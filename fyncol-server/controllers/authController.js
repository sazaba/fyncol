// fyncol-server/controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fyncol_secret_key';

// 1. LOGIN (Ya lo tenías)
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      token,
      user: { name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

// 2. GET USER DATA (Nueva función para el Dashboard)
// Esta función se llamará cuando entres al Dashboard para validar que el token sirve
// y devolverte los datos actualizados.
exports.getMe = async (req, res) => {
  try {
    // req.user viene del middleware (el token decodificado)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true } // No devolvemos el password
    });

    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // AQUÍ puedes agregar los datos "dummy" del dashboard o futuras consultas a BD
    const stats = {
      ingresos: "$12.4M",
      citas: 8,
      cartera: "$2.1M",
      pacientes: 14
    };

    res.json({
      success: true,
      user,
      stats // Enviamos las estadísticas junto con el usuario
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener datos' });
  }
};