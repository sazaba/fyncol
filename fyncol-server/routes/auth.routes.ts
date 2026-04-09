import { Router } from 'express';
import { login, getMe, registerTenant } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Rutas Públicas
router.post('/login', login);
router.post('/register', registerTenant);

// Rutas Protegidas
router.get('/me', verifyToken, getMe);

export default router;