require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client'); // Importamos Prisma
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient(); // Inicializamos el cliente
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fyncol_super_secret_key_2026';

app.use(cors());
app.use(express.json());

// Ruta Base
app.get('/', (req, res) => res.send('Fyncol API con Prisma 🚀'));

// --- RUTA DE LOGIN (Refactorizada con Prisma) ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar usuario con Prisma (mucho más legible que SQL)
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // Si no existe el usuario
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    // 2. Verificar contraseña (texto plano por ahora)
    if (password !== user.password) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }

    // 3. Crear Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Bienvenido',
      token,
      user: { name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// Prueba de BD con Prisma
app.get('/test-db', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ success: true, message: `Conexión exitosa. Hay ${userCount} usuarios.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});