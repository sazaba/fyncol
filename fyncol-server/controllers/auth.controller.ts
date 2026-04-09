import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fyncol_secret_key';

// ==========================================
// 1. INICIAR SESIÓN (LOGIN)
// ==========================================
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    // INCLUIMOS la empresa y SU SUSCRIPCIÓN para el Paywall
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { 
        company: {
          include: { subscription: true }
        } 
      } 
    });
    
    if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Tu cuenta está desactivada.' });
    }

    if (user.company && !user.company.isActive) {
      return res.status(403).json({ success: false, message: 'La cuenta de la empresa se encuentra suspendida.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        companyId: user.companyId 
      }, 
      JWT_SECRET, 
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: { 
        id: user.id,
        name: user.name, 
        email: user.email, 
        role: user.role,
        companyId: user.companyId, 
        imageUrl: user.imageUrl,
        // CRUCIAL: Enviamos el estado de la suscripción al frontend
        subscriptionStatus: user.company?.subscription?.status || null 
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

// ==========================================
// 2. VALIDAR SESIÓN (GET ME)
// ==========================================
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    // INCLUIMOS también la suscripción al recargar la página
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        company: {
          include: { subscription: true }
        }
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        imageUrl: user.imageUrl,
        // CRUCIAL: Enviamos el estado de la suscripción al frontend
        subscriptionStatus: user.company?.subscription?.status || null 
      },
      stats: { capital: "$12.4M", clientes: 145, cartera_activa: "$2.1M", mora: "12%" }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener datos' });
  }
};

// ==========================================
// 3. REGISTRO IN-APP (NUEVA EMPRESA + PRUEBA GRATIS)
// ==========================================
export const registerTenant = async (req: Request, res: Response): Promise<void> => {
  const { companyName, userName, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: "El correo ya está registrado." });
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Transacción Atómica de Prisma
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Empresa
      const newCompany = await tx.company.create({
        data: { name: companyName, isActive: true }
      });

      // 2. Crear Trial de 14 días
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const newSubscription = await tx.subscription.create({
        data: {
          plan: "BASIC", 
          status: "TRIAL",
          companyId: newCompany.id,
          endDate: trialEndDate
        }
      });

      // 3. Crear Usuario ADMIN
      const newUser = await tx.user.create({
        data: {
          name: userName,
          email: email,
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
          companyId: newCompany.id
        }
      });

      return { company: newCompany, user: newUser, subscription: newSubscription };
    });

    // Autologin inmediato
    const token = jwt.sign(
      { 
        id: result.user.id, 
        email: result.user.email, 
        role: result.user.role, 
        companyId: result.company.id 
      }, 
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.status(201).json({ 
      success: true, 
      message: "Empresa creada exitosamente.",
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.company.id,
        subscriptionStatus: result.subscription.status
      }
    });

  } catch (error) {
    console.error("Error en registro multitenant:", error);
    res.status(500).json({ success: false, message: "Error interno al procesar el registro." });
  }
};