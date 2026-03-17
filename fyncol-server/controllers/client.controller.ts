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
      interestRate
    } = req.body;

    // 1. Validaciones básicas
    if (!name || !address || !routeId || !amount || !installments || !interestRate) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // 2. Calcular la métrica proyectada (Ej: 1000 + 20% = 1200)
    const amountNum = parseFloat(amount);
    const interestNum = parseFloat(interestRate);
    const projectedTotal = amountNum + (amountNum * (interestNum / 100));

    // 3. Transacción de Prisma: Todo se ejecuta o nada se guarda
    const result = await prisma.$transaction(async (tx) => {
      // Verificar el capital de la ruta
      const route = await tx.route.findUnique({ where: { id: parseInt(routeId) } });
      
      if (!route) {
        throw new Error("La ruta especificada no existe");
      }
      if (Number(route.availableCapital) < amountNum) {
        throw new Error("Capital insuficiente en esta ruta para realizar el préstamo");
      }

      // Crear Cliente y su Préstamo anidado
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
              installments: parseInt(installments),
              interestRate: interestNum,
              projectedTotal: projectedTotal,
            }
          }
        },
        include: { loans: true } // Devuelve los datos del préstamo creado
      });

      // Descontar el capital prestado del disponible en la ruta
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