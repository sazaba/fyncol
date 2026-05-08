import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware"; 

const prisma = new PrismaClient();

export const getCapitalByRoute = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({ success: false, message: "Acceso denegado: No tienes empresa asignada." });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const companyId = req.user.companyId;

    const routes = await prisma.route.findMany({
      where: { companyId }, 
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
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({ success: false, message: "Acceso denegado." });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const companyId = req.user.companyId;
    const adminId = req.user.id;
    const { routeId, amount, description } = req.body;

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
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({ success: false, message: "Acceso denegado." });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const companyId = req.user.companyId;
    const adminId = req.user.id;
    const { routeId, amount, description } = req.body;

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

// ==========================================
// MÓDULO DE SOLICITUD DE GASTOS
// ==========================================

// 1. Cobrador solicita un gasto (Queda en PENDING)
export const requestExpense = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.companyId || !req.user.id) {
      return res.status(403).json({ success: false, message: "Acceso denegado." });
    }

    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { amount, description } = req.body;

    if (!amount || amount <= 0 || !description) {
      return res.status(400).json({ success: false, message: "Monto válido y rubro son requeridos." });
    }

    const route = await prisma.route.findFirst({ 
      where: { assignedToId: userId, companyId } 
    });
    
    if (!route) {
      return res.status(404).json({ success: false, message: "No tienes una ruta asignada para solicitar gastos." });
    }

    // Ya no descontamos el capital aquí, solo creamos la solicitud
    const expenseRequest = await prisma.expenseRequest.create({
      data: {
        amount,
        description: `Gastos: ${description}`, 
        status: "PENDING",
        routeId: route.id,
        requestedById: userId
      }
    });

    return res.status(200).json({
      success: true,
      message: "Tu solicitud ha sido enviada al administrador para aprobación.",
      data: expenseRequest 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al solicitar gasto", error: error.message });
  }
};

// 2. Admin ve las solicitudes pendientes
export const getPendingExpenses = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPERADMIN") return res.status(403).json({ success: false, message: "Requiere rol ADMIN." });

    const companyId = req.user.companyId;

    const pendingRequests = await prisma.expenseRequest.findMany({
      where: {
        status: "PENDING",
        route: { companyId }
      },
      include: {
        route: { select: { id: true, city: true, availableCapital: true, maxLoanPerClient: true } },
        requestedBy: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({ success: true, data: pendingRequests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al obtener solicitudes de gasto", error: error.message });
  }
};

// 3. Admin APRUEBA el gasto (Aquí es donde se descuenta la plata)
export const approveExpense = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPERADMIN") return res.status(403).json({ success: false, message: "Requiere rol ADMIN." });

    const companyId = req.user.companyId;
    const adminId = req.user.id;
    const expenseId = Number(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const expenseRequest = await tx.expenseRequest.findFirst({
        where: { id: expenseId, route: { companyId } },
        include: { route: true }
      });

      if (!expenseRequest) throw new Error("Solicitud no encontrada.");
      if (expenseRequest.status !== "PENDING") throw new Error("Esta solicitud ya fue procesada.");

      if (Number(expenseRequest.route.availableCapital) < Number(expenseRequest.amount)) {
        throw new Error(`La ruta no tiene fondos suficientes. Disponible: $${Number(expenseRequest.route.availableCapital).toLocaleString('es-CO')}`);
      }

      // Cambiar a aprobado
      await tx.expenseRequest.update({
        where: { id: expenseId },
        data: { status: "APPROVED" }
      });

      // Descontar la plata de la caja de la ruta
      await tx.route.update({
        where: { id: expenseRequest.routeId },
        data: { availableCapital: { decrement: expenseRequest.amount } }
      });

      // Crear el registro de contabilidad real
      const transaction = await tx.capitalTransaction.create({
        data: {
          routeId: expenseRequest.routeId,
          type: "GASTO",
          amount: expenseRequest.amount,
          description: expenseRequest.description,
          createdBy: adminId // El Admin autorizó y ejecutó esto
        }
      });

      return transaction;
    });

    return res.status(200).json({ success: true, message: "Gasto aprobado y descontado del capital.", data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Error al aprobar el gasto" });
  }
};

// 4. Admin RECHAZA el gasto
export const rejectExpense = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPERADMIN") return res.status(403).json({ success: false, message: "Requiere rol ADMIN." });

    const companyId = req.user.companyId;
    const expenseId = Number(req.params.id);

    const expenseRequest = await prisma.expenseRequest.findFirst({
      where: { id: expenseId, route: { companyId } }
    });

    if (!expenseRequest) return res.status(404).json({ success: false, message: "Solicitud no encontrada." });
    if (expenseRequest.status !== "PENDING") return res.status(400).json({ success: false, message: "Esta solicitud ya fue procesada." });

    const updatedRequest = await prisma.expenseRequest.update({
      where: { id: expenseId },
      data: { status: "REJECTED" }
    });

    return res.status(200).json({ success: true, message: "Gasto rechazado correctamente.", data: updatedRequest });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Error al rechazar el gasto", error: error.message });
  }
};

// ==========================================
// MÓDULO DE HISTORIAL Y AUDITORÍA
// ==========================================

export const getRouteCapitalHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({ success: false, message: "Acceso denegado." });
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPERADMIN") {
      return res.status(403).json({ success: false, message: "Acceso denegado. Requiere rol ADMIN." });
    }

    const companyId = req.user.companyId;
    const routeId = Number(req.params.routeId);

    if (!routeId) {
      return res.status(400).json({ success: false, message: "ID de ruta inválido." });
    }

    // Validar que la ruta le pertenezca a la empresa del Admin
    const route = await prisma.route.findFirst({
      where: { id: routeId, companyId }
    });

    if (!route) {
      return res.status(404).json({ success: false, message: "Ruta no encontrada o no autorizada." });
    }

    // Extraer todo el historial de transacciones de capital ordenado por fecha (más reciente primero)
    const history = await prisma.capitalTransaction.findMany({
      where: { routeId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ 
      success: true, 
      data: history 
    });

  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      message: "Error al obtener el historial de capital", 
      error: error.message 
    });
  }
};