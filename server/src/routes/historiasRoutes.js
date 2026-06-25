// server/src/routes/historiasRoutes.js
// MELIKA — Rutas del módulo integral de Historias Clínicas y Documentos

const express = require('express');
const router  = express.Router();
const { verifyToken, isMedico } = require('../middleware/authMiddleware');
const {
  crearHistoria,
  crearAclaracion,
  obtenerHistoria,
  obtenerHistoriaCompleta,
  historialPaciente,
  registrarDocumento,
  listarDocumentosPaciente,
  ocultarDocumento,
} = require('../controllers/historiasController');

// ── Historias clínicas ────────────────────────────────────────────────────────

// Crear historia clínica completa (solo médico con cita)
router.post('/', verifyToken, isMedico, crearHistoria);

// Agregar nota de aclaración o evolución (solo el médico autor)
router.post('/:id/aclaracion', verifyToken, isMedico, crearAclaracion);

// Historia por cita (historia principal + aclaraciones) — médico o paciente dueño
router.get('/cita/:id_cita', verifyToken, obtenerHistoria);

// Historia individual completa con todos los datos del paciente (para el PDF)
// Acceso: paciente dueño o médico con cita vinculada
router.get('/:id/completa', verifyToken, obtenerHistoriaCompleta);

// Historial completo del paciente (lista de historias principales)
// Acceso: el mismo paciente o médico con cita vinculada
router.get('/paciente/:id_paciente', verifyToken, historialPaciente);

// ── Documentos clínicos adjuntos ──────────────────────────────────────────────

// Registrar metadato de un PDF generado (médico genera historia/fórmula/orden,
// o paciente sube documento externo)
router.post('/documentos', verifyToken, registrarDocumento);

// Listar documentos de un paciente (médico: solo los suyos + acceso por cita)
router.get('/documentos/paciente/:id_paciente', verifyToken, listarDocumentosPaciente);

// Ocultar documento externo (solo paciente, solo sus propios docs)
router.patch('/documentos/:id/ocultar', verifyToken, ocultarDocumento);

module.exports = router;