const pool = require('../config/db');

// ─── POST /historias — Crear historia clínica ─────────────────────────────
async function crearHistoria(req, res) {
  const id_usuario = req.usuario.id;
  const {
    id_cita,
    motivo_consulta,
    anamnesis,
    examen_fisico,
    diagnostico_cie10,
    descripcion_diagnostico,
    plan_tratamiento,
    medicamentos_recetados,
    observaciones,
  } = req.body;

  if (!id_cita || !motivo_consulta)
    return res.status(400).json({ mensaje: 'id_cita y motivo_consulta son obligatorios.' });

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });

    const id_medico = medicoRes.rows[0].id;

    const cita = await pool.query(
      'SELECT id, id_paciente FROM citas WHERE id=$1 AND id_medico=$2',
      [id_cita, id_medico]
    );
    if (cita.rows.length === 0)
      return res.status(403).json({ mensaje: 'La cita no existe o no te pertenece.' });

    const existe = await pool.query(
      'SELECT id FROM historias_clinicas WHERE id_cita = $1',
      [id_cita]
    );
    if (existe.rows.length > 0)
      return res.status(409).json({ mensaje: 'Ya existe una historia clínica para esta cita.' });

    const id_paciente = cita.rows[0].id_paciente;

    const nueva = await pool.query(
      `INSERT INTO historias_clinicas
         (id_cita, id_paciente, id_medico, motivo_consulta, anamnesis,
          examen_fisico, diagnostico_cie10, descripcion_diagnostico,
          plan_tratamiento, medicamentos_recetados, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        id_cita, id_paciente, id_medico, motivo_consulta,
        anamnesis || null,
        examen_fisico || null,
        diagnostico_cie10 || null,
        descripcion_diagnostico || null,
        plan_tratamiento || null,
        medicamentos_recetados || null,
        observaciones || null,
      ]
    );

    // Marcar la cita como completada
    await pool.query(
      "UPDATE citas SET estado='completada', updated_at=NOW() WHERE id=$1",
      [id_cita]
    );

    res.status(201).json({ mensaje: 'Historia clínica creada.', historia: nueva.rows[0] });
  } catch (err) {
    console.error('Error en crearHistoria:', err.message);
    res.status(500).json({ mensaje: 'Error al crear la historia.' });
  }
}


// ─── PUT /historias/:id — Actualizar historia ─────────────────────────────
async function actualizarHistoria(req, res) {
  const { id } = req.params;
  const id_usuario = req.usuario.id;
  const {
    motivo_consulta, anamnesis, examen_fisico,
    diagnostico_cie10, descripcion_diagnostico,
    plan_tratamiento, medicamentos_recetados, observaciones,
  } = req.body;

  if (!motivo_consulta)
    return res.status(400).json({ mensaje: 'motivo_consulta es obligatorio.' });

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });

    const id_medico = medicoRes.rows[0].id;

    const historia = await pool.query(
      'SELECT id_medico FROM historias_clinicas WHERE id=$1',
      [id]
    );
    if (historia.rows.length === 0)
      return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });
    if (historia.rows[0].id_medico !== id_medico)
      return res.status(403).json({ mensaje: 'No puedes editar una historia ajena.' });

    const actualizada = await pool.query(
      `UPDATE historias_clinicas SET
         motivo_consulta=$1, anamnesis=$2, examen_fisico=$3,
         diagnostico_cie10=$4, descripcion_diagnostico=$5,
         plan_tratamiento=$6, medicamentos_recetados=$7,
         observaciones=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [
        motivo_consulta, anamnesis, examen_fisico,
        diagnostico_cie10, descripcion_diagnostico,
        plan_tratamiento, medicamentos_recetados, observaciones, id,
      ]
    );

    res.json({ mensaje: 'Historia actualizada.', historia: actualizada.rows[0] });
  } catch (err) {
    console.error('Error en actualizarHistoria:', err.message);
    res.status(500).json({ mensaje: 'Error al actualizar la historia.' });
  }
}


// ─── GET /historias/:id_cita — Obtener historia por cita ──────────────────
async function obtenerHistoria(req, res) {
  const { id_cita } = req.params;
  try {
    const resultado = await pool.query(
      'SELECT * FROM historias_clinicas WHERE id_cita=$1',
      [id_cita]
    );
    res.json({ historia: resultado.rows[0] || null });
  } catch (err) {
    console.error('Error en obtenerHistoria:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener la historia.' });
  }
}


// ─── GET /historias/paciente/:id_paciente — Historial del paciente ─────────
async function historialPaciente(req, res) {
  const id_usuario_auth = req.usuario.id;
  const { id_paciente } = req.params;

  // Solo el mismo paciente o un médico puede ver el historial
  if (
    req.usuario.rol === 'paciente' &&
    parseInt(id_paciente) !== id_usuario_auth
  ) {
    return res.status(403).json({ mensaje: 'No puedes ver el historial de otro paciente.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT hc.*,
              u.nombre AS medico_nombre, u.primer_apellido AS medico_apellido,
              e.nombre AS especialidad,
              c.fecha, c.hora_inicio
       FROM historias_clinicas hc
       JOIN medicos m ON hc.id_medico = m.id
       JOIN usuarios u ON m.id_usuario = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       JOIN citas c ON hc.id_cita = c.id
       WHERE hc.id_paciente = $1
       ORDER BY hc.created_at DESC`,
      [id_paciente]
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('Error en historialPaciente:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener el historial.' });
  }
}

module.exports = { crearHistoria, actualizarHistoria, obtenerHistoria, historialPaciente };