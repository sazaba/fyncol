import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crearRuta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { country, city, currency, assignedToId } = req.body;
    
    if (assignedToId) {
      const rutaExistente = await prisma.route.findFirst({
        where: { assignedToId: Number(assignedToId) }
      });

      if (rutaExistente) {
        const [, nuevaRuta] = await prisma.$transaction([
          prisma.route.update({
            where: { id: rutaExistente.id },
            data: { assignedToId: null }
          }),
          prisma.route.create({
            data: {
              country,
              city,
              currency,
              assignedToId: Number(assignedToId),
            },
            include: { assignedTo: true }
          })
        ]);
        
        res.status(201).json(nuevaRuta);
        return;
      }
    }

    const nuevaRuta = await prisma.route.create({
      data: {
        country,
        city,
        currency,
        assignedToId: assignedToId ? Number(assignedToId) : null,
      },
      include: { assignedTo: true }
    });
    
    res.status(201).json(nuevaRuta);
  } catch (error) {
    res.status(500).json({ error: 'Error interno al crear la ruta' });
  }
};

export const obtenerRutas = async (req: Request, res: Response) => {
  try {
    const rutas = await prisma.route.findMany({
      include: {
        assignedTo: {
          select: { id: true, name: true, role: true }
        },
        clients: {
          include: {
            loans: {
              // NUEVO: Incluimos los pagos para poder calcular cuánto han abonado
              include: {
                payments: true 
              }
            }
          }
        }
      }
    });

    const rutasConCartera = rutas.map(ruta => {
      let totalCartera = 0;
      
      ruta.clients.forEach(client => {
        client.loans.forEach(loan => {
          // Solo sumamos el dinero de los préstamos que siguen vivos
          if(loan.isActive) {
            const metaTotal = Number(loan.projectedTotal || 0);
            
            // Calculamos todo lo que este cliente ya ha pagado
            const totalPagado = loan.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
            
            // El dinero que realmente falta por recoger en la calle
            const saldoPendiente = metaTotal - totalPagado;

            if (saldoPendiente > 0) {
              totalCartera += saldoPendiente;
            }
          }
        });
      });

      // Extraemos clients para no saturar la respuesta web
      const { clients, ...rutaData } = ruta;
      
      return {
        ...rutaData,
        // Redondeamos para mantener la limpieza visual sin decimales
        totalCartera: Math.round(totalCartera) 
      };
    });

    res.json(rutasConCartera);
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    res.status(500).json({ error: 'Error interno al obtener las rutas' });
  }
};

export const reasignarRuta = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetRouteId = Number(req.params.id);
    const assignedToId = req.body.assignedToId ? Number(req.body.assignedToId) : null;
    const replacementId = req.body.replacementId ? Number(req.body.replacementId) : null;

    if (assignedToId) {
      // 1. Verificar si el cobrador que queremos asignar YA está en otra ruta
      const oldRoute = await prisma.route.findFirst({
        where: { 
          assignedToId: assignedToId,
          id: { not: targetRouteId } 
        }
      });

      if (oldRoute) {
        // 2. Exigir un reemplazo
        if (!replacementId) {
          res.status(400).json({ 
            code: 'REQUIRES_REPLACEMENT',
            oldRouteId: oldRoute.id,
            message: `El cobrador ya está en la Ruta ${oldRoute.id}. Debes asignar un reemplazo para esa ruta.`
          });
          return;
        }

        // 3. Verificar que el reemplazo propuesto esté libre (Ignorando la ruta destino para permitir Swap)
        const replacementInUse = await prisma.route.findFirst({
          where: { 
            assignedToId: replacementId,
            id: { not: targetRouteId } 
          }
        });

        if (replacementInUse) {
          res.status(400).json({ error: 'El cobrador de reemplazo seleccionado también está ocupado en otra ruta diferente.' });
          return;
        }

        // 4. Ejecutar el intercambio (Swap) en dos pasos seguros
        // PASO A: Soltar ambas rutas temporalmente para evitar colisión de Unique Key en MySQL
        await prisma.$transaction([
          prisma.route.update({ where: { id: targetRouteId }, data: { assignedToId: null } }),
          prisma.route.update({ where: { id: oldRoute.id }, data: { assignedToId: null } })
        ]);

        // PASO B: Cruzar los usuarios
        const [updatedTarget, updatedOld] = await prisma.$transaction([
          prisma.route.update({
            where: { id: targetRouteId },
            data: { assignedToId: assignedToId },
            include: { assignedTo: true }
          }),
          prisma.route.update({
            where: { id: oldRoute.id },
            data: { assignedToId: replacementId },
            include: { assignedTo: true }
          })
        ]);

        res.json({ updatedRoutes: [updatedTarget, updatedOld] });
        return;
      }
    }

    // 5. Flujo normal: el cobrador estaba libre, o estamos vaciando la ruta
    const rutaActualizada = await prisma.route.update({
      where: { id: targetRouteId },
      data: { assignedToId: assignedToId },
      include: { assignedTo: true }
    });

    res.json({ updatedRoutes: [rutaActualizada] });
  } catch (error) {
    console.error("Error al reasignar:", error);
    res.status(500).json({ error: 'Error interno al reasignar la ruta' });
  }
};

export const eliminarRuta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.route.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true, message: "Ruta eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al eliminar la ruta' });
  }
};