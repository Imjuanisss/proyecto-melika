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
        (
            nombre,
            documento,
            especialidad,
            telefono,
            correo,
            direccion,
            registro_medico,
            horario
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
            nombre,
            documento,
            especialidad,
            telefono,
            correo,
            direccion,
            registro_medico,
            horario
        ]
    );

    return result.rows[0];
};

module.exports = {
    getMedicos,
    createMedico
};