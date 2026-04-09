import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fyncol_secret_key';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    // INCLUIMOS la información de la empresa en la consulta
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { company: true } 
    });
    
    if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Tu cuenta está desactivada.' });
    }

    // NUEVA VALIDACIÓN: Revisar si la empresa está inactiva (SaaS)
    if (user.company && !user.company.isActive) {
      return res.status(403).json({ success: false, message: 'La cuenta de la empresa se encuentra suspendida.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

    // AÑADIMOS companyId al token
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
        companyId: user.companyId, // El frontend necesitará saber el ID de la empresa
        imageUrl: user.imageUrl 
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    // Si req.user no existe por alguna razón, cortamos la ejecución
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        companyId: true, // Añadido
        imageUrl: true 
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({
      success: true,
      user,
      // CORREGIDO: Datos de prueba acordes a un sistema de cobros, no de clínicas médicas
      stats: { capital: "$12.4M", clientes: 145, cartera_activa: "$2.1M", mora: "12%" }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener datos' });
  }
};