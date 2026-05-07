import { Router } from 'express';
// Asegúrate de importar "actualizarRuta"
import { crearRuta, obtenerRutas, actualizarRuta, reasignarRuta, eliminarRuta, getMonitoreoHoy, getRoutesSummary } from '../controllers/rutas.controller';
// 1. Importar el middleware
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// 2. Aplicar el middleware a todas las rutas de este bloque
router.use(verifyToken);

router.get('/summary/all', getRoutesSummary);

router.post('/', crearRuta);
router.get('/', obtenerRutas);
router.get('/:id/monitoreo-hoy', getMonitoreoHoy);

// NUEVA RUTA PATCH: Para actualizar datos generales (como el tope)
router.patch('/:id', actualizarRuta);

router.patch('/:id/reasignar', reasignarRuta);
router.delete('/:id', eliminarRuta); 

export default router;