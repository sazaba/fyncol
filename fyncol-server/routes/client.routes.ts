import { Router } from 'express';
import { createClientAndLoan } from '../controllers/client.controller';
// Si tienes un middleware para verificar el token (ej: verifyToken), impórtalo aquí.

const router = Router();

// Ruta POST para crear un cliente y su préstamo
// Te sugiero agregar tu middleware de autenticación antes de createClientAndLoan
router.post('/create', createClientAndLoan); 

export default router;