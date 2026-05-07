import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { getDayLimitsByOffset, COUNTRY_TIMEZONES } from './time.utils';

const prisma = new PrismaClient();

const autoCloseRoutes = async () => {
  console.log("⏰ [CRON] Ejecutando barrido de verificación de cierres automáticos...");
  
  try {
    // 1. Buscamos solo rutas activas que SÍ tengan un cobrador asignado
    const activeRoutes = await prisma.route.findMany({
      where: { 
        isActive: true,
        assignedToId: { not: null } // Asegura que la ruta tenga un dueño
      }
    });

    for (const route of activeRoutes) {
      // 2. Validación de seguridad para que TypeScript sepa que assignedToId jamás será null aquí
      if (!route.assignedToId) continue;

      const offset = COUNTRY_TIMEZONES[route.country || 'Colombia'] ?? -5;
      
      // Obtenemos la hora actual en el país de la ruta
      const nowUtc = new Date();
      const localTime = new Date(nowUtc.getTime() + (offset * 3600000));
      
      // Si son entre las 23:50 y las 23:59 locales, ejecutamos el cierre
      if (localTime.getHours() === 23 && localTime.getMinutes() >= 50) {
        
        const { startOfDay, endOfDay } = getDayLimitsByOffset(offset);

        // Verificamos si ya se cerró hoy
        const alreadyClosed = await prisma.dailyClosure.findFirst({
          where: {
            routeId: route.id,
            closedAt: { gte: startOfDay, lte: endOfDay }
          }
        });

        if (!alreadyClosed) {
          console.log(`🔒 [CRON] Cerrando automáticamente la ruta ${route.id} (${route.country})`);
          
          const dueDateEnd = new Date(endOfDay.getTime()); 
          
          // Buscamos los que no pagaron hoy
          const unmanagedInstallments = await prisma.installment.findMany({
            where: {
              loan: { client: { routeId: route.id }, isActive: true },
              status: { in: ['PENDING', 'PARTIAL'] },
              dueDate: { lte: dueDateEnd },
              expectedAmount: { gt: 0 } 
            }
          });

          // Los pasamos a mora automática
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

          // Creamos el registro de cierre asignado al cobrador de la ruta
          await prisma.dailyClosure.create({
            data: {
              routeId: route.id,
              closedById: route.assignedToId, // TypeScript ya reconoce esto como un número seguro
              availableCapital: Number(route.availableCapital || 0),
              totalPortfolio: 0, 
              totalCollected: 0, 
              newSales: 0,
              renewals: 0,
              totalClients: 0,
              collectedClients: 0,
              overdueClients: unmanagedInstallments.length,
              totalInversiones: 0,
              totalRetiros: 0
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ [CRON] Error en el cierre automático:", error);
  }
};

// Programamos el CRON para que se ejecute en el minuto 55 de CADA hora.
export const startCronJobs = () => {
  cron.schedule('55 * * * *', autoCloseRoutes);
  console.log("⚙️  [CRON] Servicio de cierre automático a las 23:59 inicializado.");
};