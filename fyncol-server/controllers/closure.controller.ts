import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para obtener el rango del día actual (Hora local)
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * 1. OBTENER RESUMEN DE ARQUEO (Para el Modal)
 */
export const getClosureSummary = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { start, end } = getTodayRange();

    // 1. Obtener la ruta del usuario
    const route = await prisma.route.findFirst({
      where: { assignedToId: userId },
      include: { clients: true }
    });

    if (!route) {
      return res.status(404).json({ error: "No tienes una ruta asignada." });
    }

    const routeId = route.id;

    // 2. DISPONIBLE (Capital de la ruta)
    const availableCapital = Number(route.availableCapital);

    // 3. RECAUDO HOY (Suma de todos los pagos hechos hoy en préstamos de esta ruta)
    const paymentsToday = await prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        loan: { client: { routeId } }
      }
    });
    
    const totalCollected = paymentsToday.reduce((acc: number, pay: any) => acc + Number(pay.amount), 0);

    // 4. CLIENTES COBRADOS (Clientes únicos que pagaron hoy)
    const collectedClients = new Set(paymentsToday.map((p: any) => p.loanId)).size; 

    // 5. VENTAS (Nuevos) y RENOVACIONES (Viejos)
    const loansToday = await prisma.loan.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        client: { routeId }
      },
      include: { client: true }
    });

    let newSales = 0;
    let renewals = 0;

    loansToday.forEach((loan: any) => {
      if (loan.client.createdAt >= start && loan.client.createdAt <= end) {
        newSales += Number(loan.amount);
      } else {
        renewals += Number(loan.amount);
      }
    });

    // 6. TOTAL RUTA (Clientes activos asignados a la ruta)
    const totalClients = route.clients.length;

    // 7. CLIENTES MORA (Incluye OVERDUE y RENEGOTIATED)
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        loan: { 
          client: { routeId },
          isActive: true // Solo préstamos activos
        },
        OR: [
          { status: 'OVERDUE' },
          { status: 'RENEGOTIATED' }, // <-- NUEVO: Incluir renegociados
          {
            status: { in: ['PENDING', 'PARTIAL'] },
            dueDate: { lte: end }, // La fecha de pago es hoy o antes
            expectedAmount: { gt: 0 } // Ignora las cuotas en $0 (rediferidas/exoneradas)
          }
        ]
      },
      select: { loanId: true, status: true } // <-- Traer también el status para contar las renegociadas
    });
    
    // FIX: Conteo para MORA RENEGOCIADA (RENEGOTIATED) primero
    const renegotiatedSet = new Set(
        overdueInstallments
            .filter((i: any) => i.status === 'RENEGOTIATED')
            .map((i: any) => i.loanId)
    );
    const renegotiatedClients = renegotiatedSet.size;

    // FIX: Conteo para MORA PURA excluyendo los que ya están en Acuerdos (renegotiatedSet)
    const pureOverdueClients = new Set(
        overdueInstallments
            .filter((i: any) => i.status !== 'RENEGOTIATED' && !renegotiatedSet.has(i.loanId))
            .map((i: any) => i.loanId)
    ).size;

    // 8. CARTERA (Total en la calle pendiente por cobrar)
    const pendingInstallments = await prisma.installment.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'] }, // <-- NUEVO: Incluir renegociados
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
        newSales,
        renewals,
        totalClients,
        collectedClients,
        overdueClients: pureOverdueClients, // Se divide en dos
        renegotiatedClients: renegotiatedClients // Nuevo campo
      }
    });

  } catch (error: any) {
    console.error("Error al calcular el arqueo:", error);
    return res.status(500).json({ error: error.message || "Error interno al calcular el arqueo." });
  }
};

/**
 * 2. GUARDAR EL CIERRE DEFINITIVO EN BASE DE DATOS
 */
export const confirmDailyClosure = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const summaryData = req.body.summary; 

    if (!summaryData) {
      return res.status(400).json({ error: "Faltan los datos del resumen de cierre." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findFirst({ 
        where: { assignedToId: userId } 
      });
      
      if (!route) {
        throw new Error("No tienes una ruta asignada.");
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
          // Sumamos ambos para el registro histórico, ya que el modelo original solo tiene un campo
          overdueClients: Number(summaryData.overdueClients) + Number(summaryData.renegotiatedClients),
        }
      });

      return closure;
    }, {
      maxWait: 5000, 
      timeout: 20000
    });

    return res.status(201).json({ 
      success: true, 
      message: "Cierre de ruta registrado exitosamente.", 
      data: result 
    });

  } catch (error: any) {
    console.error("Error al confirmar el cierre:", error);
    return res.status(500).json({ error: error.message || "Error al procesar el cierre." });
  }
};

/**
 * 3. OBTENER HISTORIAL DE ARQUEOS (Para el Admin/Supervisor)
 */
export const getAllClosures = async (req: any, res: any) => {
  try {
    const closures = await prisma.dailyClosure.findMany({
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
export const getClosureDetails = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const closure = await prisma.dailyClosure.findUnique({
      where: { id: parseInt(id) }
    });

    if (!closure) {
      return res.status(404).json({ error: "Cierre no encontrado." });
    }

    // FIX: Blindaje de Zona Horaria (Colombia UTC-5)
    // Extraemos la fecha restando 5 horas para asegurar que si se cierra
    // a las 8PM o 11PM, no salte al día siguiente en el horario UTC.
    const t = new Date(closure.closedAt);
    t.setUTCHours(t.getUTCHours() - 5); 
    
    const year = t.getUTCFullYear();
    const month = t.getUTCMonth();
    const day = t.getUTCDate();

    // Reconstruimos el inicio y fin del día en UTC, pero alineado estrictamente al día en Colombia
    const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0));    // 00:00:00 Hora Col (05:00 UTC)
    const end = new Date(Date.UTC(year, month, day, 28, 59, 59, 999)); // 23:59:59 Hora Col

    // Buscamos las cuotas usando la misma lógica del arqueo principal
    const installments = await prisma.installment.findMany({
      where: {
        loan: { 
          client: { routeId: closure.routeId },
          isActive: true
        },
        OR: [
          { dueDate: { gte: start, lte: end } }, // 1. Las cuotas programadas para ese día exacto
          { paidAt: { gte: start, lte: end } },  // 2. Las cuotas atrasadas que se pagaron ese día
          { status: { in: ['OVERDUE', 'RENEGOTIATED'] } } // 3. El arrastre de morosos activos
        ]
      },
      include: {
        loan: {
          include: { client: { select: { name: true, phone: true } } }
        }
      },
      orderBy: { dueDate: 'asc' } 
    });

    // Limpiamos duplicados: Si un cliente tiene una cuota renegociada y otra pendiente, priorizamos la renegociada.
    const clientMap = new Map();

    for (const inst of installments) {
      const clientId = inst.loan.client.name; 
      const current = clientMap.get(clientId);
      
      if (!current) {
        clientMap.set(clientId, inst);
      } else {
        // Prioridad de visualización para la auditoría
        const getWeight = (status: string) => {
            if(status === 'RENEGOTIATED') return 5;
            if(status === 'PAID') return 4;
            if(status === 'PARTIAL') return 3;
            if(status === 'OVERDUE') return 2;
            return 1; // PENDING
        };
        if (getWeight(inst.status) > getWeight(current.status)) {
            clientMap.set(clientId, inst);
        }
      }
    }

    const uniqueInstallments = Array.from(clientMap.values());

    const details = uniqueInstallments.map((inst: any) => ({
      id: inst.id,
      clientName: inst.loan.client.name,
      status: inst.status,
      expectedAmount: inst.expectedAmount,
      paidAmount: inst.paidAmount,
      observation: inst.actionDescription || (inst.status === 'OVERDUE' ? 'Cliente no pagó, reportado en mora.' : 'Sin observaciones adicionales.')
    }));

    return res.json({ success: true, data: details });

  } catch (error: any) {
    console.error("Error al obtener detalles del cierre:", error);
    return res.status(500).json({ error: "Error interno al obtener los detalles." });
  }
};