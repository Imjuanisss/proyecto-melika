const express      = require('express');
const router       = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

const {
    listarMedicos,
    crearMedico,
    obtenerMedico,
    actualizarMedico,
    eliminarMedico
} = require('../controllers/medicosController');

router.get('/',       verifyToken, listarMedicos);
router.post('/',      verifyToken, crearMedico);
router.get('/:id',    verifyToken, obtenerMedico);
router.put('/:id',    verifyToken, actualizarMedico);
router.delete('/:id', verifyToken, eliminarMedico);

module.exports = router;