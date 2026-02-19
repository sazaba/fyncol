// fyncol-server/controllers/user.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ==========================================
// 1. CREAR USUARIO (Create)
// ==========================================
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, document, address, phone, role, email, imageUrl } = req.body;

    // Validar si el correo o documento ya existen
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

    // Encriptar el documento para usarlo como contraseña inicial
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(document, salt);

    const newUser = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        document, 
        address, 
        phone, 
        role,
        imageUrl: imageUrl || null // Opcional por ahora
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        document: true, 
        role: true, 
        isActive: true,
        imageUrl: true 
      }
    });

    res.status(201).json({ success: true, message: "Usuario creado exitosamente", user: newUser });
  } catch (error) {
    console.error("Error en createUser:", error);
    res.status(500).json({ success: false, message: "Error al crear usuario" });
  }
};

// ==========================================
// 2. OBTENER USUARIOS (Read)
// ==========================================
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        imageUrl: true, // Importante para mostrar la foto en la tabla
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error en getUsers:", error);
    res.status(500).json({ success: false, message: "Error al obtener usuarios" });
  }
};

// ==========================================
// 3. ACTUALIZAR USUARIO (Update)
// ==========================================
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, document, address, phone, role, email, isActive, imageUrl } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { name, document, address, phone, role, email, isActive, imageUrl },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        isActive: true,
        imageUrl: true 
      }
    });

    res.status(200).json({ success: true, message: "Usuario actualizado", user: updatedUser });
  } catch (error) {
    console.error("Error en updateUser:", error);
    res.status(500).json({ success: false, message: "Error al actualizar usuario" });
  }
};

// ==========================================
// 4. ELIMINAR USUARIO (Delete / Soft Delete)
// ==========================================
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Aplicamos Soft Delete cambiando isActive a false
    const deactivatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true }
    });

    res.status(200).json({ success: true, message: "Usuario desactivado correctamente", user: deactivatedUser });
  } catch (error) {
    console.error("Error en deleteUser:", error);
    res.status(500).json({ success: false, message: "Error al desactivar usuario" });
  }
};

// ==========================================
// 5. ACTIVAR / DESACTIVAR (PATCH)
// ==========================================
export const toggleActiveUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive debe ser boolean (true/false).",
      });
    }

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive },
      select: { id: true, name: true, isActive: true },
    });

    return res.status(200).json({
      success: true,
      message: isActive ? "Usuario activado" : "Usuario desactivado",
      user: updated,
    });
  } catch (error) {
    console.error("Error en toggleActiveUser:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar estado del usuario" });
  }
};

// ==========================================
// 6. BORRAR REAL (Hard Delete)
// ==========================================
export const hardDeleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.user.delete({
      where: { id: Number(id) },
      select: { id: true, name: true },
    });

    return res.status(200).json({
      success: true,
      message: "Usuario eliminado definitivamente",
      user: deleted,
    });
  } catch (error) {
    console.error("Error en hardDeleteUser:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar definitivamente" });
  }
};
