const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes          = require('./routes/authRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const citasRoutes         = require('./routes/citasRoutes');
const medicosRoutes       = require('./routes/medicosRoutes');
const historiasRoutes     = require('./routes/historiasRoutes');
const medicamentosRoutes  = require('./routes/medicamentosRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();


app.get('/', (req, res) => {
  res.json({ status: "ok", message: "Servidor MELIKA funcionando correctamente" });
});

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// ── Autenticación ──────────────────────────────────────────────────────────
app.use('/auth', authRoutes);

// ── Rutas admin (requieren token + rol admin)
app.use('/admin', adminRoutes);

// ── Recursos principales ───────────────────────────────────────────────────
app.use('/especialidades',  especialidadesRoutes);
app.use('/citas',           citasRoutes);
app.use('/historias',       historiasRoutes);
app.use('/medicamentos',    medicamentosRoutes);

// ── Médicos:
//    /medicos  → admin (CRUD de médicos)
//    /medico   → médico autenticado (perfil, agenda, franjas)
//    Se usa el mismo router — las rutas internas distinguen con middleware
app.use('/medicos', medicosRoutes);
app.use('/medico',  medicosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor MELIKA listo y escuchando en el puerto ${PORT}`);
});
