// fyncol-server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importamos las rutas
const authRoutes = require('./routes/authRoutes'); 
const userRoutes = require('./routes/userRoutes'); 

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors()); 
app.use(express.json()); 

// Rutas
app.use('/api/auth', authRoutes); 
app.use('/api/users', userRoutes);

// Ruta Base (Health Check)
app.get('/', (req, res) => res.send('Fyncol API con Prisma 🚀 - Online'));

// Iniciar Servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});