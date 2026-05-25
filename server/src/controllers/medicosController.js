const pool = require('../db');

// POST /medicos — crear médico (admin)
async function crearMedico(req, res) {
    const {
        nombre,
        primer_apellido,
        email,
        numero_registro,
        id_especialidad,
        tarifa,
        acepta_teleconsulta,
        acepta_presencial,
        biografia,
        anos_experiencia,
    } = req.body;

    if (!nombre || !primer_apellido || !email || !numero_registro || !id_especialidad || !tarifa) {
        return res.status(400).json({ mensaje: 'Faltan campos obligatorios.' });
    }

    try {
        // Verificar que el número de registro no exista
        const registroExiste = await pool.query(
            'SELECT id FROM medicos WHERE numero_registro = $1',
            [numero_registro]
        );
        if (registroExiste.rows.length > 0) {
            return res.status(409).json({ mensaje: 'El número de registro ya está registrado.' });
        }

        // Verificar que el email no exista en usuarios
        const emailExiste = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );
        if (emailExiste.rows.length > 0) {
            return res.status(409).json({ mensaje: 'Este correo ya está registrado.' });
        }

        // Crear usuario con rol médico (contraseña temporal)
        const bcrypt = require('bcrypt');
        const hashTemp = await bcrypt.hash('Melika2025!', 10);

        const nuevoUsuario = await pool.query(
            `INSERT INTO usuarios (nombre, primer_apellido, email, password_hash, rol, activo, verificado)
             VALUES ($1, $2, $3, $4, 'medico', TRUE, TRUE)
             RETURNING id`,
            [nombre, primer_apellido, email, hashTemp]
        );

        const id_usuario = nuevoUsuario.rows[0].id;

        // Crear el médico vinculado al usuario
        const nuevoMedico = await pool.query(
            `INSERT INTO medicos
                (id_usuario, id_especialidad, numero_registro, tarifa,
                 acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, activo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
             RETURNING *`,
            [
                id_usuario,
                id_especialidad,
                numero_registro,
                tarifa,
                acepta_teleconsulta ?? true,
                acepta_presencial ?? true,
                biografia || '',
                anos_experiencia || 0,
            ]
        );

        res.status(201).json({
            mensaje: 'Médico creado exitosamente.',
            medico: {
                ...nuevoMedico.rows[0],
                nombre,
                primer_apellido,
                email,
            },
        });
    } catch (error) {
        console.error('Error en crearMedico:', error.message);
        res.status(500).json({ mensaje: 'Error al crear el médico.' });
    }
}

// GET /medicos — listar todos los médicos (admin)
async function listarMedicos(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT
                m.id,
                m.numero_registro,
                m.tarifa,
                m.calificacion,
                m.acepta_teleconsulta,
                m.acepta_presencial,
                m.biografia,
                m.anos_experiencia,
                m.activo,
                u.nombre,
                u.primer_apellido,
                u.email,
                u.id AS id_usuario,
                e.nombre AS especialidad,
                e.id AS id_especialidad
             FROM medicos m
             JOIN usuarios u ON m.id_usuario = u.id
             JOIN especialidades e ON m.id_especialidad = e.id
             ORDER BY u.nombre`
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error en listarMedicos:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener médicos.' });
    }
}

// PUT /medicos/:id — actualizar médico (admin)
async function actualizarMedico(req, res) {
    const { id } = req.params;
    const {
        nombre,
        primer_apellido,
        id_especialidad,
        tarifa,
        acepta_teleconsulta,
        acepta_presencial,
        biografia,
        anos_experiencia,
    } = req.body;

    try {
        // Verificar que existe
        const existe = await pool.query('SELECT * FROM medicos WHERE id = $1', [id]);
        if (existe.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Médico no encontrado.' });
        }

        const id_usuario = existe.rows[0].id_usuario;

        // Actualizar datos del usuario
        await pool.query(
            'UPDATE usuarios SET nombre = $1, primer_apellido = $2 WHERE id = $3',
            [nombre, primer_apellido, id_usuario]
        );

        // Actualizar datos del médico
        const actualizado = await pool.query(
            `UPDATE medicos
             SET id_especialidad = $1,
                 tarifa = $2,
                 acepta_teleconsulta = $3,
                 acepta_presencial = $4,
                 biografia = $5,
                 anos_experiencia = $6
             WHERE id = $7
             RETURNING *`,
            [id_especialidad, tarifa, acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, id]
        );

        res.json({
            mensaje: 'Médico actualizado.',
            medico: { ...actualizado.rows[0], nombre, primer_apellido },
        });
    } catch (error) {
        console.error('Error en actualizarMedico:', error.message);
        res.status(500).json({ mensaje: 'Error al actualizar el médico.' });
    }
}

// PATCH /medicos/:id — desactivar médico (admin)
async function desactivarMedico(req, res) {
    const { id } = req.params;

    try {
        const existe = await pool.query('SELECT id FROM medicos WHERE id = $1', [id]);
        if (existe.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Médico no encontrado.' });
        }

        await pool.query('UPDATE medicos SET activo = FALSE WHERE id = $1', [id]);

        res.json({ mensaje: 'Médico desactivado.' });
    } catch (error) {
        console.error('Error en desactivarMedico:', error.message);
        res.status(500).json({ mensaje: 'Error al desactivar el médico.' });
    }
}

// GET /medico/agenda?fecha= — agenda del médico autenticado (issue #66)
async function agendaMedico(req, res) {
    const id_usuario = req.usuario.id;
    const { fecha } = req.query;

    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

    try {
        // Obtener el id del médico desde el usuario autenticado
        const medicoRes = await pool.query(
            'SELECT id FROM medicos WHERE id_usuario = $1',
            [id_usuario]
        );

        if (medicoRes.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No se encontró perfil de médico.' });
        }

        const id_medico = medicoRes.rows[0].id;

        const resultado = await pool.query(
            `SELECT
                c.id,
                c.fecha,
                c.hora_inicio,
                c.tipo_consulta,
                c.motivo,
                c.estado,
                u.nombre    AS paciente_nombre,
                u.primer_apellido AS paciente_apellido,
                e.nombre    AS especialidad,
                h.id        AS historia_id
             FROM citas c
             JOIN usuarios u ON c.id_paciente = u.id
             JOIN especialidades e ON c.id_especialidad = e.id
             LEFT JOIN historias_clinicas h ON h.id_cita = c.id
             WHERE c.id_medico = $1
               AND c.fecha = $2
             ORDER BY c.hora_inicio`,
            [id_medico, fechaConsulta]
        );

        res.json({ fecha: fechaConsulta, citas: resultado.rows });
    } catch (error) {
        console.error('Error en agendaMedico:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener la agenda.' });
    }
}

// GET /medico/agenda/rango?inicio=&fin= — rango de fechas para FullCalendar
async function agendaRango(req, res) {
    const id_usuario = req.usuario.id;
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ mensaje: 'Se requiere inicio y fin de rango.' });
    }

    try {
        const medicoRes = await pool.query(
            'SELECT id FROM medicos WHERE id_usuario = $1',
            [id_usuario]
        );

        if (medicoRes.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No se encontró perfil de médico.' });
        }

        const id_medico = medicoRes.rows[0].id;

        const resultado = await pool.query(
            `SELECT
                c.id,
                c.fecha,
                c.hora_inicio,
                c.tipo_consulta,
                c.estado,
                u.nombre         AS paciente_nombre,
                u.primer_apellido AS paciente_apellido
             FROM citas c
             JOIN usuarios u ON c.id_paciente = u.id
             WHERE c.id_medico = $1
               AND c.fecha BETWEEN $2 AND $3
               AND c.estado != 'cancelada'
             ORDER BY c.fecha, c.hora_inicio`,
            [id_medico, inicio, fin]
        );

        // Formato de eventos para FullCalendar
        const eventos = resultado.rows.map(c => ({
            id:    c.id,
            title: `${c.paciente_nombre} ${c.paciente_apellido}`,
            start: `${c.fecha.toISOString().split('T')[0]}T${c.hora_inicio}`,
            extendedProps: {
                tipo:   c.tipo_consulta,
                estado: c.estado,
            },
        }));

        res.json(eventos);
    } catch (error) {
        console.error('Error en agendaRango:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener el rango de agenda.' });
    }
}

module.exports = {
    crearMedico,
    listarMedicos,
    actualizarMedico,
    desactivarMedico,
    agendaMedico,
    agendaRango,
};