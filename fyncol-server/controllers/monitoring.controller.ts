import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// Importa tus utilidades (Ajusta la ruta según tu estructura)
import { getDayLimitsByOffset, COUNTRY_TIMEZONES } from '../utils/time.utils'; 

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const routeId = Number(req.query.routeId);

    if (!routeId) {
      return res.status(400).json({ success: false, error: "El routeId es requerido" });
    }

    // PASO 1: Buscamos la ruta primero para saber su país
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    
    if (!route) {
      return res.status(404).json({ success: false, error: "Ruta no encontrada" });
    }

    // PASO 2: Calculamos los límites del día basándonos dinámicamente en el país
    // Si el país no está en la lista, cae por defecto a -5 (Colombia/Ecuador/Perú)
    const offset = COUNTRY_TIMEZONES[route.country] ?? -5;
    const { startOfDay, endOfDay } = getDayLimitsByOffset(offset);
    const dateFilter = { gte: startOfDay, lte: endOfDay };

    // PASO 3: Ejecutamos TODAS las demás consultas usando el dateFilter dinámico
    const [
      paymentsToday,
      loansToday,
      installmentsDueToday,
      overdueInstallments,
      clientsPaidToday,
      carteraActualQuery,
      nuevaDeudaQuery
    ] = await Promise.all([
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

      prisma.installment.aggregate({
        _sum: { expectedAmount: true, paidAmount: true },
        where: { 
          loan: { client: { routeId } }, 
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'] } 
        }
      }),

      prisma.installment.aggregate({
        _sum: { expectedAmount: true },
        where: { loan: { client: { routeId }, createdAt: dateFilter } }
      })
    ]);

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

    const carteraEsperada = Number(carteraActualQuery._sum.expectedAmount || 0);
    const carteraPagada = Number(carteraActualQuery._sum.paidAmount || 0);
    const carteraFinal = carteraEsperada - carteraPagada;

    const nuevaDeudaHoy = Number(nuevaDeudaQuery._sum.expectedAmount || 0);
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