const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión usando lo que pusiste en .env
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Mensaje para saber si conectó bien
pool.on('connect', () => {
  console.log('✅ Conectado a la Base de Datos PostgreSQL');
});

module.exports = pool;