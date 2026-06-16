const pool = require('../config/db');

// GET /especialidades (Para pacientes y público general)
async function listarEspecialidades(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, descripcion, precio_base, imagen_url, activa
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

// GET /especialidades/admin (Para el panel de administración - Ve todo)
async function listarEspecialidadesAdmin(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, descripcion, precio_base, imagen_url, activa
       FROM especialidades
       ORDER BY id DESC`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en listarEspecialidadesAdmin:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener el catálogo completo.' });
  }
}

// POST /especialidades (Crear nueva especialidad)
async function crearEspecialidad(req, res) {
  const { nombre, descripcion, precio_base, icono, activa } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ mensaje: 'El nombre de la especialidad es obligatorio.' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO especialidades (nombre, descripcion, precio_base, imagen_url, activa)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
       RETURNING *`,
      [
        nombre.trim(),
        descripcion || null,
        precio_base ? parseFloat(precio_base) : 0.00,
        icono || null, // Se mapea 'icono' del frontend a 'imagen_url' de la BD
        activa
      ]
    );

    res.status(201).json({
      mensaje: 'Especialidad creada con éxito',
      especialidad: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error al crear especialidad:', error.message);
    if (error.code === '23505') {
      return res.status(400).json({ mensaje: 'Ya existe una especialidad con este nombre.' });
    }
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
}

// PUT /especialidades/:id (Modificar especialidad)
async function actualizarEspecialidad(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, precio_base, icono, activa } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ mensaje: 'El nombre de la especialidad es obligatorio.' });
  }

  try {
    const resultado = await pool.query(
      `UPDATE especialidades
       SET nombre = $1, descripcion = $2, precio_base = $3, imagen_url = $4, activa = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        nombre.trim(),
        descripcion || null,
        precio_base ? parseFloat(precio_base) : 0.00,
        icono || null, // Sincronización de nomenclatura
        activa === undefined ? true : activa,
        id
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Especialidad no encontrada.' });
    }

    res.json({
      mensaje: 'Especialidad actualizada con éxito',
      especialidad: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar especialidad:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
}

// Mapeos de consultas existentes
async function medicosPorEspecialidad(req, res) {
  const { id } = req.params;
  try {
    // ¡AQUÍ ESTÁ LA MAGIA! Agregamos m.foto_url al SELECT
    const resultado = await pool.query(
      `SELECT m.id, u.nombre, u.primer_apellido, m.tarifa, m.calificacion,
              m.acepta_teleconsulta, m.acepta_presencial, m.biografia, m.anos_experiencia,
              m.foto_url
       FROM medicos m
       JOIN usuarios u ON m.id_usuario = u.id
       WHERE m.id_especialidad = $1 AND m.activo = TRUE AND u.activo = TRUE
       ORDER BY u.nombre`,
      [id]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en medicosPorEspecialidad:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener médicos.' });
  }
}

async function disponibilidad(req, res) {
  const { medico_id, fecha } = req.query;
  try {
    const resultado = await pool.query(
      `SELECT id, hora_inicio, hora_fin, disponible 
       FROM franjas_horarias 
       WHERE id_medico = $1 AND fecha = $2 AND disponible = TRUE
       ORDER BY hora_inicio ASC`,
      [medico_id, fecha]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en disponibilidad:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener disponibilidad.' });
  }
}

async function disponibilidadRango(req, res) {
  const { medico_id, inicio, fin } = req.query;
  try {
    const resultado = await pool.query(
      `SELECT f.id, f.fecha, f.hora_inicio, f.hora_fin
       FROM franjas_horarias f
       WHERE f.id_medico = $1 AND f.fecha BETWEEN $2 AND $3 AND f.disponible = TRUE
       ORDER BY f.fecha, f.hora_inicio`,
      [medico_id, inicio, fin]
    );
    const eventos = resultado.rows.map((f) => {
      const fechaStr = f.fecha instanceof Date ? f.fecha.toISOString().split('T')[0] : String(f.fecha).split('T')[0];
      return {
        id: `franja-${f.id}`,
        title: f.hora_inicio.substring(0, 5),
        start: `${fechaStr}T${f.hora_inicio}`,
        end: `${fechaStr}T${f.hora_fin}`,
        backgroundColor: '#1A7A52',
        borderColor: '#145C3E',
        textColor: '#fff',
        extendedProps: {
          id_franja: f.id,
          hora_inicio: f.hora_inicio,
          hora_fin: f.hora_fin,
          fecha: fechaStr
        }
      };
    });
    res.json(eventos);
  } catch (error) {
    console.error('Error en disponibilidadRango:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener las franjas.' });
  }
}

module.exports = {
  listarEspecialidades,
  listarEspecialidadesAdmin,
  crearEspecialidad,
  actualizarEspecialidad,
  medicosPorEspecialidad,
  disponibilidad,
  disponibilidadRango
};