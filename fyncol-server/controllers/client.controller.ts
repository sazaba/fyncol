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
 * 1. CREAR CLIENTE Y PRÉSTAMO
 * Crea el cliente, el préstamo inicial y genera automáticamente el plan de pagos (amortización)
 * Incluye validación de duplicados por documentId.
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

    // FIX ZONA HORARIA
    const [year, month, day] = firstPaymentDate.split('-');
    const firstPayment = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const diffTime = firstPayment.getTime() - today.getTime();
    let daysUntilFirstPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilFirstPayment <= 0) daysUntilFirstPayment = 1;

    const totalDays = daysUntilFirstPayment + ((installmentsNum - 1) * daysPerInstallment);
    const interestPerDay = (interestNum / 100 / 30) * amountNum;
    const totalInterest = interestPerDay * totalDays;
    
    const projectedTotal = amountNum + totalInterest;
    const installmentValue = projectedTotal / installmentsNum;

    const installmentsArray: any[] = [];
    let currentDate = new Date(firstPayment);

    for (let i = 1; i <= installmentsNum; i++) {
      installmentsArray.push({
        installmentNumber: i,
        dueDate: new Date(currentDate),
        expectedAmount: Number(installmentValue.toFixed(2)),
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

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({ where: { id: routeIdInt } });
      
      if (!route) throw new Error("La ruta especificada no existe");
      if (Number(route.availableCapital) < amountNum) throw new Error("Capital insuficiente en esta ruta");

      const newClient = await tx.client.create({
        data: {
          name, 
          documentId, 
          phone,      
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
              projectedTotal: Number(projectedTotal.toFixed(2)),
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
      timeout: 20000 
    });

    return res.status(201).json({
      message: "Cliente y préstamo creados exitosamente",
      data: result
    });

  } catch (error: any) {
    console.error("Error al crear cliente:", error);

    // Captura específica de documento duplicado (Error P2002 de Prisma)
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: "Error: Ya existe un cliente registrado con este número de documento." 
      });
    }

    return res.status(400).json({ error: error.message || "Error interno del servidor" });
  }
};

/**
 * 2. OBTENER CARTERA DEL COBRADOR
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
 * 3. REGISTRAR PAGO (ABONO ANTIGUO - MANTENIDO POR COMPATIBILIDAD)
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

      await tx.route.update({
        where: { id: loan.client.routeId },
        data: { availableCapital: { increment: amountNum } }
      });

      let isFullyPaid = false;
      if (newTotalPaid >= projectedTotal - 10) { 
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
      const installment = await tx.installment.findUnique({
        where: { id: parseInt(id) },
        include: { loan: { include: { client: true } } }
      });

      if (!installment) throw new Error("La cuota no existe.");

      const expected = Number(installment.expectedAmount);
      const totalPagadoHistorico = Number(installment.paidAmount || 0);
      const nuevoTotalPagado = Number((totalPagadoHistorico + amountNum).toFixed(2));

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

      let nuevoEstado = status; 
      const hasAction = actionParams && actionParams.action !== 'NONE' && actionParams.action !== 'MANTENER';

      if (hasAction) {
        const diffAmount = Number(actionParams.amount);

        // --- MANEJO DEL NUEVO ESTADO: RENEGOTIATED ---
        if (status === 'RENEGOTIATED') {
          await tx.installment.update({
            where: { id: parseInt(id) },
            data: {
              status: 'RENEGOTIATED',
              wasLate: true // La mancha para Datacrédito
            }
          });
        } else {
          // Liquidamos la cuota actual (Comportamiento original)
          await tx.installment.update({
            where: { id: parseInt(id) },
            data: {
              expectedAmount: nuevoTotalPagado,
              paidAmount: nuevoTotalPagado,
              status: 'PAID',
              paidAt: new Date()
            }
          });
        }
        
        nuevoEstado = status === 'RENEGOTIATED' ? 'RENEGOTIATED' : 'PAID';

        // Procesar cuotas futuras
        const futureInstallments = await tx.installment.findMany({
          where: {
            loanId: installment.loanId,
            installmentNumber: { gt: installment.installmentNumber },
            status: { notIn: ['PAID', 'RENEGOTIATED'] } // Evitamos tocar las ya pagadas/renegociadas
          },
          orderBy: { installmentNumber: 'asc' }
        });

        if (futureInstallments.length > 0) {
          if (actionParams.action === 'PROXIMA_CUOTA') {
            const target = futureInstallments[0];
            const nuevoValor = Number(target.expectedAmount) + diffAmount;
            await tx.installment.update({
              where: { id: target.id },
              data: { expectedAmount: Number(nuevoValor.toFixed(2)) }
            });
          } 
          else if (actionParams.action === 'DIFERIR') {
            const extraPorCuota = diffAmount / futureInstallments.length;
            const updatePromises = futureInstallments.map((inst: any) => {
              const nuevoValor = Number(inst.expectedAmount) + extraPorCuota;
              return tx.installment.update({
                where: { id: inst.id },
                data: { expectedAmount: Number(nuevoValor.toFixed(2)) }
              });
            });
            await Promise.all(updatePromises);
          }
          else if (actionParams.action === 'CUOTA_ESPECIFICA') {
            const targetNum = Number(actionParams.targetInstallment);
            const targetInst = futureInstallments.find((i: any) => i.installmentNumber === targetNum);
            
            if (targetInst) {
              const nuevoValor = Number(targetInst.expectedAmount) + diffAmount;
              await tx.installment.update({
                where: { id: targetInst.id },
                data: { expectedAmount: Number(nuevoValor.toFixed(2)) }
              });
            } else {
              const target = futureInstallments[0];
              const nuevoValor = Number(target.expectedAmount) + diffAmount;
              await tx.installment.update({
                where: { id: target.id },
                data: { expectedAmount: Number(nuevoValor.toFixed(2)) }
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
                const nuevoValor = metaFutura - saldoAFavor;
                await tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: Number(nuevoValor.toFixed(2)) }
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
                const nuevoValor = metaFutura - saldoAFavor;
                await tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: Number(nuevoValor.toFixed(2)) }
                });
                saldoAFavor = 0;
              }
            }
          } 
          else if (actionParams.action === 'REDUCE_QUOTA') {
            const rebajaPorCuota = diffAmount / futureInstallments.length;
            const updatePromises = futureInstallments.map((inst: any) => {
              const metaFutura = Number(inst.expectedAmount);
              const decrementoReal = Math.min(metaFutura, rebajaPorCuota);
              const nuevoEsperado = metaFutura - decrementoReal;

              if (nuevoEsperado <= 0.01) { 
                return tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: 0, status: 'PAID', paidAt: new Date() }
                });
              } else {
                return tx.installment.update({
                  where: { id: inst.id },
                  data: { expectedAmount: Number(nuevoEsperado.toFixed(2)) }
                });
              }
            });
            await Promise.all(updatePromises);
          }
        }

        if (actionParams.action === 'CUOTA_EXTRA') {
            const loanInfo = await tx.loan.findUnique({ where: { id: installment.loanId } });
            
            const allInst = await tx.installment.findMany({
                where: { loanId: installment.loanId },
                orderBy: { installmentNumber: 'desc' },
                take: 1
            });
            const lastInst = allInst[0];

            let newDate = new Date(lastInst.dueDate);
            if (loanInfo?.periodicity === 'MENSUAL') {
                newDate.setMonth(newDate.getMonth() + 1);
            } else if (loanInfo?.periodicity === 'QUINCENAL') {
                newDate.setDate(newDate.getDate() + 15);
            } else {
                newDate.setDate(newDate.getDate() + 1); // Diario
            }

            await tx.installment.create({
                data: {
                    loanId: installment.loanId,
                    installmentNumber: lastInst.installmentNumber + 1,
                    dueDate: newDate,
                    expectedAmount: Number(diffAmount.toFixed(2)),
                    paidAmount: 0,
                    status: 'PENDING'
                }
            });
        }
      } else {
        // --- MANEJO DE LA PROMESA DE PAGO ---
        let promiseDateObj = null;
        if (actionParams && actionParams.promiseDate) {
            const [year, month, day] = actionParams.promiseDate.split('-');
            promiseDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
        }

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
            paidAt: nuevoEstado === 'PAID' ? new Date() : null,
            wasLate: status === 'OVERDUE' ? true : undefined,
            promiseDate: promiseDateObj
          }
        });
      }

      // ---> 4. CERRAR EL PRÉSTAMO AUTOMÁTICAMENTE <---
      const todasLasCuotas = await tx.installment.findMany({
        where: { loanId: installment.loanId, status: { notIn: ['PAID', 'RENEGOTIATED'] } }
      });

      if (todasLasCuotas.length === 0 || (todasLasCuotas.length === 1 && todasLasCuotas[0].id === parseInt(id) && (nuevoEstado === 'PAID' || nuevoEstado === 'RENEGOTIATED'))) {
        const quedanPendientes = await tx.installment.count({
            where: { loanId: installment.loanId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }
        });
        
        if (quedanPendientes === 0 && nuevoEstado !== 'RENEGOTIATED') {
            await tx.loan.update({
                where: { id: installment.loanId },
                data: { isActive: false }
            });
        }
      }

      return { success: true };
    }, {
      maxWait: 5000,
      timeout: 20000 
    });

    res.json({ success: true, installment: result });
  } catch (error: any) {
    console.error("Error al actualizar cuota:", error);
    res.status(400).json({ error: "Error al procesar la gestión." });
  }
};



export const consultarDatacredito = async (req: any, res: any) => {
  try {
    const { documentId } = req.params;

    if (!documentId) return res.status(400).json({ error: "Debe proveer un documento" });

    // Blindaje: Quitamos cualquier espacio en blanco al inicio o al final
    const cleanDocumentId = documentId.trim();

    const client = await prisma.client.findFirst({ // Cambiamos a findFirst por si quedaron duplicados viejos
      where: { documentId: cleanDocumentId },
      include: {
        loans: {
          select: {
            isActive: true,
            installmentDetails: {
              select: { wasLate: true }
            }
          }
        }
      }
    });

    if (!client) {
      return res.json({ success: true, exists: false });
    }

    let fallasTotales = 0;
    let prestamosActivos = 0;
    let prestamosCancelados = 0;

    client.loans.forEach((loan: any) => {
      if (loan.isActive) prestamosActivos++;
      else prestamosCancelados++;

      loan.installmentDetails.forEach((inst: any) => {
        if (inst.wasLate) fallasTotales++;
      });
    });

    return res.json({
      success: true,
      exists: true,
      data: {
        name: client.name,
        phone: client.phone,
        fallasTotales,
        prestamosActivos,
        prestamosCancelados
      }
    });

  } catch (error: any) {
    console.error("Error en Datacredito:", error);
    return res.status(500).json({ error: "Error al consultar historial." });
  }
};

/**
 * OBTENER TODOS LOS CLIENTES DE UNA RUTA (Para el Popup de Reutilizar Cliente)
 */
export const getClientsByRoute = async (req: any, res: any) => {
  try {
    const { routeId } = req.params;
    const clients = await prisma.client.findMany({
      where: { routeId: parseInt(routeId) },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: clients });
  } catch (error) {
    return res.status(500).json({ error: "Error al obtener clientes de la ruta." });
  }
};

/**
 * AGREGAR UN NUEVO PRÉSTAMO A UN CLIENTE EXISTENTE
 */
export const addLoanToExistingClient = async (req: any, res: any) => {
  try {
    const { clientId } = req.params;
    const { amount, installments, interestRate, periodicity, firstPaymentDate } = req.body;

    const amountNum = parseFloat(amount);
    const interestNum = parseFloat(interestRate);
    const installmentsNum = parseInt(installments);

    let daysPerInstallment = 1; 
    if (periodicity === 'QUINCENAL') daysPerInstallment = 15;
    if (periodicity === 'MENSUAL') daysPerInstallment = 30;

    const [year, month, day] = firstPaymentDate.split('-');
    const firstPayment = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const diffTime = firstPayment.getTime() - today.getTime();
    let daysUntilFirstPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilFirstPayment <= 0) daysUntilFirstPayment = 1;

    const totalDays = daysUntilFirstPayment + ((installmentsNum - 1) * daysPerInstallment);
    const interestPerDay = (interestNum / 100 / 30) * amountNum;
    const totalInterest = interestPerDay * totalDays;
    
    const projectedTotal = amountNum + totalInterest;
    const installmentValue = projectedTotal / installmentsNum;

    const installmentsArray: any[] = [];
    let currentDate = new Date(firstPayment);

    for (let i = 1; i <= installmentsNum; i++) {
      installmentsArray.push({
        installmentNumber: i,
        dueDate: new Date(currentDate),
        expectedAmount: Number(installmentValue.toFixed(2)),
        paidAmount: 0,
        status: "PENDING",
      });

      if (periodicity === 'MENSUAL') currentDate.setMonth(currentDate.getMonth() + 1);
      else if (periodicity === 'QUINCENAL') currentDate.setDate(currentDate.getDate() + 15);
      else currentDate.setDate(currentDate.getDate() + 1);
    }

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: parseInt(clientId) } });
      if (!client) throw new Error("El cliente no existe.");

      const route = await tx.route.findUnique({ where: { id: client.routeId } });
      if (Number(route?.availableCapital) < amountNum) throw new Error("Capital insuficiente en esta ruta.");

      const newLoan = await tx.loan.create({
        data: {
          clientId: client.id,
          amount: amountNum,
          installments: installmentsNum,
          interestRate: interestNum,
          periodicity: periodicity,
          firstPaymentDate: firstPayment,
          projectedTotal: Number(projectedTotal.toFixed(2)),
          installmentDetails: { create: installmentsArray }
        }
      });

      await tx.route.update({
        where: { id: client.routeId },
        data: { availableCapital: { decrement: amountNum } }
      });

      return newLoan;
    });

    return res.status(201).json({ success: true, message: "Préstamo agregado", data: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Error interno" });
  }
};