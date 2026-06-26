// server/src/controllers/historiasController.js
// MELIKA — Controlador integral de Historias Clínicas y Documentos Clínicos
// Resolución 1995/1999 · Ley 2015/2020 (Colombia)
// VERSIÓN CORREGIDA: todos los bugs de referencia, parámetros SQL y funciones faltantes resueltos.

'use strict';

const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte texto libre de medicamentos → objeto JSONB { texto: "..." }
 * para almacenamiento en PostgreSQL. Acepta string, objeto o null.
 */
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

/**
 * Extrae el texto plano del campo JSONB medicamentos_recetados
 * para enviarlo al frontend como string simple.
 */
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

/**
 * Dado el id de usuario con rol 'medico', retorna el id de su fila en `medicos`.
 */
async function resolverIdMedico(id_usuario) {
  const res = await pool.query(
    'SELECT id FROM medicos WHERE id_usuario = $1',
    [id_usuario]
  );
  return res.rows.length > 0 ? res.rows[0].id : null;
}

/**
 * Verifica que exista al menos una cita entre un paciente y un médico.
 */
async function citaExisteEntreAmbosPorPaciente(id_paciente, id_medico) {
  if (!id_medico) return false;
  const res = await pool.query(
    `SELECT id FROM citas
     WHERE id_paciente = $1 AND id_medico = $2
     LIMIT 1`,
    [id_paciente, id_medico]
  );
  return res.rows.length > 0;
}

/**
 * Verifica que una cita específica pertenezca al médico indicado.
 * Retorna { id, id_paciente } o null.
 */
async function citaExisteEntreAmbosPorCita(id_cita, id_medico) {
  const res = await pool.query(
    `SELECT id, id_paciente FROM citas
     WHERE id = $1 AND id_medico = $2`,
    [id_cita, id_medico]
  );
  return res.rows.length > 0 ? res.rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /historias
// Crear historia clínica principal (solo el médico con la cita vinculada).
// ─────────────────────────────────────────────────────────────────────────────
async function crearHistoria(req, res) {
  const id_usuario = req.usuario.id;

  const {
    id_cita,
    tipo_consulta,
    eps_aseguradora,
    contacto_responsable_nombre,
    contacto_responsable_telefono,
    motivo_consulta,
    anamnesis,
    antecedentes_patologicos,
    antecedentes_quirurgicos,
    antecedentes_alergicos,
    antecedentes_familiares,
    antecedentes_ginecoobstetricos,
    habitos,
    tension_arterial_sistolica,
    tension_arterial_diastolica,
    frecuencia_cardiaca,
    frecuencia_respiratoria,
    temperatura_corporal,
    peso_kg,
    talla_cm,
    exploracion_por_sistemas,
    examen_fisico,
    diagnostico_cie10,
    descripcion_diagnostico,
    plan_tratamiento,
    medicamentos_recetados,
    ordenes_medicas,
    recomendaciones,
    incapacidad_dias,
    observaciones,
    medico_nombre_firma,
    medico_cedula_firma,
    medico_rethus_firma,
  } = req.body;

  if (!id_cita || !motivo_consulta?.trim()) {
    return res.status(400).json({
      mensaje: 'id_cita y motivo_consulta son campos obligatorios.',
    });
  }

  try {
    const id_medico = await resolverIdMedico(id_usuario);
    if (!id_medico) {
      return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });
    }

    // Verificar que la cita pertenece a este médico
    const cita = await citaExisteEntreAmbosPorCita(id_cita, id_medico);
    if (!cita) {
      return res.status(403).json({
        mensaje: 'La cita no existe o no corresponde a tu agenda.',
      });
    }

    // Verificar que no exista ya una historia principal para esta cita
    const existe = await pool.query(
      `SELECT id FROM historias_clinicas
       WHERE id_cita = $1 AND tipo_registro = 'historia_principal'`,
      [id_cita]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({
        mensaje: 'Ya existe una historia clínica registrada para esta cita.',
      });
    }

    // IMC calculado en el backend
    let imcCalculado = null;
    if (peso_kg && talla_cm && parseFloat(talla_cm) > 0) {
      imcCalculado = parseFloat(
        (parseFloat(peso_kg) / Math.pow(parseFloat(talla_cm) / 100, 2)).toFixed(2)
      );
    }

    const medicamentosParaBD = normalizarMedicamentosParaBD(medicamentos_recetados);

    const nueva = await pool.query(
      `INSERT INTO historias_clinicas (
        id_cita, id_paciente, id_medico,
        tipo_registro, estado,
        tipo_consulta,
        eps_aseguradora, contacto_responsable_nombre, contacto_responsable_telefono,
        motivo_consulta, anamnesis,
        antecedentes_patologicos, antecedentes_quirurgicos, antecedentes_alergicos,
        antecedentes_familiares, antecedentes_ginecoobstetricos, habitos,
        tension_arterial_sistolica, tension_arterial_diastolica,
        frecuencia_cardiaca, frecuencia_respiratoria, temperatura_corporal,
        peso_kg, talla_cm, imc,
        exploracion_por_sistemas, examen_fisico,
        diagnostico_cie10, descripcion_diagnostico,
        plan_tratamiento, medicamentos_recetados,
        ordenes_medicas, recomendaciones, incapacidad_dias, observaciones,
        medico_nombre_firma, medico_cedula_firma, medico_rethus_firma
      ) VALUES (
        $1,  $2,  $3,
        'historia_principal', 'activo',
        $4,
        $5,  $6,  $7,
        $8,  $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25,
        $26, $27,
        $28, $29,
        $30, $31, $32, $33,
        $34, $35, $36
      ) RETURNING *`,
      [
        id_cita,
        cita.id_paciente,   // ← FIX: usar cita.id_paciente (no citaRes que no existe)
        id_medico,
        // $4
        tipo_consulta?.trim()                     || 'presencial',
        // $5–$7
        eps_aseguradora?.trim()                   || null,
        contacto_responsable_nombre?.trim()        || null,
        contacto_responsable_telefono?.trim()      || null,
        // $8–$9
        motivo_consulta.trim(),
        anamnesis?.trim()                          || null,
        // $10–$15
        antecedentes_patologicos?.trim()           || null,
        antecedentes_quirurgicos?.trim()           || null,
        antecedentes_alergicos?.trim()             || null,
        antecedentes_familiares?.trim()            || null,
        antecedentes_ginecoobstetricos?.trim()     || null,
        habitos?.trim()                            || null,
        // $16–$22
        tension_arterial_sistolica                 || null,
        tension_arterial_diastolica                || null,
        frecuencia_cardiaca                        || null,
        frecuencia_respiratoria                    || null,
        temperatura_corporal                       || null,
        peso_kg                                    || null,
        talla_cm                                   || null,
        // $23
        imcCalculado,
        // $24–$25
        exploracion_por_sistemas?.trim()           || null,
        examen_fisico?.trim()                      || null,
        // $26–$27
        diagnostico_cie10?.trim().toUpperCase()    || null,
        descripcion_diagnostico?.trim()            || null,
        // $28–$33
        plan_tratamiento?.trim()                   || null,
        medicamentosParaBD,
        ordenes_medicas?.trim()                    || null,
        recomendaciones?.trim()                    || null,
        incapacidad_dias                           || null,
        observaciones?.trim()                      || null,
        // $34–$36
        medico_nombre_firma?.trim()                || null,
        medico_cedula_firma?.trim()                || null,
        medico_rethus_firma?.trim()                || null,
      ]
    );

    // Marcar cita como completada
    await pool.query(
      "UPDATE citas SET estado = 'completada', updated_at = NOW() WHERE id = $1",
      [id_cita]
    );

    const historiaRespuesta = {
      ...nueva.rows[0],
      medicamentos_recetados: normalizarMedicamentosParaFrontend(nueva.rows[0].medicamentos_recetados),
    };

    return res.status(201).json({
      mensaje:  'Historia clínica creada exitosamente.',
      historia: historiaRespuesta,
    });
  } catch (err) {
    console.error('Error en crearHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error interno al crear la historia clínica.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /historias/:id/aclaracion
// Agregar nota de aclaración o evolución (append-only — Ley 2015/2020).
// Solo el médico autor de la historia principal puede crear aclaraciones.
// ─────────────────────────────────────────────────────────────────────────────
async function crearAclaracion(req, res) {
  const { id }     = req.params;   // id de la historia_principal
  const id_usuario = req.usuario.id;

  const {
    tipo_registro,
    motivo_consulta,
    anamnesis,
    antecedentes_patologicos,
    antecedentes_quirurgicos,
    antecedentes_alergicos,
    antecedentes_familiares,
    antecedentes_ginecoobstetricos,
    habitos,
    tension_arterial_sistolica,
    tension_arterial_diastolica,
    frecuencia_cardiaca,
    frecuencia_respiratoria,
    temperatura_corporal,
    peso_kg,
    talla_cm,
    exploracion_por_sistemas,
    examen_fisico,
    diagnostico_cie10,
    descripcion_diagnostico,
    plan_tratamiento,
    medicamentos_recetados,
    ordenes_medicas,
    recomendaciones,
    incapacidad_dias,
    observaciones,
    medico_nombre_firma,
    medico_cedula_firma,
    medico_rethus_firma,
  } = req.body;

  const tiposValidos = ['nota_aclaracion', 'nota_evolucion'];
  if (!tiposValidos.includes(tipo_registro)) {
    return res.status(400).json({
      mensaje: "tipo_registro debe ser 'nota_aclaracion' o 'nota_evolucion'.",
    });
  }

  if (!motivo_consulta?.trim()) {
    return res.status(400).json({
      mensaje: 'El motivo de la aclaración/nota es obligatorio.',
    });
  }

  try {
    const id_medico = await resolverIdMedico(id_usuario);
    if (!id_medico) {
      return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });
    }

    // Verificar que la historia original existe y fue creada por este médico
    const historiaRes = await pool.query(
      `SELECT id, id_paciente, id_cita, id_medico
       FROM historias_clinicas
       WHERE id = $1 AND tipo_registro = 'historia_principal'`,
      [id]
    );
    if (historiaRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });
    }
    if (historiaRes.rows[0].id_medico !== id_medico) {
      return res.status(403).json({
        mensaje: 'Solo el médico autor puede agregar notas a esta historia clínica.',
      });
    }

    const historiaOriginal = historiaRes.rows[0];

    // IMC calculado
    let imcCalculado = null;
    if (peso_kg && talla_cm && parseFloat(talla_cm) > 0) {
      imcCalculado = parseFloat(
        (parseFloat(peso_kg) / Math.pow(parseFloat(talla_cm) / 100, 2)).toFixed(2)
      );
    }

    const medicamentosParaBD = normalizarMedicamentosParaBD(medicamentos_recetados);

    const aclaracion = await pool.query(
      `INSERT INTO historias_clinicas (
        id_cita, id_paciente, id_medico,
        tipo_registro, estado, id_historia_original,
        motivo_consulta, anamnesis,
        antecedentes_patologicos, antecedentes_quirurgicos, antecedentes_alergicos,
        antecedentes_familiares, antecedentes_ginecoobstetricos, habitos,
        tension_arterial_sistolica, tension_arterial_diastolica,
        frecuencia_cardiaca, frecuencia_respiratoria, temperatura_corporal,
        peso_kg, talla_cm, imc,
        exploracion_por_sistemas, examen_fisico,
        diagnostico_cie10, descripcion_diagnostico,
        plan_tratamiento, medicamentos_recetados,
        ordenes_medicas, recomendaciones, incapacidad_dias, observaciones,
        medico_nombre_firma, medico_cedula_firma, medico_rethus_firma
      ) VALUES (
        $1,  $2,  $3,
        $4,  'activo', $5,
        $6,  $7,
        $8,  $9,  $10,
        $11, $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23,
        $24, $25,
        $26, $27,
        $28, $29, $30, $31,
        $32, $33, $34
      ) RETURNING *`,
      [
        // $1–$3
        historiaOriginal.id_cita,
        historiaOriginal.id_paciente,
        id_medico,
        // $4–$5
        tipo_registro,
        parseInt(id),    // id_historia_original
        // $6–$7
        motivo_consulta.trim(),
        anamnesis?.trim()                          || null,
        // $8–$13
        antecedentes_patologicos?.trim()           || null,
        antecedentes_quirurgicos?.trim()           || null,
        antecedentes_alergicos?.trim()             || null,
        antecedentes_familiares?.trim()            || null,
        antecedentes_ginecoobstetricos?.trim()     || null,
        habitos?.trim()                            || null,
        // $14–$20
        tension_arterial_sistolica                 || null,
        tension_arterial_diastolica                || null,
        frecuencia_cardiaca                        || null,
        frecuencia_respiratoria                    || null,
        temperatura_corporal                       || null,
        peso_kg                                    || null,
        talla_cm                                   || null,
        // $21
        imcCalculado,
        // $22–$23
        exploracion_por_sistemas?.trim()           || null,
        examen_fisico?.trim()                      || null,
        // $24–$25
        diagnostico_cie10?.trim().toUpperCase()    || null,
        descripcion_diagnostico?.trim()            || null,
        // $26–$31
        plan_tratamiento?.trim()                   || null,
        medicamentosParaBD,
        ordenes_medicas?.trim()                    || null,
        recomendaciones?.trim()                    || null,
        incapacidad_dias                           || null,
        observaciones?.trim()                      || null,
        // $32–$34
        medico_nombre_firma?.trim()                || null,
        medico_cedula_firma?.trim()                || null,
        medico_rethus_firma?.trim()                || null,
      ]
    );

    const aclaracionRespuesta = {
      ...aclaracion.rows[0],
      medicamentos_recetados: normalizarMedicamentosParaFrontend(
        aclaracion.rows[0].medicamentos_recetados
      ),
    };

    return res.status(201).json({
      mensaje:    'Nota de aclaración/evolución registrada exitosamente.',
      aclaracion: aclaracionRespuesta,
    });
  } catch (err) {
    console.error('Error en crearAclaracion:', err.message);
    return res.status(500).json({
      mensaje: 'Error interno al registrar la aclaración.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/cita/:id_cita
// Obtener historia principal + aclaraciones de una cita. Accesible para
// el paciente dueño o el médico con cita vinculada.
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

    // Si no existe historia, devolver 200 con historia: null (no 404)
    // para que el frontend distinga "aún no hay historia" de error real.
    if (historiaRes.rows.length === 0) {
      return res.json({ historia: null, aclaraciones: [] });
    }

    const historia = {
      ...historiaRes.rows[0],
      medicamentos_recetados: normalizarMedicamentosParaFrontend(
        historiaRes.rows[0].medicamentos_recetados
      ),
    };

    // Verificar acceso RBAC
    if (rol === 'paciente' && historia.id_paciente !== id_usuario_auth) {
      return res.status(403).json({ mensaje: 'No tienes permiso para ver este documento.' });
    }

    if (rol === 'medico') {
      const id_medico = await resolverIdMedico(id_usuario_auth);
      if (!id_medico) {
        return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });
      }
      const tieneAcceso =
        historia.id_medico === id_medico ||
        (await citaExisteEntreAmbosPorPaciente(historia.id_paciente, id_medico));
      if (!tieneAcceso) {
        return res.status(403).json({
          mensaje: 'No tienes acceso a este expediente clínico.',
        });
      }
    }

    // Obtener aclaraciones con todos sus campos
    const aclaRes = await pool.query(
      `SELECT *
       FROM historias_clinicas
       WHERE id_historia_original = $1
         AND tipo_registro IN ('nota_aclaracion', 'nota_evolucion')
       ORDER BY created_at ASC`,
      [historia.id]
    );

    const aclaraciones = aclaRes.rows.map(ac => ({
      ...ac,
      medicamentos_recetados: normalizarMedicamentosParaFrontend(ac.medicamentos_recetados),
    }));

    return res.json({ historia, aclaraciones });
  } catch (err) {
    console.error('Error en obtenerHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia clínica.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/:id/completa
// Datos enriquecidos de una historia (para generación de PDF).
// Incluye datos demográficos completos del paciente y médico.
// ─────────────────────────────────────────────────────────────────────────────
async function obtenerHistoriaCompleta(req, res) {
  const { id }          = req.params;
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;

  try {
    const historiaRes = await pool.query(
      `SELECT hc.*,
              -- Datos del paciente
              up.nombre           AS paciente_nombre,
              up.primer_apellido  AS paciente_apellido,
              up.tipo_documento   AS paciente_tipo_doc,
              up.numero_documento AS paciente_num_doc,
              up.fecha_nacimiento AS paciente_fecha_nac,
              up.telefono         AS paciente_telefono,
              up.direccion        AS paciente_direccion,
              up.ciudad           AS paciente_ciudad,
              up.genero           AS paciente_genero,
              -- Datos del médico
              um.nombre           AS medico_nombre,
              um.primer_apellido  AS medico_apellido,
              -- Especialidad
              e.nombre            AS especialidad,
              -- Datos de la cita
              TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha_cita,
              c.hora_inicio,
              c.tipo_consulta     AS tipo_cita,
              -- EPS de la cita (si no está en historia)
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

    if (historiaRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });
    }

    const historia = {
      ...historiaRes.rows[0],
      medicamentos_recetados: normalizarMedicamentosParaFrontend(
        historiaRes.rows[0].medicamentos_recetados
      ),
    };

    // RBAC
    if (rol === 'paciente' && historia.id_paciente !== id_usuario_auth) {
      return res.status(403).json({ mensaje: 'Acceso no autorizado.' });
    }
    if (rol === 'medico') {
      const id_medico = await resolverIdMedico(id_usuario_auth);
      const tieneAcceso =
        historia.id_medico === id_medico ||
        (await citaExisteEntreAmbosPorPaciente(historia.id_paciente, id_medico));
      if (!tieneAcceso) {
        return res.status(403).json({ mensaje: 'Acceso no autorizado a este expediente.' });
      }
    }

    // Aclaraciones completas
    const aclaRes = await pool.query(
      `SELECT *
       FROM historias_clinicas
       WHERE id_historia_original = $1
         AND tipo_registro IN ('nota_aclaracion', 'nota_evolucion')
       ORDER BY created_at ASC`,
      [historia.id]
    );

    const aclaraciones = aclaRes.rows.map(ac => ({
      ...ac,
      medicamentos_recetados: normalizarMedicamentosParaFrontend(ac.medicamentos_recetados),
    }));

    return res.json({ historia, aclaraciones });
  } catch (err) {
    console.error('Error en obtenerHistoriaCompleta:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia completa.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/paciente/:id_paciente
// Historial clínico completo del paciente (lista de historias principales).
// ─────────────────────────────────────────────────────────────────────────────
async function historialPaciente(req, res) {
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;
  const { id_paciente } = req.params;

  if (rol === 'paciente' && parseInt(id_paciente) !== id_usuario_auth) {
    return res.status(403).json({
      mensaje: 'No puedes consultar el historial de otro paciente.',
    });
  }

  if (rol === 'medico') {
    const id_medico   = await resolverIdMedico(id_usuario_auth);
    const tieneAcceso = await citaExisteEntreAmbosPorPaciente(id_paciente, id_medico);
    if (!tieneAcceso) {
      return res.status(403).json({
        mensaje: 'Solo puedes ver el historial de pacientes con los que tienes citas registradas.',
      });
    }
  }

  try {
    const resultado = await pool.query(
      `SELECT
          hc.id,
          hc.motivo_consulta,
          hc.diagnostico_cie10,
          hc.descripcion_diagnostico,
          hc.tipo_registro,
          hc.estado,
          (SELECT COUNT(*)
           FROM historias_clinicas ac
           WHERE ac.id_historia_original = hc.id
             AND ac.tipo_registro IN ('nota_aclaracion', 'nota_evolucion')
          ) AS total_aclaraciones,
          um.nombre           AS medico_nombre,
          um.primer_apellido  AS medico_apellido,
          e.nombre            AS especialidad,
          TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
          c.hora_inicio
       FROM historias_clinicas hc
       JOIN medicos        m  ON hc.id_medico      = m.id
       JOIN usuarios       um ON m.id_usuario      = um.id
       JOIN especialidades e  ON m.id_especialidad = e.id
       JOIN citas          c  ON hc.id_cita        = c.id
       WHERE hc.id_paciente   = $1
         AND hc.tipo_registro = 'historia_principal'
       ORDER BY hc.created_at DESC`,
      [id_paciente]
    );

    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en historialPaciente:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el historial del paciente.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /medico/citas/:id/gestionar — Gestionar resultado de una cita.
// ─────────────────────────────────────────────────────────────────────────────
async function gestionarCita(req, res) {
  const id_usuario = req.usuario.id;
  const { id }     = req.params;
  const { estado, notas_medicas } = req.body;

  const estadosValidos = ['completada', 'no_asistio'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({
      mensaje: "El estado debe ser 'completada' o 'no_asistio'.",
    });
  }

  try {
    const id_medico = await resolverIdMedico(id_usuario);
    if (!id_medico) {
      return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });
    }

    const cita = await pool.query(
      'SELECT id, estado FROM citas WHERE id = $1 AND id_medico = $2',
      [id, id_medico]
    );

    if (cita.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Cita no encontrada en tu agenda.' });
    }

    if (cita.rows[0].estado === 'cancelada') {
      return res.status(400).json({ mensaje: 'No se puede gestionar una cita cancelada.' });
    }

    await pool.query(
      `UPDATE citas
       SET estado        = $1,
           notas_medicas = COALESCE($2, notas_medicas),
           updated_at    = NOW()
       WHERE id = $3`,
      [estado, notas_medicas?.trim() || null, id]
    );

    return res.json({
      mensaje: estado === 'completada'
        ? '✅ Cita marcada como completada.'
        : '📋 Paciente registrado como no asistente.',
    });
  } catch (err) {
    console.error('Error en gestionarCita:', err.message);
    return res.status(500).json({ mensaje: 'Error al gestionar la cita.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/documentos/paciente/:id_paciente
// ─────────────────────────────────────────────────────────────────────────────
async function listarDocumentosClinicos(req, res) {
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;
  const { id_paciente } = req.params;

  if (rol === 'paciente' && parseInt(id_paciente) !== id_usuario_auth) {
    return res.status(403).json({
      mensaje: 'No puedes consultar los documentos de otro paciente.',
    });
  }

  if (rol === 'medico') {
    const id_medico   = await resolverIdMedico(id_usuario_auth);
    const tieneAcceso = await citaExisteEntreAmbosPorPaciente(id_paciente, id_medico);
    if (!tieneAcceso) {
      return res.status(403).json({
        mensaje: 'No tienes acceso a los documentos de este paciente.',
      });
    }
  }

  try {
    const ocultoFiltro = rol === 'paciente' ? 'AND dc.oculto_paciente = FALSE' : '';

    const resultado = await pool.query(
      `SELECT
          dc.*,
          um.nombre           AS medico_nombre,
          um.primer_apellido  AS medico_apellido,
          up.nombre           AS paciente_nombre,
          up.primer_apellido  AS paciente_apellido
       FROM documentos_clinicos dc
       LEFT JOIN medicos  m  ON dc.id_medico   = m.id
       LEFT JOIN usuarios um ON m.id_usuario   = um.id
       LEFT JOIN usuarios up ON dc.id_paciente = up.id
       WHERE dc.id_paciente = $1
         ${ocultoFiltro}
       ORDER BY dc.created_at DESC`,
      [id_paciente]
    );

    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarDocumentosClinicos:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener los documentos clínicos.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /historias/documentos — Registrar documento clínico.
// ─────────────────────────────────────────────────────────────────────────────
async function registrarDocumentoClinco(req, res) {
  const id_usuario = req.usuario.id;
  const rol        = req.usuario.rol;

  const {
    id_historia,
    id_paciente,
    tipo_documento,
    nombre_archivo,
    url_pdf,
    descripcion,
  } = req.body;

  if (!id_paciente || !tipo_documento || !url_pdf) {
    return res.status(400).json({
      mensaje: 'id_paciente, tipo_documento y url_pdf son obligatorios.',
    });
  }

  const tiposPermitidosPaciente = ['documento_externo'];
  const tiposPermitidosMedico   = ['formula_medica', 'orden_examen', 'historia_clinica'];

  if (rol === 'paciente') {
    if (!tiposPermitidosPaciente.includes(tipo_documento)) {
      return res.status(403).json({
        mensaje: 'El paciente solo puede subir documentos de tipo "documento_externo".',
      });
    }
    if (parseInt(id_paciente) !== id_usuario) {
      return res.status(403).json({
        mensaje: 'No puedes registrar documentos para otro paciente.',
      });
    }
  }

  let id_medico_fk = null;

  if (rol === 'medico') {
    if (!tiposPermitidosMedico.includes(tipo_documento)) {
      return res.status(403).json({
        mensaje: 'Tipo de documento no permitido para el rol médico.',
      });
    }
    id_medico_fk = await resolverIdMedico(id_usuario);
    if (!id_medico_fk) {
      return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });
    }
    const tieneAcceso = await citaExisteEntreAmbosPorPaciente(id_paciente, id_medico_fk);
    if (!tieneAcceso) {
      return res.status(403).json({
        mensaje: 'No tienes acceso a los documentos de este paciente.',
      });
    }
  }

  try {
    const nuevo = await pool.query(
      `INSERT INTO documentos_clinicos (
        id_historia, id_paciente, id_medico,
        tipo_documento, origen,
        nombre_archivo, url_pdf, descripcion
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        id_historia  || null,
        id_paciente,
        id_medico_fk,
        tipo_documento,
        rol === 'medico' ? 'medico' : 'paciente',
        nombre_archivo || null,
        url_pdf,
        descripcion    || null,
      ]
    );

    return res.status(201).json({
      mensaje:   'Documento registrado exitosamente.',
      documento: nuevo.rows[0],
    });
  } catch (err) {
    console.error('Error en registrarDocumentoClinco:', err.message);
    return res.status(500).json({ mensaje: 'Error al registrar el documento.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /historias/documentos/:id/ocultar
// ─────────────────────────────────────────────────────────────────────────────
async function ocultarDocumentoExterno(req, res) {
  const id_usuario = req.usuario.id;
  const { id }     = req.params;

  try {
    const docRes = await pool.query(
      'SELECT id, id_paciente, origen FROM documentos_clinicos WHERE id = $1',
      [id]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Documento no encontrado.' });
    }

    const doc = docRes.rows[0];

    if (doc.id_paciente !== id_usuario) {
      return res.status(403).json({
        mensaje: 'No tienes permiso para modificar este documento.',
      });
    }

    if (doc.origen === 'medico') {
      return res.status(403).json({
        mensaje:
          'Los documentos generados por un médico no pueden ocultarse. ' +
          'Ley 2015/2020 — reserva de la historia clínica.',
      });
    }

    await pool.query(
      'UPDATE documentos_clinicos SET oculto_paciente = TRUE, updated_at = NOW() WHERE id = $1',
      [id]
    );

    return res.json({ mensaje: 'Documento ocultado de tu perfil correctamente.' });
  } catch (err) {
    console.error('Error en ocultarDocumentoExterno:', err.message);
    return res.status(500).json({ mensaje: 'Error al ocultar el documento.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/documentos/:id
// ─────────────────────────────────────────────────────────────────────────────
async function obtenerDocumentoClinco(req, res) {
  const id_usuario = req.usuario.id;
  const rol        = req.usuario.rol;
  const { id }     = req.params;

  try {
    const docRes = await pool.query(
      `SELECT dc.*,
              um.nombre          AS medico_nombre,
              um.primer_apellido AS medico_apellido,
              up.nombre          AS paciente_nombre,
              up.primer_apellido AS paciente_apellido
       FROM documentos_clinicos dc
       LEFT JOIN medicos  m  ON dc.id_medico   = m.id
       LEFT JOIN usuarios um ON m.id_usuario   = um.id
       LEFT JOIN usuarios up ON dc.id_paciente = up.id
       WHERE dc.id = $1`,
      [id]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Documento no encontrado.' });
    }

    const doc = docRes.rows[0];

    if (rol === 'paciente' && doc.id_paciente !== id_usuario) {
      return res.status(403).json({ mensaje: 'No tienes permiso para ver este documento.' });
    }

    if (rol === 'medico') {
      const id_medico   = await resolverIdMedico(id_usuario);
      const tieneAcceso = await citaExisteEntreAmbosPorPaciente(doc.id_paciente, id_medico);
      if (!tieneAcceso) {
        return res.status(403).json({
          mensaje: 'No tienes acceso a los documentos de este paciente.',
        });
      }
    }

    return res.json(doc);
  } catch (err) {
    console.error('Error en obtenerDocumentoClinco:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el documento.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  crearHistoria,
  crearAclaracion,
  obtenerHistoria,
  obtenerHistoriaCompleta,
  historialPaciente,
  gestionarCita,
  listarDocumentosClinicos,
  registrarDocumentoClinco,
  ocultarDocumentoExterno,
  obtenerDocumentoClinco,
};