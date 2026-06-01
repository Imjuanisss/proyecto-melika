const express = require('express');
const router = express.Router();
const {
  listarMedicamentos,
  listarMedicamentosAdmin,
  crearMedicamento,
  actualizarMedicamento,
  listarCategorias,
  obtenerMedicamento,
} = require('../controllers/medicamentosController');

// CRÍTICO: Las rutas estáticas siempre van ANTES de los parámetros dinámicos (:id)
router.get('/admin', listarMedicamentosAdmin);
router.get('/categorias', listarCategorias);
router.get('/', listarMedicamentos);
router.get('/:id', obtenerMedicamento);

// Rutas de escritura del Administrador
router.post('/', crearMedicamento);
router.put('/:id', actualizarMedicamento);

module.exports = router;