import { Router } from 'express';
import { crearRuta, obtenerRutas, reasignarRuta } from '../controllers/rutas.controller';

const router = Router();

// Endpoint para crear una nueva ruta (POST /api/rutas)
router.post('/', crearRuta);

// Endpoint para listar todas las rutas (GET /api/rutas)
router.get('/', obtenerRutas);

// Endpoint para reasignar el colaborador de una ruta (PATCH /api/rutas/:id/reasignar)
router.patch('/:id/reasignar', reasignarRuta);

export default router;