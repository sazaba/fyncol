// controllers/rutas.controller.ts

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware'; 

const prisma = new PrismaClient();

// ==========================================
// UTILIDADES DE ZONA HORARIA INCRUSTADAS
// ==========================================
const COUNTRY_TIMEZONES: Record<string, number> = {
  'Colombia': -5,
  'Peru': -5,
  'Ecuador': -5,
  'Panama': -5,
  'Mexico': -6, 
  'Costa Rica': -6,
  'Guatemala': -6,
  'Honduras': -6,
  'El Salvador': -6,
  'Nicaragua': -6,
  'Chile': -4,
  'Bolivia': -4,
  'Venezuela': -4,
  'Paraguay': -4,
  'República Dominicana': -4,
  'Argentina': -3,
  'Uruguay': -3,
  'Brasil': -3,
  'España': +1,
  'USA': -5 
};

const getDayLimitsByOffset = (utcOffset: number) => {
  const nowUtcEpoch = new Date().getTime();
  const localTime = new Date(nowUtcEpoch + (utcOffset * 3600000));

  const localStart = new Date(localTime);
  const localEnd = new Date(localTime);

  const corteAlMediodia = true; // TRUE = Cierra a las 12:00 PM

  if (corteAlMediodia) {
    if (localTime.getUTCHours() < 12) {
      localStart.setUTCDate(localStart.getUTCDate() - 1);
      localStart.setUTCHours(12, 0, 0, 0);
      localEnd.setUTCHours(11, 59, 59, 999);
    } else {
      localStart.setUTCHours(12, 0, 0, 0);
      localEnd.setUTCDate(localEnd.getUTCDate() + 1);
      localEnd.setUTCHours(11, 59, 59, 999);
    }
  } else {
    localStart.setUTCHours(0, 0, 0, 0);
    localEnd.setUTCHours(23, 59, 59, 999);
  }

  return { 
    startOfDay: new Date(localStart.getTime() - (utcOffset * 3600000)), 
    endOfDay: new Date(localEnd.getTime() - (utcOffset * 3600000)) 
  };
};

// ==========================================
// CONTROLADORES CRUD DE RUTAS
// ==========================================

export const crearRuta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado: No tienes empresa asignada." });
      return;
    }

    const { country, city, currency, assignedToId, maxLoanPerClient } = req.body;
    
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
              companyId,
              maxLoanPerClient: maxLoanPerClient ? Number(maxLoanPerClient) : 0 
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
        companyId,
        maxLoanPerClient: maxLoanPerClient ? Number(maxLoanPerClient) : 0 
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

export const actualizarRuta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { maxLoanPerClient } = req.body;

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

    const rutaActualizada = await prisma.route.update({
      where: { id: Number(id) },
      data: {
        maxLoanPerClient: maxLoanPerClient !== undefined ? Number(maxLoanPerClient) : rutaExistente.maxLoanPerClient
      }
    });

    res.json({ success: true, data: rutaActualizada });
  } catch (error) {
    console.error("Error al actualizar la ruta:", error);
    res.status(500).json({ error: 'Error interno al actualizar la ruta' });
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

// ==========================================
// CONTROLADORES DE MONITOREO
// ==========================================

export const getMonitoreoHoy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      res.status(403).json({ error: "Acceso denegado." });
      return;
    }

    const ruta = await prisma.route.findUnique({
      where: { id: Number(id), companyId },
      include: { assignedTo: true }
    });

    if (!ruta) {
      res.status(404).json({ error: "Ruta no encontrada" });
      return;
    }

    const offset = COUNTRY_TIMEZONES[ruta.country] ?? -5;
    const { startOfDay: hoyInicio, endOfDay: hoyFin } = getDayLimitsByOffset(offset);

    const clientesDeHoyRaw = await prisma.client.findMany({
      where: {
        routeId: Number(id),
        loans: { 
          some: { 
            OR: [
              { isActive: true },
              { payments: { some: { createdAt: { gte: hoyInicio, lte: hoyFin } } } }
            ]
          } 
        }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        loans: {
          where: { 
            OR: [
              { isActive: true },
              { payments: { some: { createdAt: { gte: hoyInicio, lte: hoyFin } } } }
            ]
          },
          include: {
            installmentDetails: true,
            payments: {
              where: {
                createdAt: { gte: hoyInicio, lte: hoyFin }
              }
            }
          }
        }
      }
    });

    const clientesProcesados: any[] = [];

    for (const client of clientesDeHoyRaw) {
      let deudaTotal = 0;
      let cuotaDia = 0;
      let hasMora = false;
      let hasPaymentToday = false;
      let needsToVisitToday = false; 
      let hasUnpaidInstallmentTodayOrBefore = false; // NUEVA VARIABLE CLAVE

      for (const loan of client.loans) {
        if (loan.payments.length > 0) {
          hasPaymentToday = true;
        }

        for (const inst of loan.installmentDetails) {
          const dueDate = new Date(inst.dueDate);
          const isDueToday = dueDate >= hoyInicio && dueDate <= hoyFin;
          const isDueBeforeToday = dueDate < hoyInicio;
          const isPendingStatus = ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'].includes(inst.status);

          if (isPendingStatus) {
            deudaTotal += (Number(inst.expectedAmount) - Number(inst.paidAmount));
          }

          if (isDueToday) {
            cuotaDia += Number(inst.expectedAmount);
          }

          if (inst.status === 'OVERDUE') {
            hasMora = true;
          }

          // Si hay una cuota vencida o de hoy que no se ha pagado completamente
          if (isPendingStatus && (isDueToday || isDueBeforeToday)) {
             hasUnpaidInstallmentTodayOrBefore = true;
          }

          if (
            isDueToday ||
            inst.status === 'OVERDUE' ||
            (inst.promiseDate && new Date(inst.promiseDate) <= hoyFin && inst.status !== 'PAID')
          ) {
            needsToVisitToday = true;
          }
        }
      }

      if (hasPaymentToday) {
        needsToVisitToday = true;
      }

      if (needsToVisitToday) {
        let estado = 'PENDIENTE';
        
        // LÓGICA CORREGIDA:
        // Solo es 'PAGADO' si hizo un pago hoy Y NO tiene cuotas vivas de hoy o días anteriores.
        if (hasPaymentToday && !hasUnpaidInstallmentTodayOrBefore) {
          estado = 'PAGADO'; 
        } else if (hasMora) {
          estado = 'MORA';   
        } else if (hasPaymentToday && hasUnpaidInstallmentTodayOrBefore) {
          // Si pagó algo pero sigue debiendo, lo dejamos como PENDIENTE (o ABONO)
          estado = 'PENDIENTE'; 
        }

        clientesProcesados.push({
          id: client.id,
          name: client.name,
          latitude: client.latitude,
          longitude: client.longitude,
          address: client.address,
          deudaTotal,
          cuotaDia,
          estado
        });
      }
    }

    res.json({ 
      success: true, 
      clientes: clientesProcesados,
      ruta: { country: ruta.country }, // Mandamos el país para que el frontend pueda calcular el hoy
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

    const distinctCountries = await prisma.route.findMany({
      where: { companyId, isActive: true },
      select: { country: true },
      distinct: ['country']
    });

    const summaryPromises = distinctCountries.map(async ({ country }) => {
      const offset = COUNTRY_TIMEZONES[country] ?? -5;
      const { startOfDay: hoyInicio, endOfDay: hoyFin } = getDayLimitsByOffset(offset);

      const rutas = await prisma.route.findMany({
        where: { companyId, isActive: true, country },
        include: {
          assignedTo: true,
          clients: { 
            include: {
              loans: { 
                where: { 
                  OR: [
                    { isActive: true },
                    { payments: { some: { createdAt: { gte: hoyInicio, lte: hoyFin } } } }
                  ]
                },
                include: {
                  installmentDetails: true,
                  payments: {
                    where: { createdAt: { gte: hoyInicio, lte: hoyFin } }
                  }
                }
              }
            }
          }
        }
      });

      return rutas.map((ruta: any) => {
        let clientesTotales = 0;
        let clientesCobrados = 0;
        let clientesMora = 0;
        let totalRecaudado = 0;

        ruta.clients.forEach((client: any) => {
          let needsToVisitToday = false;
          let hasPaymentToday = false;
          let hasMora = false;
          let hasUnpaidInstallmentTodayOrBefore = false;

          client.loans.forEach((loan: any) => {
            if (loan.payments.length > 0) {
              hasPaymentToday = true;
              loan.payments.forEach((pago: any) => {
                totalRecaudado += Number(pago.amount);
              });
            }

            loan.installmentDetails.forEach((inst: any) => {
              const dueDate = new Date(inst.dueDate);
              const isDueToday = dueDate >= hoyInicio && dueDate <= hoyFin;
              const isDueBeforeToday = dueDate < hoyInicio;
              const isPendingStatus = ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'].includes(inst.status);

              if (inst.status === 'OVERDUE') {
                hasMora = true;
              }

              if (isPendingStatus && (isDueToday || isDueBeforeToday)) {
                 hasUnpaidInstallmentTodayOrBefore = true;
              }

              if (
                isDueToday ||
                inst.status === 'OVERDUE' ||
                (inst.promiseDate && new Date(inst.promiseDate) <= hoyFin && inst.status !== 'PAID')
              ) {
                needsToVisitToday = true;
              }
            });
          });

          if (hasPaymentToday) {
            needsToVisitToday = true;
          }

          if (needsToVisitToday) {
            clientesTotales++;
            
            // LÓGICA CORREGIDA PARA EL RESUMEN:
            if (hasPaymentToday && !hasUnpaidInstallmentTodayOrBefore) {
              clientesCobrados++; 
            } else if (hasMora) {
              clientesMora++;     
            }
          }
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
    });

    const resultsArray = await Promise.all(summaryPromises);
    const summary = resultsArray.flat();

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error en getRoutesSummary:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};