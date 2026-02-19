// fyncol-server/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware'; // Ajustado el nombre del archivo

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fyncol_secret_key';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

    // Verificamos si el usuario está activo antes de dejarlo entrar
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      token,
      user: { 
        name: user.name, 
        email: user.email, 
        role: user.role,
        imageUrl: user.imageUrl // Incluimos la imagen en el login
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    // req.user.id viene del middleware verifyToken
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        imageUrl: true // Agregado para el perfil del Dashboard
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({
      success: true,
      user,
      stats: { ingresos: "$12.4M", citas: 8, cartera: "$2.1M", pacientes: 14 }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener datos' });
  }
};