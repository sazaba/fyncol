import { Router } from 'express';
import { getClosureSummary, confirmDailyClosure } from '../controllers/closure.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Rutas protegidas para el cobrador/administrador
router.get('/summary', verifyToken, getClosureSummary);
router.post('/confirm', verifyToken, confirmDailyClosure);

export default router;