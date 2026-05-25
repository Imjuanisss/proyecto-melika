const pool = require('../db');

// POST /historias — crear historia clínica (médico)
async function crearHistoria(req, res) {
    const id_usuario = req.usuario.id;
    const { contenido, id_cita } = req.body;

    if (!contenido || !id_cita) {
        return res.status(400).json({ mensaje: 'Contenido e id_cita son obligatorios.' });
    }

    try {
        // Obtener el id del médico desde el usuario autenticado
        const medicoRes = await pool.query(
            'SELECT id FROM medicos WHERE id_usuario = $1',
            [id_usuario]
        );

        if (medicoRes.rows.length === 0) {
            return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });
        }

        const id_medico = medicoRes.rows[0].id;

        // Verificar que la cita existe y pertenece a este médico
        const cita = await pool.query(
            'SELECT id FROM citas WHERE id = $1 AND id_medico = $2',
            [id_cita, id_medico]
        );

        if (cita.rows.length === 0) {
            return res.status(403).json({ mensaje: 'La cita no existe o no te pertenece.' });
        }

        // Verificar que no exista ya una historia para esa cita
        const existeHistoria = await pool.query(
            'SELECT id FROM historias_clinicas WHERE id_cita = $1',
            [id_cita]
        );

        if (existeHistoria.rows.length > 0) {
            return res.status(409).json({ mensaje: 'Ya existe una historia clínica para esta cita.' });
        }

        const nueva = await pool.query(
            `INSERT INTO historias_clinicas (id_cita, id_medico, contenido)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id_cita, id_medico, contenido]
        );

        res.status(201).json({
            mensaje: 'Historia clínica creada.',
            historia: nueva.rows[0],
        });
    } catch (error) {
        console.error('Error en crearHistoria:', error.message);
        res.status(500).json({ mensaje: 'Error al crear la historia clínica.' });
    }
}

// PUT /historias/:id — editar historia clínica (médico)
async function actualizarHistoria(req, res) {
    const { id } = req.params;
    const id_usuario = req.usuario.id;
    const { contenido } = req.body;

    if (!contenido) {
        return res.status(400).json({ mensaje: 'El contenido es obligatorio.' });
    }

    try {
        const medicoRes = await pool.query(
            'SELECT id FROM medicos WHERE id_usuario = $1',
            [id_usuario]
        );

        if (medicoRes.rows.length === 0) {
            return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });
        }

        const id_medico = medicoRes.rows[0].id;

        // Verificar que la historia existe y pertenece a este médico
        const historia = await pool.query(
            'SELECT * FROM historias_clinicas WHERE id = $1',
            [id]
        );

        if (historia.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });
        }

        if (historia.rows[0].id_medico !== id_medico) {
            return res.status(403).json({ mensaje: 'No puedes editar una historia clínica ajena.' });
        }

        const actualizada = await pool.query(
            `UPDATE historias_clinicas
             SET contenido = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [contenido, id]
        );

        res.json({
            mensaje: 'Historia clínica actualizada.',
            historia: actualizada.rows[0],
        });
    } catch (error) {
        console.error('Error en actualizarHistoria:', error.message);
        res.status(500).json({ mensaje: 'Error al actualizar la historia clínica.' });
    }
}

// GET /historias/:id_cita — obtener historia por cita
async function obtenerHistoria(req, res) {
    const { id_cita } = req.params;

    try {
        const resultado = await pool.query(
            'SELECT * FROM historias_clinicas WHERE id_cita = $1',
            [id_cita]
        );

        if (resultado.rows.length === 0) {
            return res.json({ historia: null });
        }

        res.json({ historia: resultado.rows[0] });
    } catch (error) {
        console.error('Error en obtenerHistoria:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener la historia clínica.' });
    }
}

module.exports = { crearHistoria, actualizarHistoria, obtenerHistoria };