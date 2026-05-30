const express = require('express');
const router  = express.Router();
const {
  listarEspecialidades,
  medicosPorEspecialidad,
  disponibilidad,
  disponibilidadRango,
} = require('../controllers/especialidadesController');

// CRÍTICO: rutas con segmento fijo ANTES de rutas con parámetro (:id)
// De lo contrario Express interpreta "disponibilidad" como un :id
router.get('/',                      listarEspecialidades);
router.get('/disponibilidad',        disponibilidad);          // ← primero
router.get('/disponibilidad-rango',  disponibilidadRango);     // ← primero
router.get('/:id/medicos',           medicosPorEspecialidad);  // ← después

module.exports = router;