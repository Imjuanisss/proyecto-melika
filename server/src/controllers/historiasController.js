// server/src/controllers/historiasController.js
// MELIKA — Controlador integral de Historias Clínicas y Documentos Clínicos
// Cubre: Resolución 1995/1999 y Ley 2015/2020 (Colombia)
// Lógica RBAC estricta + Inmutabilidad legal (append-only)

'use strict';

const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dado el id de usuario con rol 'medico', retorna el id de su fila en `medicos`.
 * Retorna null si no existe perfil médico.
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
 * Usado para el control de acceso RBAC al historial clínico.
 */
async function citaExisteEntreAmbosPorPaciente(id_paciente, id_medico) {
  if (!id_medico) return false;
  const res = await pool.query(
    `SELECT id FROM citas
     WHERE id_paciente = $1
       AND id_medico   = $2
     LIMIT 1`,
    [id_paciente, id_medico]
  );
  return res.rows.length > 0;
}

/**
 * Verifica que una cita específica pertenezca al médico indicado
 * y retorna los datos de la cita (id_paciente, etc.).
 */
async function citaExisteEntreAmbosPorCita(id_cita, id_medico) {
  const res = await pool.query(
    `SELECT id, id_paciente FROM citas
     WHERE id        = $1
       AND id_medico = $2`,
    [id_cita, id_medico]
  );
  return res.rows.length > 0 ? res.rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /historias
// Crear historia clínica principal (solo el médico con la cita vinculada).
// Inmutabilidad: no puede existir más de una historia_principal por cita.
// ─────────────────────────────────────────────────────────────────────────────
async function crearHistoria(req, res) {
  const id_usuario = req.usuario.id;

  const {
    // Identificación de la cita
    id_cita,
    // Bloque 1 — Datos administrativos
    tipo_consulta,
    eps_aseguradora,
    contacto_responsable_nombre,
    contacto_responsable_telefono,
    // Bloque 2 — Anamnesis
    motivo_consulta,
    anamnesis,
    antecedentes_patologicos,
    antecedentes_quirurgicos,
    antecedentes_alergicos,
    antecedentes_familiares,
    antecedentes_ginecoobstetricos,
    habitos,
    // Bloque 3 — Examen físico
    tension_arterial_sistolica,
    tension_arterial_diastolica,
    frecuencia_cardiaca,
    frecuencia_respiratoria,
    temperatura_corporal,
    peso_kg,
    talla_cm,
    exploracion_por_sistemas,
    examen_fisico,
    // Bloque 4 — Diagnóstico CIE-10
    diagnostico_cie10,
    descripcion_diagnostico,
    // Bloque 5 — Plan de manejo
    plan_tratamiento,
    medicamentos_recetados,
    ordenes_medicas,
    recomendaciones,
    incapacidad_dias,
    observaciones,
    // Bloque 6 — Cierre legal
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

    const id_paciente = citaRes.rows[0].id_paciente;

    // ── Conversión JSONB: texto libre → objeto JSON válido para PostgreSQL ──
    const medicamentosParaBD = normalizarMedicamentosParaBD(medicamentos_recetados);

    const nueva = await pool.query(
      `INSERT INTO historias_clinicas (
        id_cita, id_paciente, id_medico, tipo_registro, estado,
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
        $1, $2, $3, 'historia_principal', 'activo',
        $4,
        $5, $6, $7,
        $8, $9,
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

    // Marcar la cita como completada al registrar la historia
    await pool.query(
      "UPDATE citas SET estado = 'completada', updated_at = NOW() WHERE id = $1",
      [id_cita]
    );

    return res.status(201).json({
      mensaje: 'Historia clínica creada exitosamente.',
      historia: nueva.rows[0],
    });
  } catch (err) {
    console.error('Error en crearHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error interno al crear la historia clínica.' });
  }
}


// ─── PUT /historias/:id — Actualizar historia clínica ─────────────────────────
async function actualizarHistoria(req, res) {
  const { id }     = req.params;
  const id_usuario = req.usuario.id;
  const { id }     = req.params; // id de la historia clínica principal

  const {
    tipo_registro,             // 'nota_aclaracion' | 'nota_evolucion'
    motivo_consulta,           // Obligatorio — describe el motivo de la nota
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
      mensaje: 'El motivo de la aclaración es obligatorio.',
    });
  }

  try {
    const id_medico = await resolverIdMedico(id_usuario);
    if (!id_medico) {
      return res.status(403).json({ mensaje: 'No tienes perfil de médico registrado.' });
    }

    // Verificar que la historia original existe y pertenece a este médico
    const historiaOriginal = await pool.query(
      `SELECT id, id_paciente, id_cita, id_medico
       FROM historias_clinicas
       WHERE id = $1 AND tipo_registro = 'historia_principal'`,
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
        $1, $2, $3,
        $4, 'activo', $5,
        $6, $7,
        $8, $9, $10,
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

    return res.status(201).json({
      mensaje: 'Nota de aclaración/evolución registrada exitosamente.',
      aclaracion: aclaracion.rows[0],
    });
  } catch (err) {
    console.error('Error en crearAclaracion:', err.message);
    return res.status(500).json({
      mensaje: 'Error interno al registrar la aclaración.',
    });
  }
}


// ─── GET /historias/cita/:id_cita — Obtener historia por cita ─────────────────
//
// Esta ruta la usan TANTO médicos como pacientes:
//   - El médico la usa para revisar/editar la historia que él mismo creó.
//   - El paciente la usa para consultar su propia historia clínica desde
//     "Mis citas", una vez que la consulta quedó marcada como completada.
//
// Por eso es indispensable validar que quien pregunta tiene derecho a ver
// ESA historia puntual, y no cualquier id_cita que se le ocurra probar:
//   - paciente → solo si la historia es suya (id_paciente coincide con su id).
//   - médico   → solo si él fue quien la elaboró (id_medico le pertenece).
//   - admin    → acceso total (soporte/auditoría).
// ──────────────────────────────────────────────────────────────────────────────
async function obtenerHistoria(req, res) {
  const { id_cita }    = req.params;
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
              c.fecha             AS fecha_cita,
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

    if (historiaRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'No hay historia clínica para esta cita.' });
    }

    const historia = historiaRes.rows[0];

    // ── Verificar acceso RBAC ─────────────────────────────────────────────
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

    // ── Obtener aclaraciones vinculadas ───────────────────────────────────
    const aclaRes = await pool.query(
      `SELECT * FROM historias_clinicas
       WHERE id_historia_original = $1
         AND tipo_registro IN ('nota_aclaracion', 'nota_evolucion')
       ORDER BY created_at ASC`,
      [historia.id]
    );

    return res.json({ historia, aclaraciones: aclaRes.rows });
  } catch (err) {
    console.error('Error en obtenerHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia clínica.' });
  }
}


// ─── GET /historias/paciente/:id_paciente — Historial completo del paciente ────
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
          hc.*,
          (SELECT COUNT(*) FROM historias_clinicas ac
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
// PATCH /medico/citas/:id/gestionar
// El médico marca el resultado de la consulta: completada o no_asistio.
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
      return res.status(400).json({
        mensaje: 'No se puede gestionar una cita cancelada.',
      });
    }

    await pool.query(
      `UPDATE citas
       SET estado        = $1,
           notas_medicas = $2,
           updated_at    = NOW()
       WHERE id = $3`,
      [estado, notas_medicas?.trim() || null, id]
    );

    return res.json({
      mensaje: `Cita marcada como "${estado}" correctamente.`,
    });
  } catch (err) {
    console.error('Error en gestionarCita:', err.message);
    return res.status(500).json({ mensaje: 'Error al gestionar la cita.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /historias/documentos/paciente/:id_paciente
// Lista todos los documentos clínicos de un paciente (historias, fórmulas,
// órdenes, documentos externos). Respeta visibilidad (oculto_paciente).
// Accesible para: el propio paciente o médico con cita vinculada.
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
    // Para el paciente: excluimos documentos que él mismo ocultó.
    // Para el médico: ve todos (incluso los ocultos del paciente son visibles para
    // el médico con fines de auditoría, excepto documentos externos ocultados).
    const ocultoFiltro = rol === 'paciente' ? 'AND dc.oculto_paciente = FALSE' : '';

    const resultado = await pool.query(
      `SELECT
          dc.*,
          um.nombre           AS medico_nombre,
          um.primer_apellido  AS medico_apellido,
          up.nombre           AS paciente_nombre,
          up.primer_apellido  AS paciente_apellido
       FROM documentos_clinicos dc
       LEFT JOIN medicos  m  ON dc.id_medico  = m.id
       LEFT JOIN usuarios um ON m.id_usuario  = um.id
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
// POST /historias/documentos
// Registrar un documento clínico externo (subido por el paciente).
// El paciente solo puede subir documentos de tipo 'documento_externo'.
// El médico puede registrar fórmulas y órdenes vinculadas a una historia.
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

  // Validar tipo según rol
  const tiposPermitidosPaciente = ['documento_externo'];
  const tiposPermitidosMedico   = ['formula_medica', 'orden_examen', 'historia_clinica'];

  if (rol === 'paciente') {
    if (!tiposPermitidosPaciente.includes(tipo_documento)) {
      return res.status(403).json({
        mensaje: 'El paciente solo puede subir documentos de tipo "documento_externo".',
      });
    }
    // El paciente solo puede registrar documentos propios
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
    // Verificar que tiene acceso al paciente
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id_historia     || null,
        id_paciente,
        id_medico_fk,
        tipo_documento,
        rol === 'medico' ? 'medico' : 'paciente',
        nombre_archivo  || null,
        url_pdf,
        descripcion     || null,
      ]
    );

    return res.status(201).json({
      mensaje: 'Documento registrado exitosamente.',
      documento: nuevo.rows[0],
    });
  } catch (err) {
    console.error('Error en registrarDocumentoClinco:', err.message);
    return res.status(500).json({ mensaje: 'Error al registrar el documento.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /historias/documentos/:id/ocultar
// El paciente puede ocultar de su vista un documento externo que él mismo subió.
// Los documentos con origen 'medico' NUNCA pueden ocultarse (inmutabilidad legal).
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

    // Solo el dueño del documento puede ocultarlo
    if (doc.id_paciente !== id_usuario) {
      return res.status(403).json({
        mensaje: 'No tienes permiso para modificar este documento.',
      });
    }

    // Los documentos médicos no se pueden ocultar — reserva legal
    if (doc.origen === 'medico') {
      return res.status(403).json({
        mensaje: 'Los documentos generados por un médico no pueden ocultarse. ' +
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
// Obtener un documento clínico específico.
// Accesible para: el paciente dueño o el médico con cita vinculada.
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
       LEFT JOIN medicos  m  ON dc.id_medico  = m.id
       LEFT JOIN usuarios um ON m.id_usuario  = um.id
       LEFT JOIN usuarios up ON dc.id_paciente = up.id
       WHERE dc.id = $1`,
      [id]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Documento no encontrado.' });
    }

    const doc = docRes.rows[0];

    // RBAC
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
  // Historias clínicas
  crearHistoria,
  crearAclaracion,
  obtenerHistoria,
  obtenerHistoriaCompleta,
  historialPaciente,
  gestionarCita,
  // Documentos clínicos
  listarDocumentosClinicos,
  registrarDocumentoClinco,
  ocultarDocumentoExterno,
  obtenerDocumentoClinco,
};