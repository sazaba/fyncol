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
      periodicity // NUEVO: Recibimos la periodicidad
    } = req.body;

    if (!name || !address || !routeId || !amount || !installments || !interestRate || !periodicity) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // --- LÓGICA MATEMÁTICA DEL PRÉSTAMO ---
    const amountNum = parseFloat(amount);
    const interestNum = parseFloat(interestRate);
    const installmentsNum = parseInt(installments);

    // 1. Definir cuántos días representa cada cuota
    let daysPerInstallment = 1; // DIARIO por defecto
    if (periodicity === 'QUINCENAL') daysPerInstallment = 15;
    if (periodicity === 'MENSUAL') daysPerInstallment = 30;

    // 2. Calcular el interés exacto por día (Interés mensual / 30 * Monto)
    const interestPerDay = (interestNum / 100 / 30) * amountNum;
    
    // 3. Calcular los días totales que durará el préstamo
    const totalDays = installmentsNum * daysPerInstallment;
    
    // 4. Calcular el Total Proyectado a Recoger
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
              periodicity: periodicity, // Guardamos la periodicidad
              projectedTotal: projectedTotal,
            }
          }
        },
        include: { loans: true } 
      });

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