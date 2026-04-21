import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Asumimos que pasas el routeId por query params o lo sacas del token (req.user)
    // Para este ejemplo, lo tomaremos del query: /api/monitoring?routeId=1
    const routeId = Number(req.query.routeId);

    if (!routeId) {
      return res.status(400).json({ success: false, error: "El routeId es requerido" });
    }

    // Configurar el inicio y fin del día actual
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = { gte: startOfDay, lte: endOfDay };

    // Ejecutamos las consultas pesadas en paralelo para mayor rendimiento
    const [
      route,
      lastClosure,
      paymentsToday,
      loansToday,
      installmentsDueToday,
      overdueInstallments,
      clientsPaidToday
    ] = await Promise.all([
      // 1. Info de la ruta (Saldo Disponible)
      prisma.route.findUnique({
        where: { id: routeId }
      }),

      // 2. Último cierre de caja (Cartera Inicial)
      prisma.dailyClosure.findFirst({
        where: { routeId },
        orderBy: { closedAt: 'desc' }
      }),

      // 3. Recaudo del día
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { loan: { client: { routeId } }, createdAt: dateFilter }
      }),

      // 4. Préstamos de hoy (Nuevos vs Renovaciones)
      prisma.loan.findMany({
        where: { client: { routeId }, createdAt: dateFilter },
        select: { amount: true, isRenewal: true } // isRenewal es el campo nuevo
      }),

      // 5. Recaudo Proyectado (Cuotas que vencen hoy)
      prisma.installment.aggregate({
        _sum: { expectedAmount: true },
        where: { loan: { client: { routeId } }, dueDate: dateFilter, status: { not: 'PAID' } }
      }),

      // 6. Clientes en mora
      prisma.installment.findMany({
        where: { loan: { client: { routeId } }, status: 'OVERDUE' },
        select: { loan: { select: { clientId: true } } },
        distinct: ['loanId'] // Simplificamos para no traer toda la data
      }),

      // 7. Clientes que pagaron hoy
      prisma.payment.findMany({
        where: { loan: { client: { routeId } }, createdAt: dateFilter },
        select: { loan: { select: { clientId: true } } },
        distinct: ['loanId']
      })
    ]);

    if (!route) {
      return res.status(404).json({ success: false, error: "Ruta no encontrada" });
    }

    // --- PROCESAMIENTO DE DATOS ---

    // Puntos 3 y 4: Dinero en Créditos Nuevos y Renovaciones
    let nuevosCreditosAmount = 0;
    let renovacionesAmount = 0;

    loansToday.forEach(loan => {
      if (loan.isRenewal) {
        renovacionesAmount += Number(loan.amount);
      } else {
        nuevosCreditosAmount += Number(loan.amount);
      }
    });

    // Punto 5: Recaudo del día
    const recaudoDia = Number(paymentsToday._sum.amount || 0);

    // Punto 2: Saldo Disponible
    const saldoDisponible = Number(route.availableCapital);

    // Punto 1: Caja Inicial (Cálculo inverso: Saldo Actual + Préstamos - Recaudos)
    // Nota: Si manejas retiros/inversiones en el día, deberías sumarlos/restarlos aquí también.
    const prestamosTotalesDia = nuevosCreditosAmount + renovacionesAmount;
    const cajaInicial = saldoDisponible + prestamosTotalesDia - recaudoDia;

    // Punto 6: Cartera Inicial
    const carteraInicial = lastClosure ? Number(lastClosure.totalPortfolio) : 0;

    // Punto 7: Cartera Final (Para no hacer una consulta gigante que sume todas las cuotas vivas,
    // es más eficiente calcularla: Cartera Inicial + Préstamos Nuevos - Recaudo + InteresesNuevos)
    // Pero si quieres la data dura actual de la base de datos para evitar desfaces:
    const carteraActualQuery = await prisma.installment.aggregate({
      _sum: { expectedAmount: true, paidAmount: true },
      where: { 
        loan: { client: { routeId } }, 
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'] } 
      }
    });
    
    const carteraEsperada = Number(carteraActualQuery._sum.expectedAmount || 0);
    const carteraPagada = Number(carteraActualQuery._sum.paidAmount || 0);
    const carteraFinal = carteraEsperada - carteraPagada;

    // Punto 8: Clientes que pagaron
    const clientesQuePagaron = clientsPaidToday.length;

    // Punto 9: Clientes en Mora (Extraemos los IDs únicos)
    const clientesEnMoraIds = new Set(overdueInstallments.map(i => i.loan.clientId));
    const clientesEnMora = clientesEnMoraIds.size;

    // Punto 10: Porcentaje de Rendimiento
    const recaudoProyectado = Number(installmentsDueToday._sum.expectedAmount || 0);
    let porcentajeRendimiento = 0;
    if (recaudoProyectado > 0) {
      porcentajeRendimiento = (recaudoDia / recaudoProyectado) * 100;
    }

    // --- RESPUESTA ---
    return res.status(200).json({
      success: true,
      data: {
        cajaInicial,
        saldoDisponible,
        nuevosCreditosAmount,
        renovacionesAmount,
        recaudoDia,
        carteraInicial,
        carteraFinal,
        clientesQuePagaron,
        clientesEnMora,
        rendimiento: {
          proyectado: recaudoProyectado,
          realizado: recaudoDia,
          porcentaje: Number(porcentajeRendimiento.toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error("Error obteniendo stats de monitoreo:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
};