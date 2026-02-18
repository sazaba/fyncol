// fyncol-server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Usamos la versión con promesas (async/await)

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración del Pool de Conexiones (Más eficiente que una sola conexión)
const pool = mysql.createPool({
  host: process.env.DB_HOST,       // IP o Dominio de Hostinger
  user: process.env.DB_USER,       // Usuario de Hostinger
  password: process.env.DB_PASSWORD, // Contraseña
  database: process.env.DB_NAME,   // Nombre de la base de datos
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Fyncol (MySQL Hostinger) funcionando 🚀');
});

// Ruta para probar la conexión a la Base de Datos
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() as tiempo_servidor');
    res.json({ 
      success: true, 
      mensaje: "¡Conexión exitosa con Hostinger!", 
      tiempo: rows[0].tiempo_servidor 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});