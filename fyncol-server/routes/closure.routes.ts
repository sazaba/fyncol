import { Router } from 'express';
import { getClosureSummary, confirmDailyClosure, getAllClosures, getClosureDetails } from '../controllers/closure.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Aplicar el middleware a TODAS las rutas de este módulo
router.use(verifyToken);

router.get('/summary', getClosureSummary);
router.post('/confirm', confirmDailyClosure);
router.get('/history', getAllClosures);
router.get('/history/:id/details', getClosureDetails);

export default router;