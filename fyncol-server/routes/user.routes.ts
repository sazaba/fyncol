import { Router } from 'express';
import { createUser, getUsers, updateUser, deleteUser } from '../controllers/user.controller';

const router = Router();

// Rutas base: /api/users
router.post('/', createUser);          // Crear
router.get('/', getUsers);             // Leer todos
router.put('/:id', updateUser);        // Actualizar uno específico
router.delete('/:id', deleteUser);     // Desactivar uno específico

export default router;