// fyncol-server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Definir la ruta POST /login
router.post('/login', authController.login);

module.exports = router;