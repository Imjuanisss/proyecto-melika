const express = require('express');
const router = express.Router();
const {
  listarEspecialidades,
  listarEspecialidadesAdmin,
  crearEspecialidad,
  actualizarEspecialidad,
  medicosPorEspecialidad,
  disponibilidad,
  disponibilidadRango
} = require('../controllers/especialidadesController');

// Rutas fijas primero
router.get('/', listarEspecialidades);
router.get('/admin', listarEspecialidadesAdmin);
router.get('/disponibilidad', disponibilidad);
router.get('/disponibilidad-rango', disponibilidadRango);

// Escritura de datos
router.post('/', crearEspecialidad);
router.put('/:id', actualizarEspecialidad);

// Parámetros al final
router.get('/:id/medicos', medicosPorEspecialidad);

module.exports = router;