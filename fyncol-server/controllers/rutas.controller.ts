import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware'; 

const prisma = new PrismaClient();

export const crearRuta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    
    // CLÁUSULA DE GUARDIA: Asegura los tipos de aquí en adelante
    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado: No tienes empresa asignada." });
      return;
    }

    const { country, city, currency, assignedToId } = req.body;
    
    if (assignedToId) {
      const rutaExistente = await prisma.route.findFirst({
        where: { assignedToId: Number(assignedToId), companyId } 
      });

      if (rutaExistente) {
        const [, nuevaRuta] = await prisma.$transaction([
          prisma.route.update({
            where: { id: rutaExistente.id },
            data: { assignedToId: null }
          }),
          prisma.route.create({
            data: {
              country, city, currency,
              assignedToId: Number(assignedToId),
              companyId 
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
        country, city, currency,
        assignedToId: assignedToId ? Number(assignedToId) : null,
        companyId 
      },
      include: { assignedTo: true }
    });
    
    res.status(201).json(nuevaRuta);
  } catch (error) {
    res.status(500).json({ error: 'Error interno al crear la ruta' });
  }
};

export const obtenerRutas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado." });
      return;
    }

    const rutas = await prisma.route.findMany({
      where: { companyId }, 
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        clients: {
          include: {
            loans: { include: { payments: true } }
          }
        }
      }
    });

    const rutasConCartera = rutas.map(ruta => {
      let totalCartera = 0;
      
      ruta.clients.forEach(client => {
        client.loans.forEach(loan => {
          if(loan.isActive) {
            const metaTotal = Number(loan.projectedTotal || 0);
            const totalPagado = loan.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
            const saldoPendiente = metaTotal - totalPagado;

            if (saldoPendiente > 0) {
              totalCartera += saldoPendiente;
            }
          }
        });
      });

      const { clients, ...rutaData } = ruta;
      
      return {
        ...rutaData,
        totalCartera: Math.round(totalCartera) 
      };
    });

    res.json(rutasConCartera);
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    res.status(500).json({ error: 'Error interno al obtener las rutas' });
  }
};

export const reasignarRuta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado." });
      return;
    }

    const targetRouteId = Number(req.params.id);
    const assignedToId = req.body.assignedToId ? Number(req.body.assignedToId) : null;
    const replacementId = req.body.replacementId ? Number(req.body.replacementId) : null;

    const targetRouteExists = await prisma.route.findFirst({
      where: { id: targetRouteId, companyId }
    });

    if (!targetRouteExists) {
      res.status(404).json({ error: 'Ruta no encontrada o no autorizada.' });
      return;
    }

    if (assignedToId) {
      const oldRoute = await prisma.route.findFirst({
        where: { 
          assignedToId: assignedToId,
          id: { not: targetRouteId },
          companyId 
        }
      });

      if (oldRoute) {
        if (!replacementId) {
          res.status(400).json({ 
            code: 'REQUIRES_REPLACEMENT',
            oldRouteId: oldRoute.id,
            message: `El cobrador ya está en la Ruta ${oldRoute.id}. Debes asignar un reemplazo para esa ruta.`
          });
          return;
        }

        const replacementInUse = await prisma.route.findFirst({
          where: { 
            assignedToId: replacementId,
            id: { not: targetRouteId },
            companyId 
          }
        });

        if (replacementInUse) {
          res.status(400).json({ error: 'El cobrador de reemplazo seleccionado también está ocupado en otra ruta diferente.' });
          return;
        }

        await prisma.$transaction([
          prisma.route.update({ where: { id: targetRouteId }, data: { assignedToId: null } }),
          prisma.route.update({ where: { id: oldRoute.id }, data: { assignedToId: null } })
        ]);

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

export const eliminarRuta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado." });
      return;
    }

    const rutaExistente = await prisma.route.findFirst({
      where: { id: Number(id), companyId }
    });

    if (!rutaExistente) {
      res.status(404).json({ error: 'Ruta no encontrada o no autorizada.' });
      return;
    }

    await prisma.route.delete({
      where: { id: Number(id) }
    });
    
    res.json({ success: true, message: "Ruta eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al eliminar la ruta' });
  }
};

// fyncol-server/controllers/rutas.controller.ts

export const getMonitoreoHoy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado." });
      return;
    }

    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    // 1. Buscamos la ruta y el usuario cobrador asignado a ella
    const ruta = await prisma.route.findUnique({
      where: { id: Number(id), companyId },
      include: { assignedTo: true }
    });

    if (!ruta) {
      res.status(404).json({ error: "Ruta no encontrada" });
      return;
    }

    // 2. Buscamos los clientes de esa ruta con cobros pendientes para hoy
    const clientesDeHoy = await prisma.client.findMany({
      where: {
        routeId: Number(id),
        loans: {
          some: {
            installmentDetails: {
              some: {
                dueDate: { gte: hoyInicio, lte: hoyFin },
                status: { in: ['PENDING', 'PARTIAL'] }
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
      }
    });

    // 3. Enviamos ambas cosas al frontend
    res.json({ 
      success: true, 
      clientes: clientesDeHoy,
      cobrador: ruta.assignedTo ? {
        id: ruta.assignedTo.id,
        name: ruta.assignedTo.name,
        latitude: ruta.assignedTo.lastLatitude,
        longitude: ruta.assignedTo.lastLongitude,
        lastUpdate: ruta.assignedTo.lastLocationUpdate
      } : null
    });
  } catch (error) {
    console.error("Error al obtener monitoreo de hoy:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getRoutesSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado." });
      return;
    }

    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    // Buscamos TODAS las rutas de la empresa con sus cobradores y las cuotas de hoy
    const rutas = await prisma.route.findMany({
      where: { companyId, isActive: true },
      include: {
        assignedTo: true,
        loans: {
          where: { isActive: true },
          include: {
            installmentDetails: {
              where: {
                dueDate: { gte: hoyInicio, lte: hoyFin }
              }
            },
            payments: {
              where: {
                createdAt: { gte: hoyInicio, lte: hoyFin }
              }
            }
          }
        }
      }
    });

    // SOLUCIÓN: Agregamos ": any" a ruta, loan y pago para satisfacer a TypeScript
    const summary = rutas.map((ruta: any) => {
      let clientesTotales = 0;
      let clientesCobrados = 0;
      let clientesMora = 0;
      let totalRecaudado = 0;

      ruta.loans.forEach((loan: any) => {
        // Asumiendo 1 préstamo activo = 1 cliente en la ruta de hoy
        if (loan.installmentDetails.length > 0) {
          clientesTotales++;
          
          const cuotaHoy = loan.installmentDetails[0];
          if (cuotaHoy.status === 'PAID') {
            clientesCobrados++;
          } else if (cuotaHoy.status === 'OVERDUE') {
            clientesMora++;
          }
        }

        // Sumar pagos hechos hoy a este préstamo
        loan.payments.forEach((pago: any) => {
          totalRecaudado += Number(pago.amount);
        });
      });

      const porcentaje = clientesTotales === 0 ? 0 : Math.round((clientesCobrados / clientesTotales) * 100);

      return {
        id: ruta.id,
        zona: ruta.city,
        cobrador: ruta.assignedTo?.name || 'Sin Asignar',
        disponible: Number(ruta.availableCapital),
        recaudado: totalRecaudado,
        clientesTotales,
        clientesCobrados,
        clientesMora,
        porcentaje
      };
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error en getRoutesSummary:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};