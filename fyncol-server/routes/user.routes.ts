import { Router } from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,       
  hardDeleteUser,   
  toggleActiveUser, 
} from "../controllers/user.controller";

// 1. Importar el middleware de autenticación
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// 2. Aplicar el middleware a todas las rutas de este módulo
router.use(verifyToken);

// Rutas base: /api/users
router.post("/", createUser);
router.get("/", getUsers);
router.put("/:id", updateUser);

// Activar/Desactivar (toggle explícito)
router.patch("/:id/active", toggleActiveUser);

// Soft delete (desactiva)
router.delete("/:id", deleteUser);

// Hard delete (borra de BD)
router.delete("/:id/hard", hardDeleteUser);

export default router;