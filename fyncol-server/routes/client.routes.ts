import { Router } from 'express';
import { 
  addLoanToExistingClient,
  consultarDatacredito,
  createClientAndLoan, 
  getCarteraDelCobrador, 
  getClientsByRoute, 
  registrarPago, updateInstallmentStatus 
} from '../controllers/client.controller';
import { verifyToken } from '../middleware/auth.middleware'; 

const router = Router();

// Aplicar el middleware a TODAS las rutas de este módulo
router.use(verifyToken);

router.post('/create', createClientAndLoan); 
router.get('/cartera', getCarteraDelCobrador);
router.post('/pago', registrarPago);
router.patch('/installment/:id', updateInstallmentStatus);
router.get('/route/:routeId', getClientsByRoute);
router.post('/:clientId/add-loan', addLoanToExistingClient);
router.get('/datacredito/:documentId', consultarDatacredito);

export default router;