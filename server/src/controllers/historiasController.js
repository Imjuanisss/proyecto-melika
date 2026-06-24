// server/src/controllers/historiasController.js

const pool = require('../config/db');

// ─── Utilidad: normalizar medicamentos_recetados ───────────────────────────────
// La columna `medicamentos_recetados` es JSONB en la BD.
// El médico escribe texto libre en el formulario (un string).
// Esta función convierte ese string en un formato JSON válido
// que PostgreSQL acepta, y a la inversa al leer.
//
// Estrategia:
//   - Entrada (frontend → BD): si ya es objeto/array lo guarda tal cual.
//     Si es string, lo envuelve en { texto: "..." } para que sea JSON válido.
//     Si es null/undefined/vacío, guarda null.
//   - Salida (BD → frontend): si el JSONB tiene la forma { texto: "..." },
//     devuelve solo el string. Si tiene otra forma, devuelve la representación
//     en texto para que el textarea lo muestre correctamente.
// ──────────────────────────────────────────────────────────────────────────────

function normalizarMedicamentosParaBD(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  // Si ya es un objeto/array (no debería ocurrir desde el form, pero lo cubrimos)
  if (typeof valor === 'object') return valor;

  // Es un string — lo envolvemos en { texto } para que JSONB lo acepte
  const texto = String(valor).trim();
  if (!texto) return null;

  return { texto };
}

function normalizarMedicamentosParaFrontend(valor) {
  if (valor === null || valor === undefined) return '';

  // Forma canónica guardada por nosotros: { texto: "..." }
  if (typeof valor === 'object' && valor.texto !== undefined) {
    return String(valor.texto);
  }

  // Cualquier otro JSONB — convertir a string legible
  if (typeof valor === 'object') {
    return JSON.stringify(valor, null, 2);
  }

  return String(valor);
}


// ─── POST /historias — Crear historia clínica ─────────────────────────────────
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

  if (!id_cita || !motivo_consulta?.trim()) {
    return res.status(400).json({ mensaje: 'id_cita y motivo_consulta son obligatorios.' });
  }

  try {
    // Verificar que el usuario autenticado tiene perfil de médico
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0) {
      return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });
    }

    const id_medico = medicoRes.rows[0].id;

    // Verificar que la cita pertenece a este médico
    const citaRes = await pool.query(
      'SELECT id, id_paciente FROM citas WHERE id = $1 AND id_medico = $2',
      [id_cita, id_medico]
    );
    if (citaRes.rows.length === 0) {
      return res.status(403).json({ mensaje: 'La cita no existe o no te pertenece.' });
    }

    // Verificar que no existe ya una historia para esta cita
    const existeRes = await pool.query(
      'SELECT id FROM historias_clinicas WHERE id_cita = $1',
      [id_cita]
    );
    if (existeRes.rows.length > 0) {
      return res.status(409).json({ mensaje: 'Ya existe una historia clínica para esta cita.' });
    }

    const id_paciente = citaRes.rows[0].id_paciente;

    // ── Conversión JSONB: texto libre → objeto JSON válido para PostgreSQL ──
    const medicamentosParaBD = normalizarMedicamentosParaBD(medicamentos_recetados);

    const nueva = await pool.query(
      `INSERT INTO historias_clinicas
         (id_cita, id_paciente, id_medico,
          motivo_consulta, anamnesis, examen_fisico,
          diagnostico_cie10, descripcion_diagnostico,
          plan_tratamiento, medicamentos_recetados, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        id_cita,
        id_paciente,
        id_medico,
        motivo_consulta.trim(),
        anamnesis?.trim()               || null,
        examen_fisico?.trim()           || null,
        diagnostico_cie10?.trim()       || null,
        descripcion_diagnostico?.trim() || null,
        plan_tratamiento?.trim()        || null,
        medicamentosParaBD,                        // JSONB normalizado
        observaciones?.trim()           || null,
      ]
    );

    // Marcar la cita como completada automáticamente al crear la historia
    await pool.query(
      "UPDATE citas SET estado = 'completada', updated_at = NOW() WHERE id = $1",
      [id_cita]
    );

    // Preparar la respuesta devolviendo medicamentos como texto para el frontend
    const historiaRespuesta = {
      ...nueva.rows[0],
      medicamentos_recetados: normalizarMedicamentosParaFrontend(nueva.rows[0].medicamentos_recetados),
    };

    return res.status(201).json({
      mensaje:  'Historia clínica creada correctamente.',
      historia: historiaRespuesta,
    });
  } catch (err) {
    console.error('Error en crearHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al crear la historia clínica.' });
  }
}


// ─── PUT /historias/:id — Actualizar historia clínica ─────────────────────────
async function actualizarHistoria(req, res) {
  const { id }     = req.params;
  const id_usuario = req.usuario.id;
  const {
    motivo_consulta,
    anamnesis,
    examen_fisico,
    diagnostico_cie10,
    descripcion_diagnostico,
    plan_tratamiento,
    medicamentos_recetados,
    observaciones,
  } = req.body;

  if (!motivo_consulta?.trim()) {
    return res.status(400).json({ mensaje: 'motivo_consulta es obligatorio.' });
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

    const historiaRes = await pool.query(
      'SELECT id, id_medico FROM historias_clinicas WHERE id = $1',
      [id]
    );
    if (historiaRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });
    }
    if (historiaRes.rows[0].id_medico !== id_medico) {
      return res.status(403).json({ mensaje: 'No puedes editar una historia clínica que no es tuya.' });
    }

    // ── Conversión JSONB ─────────────────────────────────────────────────────
    const medicamentosParaBD = normalizarMedicamentosParaBD(medicamentos_recetados);

    const actualizada = await pool.query(
      `UPDATE historias_clinicas
       SET motivo_consulta         = $1,
           anamnesis               = $2,
           examen_fisico           = $3,
           diagnostico_cie10       = $4,
           descripcion_diagnostico = $5,
           plan_tratamiento        = $6,
           medicamentos_recetados  = $7,
           observaciones           = $8,
           updated_at              = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        motivo_consulta.trim(),
        anamnesis?.trim()               || null,
        examen_fisico?.trim()           || null,
        diagnostico_cie10?.trim()       || null,
        descripcion_diagnostico?.trim() || null,
        plan_tratamiento?.trim()        || null,
        medicamentosParaBD,
        observaciones?.trim()           || null,
        id,
      ]
    );

    const historiaRespuesta = {
      ...actualizada.rows[0],
      medicamentos_recetados: normalizarMedicamentosParaFrontend(actualizada.rows[0].medicamentos_recetados),
    };

    return res.json({
      mensaje:  'Historia clínica actualizada correctamente.',
      historia: historiaRespuesta,
    });
  } catch (err) {
    console.error('Error en actualizarHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al actualizar la historia clínica.' });
  }
}


// ─── GET /historias/cita/:id_cita — Obtener historia por cita ─────────────────
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

    const historia = resultado.rows[0];

    // Normalizar medicamentos para que el frontend reciba texto plano
    const historiaRespuesta = {
      ...historia,
      medicamentos_recetados: normalizarMedicamentosParaFrontend(historia.medicamentos_recetados),
    };

    return res.json({ historia: historiaRespuesta });
  } catch (err) {
    console.error('Error en obtenerHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia clínica.' });
  }
}


// ─── GET /historias/paciente/:id_paciente — Historial completo del paciente ────
async function historialPaciente(req, res) {
  const id_usuario_auth = req.usuario.id;
  const { id_paciente } = req.params;

  // Solo el mismo paciente o un médico pueden ver el historial
  if (req.usuario.rol === 'paciente' && parseInt(id_paciente) !== id_usuario_auth) {
    return res.status(403).json({ mensaje: 'No puedes ver el historial de otro paciente.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT
          hc.*,
          u.nombre          AS medico_nombre,
          u.primer_apellido AS medico_apellido,
          e.nombre          AS especialidad,
          TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
          c.hora_inicio
       FROM historias_clinicas hc
       JOIN medicos       m  ON hc.id_medico     = m.id
       JOIN usuarios      u  ON m.id_usuario     = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       JOIN citas         c  ON hc.id_cita       = c.id
       WHERE hc.id_paciente = $1
       ORDER BY hc.created_at DESC`,
      [id_paciente]
    );

    // Normalizar medicamentos en cada registro del historial
    const historias = resultado.rows.map(h => ({
      ...h,
      medicamentos_recetados: normalizarMedicamentosParaFrontend(h.medicamentos_recetados),
    }));

    return res.json(historias);
  } catch (err) {
    console.error('Error en historialPaciente:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el historial del paciente.' });
  }
}


module.exports = {
  crearHistoria,
  actualizarHistoria,
  obtenerHistoria,
  historialPaciente,
};