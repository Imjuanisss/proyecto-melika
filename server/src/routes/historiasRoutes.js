// server/src/routes/historiasRoutes.js
const express  = require('express');
const router   = express.Router();
const { verifyToken, isMedico } = require('../middleware/authMiddleware');
const {
  crearHistoria,
  actualizarHistoria,
  obtenerHistoria,
  historialPaciente,
} = require('../controllers/historiasController');

router.post('/',                         verifyToken, isMedico, crearHistoria);
router.put('/:id',                       verifyToken, isMedico, actualizarHistoria);
router.get('/cita/:id_cita',             verifyToken,           obtenerHistoria);
router.get('/paciente/:id_paciente',     verifyToken,           historialPaciente);

module.exports = router;