import { Router } from 'express';
import { 
  getCapitalByRoute, 
  addCapital, 
  withdrawCapital, 
  requestExpense, 
  getPendingExpenses, 
  approveExpense, 
  rejectExpense 
} from '../controllers/capital.controller';
import { verifyToken } from '../middleware/auth.middleware'; 

const router = Router();

// Protege todas las rutas exigiendo un token válido.
// La restricción exclusiva para el rol ADMIN se maneja dentro de cada controlador.
router.use(verifyToken);

// Rutas de inyección de capital (Admin)
router.get('/', getCapitalByRoute);
router.post('/invest', addCapital);
router.post('/withdraw', withdrawCapital);

// Rutas de Gastos Operativos (Aprobación)
router.post("/expense/request", requestExpense); // Cobrador pide
router.get("/expense/pending", getPendingExpenses); // Admin mira
router.post("/expense/:id/approve", approveExpense); // Admin aprueba
router.post("/expense/:id/reject", rejectExpense); // Admin rechaza

export default router;