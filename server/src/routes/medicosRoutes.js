// server/src/routes/medicosRoutes.js
// MELIKA — Rutas de médicos
// Monta en /medicos (admin) y en /medico (médico autenticado)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const { verifyToken, isAdmin, isMedico } = require('../middleware/authMiddleware');

const {
  crearMedico,
  activarCuenta,
  listarMedicos,
  actualizarMedico,
  toggleEstadoMedico,
  perfilMedico,
  agendaMedico,
  agendaRango,
  crearFranja,
  listarFranjas,
  editarFranja,
  eliminarFranja,
} = require('../controllers/medicosController');

// gestionarCita vive en historiasController (centralizado junto al resto
// de lógica clínica), pero se expone bajo /medico para que el dashboard
// del médico pueda consumirlo sin prefijo /historias.
const { gestionarCita } = require('../controllers/historiasController');

// ── Pública — no requiere token ────────────────────────────────────────────
// El médico activa su cuenta con el token de invitación que le envió el admin
router.post('/activar', activarCuenta);

// ── Admin — requieren token + rol admin ───────────────────────────────────
router.get('/',             verifyToken, isAdmin, listarMedicos);
router.post('/',            verifyToken, isAdmin, crearMedico);
router.put('/:id',          verifyToken, isAdmin, actualizarMedico);
router.patch('/:id/estado', verifyToken, isAdmin, toggleEstadoMedico);

// ── Médico autenticado ─────────────────────────────────────────────────────

// Perfil propio
router.get('/perfil', verifyToken, isMedico, perfilMedico);

// Agenda diaria y rango (FullCalendar)
// ⚠️ CRÍTICO: las rutas estáticas van SIEMPRE antes de las rutas con :id
router.get('/agenda/rango', verifyToken, isMedico, agendaRango);
router.get('/agenda',       verifyToken, isMedico, agendaMedico);

// ── Gestión de resultado de una cita ─────────────────────────────────────
// El DashboardMedico llama: PATCH /medico/citas/:id/gestionar
// con body { estado: 'completada' | 'no_asistio', notas_medicas: '...' }
router.patch('/citas/:id/gestionar', verifyToken, isMedico, gestionarCita);

// Franjas de disponibilidad
// ⚠️ CRÍTICO: /franjas (sin :id) ANTES de /franjas/:id
router.get('/franjas',        verifyToken, isMedico, listarFranjas);
router.post('/franjas',       verifyToken, isMedico, crearFranja);
router.patch('/franjas/:id',  verifyToken, isMedico, editarFranja);
router.delete('/franjas/:id', verifyToken, isMedico, eliminarFranja);

module.exports = router;