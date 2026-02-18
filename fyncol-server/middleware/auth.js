// fyncol-server/middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fyncol_secret_key';

module.exports = (req, res, next) => {
  // 1. Leer el header "Authorization"
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: 'Acceso denegado. No hay token.' });
  }

  try {
    // 2. Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Guardamos los datos del usuario en la petición
    next(); // Dejamos pasar al siguiente controlador
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
};