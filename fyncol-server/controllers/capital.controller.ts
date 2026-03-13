import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware"; // Asegúrate de que la ruta sea correcta

const prisma = new PrismaClient();

export const getCapitalByRoute = async (req: AuthRequest, res: Response) => {
  try {
    // Validación estricta de rol
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const routes = await prisma.route.findMany({
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
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const { routeId, amount, description } = req.body;
    const adminId = req.user.id;

    if (!routeId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Ruta y monto válido (mayor a 0) son requeridos." });
    }

    const route = await prisma.route.findUnique({ where: { id: Number(routeId) } });
    if (!route) {
      return res.status(404).json({ success: false, message: "La ruta especificada no existe." });
    }

    // Ejecutar actualización e inserción en una transacción atómica
    const result = await prisma.$transaction([
      prisma.route.update({
        where: { id: Number(routeId) },
        data: {
          availableCapital: {
            increment: amount
          }
        }
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
      data: result[0] // Retorna la ruta actualizada
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al asignar capital", error: error.message });
  }
};

export const withdrawCapital = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const { routeId, amount, description } = req.body;
    const adminId = req.user.id;

    if (!routeId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Ruta y monto válido (mayor a 0) son requeridos." });
    }

    const route = await prisma.route.findUnique({ where: { id: Number(routeId) } });
    if (!route) {
      return res.status(404).json({ success: false, message: "La ruta especificada no existe." });
    }

    // Verificar si hay fondos suficientes
    if (Number(route.availableCapital) < Number(amount)) {
      return res.status(400).json({ 
        success: false, 
        message: `Fondos insuficientes. Capital disponible: ${route.availableCapital} ${route.currency}` 
      });
    }

    // Ejecutar actualización e inserción en una transacción atómica
    const result = await prisma.$transaction([
      prisma.route.update({
        where: { id: Number(routeId) },
        data: {
          availableCapital: {
            decrement: amount
          }
        }
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
      data: result[0] // Retorna la ruta actualizada
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al retirar capital", error: error.message });
  }
};