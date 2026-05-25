const db = require('../config/db');

const getMedicos = async () => {
    const result = await db.query(
        'SELECT * FROM medicos ORDER BY id DESC'
    );
    return result.rows;
};

const createMedico = async (data) => {
    const {
        nombre,
        documento,
        especialidad,
        telefono,
        correo,
        direccion,
        registro_medico,
        horario
    } = data;

    const result = await db.query(
        `INSERT INTO medicos
        (nombre, documento, especialidad, telefono, correo, direccion, registro_medico, horario)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [nombre, documento, especialidad, telefono, correo, direccion, registro_medico, horario]
    );

    return result.rows[0];
};

const getMedicoById = async (id) => {
    const result = await db.query(
        'SELECT * FROM medicos WHERE id = $1',
        [id]
    );
    return result.rows[0];
};

const updateMedico = async (id, data) => {
    const {
        nombre,
        documento,
        especialidad,
        telefono,
        correo,
        direccion,
        registro_medico,
        horario
    } = data;

    const result = await db.query(
        `UPDATE medicos SET
            nombre          = $1,
            documento       = $2,
            especialidad    = $3,
            telefono        = $4,
            correo          = $5,
            direccion       = $6,
            registro_medico = $7,
            horario         = $8
        WHERE id = $9
        RETURNING *`,
        [nombre, documento, especialidad, telefono, correo, direccion, registro_medico, horario, id]
    );

    return result.rows[0];
};

const deleteMedico = async (id) => {
    const result = await db.query(
        'DELETE FROM medicos WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

module.exports = {
    getMedicos,
    createMedico,
    getMedicoById,
    updateMedico,
    deleteMedico
};