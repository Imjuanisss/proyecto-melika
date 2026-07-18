// server/src/app.js
// Se separa la definición de la app Express (testable con Supertest)
// del arranque del servidor (app.listen), que vive en server.js.
// Esto es EL ÚNICO cambio estructural necesario para poder testear:
// no se toca ninguna lógica de negocio, rutas ni controladores.

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes           = require('./routes/authRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const citasRoutes          = require('./routes/citasRoutes');
const medicosRoutes        = require('./routes/medicosRoutes');
const historiasRoutes      = require('./routes/historiasRoutes');
const medicamentosRoutes   = require('./routes/medicamentosRoutes');
const adminRoutes          = require('./routes/adminRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Servidor MELIKA funcionando correctamente"
  });
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/especialidades',  especialidadesRoutes);
app.use('/citas',           citasRoutes);
app.use('/historias',       historiasRoutes);
app.use('/medicamentos',    medicamentosRoutes);
app.use('/medicos', medicosRoutes);
app.use('/medico',  medicosRoutes);

module.exports = app;