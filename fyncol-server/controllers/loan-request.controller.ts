// fyncol-server/controllers/loan-request.controller.ts
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

/**
 * 1. OBTENER SOLICITUDES PENDIENTES (PANEL ADMIN)
 * Lista todas las solicitudes de crédito que superaron el tope en las rutas de esta empresa.
 */
export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    // Solo ADMIN o SUPERADMIN deberían ver este panel
    if (req.user?.role !== "ADMIN" && req.user?.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Acceso denegado. Requiere privilegios de administrador." });
    }

    const requests = await prisma.loanRequest.findMany({
      where: {
        status: "PENDING",
        route: { companyId } // BLINDAJE SAAS
      },
      include: {
        client: {
          select: { name: true, documentId: true, address: true, phone: true }
        },
        route: {
          select: { id: true, city: true, availableCapital: true, currency: true, maxLoanPerClient: true }
        },
        requestedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: requests });
  } catch (error: any) {
    console.error("Error al obtener solicitudes:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * 2. APROBAR SOLICITUD DE CRÉDITO
 * Crea el Loan, genera la tabla de amortización y descuenta el capital.
 */
export const approveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const requestId = parseInt(req.params.id as string);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar la solicitud y validar
      const loanRequest = await tx.loanRequest.findFirst({
        where: { id: requestId, route: { companyId } },
        include: { route: true, client: true }
      });

      if (!loanRequest) throw new Error("Solicitud no encontrada o no autorizada.");
      if (loanRequest.status !== "PENDING") throw new Error("Esta solicitud ya fue procesada.");

      const amountNum = Number(loanRequest.amount);

      // 2. Validar que la ruta siga teniendo capital suficiente
      if (Number(loanRequest.route.availableCapital) < amountNum) {
        throw new Error(`La ruta no tiene capital suficiente. Disponible: ${loanRequest.route.availableCapital}`);
      }

      // 3. REPLICA DE MATEMÁTICA FINANCIERA (Igual que en client.controller)
      const interestNum = Number(loanRequest.interestRate);
      const installmentsNum = loanRequest.installments;

      let daysPerInstallment = 1; 
      if (loanRequest.periodicity === 'QUINCENAL') daysPerInstallment = 15;
      if (loanRequest.periodicity === 'MENSUAL') daysPerInstallment = 30;

      const firstPayment = new Date(loanRequest.firstPaymentDate);
      firstPayment.setHours(12, 0, 0, 0);

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

        if (loanRequest.periodicity === 'MENSUAL') currentDate.setMonth(currentDate.getMonth() + 1);
        else if (loanRequest.periodicity === 'QUINCENAL') currentDate.setDate(currentDate.getDate() + 15);
        else currentDate.setDate(currentDate.getDate() + 1);
      }

      // 4. Verificar si es renovación o crédito nuevo
      const pastLoansCount = await tx.loan.count({ where: { clientId: loanRequest.clientId } });
      const isRenewal = pastLoansCount > 0;

      // 5. MARCAR SOLICITUD COMO APROBADA
      await tx.loanRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      });

      // 6. CREAR EL PRÉSTAMO REAL
      const newLoan = await tx.loan.create({
        data: {
          clientId: loanRequest.clientId,
          amount: amountNum,
          installments: installmentsNum,
          interestRate: interestNum,
          periodicity: loanRequest.periodicity,
          firstPaymentDate: firstPayment,
          projectedTotal: projectedTotal,
          isRenewal: isRenewal,
          installmentDetails: { create: installmentsArray }
        }
      });

      // 7. DESCONTAR CAPITAL DE LA RUTA
      await tx.route.update({
        where: { id: loanRequest.routeId },
        data: { availableCapital: { decrement: amountNum } }
      });

      return newLoan;
    });

    return res.status(200).json({ success: true, message: "Préstamo aprobado y capital asignado.", data: result });

  } catch (error: any) {
    console.error("Error al aprobar solicitud:", error);
    return res.status(400).json({ error: error.message || "Error al procesar la aprobación." });
  }
};

/**
 * 3. RECHAZAR SOLICITUD DE CRÉDITO
 */
export const rejectRequest = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const requestId = parseInt(req.params.id as string);

    const loanRequest = await prisma.loanRequest.findFirst({
      where: { id: requestId, route: { companyId } }
    });

    if (!loanRequest) {
      return res.status(404).json({ error: "Solicitud no encontrada o no autorizada." });
    }

    if (loanRequest.status !== "PENDING") {
      return res.status(400).json({ error: "Esta solicitud ya fue procesada anteriormente." });
    }

    const updatedRequest = await prisma.loanRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });

    return res.status(200).json({ success: true, message: "Solicitud rechazada correctamente.", data: updatedRequest });

  } catch (error: any) {
    console.error("Error al rechazar solicitud:", error);
    return res.status(500).json({ error: "Error interno al rechazar la solicitud." });
  }
};