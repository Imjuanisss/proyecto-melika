// server/src/routes/medicosRoutes.js

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
  eliminarFranja,
  gestionarCita,          // ← nueva función de gestión profesional
} = require('../controllers/medicosController');

// ── Pública — activar cuenta médico (no requiere token) ────────────────
router.post('/activar', activarCuenta);

// ── Admin — CRUD de médicos ────────────────────────────────────────────
router.get('/',             verifyToken, isAdmin, listarMedicos);
router.post('/',            verifyToken, isAdmin, crearMedico);
router.put('/:id',          verifyToken, isAdmin, actualizarMedico);
router.patch('/:id/estado', verifyToken, isAdmin, toggleEstadoMedico);

// ── Médico autenticado — perfil, agenda, franjas ───────────────────────
router.get('/perfil',        verifyToken, isMedico, perfilMedico);
router.get('/agenda',        verifyToken, isMedico, agendaMedico);
router.get('/agenda/rango',  verifyToken, isMedico, agendaRango);
router.post('/franjas',      verifyToken, isMedico, crearFranja);
router.get('/franjas',       verifyToken, isMedico, listarFranjas);
router.delete('/franjas/:id',verifyToken, isMedico, eliminarFranja);

// ── Médico autenticado — gestión de estado de sus citas ────────────────
// NOTA: La ruta usa /medico/ (no /medicos/) porque en server.js
// app.use('/medico', medicosRoutes) apunta a este mismo router.
// El médico llama a: PATCH /medico/citas/:id/gestionar
router.patch('/citas/:id/gestionar', verifyToken, isMedico, gestionarCita);

module.exports = router;