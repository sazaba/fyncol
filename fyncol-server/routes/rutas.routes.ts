import { Router } from 'express';
import { crearRuta, obtenerRutas, reasignarRuta, eliminarRuta } from '../controllers/rutas.controller';
// 1. Importar el middleware
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// 2. Aplicar el middleware a todas las rutas de este bloque
router.use(verifyToken);

router.post('/', crearRuta);
router.get('/', obtenerRutas);
router.patch('/:id/reasignar', reasignarRuta);
router.delete('/:id', eliminarRuta); 

export default router;