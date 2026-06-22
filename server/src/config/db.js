const { Pool } = require('pg');

// 1. Forzamos la lectura del .env directamente en este archivo
require('dotenv').config();

const pool = new Pool({
  // 2. Le decimos: "Usa el .env, pero si falla, usa este texto directamente"
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'melika_db', // Cambia esto si tu BD se llama diferente
  password: process.env.DB_PASSWORD || '123456', // Reemplaza esto con tu contraseña de pgAdmin
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente de la base de datos', err);
  process.exit(-1);
});

module.exports = pool;