import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

/**
 * 1. OBTENER SOLICITUDES PENDIENTES (PANEL ADMIN)
 */
export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    if (req.user?.role !== "ADMIN" && req.user?.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Acceso denegado. Requiere privilegios de administrador." });
    }

    const requests = await prisma.loanRequest.findMany({
      where: {
        status: "PENDING",
        route: { companyId }
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
 * 2. APROBAR SOLICITUD DE CRÉDITO (CON AJUSTES)
 */
export const approveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ error: "Acceso denegado." });

    const requestId = parseInt(req.params.id as string);

    // CAPTURAMOS AJUSTES OPCIONALES DESDE EL FRONTEND
    const { adjustedAmount, adjustedInstallments, adjustedInterestRate } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const loanRequest = await tx.loanRequest.findFirst({
        where: { id: requestId, route: { companyId } },
        include: { route: true, client: true }
      });

      if (!loanRequest) throw new Error("Solicitud no encontrada o no autorizada.");
      if (loanRequest.status !== "PENDING") throw new Error("Esta solicitud ya fue procesada.");

      // USAMOS VALOR AJUSTADO O EL ORIGINAL DE LA SOLICITUD
      const amountNum = adjustedAmount ? Number(adjustedAmount) : Number(loanRequest.amount);
      const interestNum = adjustedInterestRate ? Number(adjustedInterestRate) : Number(loanRequest.interestRate);
      const installmentsNum = adjustedInstallments ? Number(adjustedInstallments) : loanRequest.installments;

      if (Number(loanRequest.route.availableCapital) < amountNum) {
        throw new Error(`La ruta no tiene capital suficiente. Disponible: ${loanRequest.route.availableCapital}`);
      }

      // MATEMÁTICA FINANCIERA RECALCULADA
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

      const pastLoansCount = await tx.loan.count({ where: { clientId: loanRequest.clientId } });
      const isRenewal = pastLoansCount > 0;

      await tx.loanRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      });

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

      await tx.route.update({
        where: { id: loanRequest.routeId },
        data: { availableCapital: { decrement: amountNum } }
      });

      return newLoan;
    });

    return res.status(200).json({ success: true, message: "Préstamo aprobado con éxito.", data: result });

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

    if (!loanRequest || loanRequest.status !== "PENDING") {
      return res.status(404).json({ error: "Solicitud no encontrada o ya procesada." });
    }

    const updatedRequest = await prisma.loanRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });

    return res.status(200).json({ success: true, message: "Solicitud rechazada.", data: updatedRequest });

  } catch (error: any) {
    console.error("Error al rechazar solicitud:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};