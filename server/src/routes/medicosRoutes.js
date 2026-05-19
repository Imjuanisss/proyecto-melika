const express = require('express');

const router = express.Router();

const {
    listarMedicos,
    crearMedico
} = require('../controllers/medicosController');

router.get('/', listarMedicos);

router.post('/', crearMedico);

module.exports = router;