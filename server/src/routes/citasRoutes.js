const express           = require('express');
const router            = express.Router();
const { verifyToken }   = require('../middleware/authMiddleware');
const {
    crearCita,
    misCitas,
    cancelarCita,
    eliminarCita,
} = require('../controllers/citasController');
 
router.get('/mis-citas', verifyToken, misCitas);
router.post('/',         verifyToken, crearCita);
router.patch('/:id',     verifyToken, cancelarCita);
router.delete('/:id',    verifyToken, eliminarCita);
 
module.exports = router;