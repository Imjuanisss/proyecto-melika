const express = require('express');
const router = express.Router();
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
  completarCita,
} = require('../controllers/medicosController');

// ── Públicas (no requieren token) ──────────────────────
router.post('/activar', activarCuenta);     // el médico activa su cuenta

// ── Admin ──────────────────────────────────────────────
router.get('/', verifyToken, isAdmin, listarMedicos);
router.post('/', verifyToken, isAdmin, crearMedico);
router.put('/:id', verifyToken, isAdmin, actualizarMedico);
router.patch('/:id/estado', verifyToken, isAdmin, toggleEstadoMedico);

// ── Médico autenticado ─────────────────────────────────
router.get('/perfil', verifyToken, isMedico, perfilMedico);
router.get('/agenda', verifyToken, isMedico, agendaMedico);
router.get('/agenda/rango', verifyToken, isMedico, agendaRango);
router.post('/franjas', verifyToken, isMedico, crearFranja);
router.get('/franjas', verifyToken, isMedico, listarFranjas);
router.delete('/franjas/:id', verifyToken, isMedico, eliminarFranja);
router.patch('/citas/:id/completar', verifyToken, isMedico, completarCita);

module.exports = router;