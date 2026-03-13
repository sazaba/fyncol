import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crearRuta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { country, city, currency, assignedToId } = req.body;
    
    // Si se intenta asignar un cobrador al crear, verificamos si ya está ocupado
    if (assignedToId) {
      const rutaExistente = await prisma.route.findFirst({
        where: { assignedToId: Number(assignedToId) }
      });

      // Si el cobrador ya está en otra ruta, usamos una transacción para liberarlo primero
      if (rutaExistente) {
        const [, nuevaRuta] = await prisma.$transaction([
          // Paso 1: Liberar al cobrador de su ruta anterior
          prisma.route.update({
            where: { id: rutaExistente.id },
            data: { assignedToId: null }
          }),
          // Paso 2: Crear la nueva ruta con el cobrador
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

    // Flujo normal si el cobrador estaba libre o si no se asignó cobrador
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
        }
      }
    });
    res.json(rutas);
  } catch (error) {
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
        // 2. Si está en otra ruta, exigimos un reemplazo para esa ruta vieja
        if (!replacementId) {
          res.status(400).json({ 
            code: 'REQUIRES_REPLACEMENT',
            oldRouteId: oldRoute.id,
            message: `El cobrador ya está en la Ruta ${oldRoute.id}. Debes asignar un reemplazo para esa ruta.`
          });
          return;
        }

        // 3. Verificar que el reemplazo propuesto esté realmente libre
        const replacementInUse = await prisma.route.findFirst({
          where: { assignedToId: replacementId }
        });

        if (replacementInUse) {
          res.status(400).json({ error: 'El cobrador de reemplazo seleccionado también está ocupado.' });
          return;
        }

        // 4. Ejecutar el intercambio (Swap) en una sola transacción segura
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

        // Devolvemos ambas rutas para que el frontend las actualice
        res.json({ updatedRoutes: [updatedTarget, updatedOld] });
        return;
      }
    }

    // 5. Flujo normal: el cobrador estaba libre, o simplemente estamos vaciando la ruta (assignedToId = null)
    const rutaActualizada = await prisma.route.update({
      where: { id: targetRouteId },
      data: { assignedToId: assignedToId },
      include: { assignedTo: true }
    });

    res.json({ updatedRoutes: [rutaActualizada] });
  } catch (error) {
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