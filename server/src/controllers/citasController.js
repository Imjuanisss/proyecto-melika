const pool = require('../config/db');

// =============================================================================
// POST /citas — Crear una nueva cita (Arquitectura Limpia)
// =============================================================================
async function crearCita(req, res) {
    const {
        id_medico,
        id_especialidad,
        id_franja,
        fecha,
        hora_inicio,
        tipo_consulta,
        motivo,
    } = req.body;

    const id_paciente = req.usuario.id; // Proveniente del middleware auth

    if (!id_medico || !id_especialidad || !id_franja || !fecha || !hora_inicio) {
        return res.status(400).json({ error: 'BAD_REQUEST', mensaje: 'Faltan datos obligatorios para crear la cita.' });
    }

    try {
        // Obtenemos la tarifa del médico de forma directa en la subconsulta o previa
        const medicoQuery = await pool.query('SELECT tarifa FROM medicos WHERE id = $1', [id_medico]);
        if (medicoQuery.rows.length === 0) {
            return res.status(404).json({ error: 'NOT_FOUND', mensaje: 'El médico especificado no existe.' });
        }
        const tarifa = medicoQuery.rows[0].tarifa;

        // EJECUCIÓN DIRECTA: Confiamos el aislamiento y bloqueo a PostgreSQL
        // El trigger trg_seguridad_reserva_critica interceptará y validará ANTES de insertar.
        // El trigger trg_sincronizacion_automatica_franja actualizará la franja DESPUÉS de insertar.
        const queryInsert = `
            INSERT INTO citas (
                id_paciente, id_medico, id_especialidad, id_franja, 
                fecha, hora_inicio, tipo_consulta, motivo, tarifa, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente')
            RETURNING *;
        `;
        
        const nuevaCita = await pool.query(queryInsert, [
            id_paciente, id_medico, id_especialidad, id_franja,
            fecha, hora_inicio, tipo_consulta || 'presencial', motivo, tarifa
        ]);

        return res.status(201).json({
            mensaje: 'Cita reservada exitosamente de forma segura.',
            cita: nuevaCita.rows[0]
        });

    } catch (error) {
        // FASE 3: Captura de excepciones específicas de PL/pgSQL
        if (error.code === '45002') { // ERR_FRANJA_OCUPADA lanzado por nuestro trigger
            return res.status(409).json({
                error: 'CONCURRENCY_CONFLICT',
                mensaje: 'Esta franja horaria ya ha sido reservada por otro paciente de forma simultánea. Elige otra.'
            });
        }
        
        if (error.code === '45001') {
            return res.status(400).json({ error: 'INVALID_SLOT', mensaje: error.message });
        }

        console.error('Error crítico en arquitectura de crearCita:', error);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', mensaje: 'Error al procesar la reserva.' });
    }
}

// =============================================================================
// PATCH /citas/:id — Cancelar Cita
// =============================================================================
async function cancelarCita(req, res) {
    const { id } = req.params;
    const id_usuario_auth = req.usuario.id;
    const rol_usuario = req.usuario.rol;

    try {
        // Validación de propiedad
        const citaRes = await pool.query('SELECT * FROM citas WHERE id = $1', [id]);
        if (citaRes.rows.length === 0) {
            return res.status(404).json({ error: 'NOT_FOUND', mensaje: 'Cita no encontrada.' });
        }

        const cita = citaRes.rows[0];

        // Regla de negocio: Un paciente solo cancela sus propias citas. Admin/Médico cancelan cualquiera de su incumbencia.
        if (rol_usuario === 'paciente' && cita.id_paciente !== id_usuario_auth) {
            return res.status(403).json({ error: 'FORBIDDEN', mensaje: 'No tienes autorización para cancelar esta cita.' });
        }

        // Simplemente actualizamos el estado. El trigger trg_sincronizacion_automatica_franja liberará la franja solo.
        const resultado = await pool.query(
            "UPDATE citas SET estado = 'cancelada' WHERE id = $1 RETURNING *",
            [id]
        );

        return res.json({
            mensaje: 'Cita cancelada con éxito. La franja horaria fue liberada automáticamente por la BD.',
            cita: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error en cancelarCita:', error.message);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', mensaje: 'Error al cancelar la cita.' });
    }
}

module.exports = {
    crearCita,
    cancelarCita
    // Mantienes misCitas y eliminarCita tal como los tenías...
};