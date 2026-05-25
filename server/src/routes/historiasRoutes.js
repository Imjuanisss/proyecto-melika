const express = require('express');
const router  = express.Router();
const { verifyToken, isMedico } = require('../middleware/authMiddleware');
const { crearHistoria, actualizarHistoria, obtenerHistoria } = require('../controllers/historiasController');

router.post('/',          verifyToken, isMedico, crearHistoria);
router.put('/:id',        verifyToken, isMedico, actualizarHistoria);
router.get('/:id_cita',   verifyToken,           obtenerHistoria);

module.exports = router;