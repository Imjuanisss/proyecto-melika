const express = require('express');
const router  = express.Router();
const { verifyToken, isAdmin, isMedico } = require('../middleware/authMiddleware');
const {
    crearMedico,
    listarMedicos,
    actualizarMedico,
    desactivarMedico,
    agendaMedico,
    agendaRango,
} = require('../controllers/medicosController');

// Rutas admin — CRUD de médicos
router.get('/',     verifyToken, isAdmin,   listarMedicos);
router.post('/',    verifyToken, isAdmin,   crearMedico);
router.put('/:id',  verifyToken, isAdmin,   actualizarMedico);
router.patch('/:id', verifyToken, isAdmin,  desactivarMedico);

// Rutas del médico autenticado — agenda
router.get('/agenda',       verifyToken, isMedico, agendaMedico);
router.get('/agenda/rango', verifyToken, isMedico, agendaRango);

module.exports = router;