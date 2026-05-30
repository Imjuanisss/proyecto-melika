const pool = require('../config/db');

// ── Utilidad: normalizar fecha que puede llegar como Date o string ─────────
function normalizarFecha(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date) return fecha.toISOString().split('T')[0];
  return String(fecha).split('T')[0];
}

// =============================================================================
// POST /citas — Crear cita (el trigger PL/pgSQL valida concurrencia en la BD)
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

  const id_paciente = req.usuario.id;

  if (!id_medico || !id_especialidad || !id_franja || !fecha || !hora_inicio) {
    return res.status(400).json({
      error:   'BAD_REQUEST',
      mensaje: 'Faltan datos obligatorios para crear la cita.',
    });
  }

  try {
    const medicoQuery = await pool.query(
      'SELECT tarifa FROM medicos WHERE id = $1 AND activo = TRUE',
      [id_medico]
    );

    if (medicoQuery.rows.length === 0) {
      return res.status(404).json({
        error:   'NOT_FOUND',
        mensaje: 'El médico especificado no existe o no está activo.',
      });
    }

    const tarifa = medicoQuery.rows[0].tarifa;

    // El trigger trg_seguridad_reserva_critica valida disponibilidad ANTES del INSERT
    // El trigger trg_sincronizacion_automatica_franja marca disponible=FALSE DESPUÉS
    // El trigger trg_auditoria_citas registra el INSERT en logs_citas automáticamente
    const nuevaCita = await pool.query(
      `INSERT INTO citas (
         id_paciente, id_medico, id_especialidad, id_franja,
         fecha, hora_inicio, tipo_consulta, motivo, tarifa, estado
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente')
       RETURNING *`,
      [
        id_paciente, id_medico, id_especialidad, id_franja,
        fecha, hora_inicio, tipo_consulta || 'presencial', motivo || null, tarifa,
      ]
    );

    return res.status(201).json({
      mensaje: 'Cita reservada exitosamente.',
      cita:    nuevaCita.rows[0],
    });
  } catch (error) {
    // Errores lanzados por los triggers PL/pgSQL
    if (error.code === '45002') {
      return res.status(409).json({
        error:   'CONCURRENCY_CONFLICT',
        mensaje: 'Esta franja ya fue reservada simultáneamente. Por favor elige otro horario.',
      });
    }
    if (error.code === '45001') {
      return res.status(400).json({
        error:   'INVALID_SLOT',
        mensaje: 'La franja horaria especificada no existe o no está disponible.',
      });
    }
    console.error('Error crítico en crearCita:', error);
    return res.status(500).json({
      error:   'INTERNAL_SERVER_ERROR',
      mensaje: 'Error al procesar la reserva. Intenta nuevamente.',
    });
  }
}

// =============================================================================
// GET /citas/mis-citas — Citas del paciente autenticado (vista lista)
// =============================================================================
async function misCitas(req, res) {
  const id_paciente = req.usuario.id;

  try {
    const resultado = await pool.query(
      `SELECT
         c.id,
         c.fecha,
         c.hora_inicio,
         c.hora_fin,
         c.estado,
         c.tipo_consulta,
         c.motivo,
         c.tarifa          AS tarifa_cobrada,
         c.razon_cancelacion,
         c.created_at,
         u.nombre          AS medico_nombre,
         u.primer_apellido AS medico_apellido,
         e.nombre          AS especialidad
       FROM citas c
       JOIN medicos       m  ON c.id_medico      = m.id
       JOIN usuarios      u  ON m.id_usuario     = u.id
       JOIN especialidades e ON c.id_especialidad = e.id
       WHERE c.id_paciente = $1
       ORDER BY c.fecha DESC, c.hora_inicio DESC`,
      [id_paciente]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en misCitas:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener tus citas.' });
  }
}

// =============================================================================
// GET /citas/calendario?inicio=&fin= — Citas del paciente para FullCalendar
// =============================================================================
async function citasCalendario(req, res) {
  const id_paciente = req.usuario.id;
  const { inicio, fin } = req.query;

  if (!inicio || !fin) {
    return res
      .status(400)
      .json({ mensaje: 'Se requieren los parámetros inicio y fin.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT
         c.id,
         c.fecha,
         c.hora_inicio,
         c.estado,
         c.tipo_consulta,
         c.motivo,
         c.tarifa          AS tarifa_cobrada,
         u.nombre          AS medico_nombre,
         u.primer_apellido AS medico_apellido,
         e.nombre          AS especialidad
       FROM citas c
       JOIN medicos       m  ON c.id_medico      = m.id
       JOIN usuarios      u  ON m.id_usuario     = u.id
       JOIN especialidades e ON c.id_especialidad = e.id
       WHERE c.id_paciente = $1
         AND c.fecha BETWEEN $2 AND $3
         AND c.estado != 'cancelada'
       ORDER BY c.fecha, c.hora_inicio`,
      [id_paciente, inicio, fin]
    );

    const COLOR_ESTADO = {
      pendiente:  { bg: '#B45309', border: '#92400E' },
      confirmada: { bg: '#2351C4', border: '#1A3A8F' },
      completada: { bg: '#1A7A52', border: '#145C3E' },
    };

    const eventos = resultado.rows.map((c) => {
      const fechaStr    = normalizarFecha(c.fecha);
      const colores     = COLOR_ESTADO[c.estado] || { bg: '#8A9BBE', border: '#6B7FA6' };

      return {
        id:              String(c.id),
        title:           `${c.especialidad}`,
        start:           `${fechaStr}T${c.hora_inicio}`,
        backgroundColor: colores.bg,
        borderColor:     colores.border,
        textColor:       '#fff',
        extendedProps: {
          estado:        c.estado,
          tipo_consulta: c.tipo_consulta,
          medico_nombre: `${c.medico_nombre} ${c.medico_apellido}`,
          especialidad:  c.especialidad,
          motivo:        c.motivo,
          tarifa:        c.tarifa_cobrada,
        },
      };
    });

    res.json(eventos);
  } catch (error) {
    console.error('Error en citasCalendario:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener el calendario de citas.' });
  }
}

// =============================================================================
// PATCH /citas/:id — Cancelar cita
// El trigger trg_sincronizacion_automatica_franja libera la franja automáticamente
// El trigger trg_auditoria_citas registra el cambio de estado en logs_citas
// =============================================================================
async function cancelarCita(req, res) {
  const { id }          = req.params;
  const id_usuario_auth = req.usuario.id;
  const rol_usuario     = req.usuario.rol;

  try {
    const citaRes = await pool.query(
      'SELECT id, id_paciente, estado FROM citas WHERE id = $1',
      [id]
    );

    if (citaRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'NOT_FOUND', mensaje: 'Cita no encontrada.' });
    }

    const cita = citaRes.rows[0];

    // Solo el paciente dueño puede cancelar (admin y médico tienen su propio endpoint)
    if (rol_usuario === 'paciente' && cita.id_paciente !== id_usuario_auth) {
      return res.status(403).json({
        error:   'FORBIDDEN',
        mensaje: 'No tienes autorización para cancelar esta cita.',
      });
    }

    if (cita.estado === 'cancelada') {
      return res
        .status(400)
        .json({ error: 'BAD_REQUEST', mensaje: 'Esta cita ya está cancelada.' });
    }

    if (cita.estado === 'completada') {
      return res
        .status(400)
        .json({ error: 'BAD_REQUEST', mensaje: 'No se puede cancelar una cita ya completada.' });
    }

    const resultado = await pool.query(
      `UPDATE citas
       SET estado = 'cancelada', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.json({
      mensaje: 'Cita cancelada. La franja horaria fue liberada automáticamente por la base de datos.',
      cita:    resultado.rows[0],
    });
  } catch (error) {
    console.error('Error en cancelarCita:', error.message);
    return res.status(500).json({
      error:   'INTERNAL_SERVER_ERROR',
      mensaje: 'Error al cancelar la cita.',
    });
  }
}

// =============================================================================
// DELETE /citas/:id — Eliminar cita (solo si está cancelada)
// =============================================================================
async function eliminarCita(req, res) {
  const { id }          = req.params;
  const id_usuario_auth = req.usuario.id;

  try {
    const citaRes = await pool.query(
      'SELECT id, id_paciente, estado FROM citas WHERE id = $1',
      [id]
    );

    if (citaRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'NOT_FOUND', mensaje: 'Cita no encontrada.' });
    }

    const cita = citaRes.rows[0];

    if (cita.id_paciente !== id_usuario_auth) {
      return res.status(403).json({
        error:   'FORBIDDEN',
        mensaje: 'No puedes eliminar una cita que no es tuya.',
      });
    }

    if (cita.estado !== 'cancelada') {
      return res.status(400).json({
        error:   'BAD_REQUEST',
        mensaje: 'Solo puedes eliminar citas que estén en estado cancelada.',
      });
    }

    await pool.query('DELETE FROM citas WHERE id = $1', [id]);

    return res.json({ mensaje: 'Cita eliminada correctamente.' });
  } catch (error) {
    console.error('Error en eliminarCita:', error.message);
    return res.status(500).json({
      error:   'INTERNAL_SERVER_ERROR',
      mensaje: 'Error al eliminar la cita.',
    });
  }
}

module.exports = {
  crearCita,
  misCitas,
  citasCalendario,
  cancelarCita,
  eliminarCita,
};