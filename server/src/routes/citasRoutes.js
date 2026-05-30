const express         = require('express');
const router          = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  crearCita,
  misCitas,
  citasCalendario,
  cancelarCita,
  eliminarCita,
} = require('../controllers/citasController');

// Rutas con segmento fijo SIEMPRE antes de /:id
router.get('/mis-citas',  verifyToken, misCitas);
router.get('/calendario', verifyToken, citasCalendario);

router.post('/',          verifyToken, crearCita);
router.patch('/:id',      verifyToken, cancelarCita);
router.delete('/:id',     verifyToken, eliminarCita);

module.exports = router;