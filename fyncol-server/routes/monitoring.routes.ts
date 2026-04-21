import { Router } from 'express';
import { getDashboardStats } from '../controllers/monitoring.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Aplicar el middleware a TODAS las rutas de monitoreo
router.use(verifyToken);

// Ruta: GET /api/monitoring/dashboard
router.get('/dashboard', getDashboardStats);

export default router;