// server/src/controllers/historiasController.js
// MELIKA — Controlador integral de Historias Clínicas y Documentos Clínicos
// Incluye validación profesional end-to-end antes de cualquier persistencia.

'use strict';

const pool = require('../config/db');
const { validarHistoriaPrincipal, validarNotaAclaracion } = require('../utils/validacionesHistoria');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function normalizarMedicamentosParaBD(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') {
    const txt = valor.trim();
    return txt ? JSON.stringify({ texto: txt }) : null;
  }
  if (typeof valor === 'object' && valor.texto) {
    return JSON.stringify({ texto: String(valor.texto).trim() });
  }
  return JSON.stringify({ texto: String(valor) });
}

function normalizarMedicamentosParaFrontend(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor);
      return parsed.texto || valor;
    } catch {
      return valor;
    }
  }
  if (typeof valor === 'object') {
    return valor.texto || JSON.stringify(valor);
  }
  return String(valor);
}

async function resolverIdMedico(id_usuario) {
  const res = await pool.query('SELECT id FROM medicos WHERE id_usuario = $1', [id_usuario]);
  return res.rows.length > 0 ? res.rows[0].id : null;
}

async function citaExisteEntreAmbosPorPaciente(id_paciente, id_medico) {
  if (!id_medico) return false;
  const res = await pool.query(
    `SELECT id FROM citas WHERE id_paciente = $1 AND id_medico = $2 LIMIT 1`,
    [id_paciente, id_medico]
  );
  return res.rows.length > 0;
}

async function citaExisteEntreAmbosPorCita(id_cita, id_medico) {
  const res = await pool.query(
    `SELECT id, id_paciente FROM citas WHERE id = $1 AND id_medico = $2`,
    [id_cita, id_medico]
  );
  return res.rows.length > 0 ? res.rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /historias — CON VALIDACIÓN PROFESIONAL + SOPORTE RECETAS/EXÁMENES
// ─────────────────────────────────────────────────────────────────────────────
async function crearHistoria(req, res) {
  const id_usuario = req.usuario.id;

  const {
    id_cita, tipo_consulta, eps_aseguradora, contacto_responsable_nombre, contacto_responsable_telefono,
    motivo_consulta, anamnesis, antecedentes_patologicos, antecedentes_quirurgicos, antecedentes_alergicos,
    antecedentes_familiares, antecedentes_ginecoobstetricos, habitos, tension_arterial_sistolica,
    tension_arterial_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, temperatura_corporal,
    peso_kg, talla_cm, exploracion_por_sistemas, examen_fisico, diagnostico_cie10, descripcion_diagnostico,
    plan_tratamiento, medicamentos_recetados, ordenes_medicas, recomendaciones, incapacidad_dias,
    observaciones, medico_nombre_firma, medico_cedula_firma, medico_rethus_firma,
    recetas = [], examenes = []
  } = req.body;

  if (!id_cita) {
    return res.status(400).json({ mensaje: 'id_cita es obligatorio.' });
  }

  // ── VALIDACIÓN PROFESIONAL COMPLETA ───────────────────────────────────────
  // Se valida ANTES de tocar la base de datos: ninguna historia incompleta
  // o clínicamente inconsistente debe llegar a persistirse.
  const errores = validarHistoriaPrincipal(req.body);
  if (errores.length > 0) {
    return res.status(422).json({
      mensaje: 'La historia clínica contiene campos obligatorios sin diligenciar o inconsistencias clínicas.',
      errores,
    });
  }

  try {
    const id_medico = await resolverIdMedico(id_usuario);
    if (!id_medico) return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });

    const cita = await citaExisteEntreAmbosPorCita(id_cita, id_medico);
    if (!cita) return res.status(403).json({ mensaje: 'La cita no existe o no corresponde a tu agenda.' });

    const existe = await pool.query(
      `SELECT id FROM historias_clinicas WHERE id_cita = $1 AND tipo_registro = 'historia_principal'`,
      [id_cita]
    );
    if (existe.rows.length > 0) return res.status(409).json({ mensaje: 'Ya existe una historia clínica para esta cita.' });

    let imcCalculado = null;
    if (peso_kg && talla_cm && parseFloat(talla_cm) > 0) {
      imcCalculado = parseFloat((parseFloat(peso_kg) / Math.pow(parseFloat(talla_cm) / 100, 2)).toFixed(2));
    }

    const medicamentosParaBD = normalizarMedicamentosParaBD(medicamentos_recetados);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nueva = await client.query(
        `INSERT INTO historias_clinicas (
          id_cita, id_paciente, id_medico, tipo_registro, estado, tipo_consulta,
          eps_aseguradora, contacto_responsable_nombre, contacto_responsable_telefono,
          motivo_consulta, anamnesis, antecedentes_patologicos, antecedentes_quirurgicos, antecedentes_alergicos,
          antecedentes_familiares, antecedentes_ginecoobstetricos, habitos,
          tension_arterial_sistolica, tension_arterial_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, temperatura_corporal,
          peso_kg, talla_cm, imc, exploracion_por_sistemas, examen_fisico,
          diagnostico_cie10, descripcion_diagnostico, plan_tratamiento, medicamentos_recetados,
          ordenes_medicas, recomendaciones, incapacidad_dias, observaciones,
          medico_nombre_firma, medico_cedula_firma, medico_rethus_firma
        ) VALUES (
          $1, $2, $3, 'historia_principal', 'activo', $4,
          $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
        ) RETURNING *`,
        [
          id_cita, cita.id_paciente, id_medico, tipo_consulta?.trim() || 'presencial',
          eps_aseguradora?.trim() || null, contacto_responsable_nombre?.trim() || null, contacto_responsable_telefono?.trim() || null,
          motivo_consulta.trim(), anamnesis.trim(), antecedentes_patologicos.trim(), antecedentes_quirurgicos?.trim() || null, antecedentes_alergicos.trim(),
          antecedentes_familiares?.trim() || null, antecedentes_ginecoobstetricos?.trim() || null, habitos?.trim() || null,
          tension_arterial_sistolica || null, tension_arterial_diastolica || null, frecuencia_cardiaca || null, frecuencia_respiratoria || null, temperatura_corporal || null,
          peso_kg || null, talla_cm || null, imcCalculado, exploracion_por_sistemas?.trim() || null, examen_fisico.trim(),
          diagnostico_cie10.trim().toUpperCase(), descripcion_diagnostico.trim(), plan_tratamiento.trim(), medicamentosParaBD,
          ordenes_medicas?.trim() || null, recomendaciones?.trim() || null, incapacidad_dias || null, observaciones?.trim() || null,
          medico_nombre_firma.trim(), medico_cedula_firma?.trim() || null, medico_rethus_firma.trim()
        ]
      );

      const id_historia_nueva = nueva.rows[0].id;

      if (recetas && recetas.length > 0) {
        for (const receta of recetas) {
          await client.query(
            `INSERT INTO recetas_medicas (id_historia, medicamento, dosis, frecuencia, duracion, via_administracion, indicaciones)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id_historia_nueva, receta.medicamento.trim(), receta.dosis.trim(), receta.frecuencia.trim(),
              receta.duracion.trim(), receta.via_administracion?.trim() || null, receta.indicaciones?.trim() || null
            ]
          );
        }
      }

      if (examenes && examenes.length > 0) {
        for (const examen of examenes) {
          await client.query(
            `INSERT INTO ordenes_examenes (id_historia, tipo_examen, nombre_examen, justificacion_clinica)
             VALUES ($1, $2, $3, $4)`,
            [id_historia_nueva, examen.tipo_examen, examen.nombre_examen.trim(), examen.justificacion_clinica?.trim() || null]
          );
        }
      }

      await client.query("UPDATE citas SET estado = 'completada', updated_at = NOW() WHERE id = $1", [id_cita]);
      await client.query('COMMIT');

      const historiaRespuesta = {
        ...nueva.rows[0],
        medicamentos_recetados: normalizarMedicamentosParaFrontend(nueva.rows[0].medicamentos_recetados),
      };

      res.status(201).json({ mensaje: 'Historia, recetas y exámenes guardados exitosamente.', historia: historiaRespuesta });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en crearHistoria:', err.message);
    // Constraint de BD violado (defensa en profundidad) → mensaje claro
    if (err.code === '23514') {
      return res.status(422).json({ mensaje: 'La historia clínica viola una regla de integridad clínica (rango fuera de límite o campo inconsistente).' });
    }
    return res.status(500).json({ mensaje: 'Error interno al crear la historia clínica.' });
  }
}

// ─── PUT /historias/:id — Actualizar historia clínica (nota aclaración/evolución) ──
async function actualizarHistoria(req, res) {
  const id_usuario = req.usuario.id;
  const { id } = req.params;
  const {
    tipo_registro, motivo_consulta, anamnesis, antecedentes_patologicos, antecedentes_quirurgicos,
    antecedentes_alergicos, antecedentes_familiares, antecedentes_ginecoobstetricos, habitos,
    tension_arterial_sistolica, tension_arterial_diastolica, frecuencia_cardiaca, frecuencia_respiratoria,
    temperatura_corporal, peso_kg, talla_cm, exploracion_por_sistemas, examen_fisico, diagnostico_cie10,
    descripcion_diagnostico, plan_tratamiento, medicamentos_recetados, ordenes_medicas, recomendaciones,
    incapacidad_dias, observaciones, medico_nombre_firma, medico_cedula_firma, medico_rethus_firma,
    recetas = [], examenes = [],
  } = req.body;

  const tiposValidos = ['nota_aclaracion', 'nota_evolucion'];
  if (!tiposValidos.includes(tipo_registro)) {
    return res.status(400).json({ mensaje: "tipo_registro debe ser 'nota_aclaracion' o 'nota_evolucion'." });
  }

  // ── VALIDACIÓN PROFESIONAL DE LA NOTA ─────────────────────────────────────
  const errores = validarNotaAclaracion(req.body);
  if (errores.length > 0) {
    return res.status(422).json({
      mensaje: 'La nota contiene campos obligatorios sin diligenciar o inconsistencias clínicas.',
      errores,
    });
  }

  try {
    const id_medico = await resolverIdMedico(id_usuario);
    if (!id_medico) return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });

    const historiaRes = await pool.query(
      `SELECT id, id_paciente, id_cita, id_medico FROM historias_clinicas WHERE id = $1 AND tipo_registro = 'historia_principal'`,
      [id]
    );
    if (historiaRes.rows.length === 0) return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });
    if (historiaRes.rows[0].id_medico !== id_medico) return res.status(403).json({ mensaje: 'Solo el médico autor puede agregar notas.' });

    const historiaOriginal = historiaRes.rows[0];
    let imcCalculado = null;
    if (peso_kg && talla_cm && parseFloat(talla_cm) > 0) {
      imcCalculado = parseFloat((parseFloat(peso_kg) / Math.pow(parseFloat(talla_cm) / 100, 2)).toFixed(2));
    }
    const medicamentosParaBD = normalizarMedicamentosParaBD(medicamentos_recetados);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const aclaracion = await client.query(
        `INSERT INTO historias_clinicas (
          id_cita, id_paciente, id_medico, tipo_registro, estado, id_historia_original, motivo_consulta, anamnesis,
          antecedentes_patologicos, antecedentes_quirurgicos, antecedentes_alergicos, antecedentes_familiares, antecedentes_ginecoobstetricos, habitos,
          tension_arterial_sistolica, tension_arterial_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, temperatura_corporal, peso_kg, talla_cm, imc,
          exploracion_por_sistemas, examen_fisico, diagnostico_cie10, descripcion_diagnostico, plan_tratamiento, medicamentos_recetados,
          ordenes_medicas, recomendaciones, incapacidad_dias, observaciones, medico_nombre_firma, medico_cedula_firma, medico_rethus_firma
        ) VALUES (
          $1, $2, $3, $4, 'activo', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
        ) RETURNING *`,
        [
          historiaOriginal.id_cita, historiaOriginal.id_paciente, id_medico, tipo_registro, parseInt(id),
          motivo_consulta.trim(), anamnesis?.trim() || null, antecedentes_patologicos?.trim() || null, antecedentes_quirurgicos?.trim() || null, antecedentes_alergicos?.trim() || null,
          antecedentes_familiares?.trim() || null, antecedentes_ginecoobstetricos?.trim() || null, habitos?.trim() || null,
          tension_arterial_sistolica || null, tension_arterial_diastolica || null, frecuencia_cardiaca || null, frecuencia_respiratoria || null, temperatura_corporal || null,
          peso_kg || null, talla_cm || null, imcCalculado, exploracion_por_sistemas?.trim() || null, examen_fisico?.trim() || null,
          diagnostico_cie10?.trim().toUpperCase() || null, descripcion_diagnostico?.trim() || null, plan_tratamiento?.trim() || null, medicamentosParaBD,
          ordenes_medicas?.trim() || null, recomendaciones?.trim() || null, incapacidad_dias || null, observaciones?.trim() || null,
          medico_nombre_firma.trim(), medico_cedula_firma?.trim() || null, medico_rethus_firma.trim(),
        ]
      );

      const id_nota = aclaracion.rows[0].id;

      if (recetas && recetas.length > 0) {
        for (const r of recetas) {
          await client.query(
            `INSERT INTO recetas_medicas (id_historia, medicamento, dosis, frecuencia, duracion, via_administracion, indicaciones)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [id_nota, r.medicamento.trim(), r.dosis.trim(), r.frecuencia.trim(), r.duracion.trim(), r.via_administracion?.trim() || null, r.indicaciones?.trim() || null]
          );
        }
      }

      if (examenes && examenes.length > 0) {
        for (const ex of examenes) {
          await client.query(
            `INSERT INTO ordenes_examenes (id_historia, tipo_examen, nombre_examen, justificacion_clinica)
             VALUES ($1,$2,$3,$4)`,
            [id_nota, ex.tipo_examen, ex.nombre_examen.trim(), ex.justificacion_clinica?.trim() || null]
          );
        }
      }

      await client.query('COMMIT');

      const aclaracionRespuesta = {
        ...aclaracion.rows[0],
        medicamentos_recetados: normalizarMedicamentosParaFrontend(aclaracion.rows[0].medicamentos_recetados),
      };

      return res.status(201).json({ mensaje: 'Nota de aclaración/evolución registrada exitosamente.', aclaracion: aclaracionRespuesta });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en actualizarHistoria:', err.message);
    if (err.code === '23514') {
      return res.status(422).json({ mensaje: 'La nota viola una regla de integridad clínica (rango fuera de límite o campo inconsistente).' });
    }
    return res.status(500).json({ mensaje: 'Error interno al registrar la aclaración.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/cita/:id_cita
// ─────────────────────────────────────────────────────────────────────────────
async function obtenerHistoria(req, res) {
  const { id_cita }     = req.params;
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;

  try {
    const historiaRes = await pool.query(
      `SELECT hc.*,
              up.nombre           AS paciente_nombre,
              up.primer_apellido  AS paciente_apellido,
              up.tipo_documento   AS paciente_tipo_doc,
              up.numero_documento AS paciente_num_doc,
              up.fecha_nacimiento AS paciente_fecha_nac,
              up.telefono         AS paciente_telefono,
              up.direccion        AS paciente_direccion,
              up.ciudad           AS paciente_ciudad,
              up.genero           AS paciente_genero,
              um.nombre           AS medico_nombre,
              um.primer_apellido  AS medico_apellido,
              e.nombre            AS especialidad,
              TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha_cita,
              c.hora_inicio,
              c.tipo_consulta     AS tipo_cita
       FROM historias_clinicas hc
       JOIN usuarios       up ON hc.id_paciente    = up.id
       JOIN medicos        m  ON hc.id_medico      = m.id
       JOIN usuarios       um ON m.id_usuario      = um.id
       JOIN especialidades e  ON m.id_especialidad = e.id
       JOIN citas          c  ON hc.id_cita        = c.id
       WHERE hc.id_cita = $1 AND hc.tipo_registro = 'historia_principal'`,
      [id_cita]
    );

    if (historiaRes.rows.length === 0) return res.json({ historia: null, aclaraciones: [], recetas: [], examenes: [] });

    const historia = {
      ...historiaRes.rows[0],
      medicamentos_recetados: normalizarMedicamentosParaFrontend(historiaRes.rows[0].medicamentos_recetados),
    };

    if (rol === 'paciente' && historia.id_paciente !== id_usuario_auth) {
      return res.status(403).json({ mensaje: 'No tienes permiso para ver este documento.' });
    }

    if (rol === 'medico') {
      const id_medico = await resolverIdMedico(id_usuario_auth);
      if (!id_medico) return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });
      const tieneAcceso = historia.id_medico === id_medico || (await citaExisteEntreAmbosPorPaciente(historia.id_paciente, id_medico));
      if (!tieneAcceso) return res.status(403).json({ mensaje: 'No tienes acceso a este expediente clínico.' });
    }

    // Aclaraciones
    const aclaRes = await pool.query(
      `SELECT * FROM historias_clinicas WHERE id_historia_original = $1 AND tipo_registro IN ('nota_aclaracion', 'nota_evolucion') ORDER BY created_at ASC`,
      [historia.id]
    );
    const aclaraciones = aclaRes.rows.map(ac => ({
      ...ac, medicamentos_recetados: normalizarMedicamentosParaFrontend(ac.medicamentos_recetados),
    }));

    // Recetas
    const recetasRes = await pool.query(`SELECT * FROM recetas_medicas WHERE id_historia = $1 ORDER BY id ASC`, [historia.id]);

    // Exámenes
    const examenesRes = await pool.query(`SELECT * FROM ordenes_examenes WHERE id_historia = $1 ORDER BY id ASC`, [historia.id]);

    return res.json({
      historia,
      aclaraciones,
      recetas: recetasRes.rows,
      examenes: examenesRes.rows
    });
  } catch (err) {
    console.error('Error en obtenerHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia clínica.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/:id/completa
// ─────────────────────────────────────────────────────────────────────────────
async function obtenerHistoriaCompleta(req, res) {
  const { id }          = req.params;
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;

  try {
    const historiaRes = await pool.query(
      `SELECT hc.*,
              up.nombre           AS paciente_nombre, up.primer_apellido  AS paciente_apellido,
              up.tipo_documento   AS paciente_tipo_doc, up.numero_documento AS paciente_num_doc,
              up.fecha_nacimiento AS paciente_fecha_nac, up.telefono         AS paciente_telefono,
              up.direccion        AS paciente_direccion, up.ciudad           AS paciente_ciudad,
              up.genero           AS paciente_genero,
              um.nombre           AS medico_nombre, um.primer_apellido  AS medico_apellido,
              e.nombre            AS especialidad,
              TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha_cita, c.hora_inicio, c.tipo_consulta     AS tipo_cita,
              COALESCE(hc.eps_aseguradora, '') AS eps_aseguradora
       FROM historias_clinicas hc
       JOIN usuarios       up ON hc.id_paciente    = up.id
       JOIN medicos        m  ON hc.id_medico      = m.id
       JOIN usuarios       um ON m.id_usuario      = um.id
       JOIN especialidades e  ON m.id_especialidad = e.id
       JOIN citas          c  ON hc.id_cita        = c.id
       WHERE hc.id = $1 AND hc.tipo_registro = 'historia_principal'`,
      [id]
    );

    if (historiaRes.rows.length === 0) return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });

    const historia = { ...historiaRes.rows[0], medicamentos_recetados: normalizarMedicamentosParaFrontend(historiaRes.rows[0].medicamentos_recetados) };

    if (rol === 'paciente' && historia.id_paciente !== id_usuario_auth) return res.status(403).json({ mensaje: 'Acceso no autorizado.' });
    if (rol === 'medico') {
      const id_medico = await resolverIdMedico(id_usuario_auth);
      const tieneAcceso = historia.id_medico === id_medico || (await citaExisteEntreAmbosPorPaciente(historia.id_paciente, id_medico));
      if (!tieneAcceso) return res.status(403).json({ mensaje: 'Acceso no autorizado a este expediente.' });
    }

    const aclaRes = await pool.query(`SELECT * FROM historias_clinicas WHERE id_historia_original = $1 AND tipo_registro IN ('nota_aclaracion', 'nota_evolucion') ORDER BY created_at ASC`, [historia.id]);
    const aclaraciones = aclaRes.rows.map(ac => ({ ...ac, medicamentos_recetados: normalizarMedicamentosParaFrontend(ac.medicamentos_recetados) }));

    // Recetas y Exámenes
    const recetasRes = await pool.query(`SELECT * FROM recetas_medicas WHERE id_historia = $1 ORDER BY id ASC`, [historia.id]);
    const examenesRes = await pool.query(`SELECT * FROM ordenes_examenes WHERE id_historia = $1 ORDER BY id ASC`, [historia.id]);

    return res.json({
      historia,
      aclaraciones,
      recetas: recetasRes.rows,
      examenes: examenesRes.rows
    });
  } catch (err) {
    console.error('Error en obtenerHistoriaCompleta:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia completa.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/paciente/:id_paciente
// ─────────────────────────────────────────────────────────────────────────────
async function historialPaciente(req, res) {
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;
  const { id_paciente } = req.params;

  if (rol === 'paciente' && parseInt(id_paciente) !== id_usuario_auth) return res.status(403).json({ mensaje: 'No puedes consultar el historial de otro paciente.' });
  if (rol === 'medico') {
    const id_medico   = await resolverIdMedico(id_usuario_auth);
    const tieneAcceso = await citaExisteEntreAmbosPorPaciente(id_paciente, id_medico);
    if (!tieneAcceso) return res.status(403).json({ mensaje: 'Solo puedes ver el historial de pacientes con los que tienes citas registradas.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT hc.id, hc.motivo_consulta, hc.diagnostico_cie10, hc.descripcion_diagnostico, hc.tipo_registro, hc.estado,
         (SELECT COUNT(*) FROM historias_clinicas ac WHERE ac.id_historia_original = hc.id AND ac.tipo_registro IN ('nota_aclaracion', 'nota_evolucion')) AS total_aclaraciones,
         um.nombre AS medico_nombre, um.primer_apellido AS medico_apellido, e.nombre AS especialidad, TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha, c.hora_inicio
       FROM historias_clinicas hc
       JOIN medicos m ON hc.id_medico = m.id
       JOIN usuarios um ON m.id_usuario = um.id
       JOIN especialidades e ON m.id_especialidad = e.id
       JOIN citas c ON hc.id_cita = c.id
       WHERE hc.id_paciente = $1 AND hc.tipo_registro = 'historia_principal' ORDER BY hc.created_at DESC`,
      [id_paciente]
    );
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en historialPaciente:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el historial.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /medico/citas/:id/gestionar
// ─────────────────────────────────────────────────────────────────────────────
async function gestionarCita(req, res) {
  const id_usuario = req.usuario.id;
  const { id }     = req.params;
  const { estado, notas_medicas } = req.body;

  const estadosValidos = ['completada', 'no_asistio'];
  if (!estadosValidos.includes(estado)) return res.status(400).json({ mensaje: "El estado debe ser 'completada' o 'no_asistio'." });

  try {
    const id_medico = await resolverIdMedico(id_usuario);
    if (!id_medico) return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });

    const cita = await pool.query('SELECT id, estado FROM citas WHERE id = $1 AND id_medico = $2', [id, id_medico]);
    if (cita.rows.length === 0) return res.status(404).json({ mensaje: 'Cita no encontrada en tu agenda.' });
    if (cita.rows[0].estado === 'cancelada') return res.status(400).json({ mensaje: 'No se puede gestionar una cita cancelada.' });

    await pool.query(
      `UPDATE citas SET estado = $1, notas_medicas = COALESCE($2, notas_medicas), updated_at = NOW() WHERE id = $3`,
      [estado, notas_medicas?.trim() || null, id]
    );

    return res.json({ mensaje: estado === 'completada' ? '✅ Cita completada.' : '📋 Paciente ausente.' });
  } catch (err) {
    console.error('Error en gestionarCita:', err.message);
    return res.status(500).json({ mensaje: 'Error al gestionar la cita.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OTRAS FUNCIONES (Documentos Clínicos)
// ─────────────────────────────────────────────────────────────────────────────
async function listarDocumentosClinicos(req, res) {
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;
  const { id_paciente } = req.params;

  if (rol === 'paciente' && parseInt(id_paciente) !== id_usuario_auth) return res.status(403).json({ mensaje: 'Acceso denegado.' });
  if (rol === 'medico') {
    const id_medico   = await resolverIdMedico(id_usuario_auth);
    const tieneAcceso = await citaExisteEntreAmbosPorPaciente(id_paciente, id_medico);
    if (!tieneAcceso) return res.status(403).json({ mensaje: 'Acceso denegado.' });
  }

  try {
    const ocultoFiltro = rol === 'paciente' ? 'AND dc.oculto_paciente = FALSE' : '';
    const resultado = await pool.query(
      `SELECT dc.*, um.nombre AS medico_nombre, um.primer_apellido AS medico_apellido, up.nombre AS paciente_nombre, up.primer_apellido AS paciente_apellido
       FROM documentos_clinicos dc
       LEFT JOIN medicos m ON dc.id_medico = m.id LEFT JOIN usuarios um ON m.id_usuario = um.id LEFT JOIN usuarios up ON dc.id_paciente = up.id
       WHERE dc.id_paciente = $1 ${ocultoFiltro} ORDER BY dc.created_at DESC`,
      [id_paciente]
    );
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarDocumentosClinicos:', err.message);
    return res.status(500).json({ mensaje: 'Error interno.' });
  }
}

async function registrarDocumentoClinco(req, res) {
  const id_usuario = req.usuario.id;
  const rol        = req.usuario.rol;
  const { id_historia, id_paciente, tipo_documento, nombre_archivo, url_pdf, descripcion } = req.body;

  if (!id_paciente || !tipo_documento || !url_pdf) return res.status(400).json({ mensaje: 'id_paciente, tipo_documento y url_pdf obligatorios.' });

  const tiposPermitidosPaciente = ['documento_externo'];
  const tiposPermitidosMedico   = ['formula_medica', 'orden_examen', 'historia_clinica'];

  if (rol === 'paciente') {
    if (!tiposPermitidosPaciente.includes(tipo_documento)) return res.status(403).json({ mensaje: 'Tipo no permitido.' });
    if (parseInt(id_paciente) !== id_usuario) return res.status(403).json({ mensaje: 'No puedes registrar para otro paciente.' });
  }

  let id_medico_fk = null;
  if (rol === 'medico') {
    if (!tiposPermitidosMedico.includes(tipo_documento)) return res.status(403).json({ mensaje: 'Tipo no permitido.' });
    id_medico_fk = await resolverIdMedico(id_usuario);
    if (!id_medico_fk) return res.status(403).json({ mensaje: 'Perfil no registrado.' });
    const tieneAcceso = await citaExisteEntreAmbosPorPaciente(id_paciente, id_medico_fk);
    if (!tieneAcceso) return res.status(403).json({ mensaje: 'Acceso denegado.' });
  }

  try {
    const nuevo = await pool.query(
      `INSERT INTO documentos_clinicos (id_historia, id_paciente, id_medico, tipo_documento, origen, nombre_archivo, url_pdf, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id_historia || null, id_paciente, id_medico_fk, tipo_documento, rol === 'medico' ? 'medico' : 'paciente', nombre_archivo || null, url_pdf, descripcion || null]
    );
    return res.status(201).json({ mensaje: 'Documento registrado.', documento: nuevo.rows[0] });
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al registrar.' });
  }
}

async function ocultarDocumentoExterno(req, res) {
  const id_usuario = req.usuario.id;
  const { id }     = req.params;

  try {
    const docRes = await pool.query('SELECT id, id_paciente, origen FROM documentos_clinicos WHERE id = $1', [id]);
    if (docRes.rows.length === 0) return res.status(404).json({ mensaje: 'No encontrado.' });
    const doc = docRes.rows[0];
    if (doc.id_paciente !== id_usuario) return res.status(403).json({ mensaje: 'Sin permiso.' });
    if (doc.origen === 'medico') return res.status(403).json({ mensaje: 'No se pueden ocultar documentos médicos.' });

    await pool.query('UPDATE documentos_clinicos SET oculto_paciente = TRUE, updated_at = NOW() WHERE id = $1', [id]);
    return res.json({ mensaje: 'Ocultado.' });
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error interno.' });
  }
}

async function obtenerDocumentoClinco(req, res) {
  const id_usuario = req.usuario.id;
  const rol        = req.usuario.rol;
  const { id }     = req.params;

  try {
    const docRes = await pool.query(
      `SELECT dc.*, um.nombre AS medico_nombre, um.primer_apellido AS medico_apellido, up.nombre AS paciente_nombre, up.primer_apellido AS paciente_apellido
       FROM documentos_clinicos dc LEFT JOIN medicos m ON dc.id_medico = m.id LEFT JOIN usuarios um ON m.id_usuario = um.id LEFT JOIN usuarios up ON dc.id_paciente = up.id
       WHERE dc.id = $1`, [id]
    );
    if (docRes.rows.length === 0) return res.status(404).json({ mensaje: 'No encontrado.' });
    const doc = docRes.rows[0];
    if (rol === 'paciente' && doc.id_paciente !== id_usuario) return res.status(403).json({ mensaje: 'Sin permiso.' });
    if (rol === 'medico') {
      const id_medico = await resolverIdMedico(id_usuario);
      const tieneAcceso = await citaExisteEntreAmbosPorPaciente(doc.id_paciente, id_medico);
      if (!tieneAcceso) return res.status(403).json({ mensaje: 'Sin permiso.' });
    }
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error interno.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  crearHistoria,
  actualizarHistoria,
  obtenerHistoria,
  obtenerHistoriaCompleta,
  historialPaciente,
  gestionarCita,
  listarDocumentosClinicos,
  registrarDocumentoClinco,
  ocultarDocumentoExterno,
  obtenerDocumentoClinco,
};