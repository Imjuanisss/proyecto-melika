const medicoModel = require('../models/medicosModel');

const listarMedicos = async (req, res) => {
    try {
        const medicos = await medicoModel.getMedicos();
        res.json(medicos);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error obteniendo médicos' });
    }
};

const crearMedico = async (req, res) => {
    try {
        const medico = await medicoModel.createMedico(req.body);
        res.status(201).json(medico);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creando médico' });
    }
};

const obtenerMedico = async (req, res) => {
    try {
        const medico = await medicoModel.getMedicoById(req.params.id);
        if (!medico) {
            return res.status(404).json({ message: 'Médico no encontrado' });
        }
        res.json(medico);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error obteniendo médico' });
    }
};

const actualizarMedico = async (req, res) => {
    try {
        const medico = await medicoModel.getMedicoById(req.params.id);
        if (!medico) {
            return res.status(404).json({ message: 'Médico no encontrado' });
        }
        const actualizado = await medicoModel.updateMedico(req.params.id, req.body);
        res.json(actualizado);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Ya existe un médico con ese documento o correo' });
        }
        console.log(error);
        res.status(500).json({ message: 'Error actualizando médico' });
    }
};

const eliminarMedico = async (req, res) => {
    try {
        const medico = await medicoModel.getMedicoById(req.params.id);
        if (!medico) {
            return res.status(404).json({ message: 'Médico no encontrado' });
        }
        await medicoModel.deleteMedico(req.params.id);
        res.json({ message: 'Médico eliminado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error eliminando médico' });
    }
};

module.exports = {
    listarMedicos,
    crearMedico,
    obtenerMedico,
    actualizarMedico,
    eliminarMedico
};