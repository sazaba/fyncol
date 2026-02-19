import { Router } from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,       // soft delete (desactivar)
  hardDeleteUser,   // hard delete (borrar real)
  toggleActiveUser, // activar/desactivar
} from "../controllers/user.controller";

const router = Router();

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
