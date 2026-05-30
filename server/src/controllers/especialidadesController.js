const pool = require('../config/db');

// ── GET /especialidades ────────────────────────────────────────────────────
async function listarEspecialidades(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, descripcion, precio_base, imagen_url
       FROM especialidades
       WHERE activa = TRUE
       ORDER BY nombre`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en listarEspecialidades:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener especialidades.' });
  }
}

// ── GET /especialidades/:id/medicos ────────────────────────────────────────
async function medicosPorEspecialidad(req, res) {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      `SELECT
         m.id,
         u.nombre,
         u.primer_apellido,
         m.tarifa,
         m.calificacion,
         m.acepta_teleconsulta,
         m.acepta_presencial,
         m.biografia,
         m.anos_experiencia
       FROM medicos m
       JOIN usuarios u ON m.id_usuario = u.id
       WHERE m.id_especialidad = $1
         AND m.activo = TRUE
         AND u.activo = TRUE
       ORDER BY u.nombre`,
      [id]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en medicosPorEspecialidad:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener médicos.' });
  }
}

// ── GET /especialidades/disponibilidad?medico_id=&fecha= ──────────────────
// Una sola fecha — usado por el dashboard médico y selección puntual
async function disponibilidad(req, res) {
  const { medico_id, fecha } = req.query;

  if (!medico_id || !fecha) {
    return res
      .status(400)
      .json({ mensaje: 'Se requieren medico_id y fecha.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, hora_inicio, hora_fin
       FROM franjas_horarias
       WHERE id_medico = $1
         AND fecha     = $2
         AND disponible = TRUE
       ORDER BY hora_inicio`,
      [medico_id, fecha]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en disponibilidad:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener disponibilidad.' });
  }
}

// ── GET /especialidades/disponibilidad-rango?medico_id=&inicio=&fin= ──────
// NUEVO: Rango de fechas en UNA sola query — resuelve el problema de las 42 peticiones
// Devuelve eventos con formato FullCalendar listos para usar directamente
async function disponibilidadRango(req, res) {
  const { medico_id, inicio, fin } = req.query;

  if (!medico_id || !inicio || !fin) {
    return res
      .status(400)
      .json({ mensaje: 'Se requieren medico_id, inicio y fin.' });
  }

  // Validar que el rango no sea excesivo (máximo 3 meses)
  const inicioDate = new Date(inicio + 'T00:00:00');
  const finDate    = new Date(fin    + 'T00:00:00');
  const diffDias   = (finDate - inicioDate) / (1000 * 60 * 60 * 24);

  if (diffDias > 93) {
    return res
      .status(400)
      .json({ mensaje: 'El rango máximo permitido es de 3 meses.' });
  }

  try {
    // Una sola query trae TODAS las franjas del rango
    const resultado = await pool.query(
      `SELECT
         f.id,
         f.fecha,
         f.hora_inicio,
         f.hora_fin
       FROM franjas_horarias f
       WHERE f.id_medico  = $1
         AND f.fecha      BETWEEN $2 AND $3
         AND f.disponible = TRUE
       ORDER BY f.fecha, f.hora_inicio`,
      [medico_id, inicio, fin]
    );

    // Convertir a formato FullCalendar directamente en el backend
    const eventos = resultado.rows.map((f) => {
      // fecha puede llegar como Date o como string según el driver
      const fechaStr =
        f.fecha instanceof Date
          ? f.fecha.toISOString().split('T')[0]
          : String(f.fecha).split('T')[0];

      return {
        id:    `franja-${f.id}`,
        title: f.hora_inicio.substring(0, 5),
        start: `${fechaStr}T${f.hora_inicio}`,
        end:   `${fechaStr}T${f.hora_fin}`,
        backgroundColor: '#1A7A52',
        borderColor:     '#145C3E',
        textColor:       '#fff',
        extendedProps: {
          id_franja:   f.id,
          hora_inicio: f.hora_inicio,
          hora_fin:    f.hora_fin,
          fecha:       fechaStr,
        },
      };
    });

    res.json(eventos);
  } catch (error) {
    console.error('Error en disponibilidadRango:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener disponibilidad en rango.' });
  }
}

module.exports = {
  listarEspecialidades,
  medicosPorEspecialidad,
  disponibilidad,
  disponibilidadRango,
};