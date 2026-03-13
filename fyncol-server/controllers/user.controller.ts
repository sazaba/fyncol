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
    const { name, document, address, phone, role, email, imageUrl, password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: "La contraseña es obligatoria." 
      });
    }

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

    // Encriptar la contraseña recibida
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        document, 
        address, 
        phone, 
        role,
        imageUrl: imageUrl || null 
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
        imageUrl: true, 
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
    const { name, document, address, phone, role, email, isActive, imageUrl, password } = req.body;

    const dataToUpdate: any = { name, document, address, phone, role, email, isActive, imageUrl };

    // Si envían una contraseña nueva, la encriptamos y la agregamos a la actualización
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: dataToUpdate,
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

    // VALIDACIÓN CRÍTICA: Impedir borrar si tiene ruta asignada
    const hasRoute = await prisma.route.findFirst({
      where: { assignedToId: Number(id) }
    });

    if (hasRoute) {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede desactivar: El usuario administra la Ruta ${hasRoute.id}. Reasígnala primero.` 
      });
    }

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

    // VALIDACIÓN CRÍTICA: Impedir desactivar por toggle si tiene ruta asignada
    if (isActive === false) {
      const hasRoute = await prisma.route.findFirst({
        where: { assignedToId: Number(id) }
      });

      if (hasRoute) {
        return res.status(400).json({ 
          success: false, 
          message: `No se puede desactivar: El usuario administra la Ruta ${hasRoute.id}. Reasígnala primero.` 
        });
      }
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

    // VALIDACIÓN CRÍTICA: Impedir borrar definitivamente si tiene ruta asignada
    const hasRoute = await prisma.route.findFirst({
      where: { assignedToId: Number(id) }
    });

    if (hasRoute) {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede eliminar definitivamente: El usuario administra la Ruta ${hasRoute.id}. Reasígnala primero.` 
      });
    }

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