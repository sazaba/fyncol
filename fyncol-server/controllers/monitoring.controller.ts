import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.query.routeId);

    if (!routeId) {
      return res.status(400).json({ success: false, error: "El routeId es requerido" });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = { gte: startOfDay, lte: endOfDay };

    // Ejecutamos TODAS las consultas pesadas en paralelo
    const [
      route,
      paymentsToday,
      loansToday,
      installmentsDueToday,
      overdueInstallments,
      clientsPaidToday,
      carteraActualQuery, // Movid0 aquí para mejor rendimiento
      nuevaDeudaQuery     // NUEVA CONSULTA: Para calcular la cartera inicial
    ] = await Promise.all([
      prisma.route.findUnique({ where: { id: routeId } }),

      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { loan: { client: { routeId } }, createdAt: dateFilter }
      }),

      prisma.loan.findMany({
        where: { client: { routeId }, createdAt: dateFilter },
        select: { amount: true, isRenewal: true }
      }),

      prisma.installment.aggregate({
        _sum: { expectedAmount: true },
        where: { loan: { client: { routeId } }, dueDate: dateFilter, status: { not: 'PAID' } }
      }),

      prisma.installment.findMany({
        where: { loan: { client: { routeId } }, status: 'OVERDUE' },
        select: { loan: { select: { clientId: true } } },
        distinct: ['loanId']
      }),

      prisma.payment.findMany({
        where: { loan: { client: { routeId } }, createdAt: dateFilter },
        select: { loan: { select: { clientId: true } } },
        distinct: ['loanId']
      }),

      // Consulta de Cartera Final (Actual)
      prisma.installment.aggregate({
        _sum: { expectedAmount: true, paidAmount: true },
        where: { 
          loan: { client: { routeId } }, 
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'] } 
        }
      }),

      // Consulta de Deuda Nueva generada hoy (Capital + Intereses prestados hoy)
      prisma.installment.aggregate({
        _sum: { expectedAmount: true },
        where: { loan: { client: { routeId }, createdAt: dateFilter } }
      })
    ]);

    if (!route) {
      return res.status(404).json({ success: false, error: "Ruta no encontrada" });
    }

    // --- PROCESAMIENTO DE DATOS ---

    let nuevosCreditosAmount = 0;
    let renovacionesAmount = 0;

    loansToday.forEach(loan => {
      if (loan.isRenewal) {
        renovacionesAmount += Number(loan.amount);
      } else {
        nuevosCreditosAmount += Number(loan.amount);
      }
    });

    const recaudoDia = Number(paymentsToday._sum.amount || 0);
    const saldoDisponible = Number(route.availableCapital);

    const prestamosTotalesDia = nuevosCreditosAmount + renovacionesAmount;
    const cajaInicial = saldoDisponible + prestamosTotalesDia - recaudoDia;

    // 1. Calculamos la Cartera Final (La foto real de este segundo)
    const carteraEsperada = Number(carteraActualQuery._sum.expectedAmount || 0);
    const carteraPagada = Number(carteraActualQuery._sum.paidAmount || 0);
    const carteraFinal = carteraEsperada - carteraPagada;

    // 2. Calculamos el valor total a pagar de los créditos generados hoy
    const nuevaDeudaHoy = Number(nuevaDeudaQuery._sum.expectedAmount || 0);

    // 3. Calculamos la Cartera Inicial de forma matemática y precisa
    const carteraInicial = carteraFinal + recaudoDia - nuevaDeudaHoy;

    const clientesQuePagaron = clientsPaidToday.length;
    const clientesEnMora = new Set(overdueInstallments.map(i => i.loan.clientId)).size;

    const recaudoProyectado = Number(installmentsDueToday._sum.expectedAmount || 0);
    const porcentajeRendimiento = recaudoProyectado > 0 ? (recaudoDia / recaudoProyectado) * 100 : 0;

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