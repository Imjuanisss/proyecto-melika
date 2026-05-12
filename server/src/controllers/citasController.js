const pool = require('../db');
 
// POST /citas — crear una nueva cita
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
 
    const id_paciente = req.usuario.id;
 
    if (!id_medico || !id_especialidad || !id_franja || !fecha || !hora_inicio) {
        return res.status(400).json({ mensaje: 'Faltan datos obligatorios para crear la cita.' });
    }
 
    try {
        // Verificar que la franja siga disponible (prevención doble booking)
        const franja = await pool.query(
            'SELECT * FROM franjas_horarias WHERE id = $1 AND disponible = TRUE',
            [id_franja]
        );
 
        if (franja.rows.length === 0) {
            return res.status(409).json({ mensaje: 'Esta franja horaria ya fue reservada. Elige otra.' });
        }
 
        // Obtener la tarifa del médico
        const medico = await pool.query(
            'SELECT tarifa FROM medicos WHERE id = $1',
            [id_medico]
        );
        const tarifa = medico.rows[0]?.tarifa || 0;
 
        // Crear la cita
        const nuevaCita = await pool.query(
            `INSERT INTO citas
                (id_paciente, id_medico, id_especialidad, id_franja,
                 fecha, hora_inicio, tipo_consulta, motivo, estado, tarifa_cobrada)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente', $9)
             RETURNING *`,
            [id_paciente, id_medico, id_especialidad, id_franja,
             fecha, hora_inicio, tipo_consulta, motivo || '', tarifa]
        );
 
        // Marcar la franja como no disponible
        await pool.query(
            'UPDATE franjas_horarias SET disponible = FALSE WHERE id = $1',
            [id_franja]
        );
 
        res.status(201).json({
            mensaje: 'Cita agendada exitosamente.',
            cita: nuevaCita.rows[0],
        });
    } catch (error) {
        console.error('Error en crearCita:', error.message);
        res.status(500).json({ mensaje: 'Error al crear la cita.' });
    }
}
 
// GET /citas/mis-citas — historial del paciente autenticado
async function misCitas(req, res) {
    const id_paciente = req.usuario.id;
 
    try {
        const resultado = await pool.query(
            `SELECT
                c.id,
                c.fecha,
                c.hora_inicio,
                c.tipo_consulta,
                c.motivo,
                c.estado,
                c.razon_cancelacion,
                c.tarifa_cobrada,
                c.created_at,
                u.nombre          AS medico_nombre,
                u.primer_apellido AS medico_apellido,
                e.nombre          AS especialidad
             FROM citas c
             JOIN medicos        m ON c.id_medico      = m.id
             JOIN usuarios       u ON m.id_usuario     = u.id
             JOIN especialidades e ON c.id_especialidad = e.id
             WHERE c.id_paciente = $1
             ORDER BY c.fecha DESC, c.hora_inicio DESC`,
            [id_paciente]
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error en misCitas:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener las citas.' });
    }
}
 
// PATCH /citas/:id — cancelar una cita pendiente
async function cancelarCita(req, res) {
    const { id }              = req.params;
    const id_paciente         = req.usuario.id;
    const { razon_cancelacion } = req.body;
 
    try {
        // Verificar que la cita existe y pertenece al paciente
        const cita = await pool.query(
            'SELECT * FROM citas WHERE id = $1 AND id_paciente = $2',
            [id, id_paciente]
        );
 
        if (cita.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Cita no encontrada.' });
        }
 
        if (cita.rows[0].estado !== 'pendiente') {
            return res.status(400).json({ mensaje: 'Solo puedes cancelar citas con estado pendiente.' });
        }
 
        // Cancelar la cita
        await pool.query(
            `UPDATE citas
             SET estado = 'cancelada',
                 razon_cancelacion = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [razon_cancelacion || 'Cancelada por el paciente', id]
        );
 
        // Liberar la franja horaria para que otro paciente pueda usarla
        await pool.query(
            'UPDATE franjas_horarias SET disponible = TRUE WHERE id = $1',
            [cita.rows[0].id_franja]
        );
 
        res.json({ mensaje: 'Cita cancelada exitosamente.' });
    } catch (error) {
        console.error('Error en cancelarCita:', error.message);
        res.status(500).json({ mensaje: 'Error al cancelar la cita.' });
    }
}
 
// DELETE /citas/:id — eliminar una cita cancelada
async function eliminarCita(req, res) {
    const { id }      = req.params;
    const id_paciente = req.usuario.id;
 
    try {
        const cita = await pool.query(
            'SELECT * FROM citas WHERE id = $1 AND id_paciente = $2',
            [id, id_paciente]
        );
 
        if (cita.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Cita no encontrada.' });
        }
 
        if (cita.rows[0].estado !== 'cancelada') {
            return res.status(400).json({ mensaje: 'Solo puedes eliminar citas que estén canceladas.' });
        }
 
        await pool.query('DELETE FROM citas WHERE id = $1', [id]);
 
        res.json({ mensaje: 'Cita eliminada exitosamente.' });
    } catch (error) {
        console.error('Error en eliminarCita:', error.message);
        res.status(500).json({ mensaje: 'Error al eliminar la cita.' });
    }
}
 
module.exports = { crearCita, misCitas, cancelarCita, eliminarCita };
 
 