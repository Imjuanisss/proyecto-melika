// server/src/routes/adminRoutes.js
const express = require('express');
const router  = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const {
  getStats,
  listarUsuarios, toggleEstadoUsuario,
  listarCitas, cambiarEstadoCita,
  getHorariosAdmin, crearFranjaAdmin, crearHorarioMasivo, eliminarFranjaAdmin,
  crearEspecialidad, actualizarEspecialidad, toggleEspecialidad,
  crearMedicamento, actualizarMedicamento, toggleMedicamento,
} = require('../controllers/adminController');

// Todas las rutas admin requieren token + rol admin
router.use(verifyToken, isAdmin);

// Dashboard
router.get('/stats', getStats);

// Usuarios
router.get('/usuarios',              listarUsuarios);
router.patch('/usuarios/:id/estado', toggleEstadoUsuario);

// Citas
router.get('/citas',              listarCitas);
router.patch('/citas/:id/estado', cambiarEstadoCita);

// Horarios / Franjas
// ⚠️ CRÍTICO: /horarios/masivo ANTES de /horarios/:id
router.get('/horarios',              getHorariosAdmin);
router.post('/horarios/masivo',      crearHorarioMasivo);  // Creación en bloque (semana)
router.post('/horarios',             crearFranjaAdmin);    // Franja individual (compatibilidad)
router.delete('/horarios/:id',       eliminarFranjaAdmin);

// Especialidades
router.post('/especialidades',              crearEspecialidad);
router.put('/especialidades/:id',           actualizarEspecialidad);
router.patch('/especialidades/:id/estado',  toggleEspecialidad);

// Medicamentos
router.post('/medicamentos',             crearMedicamento);
router.put('/medicamentos/:id',          actualizarMedicamento);
router.patch('/medicamentos/:id/estado', toggleMedicamento);

module.exports = router;