import { Response } from "express";
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from "../middleware/auth.middleware"; 
import { getDayLimitsByOffset, COUNTRY_TIMEZONES } from '../utils/time.utils';

const prisma = new PrismaClient();

// NUEVO HELPER: Calcula la medianoche estricta del día actual para no cobrar cuotas del día siguiente
const getDueDateLimits = (start: Date, offset: number) => {
  const utcStart = start.getTime() + (offset * 3600000);
  const localDate = new Date(utcStart);
  
  const startLocal = new Date(localDate);
  startLocal.setHours(0, 0, 0, 0);
  
  const endLocal = new Date(localDate);
  endLocal.setHours(23, 59, 59, 999);
  
  return {
    dueDateStart: new Date(startLocal.getTime() - (offset * 3600000)),
    dueDateEnd: new Date(endLocal.getTime() - (offset * 3600000))
  };
};

/**
 * 1. OBTENER RESUMEN DE ARQUEO (Para el Modal)
 */
export const getClosureSummary = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; 
    const userId = req.user?.id;
    
    if (!companyId || !userId) return res.status(403).json({ error: "Acceso denegado." });

    const route = await prisma.route.findFirst({
      where: { 
        assignedToId: userId,
        companyId 
      },
      include: { clients: true }
    });

    if (!route) {
      return res.status(404).json({ error: "No tienes una ruta asignada o autorizada." });
    }

    const offset = COUNTRY_TIMEZONES[route.country] ?? -5;
    const { startOfDay: start, endOfDay: end } = getDayLimitsByOffset(offset);
    
    // Obtenemos el límite de medianoche para las cuotas
    const { dueDateEnd } = getDueDateLimits(start, offset);

    const routeId = route.id;
    const availableCapital = Number(route.availableCapital);

    const capitalTransactionsToday = await prisma.capitalTransaction.findMany({
      where: {
        routeId,
        createdAt: { gte: start, lte: end }
      }
    });

    const totalInversiones = capitalTransactionsToday
      .filter(t => t.type === 'INVERSION')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalRetiros = capitalTransactionsToday
      .filter(t => t.type === 'RETIRO')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const paymentsToday = await prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        loan: { client: { routeId } }
      }
    });
    
    const totalCollected = paymentsToday.reduce((acc: number, pay: any) => acc + Number(pay.amount), 0);
    const collectedClients = new Set(paymentsToday.map((p: any) => p.loanId)).size; 

    const loansToday = await prisma.loan.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        client: { routeId }
      }
    });

    let newSales = 0;
    let renewals = 0;

    loansToday.forEach((loan: any) => {
      if (loan.isRenewal) {
        renewals += Number(loan.amount);
      } else {
        newSales += Number(loan.amount);
      }
    });

    const totalClients = route.clients.length;

    const overdueInstallments = await prisma.installment.findMany({
      where: {
        loan: { 
          client: { routeId },
          isActive: true 
        },
        OR: [
          { status: 'OVERDUE' },
          { status: 'RENEGOTIATED' },
          {
            status: { in: ['PENDING', 'PARTIAL'] },
            dueDate: { lte: dueDateEnd }, // Usamos el límite estricto de medianoche
            expectedAmount: { gt: 0 } 
          }
        ]
      },
      select: { loanId: true, status: true } 
    });
    
    const renegotiatedSet = new Set(
        overdueInstallments
            .filter((i: any) => i.status === 'RENEGOTIATED')
            .map((i: any) => i.loanId)
    );
    const renegotiatedClients = renegotiatedSet.size;

    const pureOverdueClients = new Set(
        overdueInstallments
            .filter((i: any) => i.status !== 'RENEGOTIATED' && !renegotiatedSet.has(i.loanId))
            .map((i: any) => i.loanId)
    ).size;

    const pendingInstallments = await prisma.installment.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'] },
        loan: { client: { routeId } }
      }
    });
    
    const totalPortfolio = pendingInstallments.reduce((acc: number, inst: any) => {
      return acc + (Number(inst.expectedAmount) - Number(inst.paidAmount));
    }, 0);

    return res.json({
      success: true,
      summary: {
        availableCapital,
        totalPortfolio,
        totalCollected,
        totalInversiones, 
        totalRetiros,     
        newSales,
        renewals,
        totalClients,
        collectedClients,
        overdueClients: pureOverdueClients, 
        renegotiatedClients: renegotiatedClients 
      }
    });

  } catch (error: any) {
    console.error("Error al calcular el arqueo:", error);
    return res.status(500).json({ error: error.message || "Error interno al calcular el arqueo." });
  }
};

/**
 * 2. GUARDAR EL CIERRE DEFINITIVO EN BASE DE DATOS Y BARRIDO DE MOROSOS
 */
export const confirmDailyClosure = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; 
    const userId = req.user?.id;
    if (!companyId || !userId) return res.status(403).json({ error: "Acceso denegado." });

    // FIX PROFUNDO: En tu frontend estás mandando "body: JSON.stringify({ summary: closureSummary })"
    // Por lo que los datos vienen anidados en req.body.summary. Nos aseguramos de leerlo bien.
    const summaryData = req.body.summary || req.body;

    if (!summaryData || summaryData.availableCapital === undefined) {
      return res.status(400).json({ error: "Faltan los datos del resumen de cierre." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findFirst({ 
        where: { 
          assignedToId: userId,
          companyId 
        } 
      });
      
      if (!route) {
        throw new Error("No tienes una ruta asignada o autorizada.");
      }

      const offset = COUNTRY_TIMEZONES[route.country] ?? -5;
      const { startOfDay: start, endOfDay: end } = getDayLimitsByOffset(offset);
      
      // Obtenemos el límite de medianoche para barrer morosos
      const { dueDateEnd } = getDueDateLimits(start, offset);

      const existingClosure = await tx.dailyClosure.findFirst({
        where: {
          routeId: route.id,
          closedAt: {
            gte: start,
            lte: end
          }
        }
      });

      if (existingClosure) {
        throw new Error("Esta ruta ya fue cerrada en el turno de hoy. No se permiten cierres duplicados.");
      }

      const unmanagedInstallments = await tx.installment.findMany({
        where: {
          loan: { 
            client: { routeId: route.id },
            isActive: true 
          },
          status: { in: ['PENDING', 'PARTIAL'] },
          dueDate: { lte: dueDateEnd }, // Usamos el límite estricto de medianoche
          expectedAmount: { gt: 0 } 
        }
      });

      if (unmanagedInstallments.length > 0) {
        const unmanagedIds = unmanagedInstallments.map((inst: any) => inst.id);
        
        await tx.installment.updateMany({
          where: { id: { in: unmanagedIds } },
          data: {
            status: 'OVERDUE',
            wasLate: true,
            actionDescription: 'Sistema: Reportado en mora automática por cierre de caja sin gestión.'
          }
        });
      }

      // GUARDADO DEFINITIVO DE LA TABLA (Asegurando la conversión a números)
      const closure = await tx.dailyClosure.create({
        data: {
          routeId: route.id,
          closedById: userId,
          availableCapital: Number(summaryData.availableCapital || 0),
          totalPortfolio: Number(summaryData.totalPortfolio || 0),
          totalCollected: Number(summaryData.totalCollected || 0),
          newSales: Number(summaryData.newSales || 0),
          renewals: Number(summaryData.renewals || 0),
          totalClients: Number(summaryData.totalClients || 0),
          collectedClients: Number(summaryData.collectedClients || 0),
          overdueClients: Number(summaryData.overdueClients || 0) + Number(summaryData.renegotiatedClients || 0),
          totalInversiones: Number(summaryData.totalInversiones || 0), 
          totalRetiros: Number(summaryData.totalRetiros || 0) 
        }
      });

      return { closure, unmanagedCount: unmanagedInstallments.length };
    }, {
      maxWait: 5000, 
      timeout: 20000
    });

    return res.status(201).json({ 
      success: true, 
      message: `Cierre registrado. ${result.unmanagedCount > 0 ? `Se reportaron ${result.unmanagedCount} clientes a mora automáticamente.` : 'Todos los clientes fueron gestionados.'}`, 
      data: result.closure 
    });

  } catch (error: any) {
    console.error("Error al confirmar el cierre:", error);
    return res.status(400).json({ error: error.message || "Error al procesar el cierre." });
  }
};

/**
 * 3. OBTENER HISTORIAL DE ARQUEOS (Para el Admin/Supervisor)
 */
export const getAllClosures = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; 
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const closures = await prisma.dailyClosure.findMany({
      where: {
        route: { companyId } 
      },
      include: {
        route: true,
        closedBy: { 
          select: { id: true, name: true, email: true } 
        }
      },
      orderBy: { closedAt: 'desc' } 
    });

    return res.json({ 
      success: true, 
      data: closures 
    });

  } catch (error: any) {
    console.error("Error al obtener historial de arqueos:", error);
    return res.status(500).json({ error: error.message || "Error al procesar la solicitud." });
  }
};

/**
 * 4. OBTENER DETALLE DE UN CIERRE (Clientes y Observaciones del día)
 */
export const getClosureDetails = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; 
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const id = req.params.id as string; 
    
    const closure = await prisma.dailyClosure.findFirst({
      where: { 
        id: parseInt(id),
        route: { companyId } 
      },
      include: { route: true }
    });

    if (!closure) {
      return res.status(404).json({ error: "Cierre no encontrado o no autorizado." });
    }

    const offset = COUNTRY_TIMEZONES[closure.route.country] ?? -5;
    const utcTime = closure.closedAt.getTime();
    const localTime = new Date(utcTime + (offset * 3600000));
    
    const localStart = new Date(localTime);
    const localEnd = new Date(localTime);
    
    if (localTime.getHours() < 12) {
      localStart.setDate(localStart.getDate() - 1);
      localStart.setHours(12, 0, 0, 0);
      localEnd.setHours(11, 59, 59, 999);
    } else {
      localStart.setHours(12, 0, 0, 0);
      localEnd.setDate(localEnd.getDate() + 1);
      localEnd.setHours(11, 59, 59, 999);
    }
    
    const start = new Date(localStart.getTime() - (offset * 3600000));
    const end = new Date(localEnd.getTime() - (offset * 3600000));

    const { dueDateStart, dueDateEnd } = getDueDateLimits(start, offset);

    const installments = await prisma.installment.findMany({
      where: {
        loan: { 
          client: { routeId: closure.routeId }
        },
        OR: [
          { dueDate: { gte: dueDateStart, lte: dueDateEnd } }, 
          { paidAt: { gte: start, lte: end } },  
          { status: { in: ['OVERDUE', 'RENEGOTIATED'] } } 
        ]
      },
      include: {
        loan: {
          include: { client: { select: { name: true, phone: true } } }
        }
      },
      orderBy: { dueDate: 'asc' } 
    });

    const loanMap = new Map();

    for (const inst of installments) {
      const loanId = inst.loanId; 
      const current = loanMap.get(loanId);
      
      if (!current) {
        loanMap.set(loanId, {
          ...inst,
          aggregatedExpected: Number(inst.expectedAmount || 0),
          aggregatedPaid: Number(inst.paidAmount || 0),
          allObservations: inst.actionDescription ? [inst.actionDescription] : []
        });
      } else {
        current.aggregatedExpected += Number(inst.expectedAmount || 0);
        current.aggregatedPaid += Number(inst.paidAmount || 0);
        
        if (inst.actionDescription && !current.allObservations.includes(inst.actionDescription)) {
            current.allObservations.push(inst.actionDescription);
        }

        const getWeight = (status: string) => {
            if(status === 'RENEGOTIATED') return 5;
            if(status === 'PAID') return 4;
            if(status === 'PARTIAL') return 3;
            if(status === 'OVERDUE') return 2;
            return 1; 
        };
        if (getWeight(inst.status) > getWeight(current.status)) {
            current.status = inst.status;
        }
      }
    }

    const uniqueInstallments = Array.from(loanMap.values());

    const details = uniqueInstallments.map((inst: any) => ({
      id: inst.id,
      clientName: `${inst.loan.client.name} (Préstamo #${inst.loanId})`, 
      status: inst.status,
      expectedAmount: inst.aggregatedExpected, 
      paidAmount: inst.aggregatedPaid,         
      observation: inst.allObservations.length > 0 
        ? inst.allObservations.join(' | ') 
        : (inst.status === 'OVERDUE' ? 'Cliente no pagó, reportado en mora automática.' : 'Sin observaciones adicionales.')
    }));

    return res.json({ success: true, data: details });

  } catch (error: any) {
    console.error("Error al obtener detalles del cierre:", error);
    return res.status(500).json({ error: "Error interno al obtener los detalles." });
  }
};