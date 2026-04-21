import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// ==========================================
// 1. CREAR USUARIO (Create)
// ==========================================
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(403).json({ success: false, message: "Acceso denegado: No tienes empresa asignada." });
    }

    const { name, document, address, phone, role, email, imageUrl, password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "La contraseña es obligatoria." });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { document }] },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: "El correo o documento ya están registrados." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { 
        name, email, password: hashedPassword, document, address, phone, role,
        imageUrl: imageUrl || null,
        companyId 
      },
      select: { id: true, name: true, email: true, document: true, role: true, isActive: true, imageUrl: true }
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
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });

    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true, name: true, email: true, document: true, phone: true, address: true,
        role: true, isActive: true, imageUrl: true, createdAt: true,
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
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });

    const { name, document, address, phone, role, email, isActive, imageUrl, password } = req.body;

    const userExists = await prisma.user.findFirst({
      where: { id: Number(id), companyId }
    });

    if (!userExists) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado o no autorizado." });
    }

    const dataToUpdate: any = { name, document, address, phone, role, email, isActive, imageUrl };

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true, isActive: true, imageUrl: true }
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
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });

    const userExists = await prisma.user.findFirst({
      where: { id: Number(id), companyId }
    });
    if (!userExists) return res.status(404).json({ success: false, message: "Usuario no autorizado." });

    const hasRoute = await prisma.route.findFirst({
      where: { assignedToId: Number(id), companyId }
    });

    if (hasRoute) {
      return res.status(400).json({ success: false, message: `No se puede desactivar: El usuario administra la Ruta ${hasRoute.id}. Reasígnala primero.` });
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
export const toggleActiveUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive debe ser boolean (true/false)." });
    }

    const userExists = await prisma.user.findFirst({
      where: { id: Number(id), companyId }
    });
    if (!userExists) return res.status(404).json({ success: false, message: "Usuario no autorizado." });

    if (isActive === false) {
      const hasRoute = await prisma.route.findFirst({
        where: { assignedToId: Number(id), companyId } 
      });

      if (hasRoute) {
        return res.status(400).json({ success: false, message: `No se puede desactivar: El usuario administra la Ruta ${hasRoute.id}. Reasígnala primero.` });
      }
    }

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive },
      select: { id: true, name: true, isActive: true },
    });

    return res.status(200).json({ success: true, message: isActive ? "Usuario activado" : "Usuario desactivado", user: updated });
  } catch (error) {
    console.error("Error en toggleActiveUser:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar estado" });
  }
};

// ==========================================
// 6. BORRAR REAL (Hard Delete)
// ==========================================
export const hardDeleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: "Acceso denegado." });

    const userExists = await prisma.user.findFirst({
      where: { id: Number(id), companyId }
    });
    if (!userExists) return res.status(404).json({ success: false, message: "Usuario no autorizado." });

    const hasRoute = await prisma.route.findFirst({
      where: { assignedToId: Number(id), companyId } 
    });

    if (hasRoute) {
      return res.status(400).json({ success: false, message: `No se puede eliminar: El usuario administra la Ruta ${hasRoute.id}. Reasígnala primero.` });
    }

    const deleted = await prisma.user.delete({
      where: { id: Number(id) },
      select: { id: true, name: true },
    });

    return res.status(200).json({ success: true, message: "Usuario eliminado definitivamente", user: deleted });
  } catch (error) {
    console.error("Error en hardDeleteUser:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar definitivamente" });
  }
};

// ==========================================
// 7. ACTUALIZAR GPS EN TIEMPO REAL
// ==========================================
export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { latitude, longitude } = req.body;

    if (!userId || !latitude || !longitude) {
      res.status(400).json({ error: "Datos de ubicación incompletos" });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdate: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error actualizando GPS:", error);
    res.status(500).json({ error: "Error interno al actualizar GPS" });
  }
};