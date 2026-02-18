// fyncol-server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes'); // Importamos las rutas de autenticación

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend
app.use(express.json()); // Parsea el body de las peticiones a JSON

// Rutas
app.use('/api/auth', authRoutes); // Prefijo para todas las rutas de autenticación (ej: /api/auth/login)

// Ruta Base (Health Check)
app.get('/', (req, res) => res.send('Fyncol API con Prisma 🚀 - Online'));

// Iniciar Servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});