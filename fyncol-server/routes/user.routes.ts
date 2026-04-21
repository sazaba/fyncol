import { Router } from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,       
  hardDeleteUser,   
  toggleActiveUser,
  updateLocation
} from "../controllers/user.controller";

import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyToken);

// Rastreo GPS (Debe ir arriba para que no colisione con /:id)
router.patch("/location", updateLocation);

// Rutas base: /api/users
router.post("/", createUser);
router.get("/", getUsers);
router.put("/:id", updateUser);
router.patch("/:id/active", toggleActiveUser);
router.delete("/:id", deleteUser);
router.delete("/:id/hard", hardDeleteUser);

export default router;