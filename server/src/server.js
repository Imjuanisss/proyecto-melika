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

// ── CORS ─────────────────────────────────────────────────────────────────
// Orígenes permitidos:
//   - localhost / 127.0.0.1 → desarrollo local con Vite
//   - el dominio de producción del frontend en Railway
//
// FRONTEND_URL se define como variable de entorno en Railway (en el
// servicio del backend), apuntando a la URL pública del frontend.
// Así, si el dominio cambia en el futuro, solo se actualiza la variable
// de entorno y no hay que tocar ni redeployar código.
const origenesPermitidos = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL, // p. ej. https://melika-frontend-production.up.railway.app
].filter(Boolean); // quita undefined si la variable no está definida

app.use(cors({
  origin(origin, callback) {
    // Permite peticiones sin "origin" (curl, health checks de Railway, etc.)
    if (!origin || origenesPermitidos.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// ── Estado del Servidor (Verificación Raíz) ────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Servidor MELIKA funcionando correctamente"
  });
});

// ── Autenticación ──────────────────────────────────────────────────────────
app.use('/auth', authRoutes);

// ── Rutas admin (requieren token + rol admin) ──────────────────────────────
app.use('/admin', adminRoutes);

// ── Recursos principales ───────────────────────────────────────────────────
app.use('/especialidades',  especialidadesRoutes);
app.use('/citas',           citasRoutes);
app.use('/historias',       historiasRoutes);
app.use('/medicamentos',    medicamentosRoutes);

// ── Médicos ────────────────────────────────────────────────────────────────
// /medicos  → admin (CRUD de médicos)
// /medico   → médico autenticado (perfil, agenda, franjas)
// Se usa el mismo router — las rutas internas distinguen con middleware
app.use('/medicos', medicosRoutes);
app.use('/medico',  medicosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor MELIKA listo y escuchando en el puerto ${PORT}`);
});