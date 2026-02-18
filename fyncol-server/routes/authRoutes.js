// fyncol-server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth'); // El portero de seguridad

// Ruta Login (Pública)
router.post('/login', authController.login);

// Ruta Dashboard/Perfil (Protegida) -> Usa la misma controladora
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;