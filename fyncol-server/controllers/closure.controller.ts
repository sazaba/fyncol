import { Response } from "express";
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from "../middleware/auth.middleware"; // SAAS-BLINDAJE

const prisma = new PrismaClient();

// Helper para obtener el rango del día actual blindado para Colombia (UTC-5)
const getTodayRange = () => {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 5);
  
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0)); 
  const end = new Date(Date.UTC(year, month, day, 28, 59, 59, 999)); 

  return { start, end };
};

/**
 * 1. OBTENER RESUMEN DE ARQUEO (Para el Modal)
 */
export const getClosureSummary = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    const userId = req.user?.id;
    
    if (!companyId || !userId) return res.status(403).json({ error: "Acceso denegado." });

    const { start, end } = getTodayRange();

    // SAAS-BLINDAJE: Validar que la ruta le pertenece a su empresa
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

    const routeId = route.id;
    const availableCapital = Number(route.availableCapital);

    // NUEVO: Obtener Inversiones y Retiros del día
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
      // Usamos el flag nativo isRenewal de la base de datos
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
            dueDate: { lte: end }, 
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
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    const userId = req.user?.id;
    if (!companyId || !userId) return res.status(403).json({ error: "Acceso denegado." });

    const summaryData = req.body.summary; 

    if (!summaryData) {
      return res.status(400).json({ error: "Faltan los datos del resumen de cierre." });
    }

    const { end } = getTodayRange(); 

    const result = await prisma.$transaction(async (tx) => {
      // SAAS-BLINDAJE
      const route = await tx.route.findFirst({ 
        where: { 
          assignedToId: userId,
          companyId 
        } 
      });
      
      if (!route) {
        throw new Error("No tienes una ruta asignada o autorizada.");
      }

      const unmanagedInstallments = await tx.installment.findMany({
        where: {
          loan: { 
            client: { routeId: route.id },
            isActive: true 
          },
          status: { in: ['PENDING', 'PARTIAL'] },
          dueDate: { lte: end },
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

      const closure = await tx.dailyClosure.create({
        data: {
          routeId: route.id,
          closedById: userId,
          availableCapital: Number(summaryData.availableCapital),
          totalPortfolio: Number(summaryData.totalPortfolio),
          totalCollected: Number(summaryData.totalCollected),
          newSales: Number(summaryData.newSales),
          renewals: Number(summaryData.renewals),
          totalClients: Number(summaryData.totalClients),
          collectedClients: Number(summaryData.collectedClients),
          overdueClients: Number(summaryData.overdueClients) + Number(summaryData.renegotiatedClients),
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
    return res.status(500).json({ error: error.message || "Error al procesar el cierre." });
  }
};


/**
 * 3. OBTENER HISTORIAL DE ARQUEOS (Para el Admin/Supervisor)
 */
export const getAllClosures = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const closures = await prisma.dailyClosure.findMany({
      where: {
        route: { companyId } // SAAS-BLINDAJE: Solo los cierres de rutas de esta empresa
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
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const id = req.params.id as string; // CORRECCIÓN TIPADO TS
    
    // SAAS-BLINDAJE: Validar jerarquía
    const closure = await prisma.dailyClosure.findFirst({
      where: { 
        id: parseInt(id),
        route: { companyId } // SAAS-BLINDAJE
      }
    });

    if (!closure) {
      return res.status(404).json({ error: "Cierre no encontrado o no autorizado." });
    }

    const t = new Date(closure.closedAt);
    t.setUTCHours(t.getUTCHours() - 5); 
    
    const year = t.getUTCFullYear();
    const month = t.getUTCMonth();
    const day = t.getUTCDate();

    const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0));   
    const end = new Date(Date.UTC(year, month, day, 28, 59, 59, 999)); 

    const installments = await prisma.installment.findMany({
      where: {
        loan: { 
          client: { routeId: closure.routeId }
        },
        OR: [
          { dueDate: { gte: start, lte: end } }, 
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
        // Inicializamos el acumulador para este préstamo
        loanMap.set(loanId, {
          ...inst,
          aggregatedExpected: Number(inst.expectedAmount || 0),
          aggregatedPaid: Number(inst.paidAmount || 0),
          allObservations: inst.actionDescription ? [inst.actionDescription] : []
        });
      } else {
        // Si ya existe, SUMAMOS los valores de las demás cuotas pagadas/movidas hoy
        current.aggregatedExpected += Number(inst.expectedAmount || 0);
        current.aggregatedPaid += Number(inst.paidAmount || 0);
        
        // Agregamos la observación si es diferente a las que ya tenemos guardadas
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
        // Mantenemos el estado de mayor peso
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
      expectedAmount: inst.aggregatedExpected, // Usamos la suma total esperada
      paidAmount: inst.aggregatedPaid,         // Usamos la suma total pagada
      // Unimos todas las observaciones separadas por un " | "
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