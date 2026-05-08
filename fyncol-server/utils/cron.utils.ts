// utils/cron.utils.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { getDayLimitsByOffset, COUNTRY_TIMEZONES } from './time.utils';

const prisma = new PrismaClient();

// Helper para calcular la medianoche estricta (Misma lógica del controlador)
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

const autoCloseRoutes = async () => {
  console.log("⏰ [CRON] Ejecutando barrido de verificación de cierres automáticos...");
  
  try {
    const activeRoutes = await prisma.route.findMany({
      where: { 
        isActive: true,
        assignedToId: { not: null } 
      },
      include: { clients: true } // Necesario para contar totalClients
    });

    for (const route of activeRoutes) {
      if (!route.assignedToId) continue;

      const offset = COUNTRY_TIMEZONES[route.country || 'Colombia'] ?? -5;
      
      // SOLUCIÓN ZONA HORARIA: Cálculos basados en UTC puro
      const nowUtc = new Date();
      const currentUtcHour = nowUtc.getUTCHours();
      
      // Ajustamos la hora UTC al offset del país de la ruta y forzamos formato 24h
      let localHour = (currentUtcHour + offset) % 24;
      if (localHour < 0) localHour += 24; 
      
      const localMinutes = nowUtc.getUTCMinutes();
      
      // Si son entre las 23:50 y las 23:59 locales en ESE PAÍS
      if (localHour === 23 && localMinutes >= 50) {
        
        const { startOfDay, endOfDay } = getDayLimitsByOffset(offset);
        const { dueDateEnd } = getDueDateLimits(startOfDay, offset);

        const alreadyClosed = await prisma.dailyClosure.findFirst({
          where: {
            routeId: route.id,
            closedAt: { gte: startOfDay, lte: endOfDay }
          }
        });

        if (!alreadyClosed) {
          console.log(`🔒 [CRON] Cerrando automáticamente la ruta ${route.id} (${route.country})`);
          
          // 1. PASAR A MORA AUTOMÁTICA
          const unmanagedInstallments = await prisma.installment.findMany({
            where: {
              loan: { client: { routeId: route.id }, isActive: true },
              status: { in: ['PENDING', 'PARTIAL'] },
              dueDate: { lte: dueDateEnd },
              expectedAmount: { gt: 0 } 
            }
          });

          if (unmanagedInstallments.length > 0) {
            const unmanagedIds = unmanagedInstallments.map(inst => inst.id);
            await prisma.installment.updateMany({
              where: { id: { in: unmanagedIds } },
              data: {
                status: 'OVERDUE',
                wasLate: true,
                actionDescription: 'Sistema: Reportado en mora automática a las 23:59 (Cierre de servidor).'
              }
            });
          }

          // 2. CALCULAR MÉTRICAS REALES DEL DÍA (Para no guardar el cierre en ceros)
          const capitalTransactionsToday = await prisma.capitalTransaction.findMany({
            where: { routeId: route.id, createdAt: { gte: startOfDay, lte: endOfDay } }
          });

          const totalInversiones = capitalTransactionsToday.filter(t => t.type === 'INVERSION').reduce((acc, t) => acc + Number(t.amount), 0);
          const totalRetiros = capitalTransactionsToday.filter(t => t.type === 'RETIRO').reduce((acc, t) => acc + Number(t.amount), 0);
          const totalGastos = capitalTransactionsToday.filter(t => t.type === 'GASTO').reduce((acc, t) => acc + Number(t.amount), 0); // NUEVO CAMPO

          const paymentsToday = await prisma.payment.findMany({
            where: { createdAt: { gte: startOfDay, lte: endOfDay }, loan: { client: { routeId: route.id } } }
          });
          
          const totalCollected = paymentsToday.reduce((acc, pay) => acc + Number(pay.amount), 0);
          const collectedClients = new Set(paymentsToday.map(p => p.loanId)).size; 

          const loansToday = await prisma.loan.findMany({
            where: { createdAt: { gte: startOfDay, lte: endOfDay }, client: { routeId: route.id } }
          });

          let newSales = 0;
          let renewals = 0;
          loansToday.forEach(loan => {
            if (loan.isRenewal) renewals += Number(loan.amount);
            else newSales += Number(loan.amount);
          });

          const totalClients = route.clients.length;

          // Clientes que quedaron en mora al final del día
          const overdueInstallments = await prisma.installment.findMany({
            where: {
              loan: { client: { routeId: route.id }, isActive: true },
              status: { in: ['OVERDUE', 'RENEGOTIATED'] }
            },
            select: { loanId: true } 
          });
          const overdueClients = new Set(overdueInstallments.map(i => i.loanId)).size;

          // Cartera actual
          const pendingInstallments = await prisma.installment.findMany({
            where: {
              status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'RENEGOTIATED'] },
              loan: { client: { routeId: route.id } }
            }
          });
          const totalPortfolio = pendingInstallments.reduce((acc, inst) => acc + (Number(inst.expectedAmount) - Number(inst.paidAmount)), 0);

          // 3. CREAR EL REGISTRO DE CIERRE DEFINITIVO
          await prisma.dailyClosure.create({
            data: {
              routeId: route.id,
              closedById: route.assignedToId, 
              availableCapital: Number(route.availableCapital || 0),
              totalPortfolio, 
              totalCollected, 
              newSales,
              renewals,
              totalClients,
              collectedClients,
              overdueClients,
              totalInversiones,
              totalRetiros,
              totalGastos // Agregado para que audite contablemente
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ [CRON] Error en el cierre automático:", error);
  }
};

export const startCronJobs = () => {
  cron.schedule('55 * * * *', autoCloseRoutes);
  console.log("⚙️  [CRON] Servicio de cierre automático a las 23:55 inicializado.");
};