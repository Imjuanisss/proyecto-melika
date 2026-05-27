const express = require('express');
const router  = express.Router();
const {
  listarEspecialidades,
  medicosPorEspecialidad,
  disponibilidad,
} = require('../controllers/especialidadesController');

// IMPORTANTE: /disponibilidad antes de /:id/medicos
router.get('/',                listarEspecialidades);
router.get('/disponibilidad',  disponibilidad);       // ← primero
router.get('/:id/medicos',     medicosPorEspecialidad); // ← después

module.exports = router;