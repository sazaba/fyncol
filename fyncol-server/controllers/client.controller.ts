import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interfaz para asegurar el tipado correcto de las cuotas
interface InstallmentInput {
  installmentNumber: number;
  dueDate: Date;
  expectedAmount: number;
  paidAmount: number;
  status: string;
}

/**

 */
/**
 * 1. CREAR CLIENTE Y PRÉSTAMO
 * Crea el cliente, el préstamo inicial y genera automáticamente el plan de pagos (amortización)
 */
export const createClientAndLoan = async (req: any, res: any) => {
  try {
    const {
      name, documentId, phone, address, latitude, longitude, documentUrl, routeId,
      amount, installments, interestRate, periodicity, firstPaymentDate
    } = req.body;

    if (!name || !address || !routeId || !amount || !installments || !interestRate || !periodicity || !firstPaymentDate) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const amountNum = parseFloat(amount);
    const interestNum = parseFloat(interestRate);
    const installmentsNum = parseInt(installments);
    const routeIdInt = parseInt(routeId);

    let daysPerInstallment = 1; 
    if (periodicity === 'QUINCENAL') daysPerInstallment = 15;
    if (periodicity === 'MENSUAL') daysPerInstallment = 30;

    // FIX ZONA HORARIA: Extraemos año, mes y día del string "YYYY-MM-DD" que viene del front
    const [year, month, day] = firstPaymentDate.split('-');
    
    // Creamos la fecha forzando la HORA LOCAL al mediodía (12:00 PM) para que,
    // sin importar el UTC-5, siga cayendo en el mismo día.
    const firstPayment = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

    const today = new Date();
    today.setHours(12, 0, 0, 0); // También seteamos hoy al mediodía para calcular bien los días

    const diffTime = firstPayment.getTime() - today.getTime();
    let daysUntilFirstPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilFirstPayment <= 0) daysUntilFirstPayment = 1;

    const totalDays = daysUntilFirstPayment + ((installmentsNum - 1) * daysPerInstallment);
    const interestPerDay = (interestNum / 100 / 30) * amountNum;
    const totalInterest = interestPerDay * totalDays;
    
    const projectedTotal = amountNum + totalInterest;
    const installmentValue = projectedTotal / installmentsNum;

    // Generamos el cronograma de cuotas (Installments)
    const installmentsArray: InstallmentInput[] = [];
    let currentDate = new Date(firstPayment);

    for (let i = 1; i <= installmentsNum; i++) {
      installmentsArray.push({
        installmentNumber: i,
        // Guardamos la fecha manteniendo las 12:00 PM
        dueDate: new Date(currentDate),
        expectedAmount: installmentValue,
        paidAmount: 0,
        status: "PENDING",
      });

      if (periodicity === 'MENSUAL') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (periodicity === 'QUINCENAL') {
        currentDate.setDate(currentDate.getDate() + 15);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // FIX DE RENDER (P2028): Aumentamos el timeout a 20 segundos
    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({ where: { id: routeIdInt } });
      
      if (!route) throw new Error("La ruta especificada no existe");
      if (Number(route.availableCapital) < amountNum) throw new Error("Capital insuficiente en esta ruta");

      const newClient = await tx.client.create({
        data: {
          name, 
          documentId, // Se guarda la cédula
          phone,      // Se guarda el celular con el indicativo
          address, 
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          documentUrl,
          routeId: routeIdInt,
          loans: {
            create: {
              amount: amountNum,
              installments: installmentsNum,
              interestRate: interestNum,
              periodicity: periodicity,
              firstPaymentDate: firstPayment,
              projectedTotal: projectedTotal,
              installmentDetails: {
                create: installmentsArray 
              }
            }
          }
        },
        include: { 
          loans: {
            include: { installmentDetails: true }
          }
        } 
      });

      await tx.route.update({
        where: { id: routeIdInt },
        data: { availableCapital: { decrement: amountNum } }
      });

      return newClient;
    }, {
      maxWait: 5000, 
      timeout: 20000 // 20 Segundos de tiempo límite para la base de datos remota
    });

    return res.status(201).json({
      message: "Cliente, préstamo y cronograma creados exitosamente",
      data: result
    });

  } catch (error: any) {
    console.error("Error al crear cliente:", error);
    return res.status(400).json({ error: error.message || "Error interno del servidor" });
  }
};

/**
 * 2. OBTENER CARTERA DEL COBRADOR
 * Trae todos los clientes y préstamos activos de la ruta del usuario logueado
 */
export const getCarteraDelCobrador = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const route = await prisma.route.findFirst({
      where: { assignedToId: userId }
    });

    if (!route) {
      return res.status(404).json({ error: "No tienes una ruta asignada." });
    }

    const clients = await prisma.client.findMany({
      where: { 
        routeId: route.id,
        loans: { some: { isActive: true } }
      },
      include: {
        loans: {
          where: { isActive: true },
          include: { 
            payments: true,
            installmentDetails: {
                orderBy: { installmentNumber: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      route,
      clients
    });

  } catch (error: any) {
    console.error("Error al obtener cartera:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * 3. REGISTRAR PAGO (ABONO ANTIGUO - MANTENIDO POR COMPATIBILIDAD SI LO NECESITAS)
 */
export const registrarPago = async (req: any, res: any) => {
  try {
    const { loanId, amount } = req.body;
    const amountNum = parseFloat(amount);

    if (!loanId || amountNum <= 0) {
      return res.status(400).json({ error: "Datos de pago inválidos" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: parseInt(loanId) },
        include: { payments: true, client: true }
      });

      if (!loan || !loan.isActive) {
        throw new Error("El préstamo no existe o ya está cancelado.");
      }

      const totalPaidSoFar = loan.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const projectedTotal = Number(loan.projectedTotal);
      const newTotalPaid = totalPaidSoFar + amountNum;

      const newPayment = await tx.payment.create({
        data: {
          amount: amountNum,
          loanId: loan.id
        }
      });

      // Actualizamos el capital disponible de la ruta
      await tx.route.update({
        where: { id: loan.client.routeId },
        data: { availableCapital: { increment: amountNum } }
      });

      // Si el pago total supera o iguala el proyectado, desactivamos el crédito
      let isFullyPaid = false;
      if (newTotalPaid >= projectedTotal - 10) { // Margen de seguridad por decimales
        await tx.loan.update({
          where: { id: loan.id },
          data: { isActive: false }
        });
        isFullyPaid = true;
      }

      return { newPayment, isFullyPaid, newTotalPaid };
    });

    res.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Error al registrar pago:", error);
    res.status(400).json({ error: error.message || "Error al procesar el pago" });
  }
};

/**
 * 4. ACTUALIZAR ESTADO DE CUOTA (AMORTIZACIÓN DINÁMICA INTELIGENTE)
 */
export const updateInstallmentStatus = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, paidAmount, actionParams } = req.body;
    const amountNum = parseFloat(paidAmount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la cuota
      const installment = await tx.installment.findUnique({
        where: { id: parseInt(id) },
        include: { loan: { include: { client: true } } }
      });

      if (!installment) throw new Error("La cuota no existe.");

      const expected = Number(installment.expectedAmount);
      const totalPagadoHistorico = Number(installment.paidAmount || 0);
      const nuevoTotalPagado = totalPagadoHistorico + amountNum;

      // 2. Crear recibo y devolver dinero a la ruta
      if (amountNum > 0) {
        await tx.payment.create({
          data: {
            amount: amountNum,
            loanId: installment.loanId
          }
        });

        await tx.route.update({
          where: { id: installment.loan.client.routeId },
          data: { availableCapital: { increment: amountNum } }
        });
      }

      // Variable maestra del estado
      let nuevoEstado = status; 
      const hasAction = actionParams && actionParams.action !== 'NONE' && actionParams.action !== 'MANTENER';

      // 3. MOTOR INTELIGENTE
      if (hasAction) {
        const diffAmount = Number(actionParams.amount);

        // Liquidamos la cuota actual
        await tx.installment.update({
          where: { id: parseInt(id) },
          data: {
            expectedAmount: nuevoTotalPagado,
            paidAmount: nuevoTotalPagado,
            status: 'PAID',
            paidAt: new Date()
          }
        });
        nuevoEstado = 'PAID';

        // Procesar cuotas futuras (¡AQUÍ ESTABA EL ERROR CORREGIDO "gt:"!)
        const futureInstallments = await tx.installment.findMany({
          where: {
            loanId: installment.loanId,
            installmentNumber: { gt: installment.installmentNumber },
            status: { not: 'PAID' }
          },
          orderBy: { installmentNumber: 'asc' }
        });

        if (futureInstallments.length > 0) {
          if (actionParams.action === 'PROXIMA_CUOTA') {
            await tx.installment.update({
              where: { id: futureInstallments[0].id },
              data: { expectedAmount: { increment: diffAmount } }
            });
          } 
          else if (actionParams.action === 'DIFERIR') {
            const extraPorCuota = diffAmount / futureInstallments.length;
            for (const inst of futureInstallments) {
              await tx.installment.update({
                where: { id: inst.id },
                data: { expectedAmount: { increment: extraPorCuota } }
              });
            }
          }
          else if (actionParams.action === 'NEXT_QUOTA') {
            let saldoAFavor = diffAmount;
            for (const inst of futureInstallments) {
              if (saldoAFavor <= 0) break;
              const metaFutura = Number(inst.expectedAmount);
              
              if (saldoAFavor >= metaFutura) {
                await tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: 0, status: 'PAID', paidAt: new Date() }
                });
                saldoAFavor -= metaFutura;
              } else {
                await tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: { decrement: saldoAFavor } }
                });
                saldoAFavor = 0;
              }
            }
          } 
          else if (actionParams.action === 'REDUCE_TIME') {
            let saldoAFavor = diffAmount;
            const reversedFuture = [...futureInstallments].reverse();
            for (const inst of reversedFuture) {
              if (saldoAFavor <= 0) break;
              const metaFutura = Number(inst.expectedAmount);
              
              if (saldoAFavor >= metaFutura) {
                await tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: 0, status: 'PAID', paidAt: new Date() }
                });
                saldoAFavor -= metaFutura;
              } else {
                await tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: { decrement: saldoAFavor } }
                });
                saldoAFavor = 0;
              }
            }
          } 
          else if (actionParams.action === 'REDUCE_QUOTA') {
            const rebajaPorCuota = diffAmount / futureInstallments.length;
            for (const inst of futureInstallments) {
              const decrementoReal = Math.min(Number(inst.expectedAmount), rebajaPorCuota);
              await tx.installment.update({
                where: { id: inst.id },
                data: { expectedAmount: { decrement: decrementoReal } }
              });
            }
          }
        }
      } else {
        // FLUJO TRADICIONAL
        if (status === 'PAID' || nuevoTotalPagado >= expected) {
          nuevoEstado = 'PAID';
        } else if (nuevoTotalPagado > 0 && status !== 'OVERDUE') {
          nuevoEstado = 'PARTIAL';
        }

        await tx.installment.update({
          where: { id: parseInt(id) },
          data: {
            status: nuevoEstado,
            paidAmount: nuevoTotalPagado,
            paidAt: nuevoEstado === 'PAID' ? new Date() : null
          }
        });
      }

      // ---> 4. CERRAR EL PRÉSTAMO AUTOMÁTICAMENTE <---
      const todasLasCuotas = await tx.installment.findMany({
        where: { loanId: installment.loanId }
      });

      const prestamoTerminado = todasLasCuotas.every((inst: any) => 
        inst.id === parseInt(id) ? nuevoEstado === 'PAID' : inst.status === 'PAID'
      );

      if (prestamoTerminado) {
        await tx.loan.update({
          where: { id: installment.loanId },
          data: { isActive: false }
        });
      }

      return { success: true };
    });

    res.json({ success: true, installment: result });
  } catch (error: any) {
    console.error("Error al actualizar cuota:", error);
    res.status(400).json({ error: "Error al procesar el abono." });
  }
};