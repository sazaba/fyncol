import { Router } from 'express';
import { crearRuta, obtenerRutas, reasignarRuta, eliminarRuta } from '../controllers/rutas.controller';

const router = Router();

router.post('/', crearRuta);
router.get('/', obtenerRutas);
router.patch('/:id/reasignar', reasignarRuta);
router.delete('/:id', eliminarRuta); 

export default router;