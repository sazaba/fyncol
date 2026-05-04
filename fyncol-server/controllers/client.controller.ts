import { Response } from "express";
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from "../middleware/auth.middleware";

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
export const createClientAndLoan = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; 
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const {
      name, documentId, phone, address, latitude, longitude, documentUrl, routeId,
      amount, installments, interestRate, periodicity, firstPaymentDate
    } = req.body;

    if (!name || !address || !routeId || !amount || !installments || !interestRate || !periodicity || !firstPaymentDate) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const cleanDocumentId = documentId.trim();
    const routeIdInt = parseInt(routeId as string);

    // ==========================================
    // LOGICA DE RENOVACIÓN Y RUTAS EXTERNAS
    // ==========================================
    
    // 1. Buscar si la cédula ya existe en cualquier ruta de LA EMPRESA
    const existingClients = await prisma.client.findMany({
      where: { 
        documentId: cleanDocumentId,
        route: { companyId } 
      },
      include: { loans: { where: { isActive: true } } }
    });

    // 2. Separar si existe en la ruta actual o en otras
    const clientSameRoute = existingClients.find(c => c.routeId === routeIdInt);
    
    // 3. Contar deudas en otras oficinas para la alerta (Punto 4)
    const activeLoansOtherRoutes = existingClients
      .filter(c => c.routeId !== routeIdInt)
      .reduce((sum, c) => sum + c.loans.length, 0);

    // 4. Bloqueo si tiene deuda en LA MISMA ruta (Punto 3)
    if (clientSameRoute && clientSameRoute.loans.length > 0) {
      return res.status(400).json({ 
        errorType: "ACTIVE_DEBT",
        error: "Este cliente ya está en tu ruta y tiene una deuda activa. Debe saldarla para poder prestarle de nuevo." 
      });
    }

    // ==========================================
    // CÁLCULOS MATEMÁTICOS (Sin cambios)
    // ==========================================
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
    
    const exactProjectedTotal = amountNum + totalInterest;
    const installmentValue = Math.ceil(exactProjectedTotal / installmentsNum);
    const projectedTotal = installmentValue * installmentsNum; 

    const installmentsArray: any[] = [];
    let currentDate = new Date(firstPayment);

    for (let i = 1; i <= installmentsNum; i++) {
      installmentsArray.push({
        installmentNumber: i,
        dueDate: new Date(currentDate),
        expectedAmount: installmentValue,
        paidAmount: 0,
        status: "PENDING",
      });

      if (periodicity === 'MENSUAL') currentDate.setMonth(currentDate.getMonth() + 1);
      else if (periodicity === 'QUINCENAL') currentDate.setDate(currentDate.getDate() + 15);
      else currentDate.setDate(currentDate.getDate() + 1);
    }

    // ==========================================
    // TRANSACCIÓN DE BASE DE DATOS
    // ==========================================
    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findFirst({ where: { id: routeIdInt, companyId } });
      if (!route) throw new Error("La ruta especificada no existe o no estás autorizado");
      if (Number(route.availableCapital) < amountNum) throw new Error("Capital insuficiente en esta ruta");

      let processedClient;

      if (clientSameRoute) {
        // ES RENOVACIÓN (Punto 2): Actualizamos datos del cliente y metemos el Loan nuevo
        processedClient = await tx.client.update({
          where: { id: clientSameRoute.id },
          data: {
            name, phone, address, latitude, longitude,
            documentUrl: documentUrl || clientSameRoute.documentUrl, // Mantiene la foto si no envían una nueva
            loans: {
              create: {
                amount: amountNum, installments: installmentsNum, interestRate: interestNum,
                periodicity: periodicity, firstPaymentDate: firstPayment, projectedTotal: projectedTotal,
                isRenewal: true, // Marca importante
                installmentDetails: { create: installmentsArray }
              }
            }
          },
          include: { loans: { include: { installmentDetails: true } } }
        });
      } else {
        // ES CLIENTE NUEVO PARA ESTA RUTA
        processedClient = await tx.client.create({
          data: {
            name, documentId: cleanDocumentId, phone, address, latitude, longitude, documentUrl, routeId: routeIdInt,
            loans: {
              create: {
                amount: amountNum, installments: installmentsNum, interestRate: interestNum,
                periodicity: periodicity, firstPaymentDate: firstPayment, projectedTotal: projectedTotal,
                isRenewal: false,
                installmentDetails: { create: installmentsArray }
              }
            }
          },
          include: { loans: { include: { installmentDetails: true } } } 
        });
      }

      await tx.route.update({
        where: { id: routeIdInt },
        data: { availableCapital: { decrement: amountNum } }
      });

      return processedClient;
    }, { maxWait: 5000, timeout: 20000 });

    return res.status(201).json({
      message: clientSameRoute ? "Crédito renovado exitosamente" : "Cliente y préstamo creados exitosamente",
      otherActiveLoansCount: activeLoansOtherRoutes, // Pasamos este dato al frontend
      data: result
    });

  } catch (error: any) {
    console.error("Error al crear/renovar cliente:", error);
    return res.status(400).json({ error: error.message || "Error interno del servidor" });
  }
};

/**
 * 2. OBTENER CARTERA DEL COBRADOR
 */
export const getCarteraDelCobrador = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    const userId = req.user?.id;
    if (!companyId || !userId) return res.status(403).json({ error: "Acceso denegado." });

    const route = await prisma.route.findFirst({
      where: { 
        assignedToId: userId, 
        companyId // SAAS-BLINDAJE
      }
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
export const registrarPago = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const { loanId, amount } = req.body;
    const amountNum = parseFloat(amount);

    if (!loanId || amountNum <= 0) {
      return res.status(400).json({ error: "Datos de pago inválidos" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findFirst({ // SAAS-BLINDAJE: findFirst en lugar de findUnique
        where: { 
          id: parseInt(loanId as string),
          client: { route: { companyId } } // SAAS-BLINDAJE
        },
        include: { payments: true, client: true }
      });

      if (!loan || !loan.isActive) {
        throw new Error("El préstamo no existe, no estás autorizado o ya está cancelado.");
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
export const updateInstallmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const id = req.params.id as string; // CORRECCIÓN TIPADO TS
    const { status, paidAmount, actionParams } = req.body;
    const amountNum = parseFloat(paidAmount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.installment.findFirst({ // SAAS-BLINDAJE
        where: { 
          id: parseInt(id),
          loan: { client: { route: { companyId } } } // SAAS-BLINDAJE
        },
        include: { loan: { include: { client: true } } }
      });

      if (!installment) throw new Error("La cuota no existe o no estás autorizado.");

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
      
      // --- CAPTURAMOS LA DESCRIPCIÓN DEL FRONTEND ---
      const descripcionFrontend = actionParams?.description || null;

      if (hasAction) {
        const diffAmount = Number(actionParams.amount);

        // --- CORRECCIÓN CRÍTICA DE DUPLICACIÓN DE DEUDA ---
        await tx.installment.update({
          where: { id: parseInt(id) },
          data: {
            expectedAmount: nuevoTotalPagado, 
            paidAmount: nuevoTotalPagado,
            status: status === 'RENEGOTIATED' ? 'RENEGOTIATED' : 'PAID',
            paidAt: status === 'RENEGOTIATED' ? null : new Date(),
            wasLate: status === 'RENEGOTIATED' ? true : undefined,
            actionDescription: descripcionFrontend // Guardar nota
          }
        });
        
        nuevoEstado = status === 'RENEGOTIATED' ? 'RENEGOTIATED' : 'PAID';

        // Procesar cuotas futuras
        const futureInstallments = await tx.installment.findMany({
          where: {
            loanId: installment.loanId,
            installmentNumber: { gt: installment.installmentNumber },
            status: { notIn: ['PAID', 'RENEGOTIATED'] } 
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
          else if (actionParams.action === 'ABONO_CUOTA_ESPECIFICA') {
            const targetNum = Number(actionParams.targetInstallment);
            const targetInst = futureInstallments.find((i: any) => i.installmentNumber === targetNum);
            
            if (targetInst) {
              const metaFutura = Number(targetInst.expectedAmount);
              const nuevoValor = Math.max(0, metaFutura - diffAmount); 
              await tx.installment.update({
                where: { id: targetInst.id },
                data: { 
                    expectedAmount: Number(nuevoValor.toFixed(2)),
                    status: nuevoValor === 0 ? 'PAID' : targetInst.status,
                    paidAt: nuevoValor === 0 ? new Date() : null
                }
              });
            }
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
        // --- MANEJO DE LA PROMESA DE PAGO Y ABONOS PARCIALES SIN ACCIÓN ---
        let promiseDateObj = null;
        if (actionParams && actionParams.promiseDate) {
            const [year, month, day] = actionParams.promiseDate.split('-');
            promiseDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
        }

        if (status === 'PAID' || nuevoTotalPagado >= expected) {
          nuevoEstado = 'PAID';
        } else if (nuevoTotalPagado > 0 && status !== 'OVERDUE' && status !== 'RENEGOTIATED') {
          nuevoEstado = 'PARTIAL';
        }

        await tx.installment.update({
          where: { id: parseInt(id) },
          data: {
            status: nuevoEstado,
            paidAmount: nuevoTotalPagado,
            paidAt: nuevoEstado === 'PAID' ? new Date() : null,
            wasLate: (status === 'OVERDUE' || status === 'RENEGOTIATED') ? true : undefined,
            promiseDate: promiseDateObj,
            actionDescription: descripcionFrontend // Guardar nota
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

/**
 * 5. BURÓ INTERNO (MODIFICADO PARA BÚSQUEDA GLOBAL)
 */
/**
 * 5. BURÓ INTERNO (ACTUALIZADO PARA MULTI-RUTA)
 */
export const consultarDatacredito = async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.documentId as string;

    if (!documentId) return res.status(400).json({ error: "Debe proveer un documento" });
    const cleanDocumentId = documentId.trim();

    // CAMBIO CLAVE: Usamos findMany para traer el cliente de TODAS las rutas donde exista
    const clients = await prisma.client.findMany({ 
      where: { 
        documentId: cleanDocumentId
      },
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

    // Si el array está vacío, el cliente no existe en ninguna ruta
    if (clients.length === 0) {
      return res.json({ success: true, exists: false });
    }

    let fallasTotales = 0;
    let prestamosActivos = 0;
    let prestamosCancelados = 0;

    // Iteramos sobre CADA registro del cliente que encontramos en las distintas oficinas
    clients.forEach((clientRecord) => {
      clientRecord.loans.forEach((loan: any) => {
        if (loan.isActive) prestamosActivos++;
        else prestamosCancelados++;

        loan.installmentDetails.forEach((inst: any) => {
          if (inst.wasLate) fallasTotales++;
        });
      });
    });

    // Tomamos el nombre y teléfono del primer registro que encontramos (asumiendo que son los mismos)
    const primerRegistro = clients[0];

    return res.json({
      success: true,
      exists: true,
      data: {
        name: primerRegistro.name,
        phone: primerRegistro.phone,
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
 * 6. LIQUIDAR DEUDA TOTAL
 * Cancela todas las cuotas pendientes de un préstamo en una sola transacción.
 */
/**
 * 6. LIQUIDAR DEUDA TOTAL
 * Cancela todas las cuotas pendientes de un préstamo en una sola transacción.
 */
export const liquidarPrestamo = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; 
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    // Aseguramos el tipado correcto de loanId
    const loanId = parseInt(req.params.loanId as string);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findFirst({
        where: { 
          id: loanId, 
          client: { route: { companyId } } 
        },
        include: { client: true, installmentDetails: true }
      });

      if (!loan || !loan.isActive) throw new Error("Préstamo no existe o ya está cancelado.");

      // Filtrar las cuotas que aún tienen saldo pendiente
      const cuotasPendientes = loan.installmentDetails.filter(
        inst => inst.status !== 'PAID' && (Number(inst.expectedAmount) - Number(inst.paidAmount || 0)) > 0
      );

      if (cuotasPendientes.length === 0) throw new Error("No hay cuotas con saldo pendiente.");

      // Calcular la deuda total exacta
      const deudaTotal = cuotasPendientes.reduce((sum, inst) => {
        return sum + (Number(inst.expectedAmount) - Number(inst.paidAmount || 0));
      }, 0);

      // 1. Crear el recibo de pago por el total
      await tx.payment.create({
        data: {
          amount: deudaTotal,
          loanId: loan.id
        }
      });

      // 2. Ingresar el capital a la ruta
      await tx.route.update({
        where: { id: loan.client.routeId },
        data: { availableCapital: { increment: deudaTotal } }
      });

      // 3. Pagar todas las cuotas pendientes (Secuencialmente para no saturar Prisma)
      for (const inst of cuotasPendientes) {
        await tx.installment.update({
          where: { id: inst.id },
          data: {
            paidAmount: inst.expectedAmount,
            status: 'PAID',
            paidAt: new Date(),
            actionDescription: "Liquidación total anticipada de la deuda."
          }
        });
      }

      // 4. Cerrar el préstamo
      await tx.loan.update({
        where: { id: loan.id },
        data: { isActive: false }
      });

      return { success: true, liquidado: deudaTotal };
    }, {
      // Configuraciones de timeout para evitar el error de "Transaction closed"
      maxWait: 5000, 
      timeout: 20000 
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error al liquidar:", error);
    res.status(400).json({ error: error.message || "Error interno al liquidar" });
  }
};



/**
 * OBTENER TODOS LOS CLIENTES DE UNA RUTA (Para el Popup de Reutilizar Cliente)
 */
export const getClientsByRoute = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const routeId = req.params.routeId as string; 
    
    const clients = await prisma.client.findMany({
      where: { 
        routeId: parseInt(routeId),
        route: { companyId } // SAAS-BLINDAJE
      },
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
export const addLoanToExistingClient = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const clientId = req.params.clientId as string; 
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
      const client = await tx.client.findFirst({ 
        where: { 
          id: parseInt(clientId),
          route: { companyId } // SAAS-BLINDAJE
        } 
      });
      if (!client) throw new Error("El cliente no existe o no autorizado.");

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
          isRenewal: true,
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

export const getCapitalByRoute = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado: No tienes empresa asignada." });

    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const routes = await prisma.route.findMany({
      where: { companyId }, // SAAS-BLINDAJE: Solo las rutas de la empresa
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { id: "asc" }
    });

    return res.status(200).json({ success: true, data: routes });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al obtener capital de rutas", error: error.message });
  }
};

export const addCapital = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });

    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const { routeId, amount, description } = req.body;
    const adminId = req.user.id;

    if (!routeId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Ruta y monto válido (mayor a 0) son requeridos." });
    }

    const route = await prisma.route.findFirst({ 
      where: { id: Number(routeId), companyId } 
    });
    
    if (!route) {
      return res.status(404).json({ success: false, message: "La ruta especificada no existe o no te pertenece." });
    }

    const result = await prisma.$transaction([
      prisma.route.update({
        where: { id: Number(routeId) },
        data: { availableCapital: { increment: amount } }
      }),
      prisma.capitalTransaction.create({
        data: {
          routeId: Number(routeId),
          type: "INVERSION",
          amount: amount,
          description: description || "Inversión de capital",
          createdBy: adminId
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: "Capital asignado correctamente.",
      data: result[0] 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al asignar capital", error: error.message });
  }
};

export const withdrawCapital = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId; // SAAS-BLINDAJE
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });

    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const { routeId, amount, description } = req.body;
    const adminId = req.user.id;

    if (!routeId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Ruta y monto válido (mayor a 0) son requeridos." });
    }

    const route = await prisma.route.findFirst({ 
      where: { id: Number(routeId), companyId } 
    });
    
    if (!route) {
      return res.status(404).json({ success: false, message: "La ruta especificada no existe o no te pertenece." });
    }

    if (Number(route.availableCapital) < Number(amount)) {
      return res.status(400).json({ 
        success: false, 
        message: `Fondos insuficientes. Capital disponible: ${route.availableCapital} ${route.currency}` 
      });
    }

    const result = await prisma.$transaction([
      prisma.route.update({
        where: { id: Number(routeId) },
        data: { availableCapital: { decrement: amount } }
      }),
      prisma.capitalTransaction.create({
        data: {
          routeId: Number(routeId),
          type: "RETIRO",
          amount: amount,
          description: description || "Retiro de capital",
          createdBy: adminId
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: "Retiro realizado correctamente.",
      data: result[0] 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al retirar capital", error: error.message });
  }
};