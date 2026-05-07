import { Router } from 'express';
import { getPendingRequests, approveRequest, rejectRequest } from '../controllers/loan-request.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Aplicar el middleware a TODAS las rutas de este módulo
router.use(verifyToken);

router.get('/pending', getPendingRequests);
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);

export default router;