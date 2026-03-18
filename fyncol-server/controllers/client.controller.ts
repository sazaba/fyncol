import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createClientAndLoan = async (req: any, res: any) => {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      documentUrl,
      routeId,
      amount,
      installments,
      interestRate,
      periodicity,
      firstPaymentDate // <--- 1. Recibimos la fecha del primer pago desde el frontend
    } = req.body;

    if (!name || !address || !routeId || !amount || !installments || !interestRate || !periodicity || !firstPaymentDate) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // --- LÓGICA MATEMÁTICA DEL PRÉSTAMO (PRORRATEO POR DÍAS EXACTOS) ---
    const amountNum = parseFloat(amount);
    const interestNum = parseFloat(interestRate);
    const installmentsNum = parseInt(installments);

    // 1. Definir cuántos días representa cada cuota según la periodicidad
    let daysPerInstallment = 1; // DIARIO por defecto
    if (periodicity === 'QUINCENAL') daysPerInstallment = 15;
    if (periodicity === 'MENSUAL') daysPerInstallment = 30;

    // 2. Calcular los días exactos hasta el primer pago
    // Igualamos las horas a cero (00:00:00) para calcular solo los días calendario
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parseamos el string "YYYY-MM-DD" asegurando la zona horaria local
    const [year, month, day] = firstPaymentDate.split('-');
    const firstPayment = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    firstPayment.setHours(0, 0, 0, 0);

    // Diferencia en milisegundos a días
    const diffTime = firstPayment.getTime() - today.getTime();
    let daysUntilFirstPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Por seguridad, si eligen una fecha pasada o si es hoy mismo, como mínimo cobramos 1 día
    if (daysUntilFirstPayment <= 0) daysUntilFirstPayment = 1;

    // 3. Calcular los días totales reales que durará el préstamo
    // Fórmula: Días hasta el 1er pago + (El resto de las cuotas * los días que dura cada cuota)
    const totalDays = daysUntilFirstPayment + ((installmentsNum - 1) * daysPerInstallment);

    // 4. Calcular el interés exacto por día (Interés mensual / 30 * Monto)
    const interestPerDay = (interestNum / 100 / 30) * amountNum;
    
    // 5. Calcular el Total Proyectado a Recoger
    const totalInterest = interestPerDay * totalDays;
    const projectedTotal = amountNum + totalInterest;

    // --- TRANSACCIÓN PRISMA ---
    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({ where: { id: parseInt(routeId) } });
      
      if (!route) {
        throw new Error("La ruta especificada no existe");
      }
      if (Number(route.availableCapital) < amountNum) {
        throw new Error("Capital insuficiente en esta ruta para realizar el préstamo");
      }

      const newClient = await tx.client.create({
        data: {
          name,
          address,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          documentUrl,
          routeId: parseInt(routeId),
          loans: {
            create: {
              amount: amountNum,
              installments: installmentsNum,
              interestRate: interestNum,
              periodicity: periodicity,
              firstPaymentDate: firstPayment, // <--- 2. Guardamos la fecha en la BD
              projectedTotal: projectedTotal,
            }
          }
        },
        include: { loans: true } 
      });

      // Descontar el capital prestado del capital disponible en la ruta
      await tx.route.update({
        where: { id: parseInt(routeId) },
        data: { availableCapital: { decrement: amountNum } }
      });

      return newClient;
    });

    return res.status(201).json({
      message: "Cliente y préstamo registrados exitosamente",
      data: result
    });

  } catch (error: any) {
    console.error("Error al crear cliente:", error);
    return res.status(400).json({ error: error.message || "Error interno del servidor" });
  }
};

export const getCarteraDelCobrador = async (req: any, res: any) => {
  try {
    const userId = req.user.id; // Viene del token

    // Buscar la ruta de este cobrador
    const route = await prisma.route.findFirst({
      where: { assignedToId: userId }
    });

    if (!route) {
      return res.status(404).json({ error: "No tienes una ruta asignada." });
    }

    // Traer los clientes de ESA ruta que tengan préstamos activos
    const clients = await prisma.client.findMany({
      where: { 
        routeId: route.id,
        loans: { some: { isActive: true } }
      },
      include: {
        loans: {
          where: { isActive: true },
          include: { payments: true } // Traemos el historial de pagos para sumar cuánto han pagado
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

// 2. Registrar un pago en un préstamo
export const registrarPago = async (req: any, res: any) => {
  try {
    const { loanId, amount } = req.body;
    const amountNum = parseFloat(amount);

    if (!loanId || amountNum <= 0) {
      return res.status(400).json({ error: "Datos de pago inválidos" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Obtener el préstamo actual y sus pagos
      const loan = await tx.loan.findUnique({
        where: { id: parseInt(loanId) },
        include: { payments: true, client: true }
      });

      if (!loan || !loan.isActive) {
        throw new Error("El préstamo no existe o ya está cancelado.");
      }

      // Sumar lo que ya ha pagado + este nuevo pago
      const totalPaidSoFar = loan.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const projectedTotal = Number(loan.projectedTotal);
      const newTotalPaid = totalPaidSoFar + amountNum;

      // 1. Crear el recibo de pago
      const newPayment = await tx.payment.create({
        data: {
          amount: amountNum,
          loanId: loan.id
        }
      });

      // 2. Devolver el dinero al bolsillo (Capital) de la ruta
      await tx.route.update({
        where: { id: loan.client.routeId },
        data: { availableCapital: { increment: amountNum } }
      });

      // 3. ¿El préstamo ya se pagó completo? Lo cerramos.
      let isFullyPaid = false;
      // Usamos un margen de 10 pesos por si hay un micro-descuadre de decimales
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