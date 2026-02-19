import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ==========================================
// 1. CREAR USUARIO (Create)
// ==========================================
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, document, address, phone, role, email } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { document }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "El correo o documento ya están registrados." 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(document, salt);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, document, address, phone, role },
      select: { id: true, name: true, email: true, document: true, role: true, isActive: true }
    });

    res.status(201).json({ success: true, message: "Usuario creado", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al crear usuario" });
  }
};

// ==========================================
// 2. OBTENER USUARIOS (Read)
// ==========================================
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      // Excluimos la contraseña por seguridad
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' } // Los más nuevos primero
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al obtener usuarios" });
  }
};

// ==========================================
// 3. ACTUALIZAR USUARIO (Update)
// ==========================================
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, document, address, phone, role, email, isActive } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { name, document, address, phone, role, email, isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    res.status(200).json({ success: true, message: "Usuario actualizado", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al actualizar usuario" });
  }
};

// ==========================================
// 4. ELIMINAR USUARIO (Delete / Soft Delete)
// ==========================================
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // En lugar de borrarlo, lo desactivamos (Soft Delete)
    const deactivatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true }
    });

    res.status(200).json({ success: true, message: "Usuario desactivado", user: deactivatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al desactivar usuario" });
  }
};