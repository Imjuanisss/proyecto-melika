const express = require('express');
const router  = express.Router();
const {
  listarMedicamentos,
  listarCategorias,
  obtenerMedicamento,
} = require('../controllers/medicamentosController');

// IMPORTANTE: /categorias debe ir ANTES de /:id para evitar que express
// interprete "categorias" como un parámetro de ID.
router.get('/categorias', listarCategorias);
router.get('/',           listarMedicamentos);
router.get('/:id',        obtenerMedicamento);

module.exports = router;