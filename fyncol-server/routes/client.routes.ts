import { Router } from 'express';
import { 
  createClientAndLoan, 
  getCarteraDelCobrador, 
  registrarPago 
} from '../controllers/client.controller';
import { verifyToken } from '../middleware/auth.middleware'; 

const router = Router();

// ==========================================
// RUTAS DE GESTIÓN DE CLIENTES Y CRÉDITOS
// Todas estas rutas están protegidas (requieren sesión activa)
// ==========================================

// 1. Crear un cliente nuevo y asignarle su primer préstamo
router.post('/create', verifyToken, createClientAndLoan); 

// 2. Obtener todos los clientes con préstamos activos de la ruta del cobrador actual
router.get('/cartera', verifyToken, getCarteraDelCobrador);

// 3. Registrar un abono a un préstamo específico
router.post('/pago', verifyToken, registrarPago);

export default router;