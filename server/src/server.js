// server/src/server.js
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes           = require('./routes/authRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const citasRoutes          = require('./routes/citasRoutes');
const medicosRoutes        = require('./routes/medicosRoutes');
const historiasRoutes      = require('./routes/historiasRoutes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Rutas de autenticación
app.use('/auth', authRoutes);

// Rutas de recursos
app.use('/especialidades', especialidadesRoutes);
app.use('/citas',          citasRoutes);
app.use('/historias',      historiasRoutes);

// /medicos para admin (CRUD)
// /medico  para el médico autenticado (agenda, franjas, perfil)
// Se usa el mismo router — las rutas internas distinguen con middleware
app.use('/medicos', medicosRoutes);
app.use('/medico',  medicosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor MELIKA en http://localhost:${PORT}`);
});