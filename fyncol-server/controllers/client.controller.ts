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
 */
export const createClientAndLoan = async (req: any, res: any) => {
  try {
    const {
      name, address, latitude, longitude, documentUrl, routeId,
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = firstPaymentDate.split('-');
    const firstPayment = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    firstPayment.setHours(0, 0, 0, 0);

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

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({ where: { id: routeIdInt } });
      
      if (!route) throw new Error("La ruta especificada no existe");
      if (Number(route.availableCapital) < amountNum) throw new Error("Capital insuficiente en esta ruta");

      const newClient = await tx.client.create({
        data: {
          name, address, latitude: latitude ? parseFloat(latitude) : null,
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
 * 3. REGISTRAR PAGO (ABONO)
 * Registra el dinero recibido, lo suma al capital de la ruta y cierra el crédito si ya se pagó todo
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
// Actualizar el estado de una cuota específica (Amortización Dinámica)
export const updateInstallmentStatus = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, paidAmount } = req.body;
    const amountNum = parseFloat(paidAmount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la cuota y la info de su préstamo
      const installment = await tx.installment.findUnique({
        where: { id: parseInt(id) },
        include: { loan: { include: { client: true } } }
      });

      if (!installment) throw new Error("La cuota no existe.");

      // 2. Actualizar el estado de la cuota
      const updatedInstallment = await tx.installment.update({
        where: { id: parseInt(id) },
        data: {
          status, // PAID, PARTIAL, OVERDUE
          paidAmount: amountNum,
          paidAt: status === 'PAID' ? new Date() : null
        }
      });

      // 3. ¡SOLUCIÓN!: Registrar el movimiento en la tabla "payments"
      if (amountNum > 0 && (status === 'PAID' || status === 'PARTIAL')) {
        await tx.payment.create({
          data: {
            amount: amountNum,
            loanId: installment.loanId // Se vincula al préstamo correspondiente
          }
        });

        // 4. Devolver el capital a la ruta del cobrador
        await tx.route.update({
          where: { id: installment.loan.client.routeId },
          data: { availableCapital: { increment: amountNum } }
        });
      }

      return updatedInstallment;
    });

    res.json({ success: true, installment: result });
  } catch (error: any) {
    console.error("Error al actualizar cuota:", error);
    res.status(400).json({ error: "Error al actualizar la cuota y registrar el pago." });
  }
};