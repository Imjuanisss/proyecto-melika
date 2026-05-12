const express = require('express');
const router  = express.Router();
const {
    listarEspecialidades,
    medicosPorEspecialidad,
    disponibilidad,
} = require('../controllers/especialidadesController');
 
router.get('/',                  listarEspecialidades);
router.get('/:id/medicos',       medicosPorEspecialidad);
router.get('/disponibilidad',    disponibilidad);
 
module.exports = router;