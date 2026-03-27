import { Router } from 'express';
import { getClosureSummary, confirmDailyClosure, getAllClosures, getClosureDetails } from '../controllers/closure.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Rutas protegidas para el cobrador/administrador
router.get('/summary', verifyToken, getClosureSummary);
router.post('/confirm', verifyToken, confirmDailyClosure);
router.get('/history', verifyToken, getAllClosures);
router.get('/history/:id/details', verifyToken, getClosureDetails);

export default router;