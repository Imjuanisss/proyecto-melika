const medicoModel = require('../models/medicosModel');

const listarMedicos = async (req, res) => {
    try {
        const medicos = await medicoModel.getMedicos();

        res.json(medicos);
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: 'Error obteniendo médicos'
        });
    }
};

const crearMedico = async (req, res) => {
    try {
        const medico = await medicoModel.createMedico(req.body);

        res.status(201).json(medico);
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: 'Error creando médico'
        });
    }
};

module.exports = {
    listarMedicos,
    crearMedico
};