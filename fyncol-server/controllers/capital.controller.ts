import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware"; 

const prisma = new PrismaClient();

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

    // SAAS-BLINDAJE: Cambiamos findUnique por findFirst para poder validar el companyId
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

    // SAAS-BLINDAJE
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