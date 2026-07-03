// server/src/routes/historiasRoutes.js
// MELIKA — Rutas del módulo de Historias Clínicas y Documentos Clínicos
// Montado en /historias desde server.js
//
// REGLA CRÍTICA DE ORDEN:
//   Las rutas con segmentos estáticos (/paciente/:id, /documentos/...)
//   SIEMPRE van ANTES de la ruta dinámica genérica (/:id).
//   Si /:id se registra primero, Express lo capturará como parámetro dinámico
//   y nunca llegará a las rutas estáticas definidas después.

'use strict';

const express = require('express');
const router  = express.Router();

const { verifyToken, isMedico, isPaciente } = require('../middleware/authMiddleware');

const {
  // Historias
  crearHistoria,
  actualizarHistoria,
  obtenerHistoria,
  obtenerHistoriaCompleta,
  historialPaciente,
  gestionarCita,
  // Documentos clínicos
  listarDocumentosClinicos,
  registrarDocumentoClinco,
  ocultarDocumentoExterno,
  obtenerDocumentoClinco,
} = require('../controllers/historiasController');

// ─── RUTAS DE HISTORIAS CLÍNICAS ──────────────────────────────────────────────

// GET /historias/paciente/:id_paciente
router.get('/paciente/:id_paciente', verifyToken, historialPaciente);

// GET /historias/cita/:id_cita
router.get('/cita/:id_cita', verifyToken, obtenerHistoria);

// POST /historias — crear historia principal
router.post('/', verifyToken, isMedico, crearHistoria);

// GET /historias/:id/completa
router.get('/:id/completa', verifyToken, obtenerHistoriaCompleta);

// ⚠️ FIX CRÍTICO: el front llama POST /historias/:id/aclaracion
// (FormularioAclaracion.jsx y ModalHistoriaClinica.jsx) pero esta ruta
// NUNCA existía — solo existía PUT /historias/:id. Esto provocaba un 404
// silencioso cada vez que un médico intentaba registrar una nota de
// aclaración/evolución. Ambas rutas apuntan al mismo controlador para
// mantener compatibilidad con cualquier consumidor existente.
router.post('/:id/aclaracion', verifyToken, isMedico, actualizarHistoria);
router.put('/:id', verifyToken, isMedico, actualizarHistoria);

// PATCH /historias/gestionar-cita/:id
router.patch('/gestionar-cita/:id', verifyToken, isMedico, gestionarCita);

// ─── RUTAS DE DOCUMENTOS CLÍNICOS ─────────────────────────────────────────────

router.get('/documentos/paciente/:id_paciente', verifyToken, listarDocumentosClinicos);
router.get('/documentos/:id', verifyToken, obtenerDocumentoClinco);
router.post('/documentos', verifyToken, registrarDocumentoClinco);
router.patch('/documentos/:id/ocultar', verifyToken, isPaciente, ocultarDocumentoExterno);

module.exports = router;