import { Router } from 'express';
import { getCapitalByRoute, addCapital, withdrawCapital } from '../controllers/capital.controller';
import { verifyToken } from '../middleware/auth.middleware'; // Importación corregida

const router = Router();

// Protege todas las rutas exigiendo un token válido.
// La restricción exclusiva para el rol ADMIN se maneja dentro de cada controlador.
router.use(verifyToken);

router.get('/', getCapitalByRoute);
router.post('/invest', addCapital);
router.post('/withdraw', withdrawCapital);

export default router;