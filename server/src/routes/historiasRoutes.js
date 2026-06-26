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
  crearAclaracion,
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
// Lista el historial clínico de un paciente.
// Accesible para: el propio paciente o un médico con cita vinculada.
// ⚠️ DEBE ir ANTES de /:id para no ser capturada como parámetro.
router.get('/paciente/:id_paciente', verifyToken, historialPaciente);

// GET /historias/cita/:id_cita
// Retorna la historia principal + aclaraciones de una cita concreta.
// Accesible para: el paciente dueño o el médico de la cita.
router.get('/cita/:id_cita', verifyToken, obtenerHistoria);

// POST /historias
// Crear historia clínica nueva (solo médico con la cita vinculada).
router.post('/', verifyToken, isMedico, crearHistoria);

// GET /historias/:id/completa
// Retorna historia con datos enriquecidos del paciente (para generar PDF).
// La ruta dinámica /:id va DESPUÉS de las estáticas.
router.get('/:id/completa', verifyToken, obtenerHistoriaCompleta);

// POST /historias/:id/aclaracion
// Agregar nota de aclaración o evolución (append-only — Ley 2015/2020).
// Solo el médico autor de la historia principal puede crear aclaraciones.
router.post('/:id/aclaracion', verifyToken, isMedico, crearAclaracion);

// PATCH /historias/gestionar-cita/:id
// Alias de PATCH /medico/citas/:id/gestionar — centraliza la lógica aquí.
// (La ruta canónica se monta en medicosRoutes bajo /medico/citas/:id/gestionar)
router.patch('/gestionar-cita/:id', verifyToken, isMedico, gestionarCita);

// ─── RUTAS DE DOCUMENTOS CLÍNICOS ─────────────────────────────────────────────

// GET /historias/documentos/paciente/:id_paciente
// Lista todos los documentos clínicos de un paciente.
// Respeta el flag oculto_paciente para el rol 'paciente'.
// ⚠️ Ruta estática /documentos/paciente ANTES de /documentos/:id
router.get('/documentos/paciente/:id_paciente', verifyToken, listarDocumentosClinicos);

// GET /historias/documentos/:id
// Obtener un documento clínico específico por su ID.
router.get('/documentos/:id', verifyToken, obtenerDocumentoClinco);

// POST /historias/documentos
// Registrar un documento clínico.
// El paciente puede subir 'documento_externo'.
// El médico puede registrar 'formula_medica', 'orden_examen', 'historia_clinica'.
router.post('/documentos', verifyToken, registrarDocumentoClinco);

// PATCH /historias/documentos/:id/ocultar
// Solo el paciente puede ocultar de su vista un documento externo propio.
// Los documentos con origen 'medico' nunca pueden ocultarse (inmutabilidad legal).
router.patch('/documentos/:id/ocultar', verifyToken, isPaciente, ocultarDocumentoExterno);

module.exports = router;