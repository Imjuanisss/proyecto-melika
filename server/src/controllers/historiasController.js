// server/src/controllers/historiasController.js
// MELIKA — Módulo integral de Historias Clínicas (Resolución 1995/1999 · Ley 2015/2020)
// Lógica append-only: los registros médicos nunca se destruyen. Las correcciones
// generan notas de aclaración vinculadas al registro original.

const pool = require('../config/db');

// ─── Helper: verificar que el médico tiene cita con el paciente ───────────────
// Regla RBAC crítica: un médico solo puede leer/escribir historias de pacientes
// con quienes tenga o haya tenido una cita registrada en el sistema.
async function verificarAccesoMedicoPaciente(id_medico, id_paciente) {
  const resultado = await pool.query(
    `SELECT id FROM citas
     WHERE id_medico = $1 AND id_paciente = $2
     LIMIT 1`,
    [id_medico, id_paciente]
  );
  return resultado.rows.length > 0;
}

// ─── Helper: calcular IMC ─────────────────────────────────────────────────────
function calcularIMC(peso_kg, talla_cm) {
  if (!peso_kg || !talla_cm || talla_cm === 0) return null;
  const talla_m = talla_cm / 100;
  return parseFloat((peso_kg / (talla_m * talla_m)).toFixed(2));
}

// ─── POST /historias — Crear historia clínica completa ───────────────────────
async function crearHistoria(req, res) {
  const id_usuario = req.usuario.id;

  const {
    id_cita,
    // Bloque 1 - Datos administrativos complementarios
    eps_aseguradora,
    contacto_responsable_nombre,
    contacto_responsable_telefono,
    // Bloque 2 - Anamnesis
    motivo_consulta,
    anamnesis,
    antecedentes_patologicos,
    antecedentes_quirurgicos,
    antecedentes_alergicos,
    antecedentes_familiares,
    antecedentes_ginecoobstetricos,
    habitos,
    // Bloque 3 - Examen físico
    tension_arterial_sistolica,
    tension_arterial_diastolica,
    frecuencia_cardiaca,
    frecuencia_respiratoria,
    temperatura_corporal,
    peso_kg,
    talla_cm,
    exploracion_por_sistemas,
    examen_fisico,
    // Bloque 4 - Diagnóstico CIE-10
    diagnostico_cie10,
    descripcion_diagnostico,
    // Bloque 5 - Plan de manejo
    plan_tratamiento,
    medicamentos_recetados,
    ordenes_medicas,
    recomendaciones,
    incapacidad_dias,
    // Bloque 6 - Cierre legal
    medico_nombre_firma,
    medico_cedula_firma,
    medico_rethus_firma,
    // Extras
    observaciones,
  } = req.body;

  if (!id_cita || !motivo_consulta?.trim()) {
    return res.status(400).json({ mensaje: 'id_cita y motivo_consulta son obligatorios.' });
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

    const cita = await pool.query(
      'SELECT id, id_paciente, tipo_consulta FROM citas WHERE id = $1 AND id_medico = $2',
      [id_cita, id_medico]
    );
    if (cita.rows.length === 0) {
      return res.status(403).json({ mensaje: 'La cita no existe o no te pertenece.' });
    }

    const existe = await pool.query(
      "SELECT id FROM historias_clinicas WHERE id_cita = $1 AND tipo_registro = 'historia_principal'",
      [id_cita]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({
        mensaje: 'Ya existe una historia clínica principal para esta cita. Usa una nota de aclaración para corregir.',
      });
    }

    const id_paciente = cita.rows[0].id_paciente;
    const imc = calcularIMC(peso_kg, talla_cm);

    const nueva = await pool.query(
      `INSERT INTO historias_clinicas (
        id_cita, id_paciente, id_medico,
        tipo_consulta, eps_aseguradora,
        contacto_responsable_nombre, contacto_responsable_telefono,
        motivo_consulta, anamnesis,
        antecedentes_patologicos, antecedentes_quirurgicos,
        antecedentes_alergicos, antecedentes_familiares,
        antecedentes_ginecoobstetricos, habitos,
        tension_arterial_sistolica, tension_arterial_diastolica,
        frecuencia_cardiaca, frecuencia_respiratoria,
        temperatura_corporal, peso_kg, talla_cm, imc,
        exploracion_por_sistemas, examen_fisico,
        diagnostico_cie10, descripcion_diagnostico,
        plan_tratamiento, medicamentos_recetados,
        ordenes_medicas, recomendaciones, incapacidad_dias,
        medico_nombre_firma, medico_cedula_firma, medico_rethus_firma,
        observaciones,
        tipo_registro, estado
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,
        $30,$31,$32,$33,$34,$35,$36,'historia_principal','activo'
      ) RETURNING *`,
      [
        id_cita, id_paciente, id_medico,
        cita.rows[0].tipo_consulta || 'presencial',
        eps_aseguradora || null,
        contacto_responsable_nombre || null,
        contacto_responsable_telefono || null,
        motivo_consulta.trim(),
        anamnesis || null,
        antecedentes_patologicos || null,
        antecedentes_quirurgicos || null,
        antecedentes_alergicos || null,
        antecedentes_familiares || null,
        antecedentes_ginecoobstetricos || null,
        habitos || null,
        tension_arterial_sistolica ? parseFloat(tension_arterial_sistolica) : null,
        tension_arterial_diastolica ? parseFloat(tension_arterial_diastolica) : null,
        frecuencia_cardiaca ? parseInt(frecuencia_cardiaca) : null,
        frecuencia_respiratoria ? parseInt(frecuencia_respiratoria) : null,
        temperatura_corporal ? parseFloat(temperatura_corporal) : null,
        peso_kg ? parseFloat(peso_kg) : null,
        talla_cm ? parseFloat(talla_cm) : null,
        imc,
        exploracion_por_sistemas || null,
        examen_fisico || null,
        diagnostico_cie10 || null,
        descripcion_diagnostico || null,
        plan_tratamiento || null,
        medicamentos_recetados || null,
        ordenes_medicas || null,
        recomendaciones || null,
        incapacidad_dias ? parseInt(incapacidad_dias) : null,
        medico_nombre_firma || null,
        medico_cedula_firma || null,
        medico_rethus_firma || null,
        observaciones || null,
      ]
    );

    await pool.query(
      "UPDATE citas SET estado='completada', updated_at=NOW() WHERE id=$1",
      [id_cita]
    );

    return res.status(201).json({ mensaje: 'Historia clínica creada.', historia: nueva.rows[0] });
  } catch (err) {
    console.error('Error en crearHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al crear la historia clínica.' });
  }
}

// ─── POST /historias/:id/aclaracion — Nota de aclaración (append-only) ────────
// Cumple con Ley 2015/2020: no se destruye el registro original.
// Se crea un nuevo registro vinculado como nota de aclaración.
async function crearAclaracion(req, res) {
  const { id } = req.params;
  const id_usuario = req.usuario.id;

  const {
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
    medico_nombre_firma,
    medico_cedula_firma,
    medico_rethus_firma,
    observaciones,
    tipo_registro,
  } = req.body;

  if (!motivo_consulta?.trim()) {
    return res.status(400).json({ mensaje: 'El motivo de la aclaración es obligatorio.' });
  }

  const tipoRegistroValido = ['nota_aclaracion', 'nota_evolucion'].includes(tipo_registro)
    ? tipo_registro
    : 'nota_aclaracion';

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0) {
      return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });
    }
    const id_medico = medicoRes.rows[0].id;

    const historiaOriginal = await pool.query(
      'SELECT id, id_cita, id_paciente, id_medico FROM historias_clinicas WHERE id = $1',
      [id]
    );
    if (historiaOriginal.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Historia clínica original no encontrada.' });
    }

    const ho = historiaOriginal.rows[0];

    if (ho.id_medico !== id_medico) {
      return res.status(403).json({
        mensaje: 'Solo el médico autor puede agregar aclaraciones a esta historia.',
      });
    }

    const imc = calcularIMC(peso_kg, talla_cm);

    const nueva = await pool.query(
      `INSERT INTO historias_clinicas (
        id_cita, id_paciente, id_medico,
        motivo_consulta, anamnesis,
        antecedentes_patologicos, antecedentes_quirurgicos,
        antecedentes_alergicos, antecedentes_familiares,
        antecedentes_ginecoobstetricos, habitos,
        tension_arterial_sistolica, tension_arterial_diastolica,
        frecuencia_cardiaca, frecuencia_respiratoria,
        temperatura_corporal, peso_kg, talla_cm, imc,
        exploracion_por_sistemas, examen_fisico,
        diagnostico_cie10, descripcion_diagnostico,
        plan_tratamiento, medicamentos_recetados,
        ordenes_medicas, recomendaciones, incapacidad_dias,
        medico_nombre_firma, medico_cedula_firma, medico_rethus_firma,
        observaciones,
        tipo_registro, estado, id_historia_original
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
        $29,$30,$31,$32,$33,'activo',$34
      ) RETURNING *`,
      [
        ho.id_cita, ho.id_paciente, id_medico,
        motivo_consulta.trim(),
        anamnesis || null,
        antecedentes_patologicos || null,
        antecedentes_quirurgicos || null,
        antecedentes_alergicos || null,
        antecedentes_familiares || null,
        antecedentes_ginecoobstetricos || null,
        habitos || null,
        tension_arterial_sistolica ? parseFloat(tension_arterial_sistolica) : null,
        tension_arterial_diastolica ? parseFloat(tension_arterial_diastolica) : null,
        frecuencia_cardiaca ? parseInt(frecuencia_cardiaca) : null,
        frecuencia_respiratoria ? parseInt(frecuencia_respiratoria) : null,
        temperatura_corporal ? parseFloat(temperatura_corporal) : null,
        peso_kg ? parseFloat(peso_kg) : null,
        talla_cm ? parseFloat(talla_cm) : null,
        imc,
        exploracion_por_sistemas || null,
        examen_fisico || null,
        diagnostico_cie10 || null,
        descripcion_diagnostico || null,
        plan_tratamiento || null,
        medicamentos_recetados || null,
        ordenes_medicas || null,
        recomendaciones || null,
        incapacidad_dias ? parseInt(incapacidad_dias) : null,
        medico_nombre_firma || null,
        medico_cedula_firma || null,
        medico_rethus_firma || null,
        observaciones || null,
        tipoRegistroValido,
        parseInt(id),
      ]
    );

    return res.status(201).json({
      mensaje: 'Nota de aclaración registrada. El historial original permanece intacto.',
      aclaracion: nueva.rows[0],
    });
  } catch (err) {
    console.error('Error en crearAclaracion:', err.message);
    return res.status(500).json({ mensaje: 'Error al crear la aclaración.' });
  }
}

// ─── GET /historias/cita/:id_cita — Historia por cita (con aclaraciones) ──────
async function obtenerHistoria(req, res) {
  const { id_cita } = req.params;
  const id_usuario  = req.usuario.id;
  const rol         = req.usuario.rol;

  try {
    // Verificar acceso según rol
    if (rol === 'medico') {
      const medicoRes = await pool.query(
        'SELECT id FROM medicos WHERE id_usuario = $1',
        [id_usuario]
      );
      if (medicoRes.rows.length === 0) {
        return res.status(403).json({ mensaje: 'Perfil de médico no encontrado.' });
      }
      const id_medico = medicoRes.rows[0].id;

      const citaRes = await pool.query(
        'SELECT id_paciente FROM citas WHERE id = $1',
        [id_cita]
      );
      if (citaRes.rows.length === 0) {
        return res.status(404).json({ mensaje: 'Cita no encontrada.' });
      }

      const tieneAcceso = await verificarAccesoMedicoPaciente(id_medico, citaRes.rows[0].id_paciente);
      if (!tieneAcceso) {
        return res.status(403).json({
          mensaje: 'No tienes acceso a la historia de este paciente. No existe cita vinculada.',
        });
      }
    }

    // Historia principal + aclaraciones ordenadas cronológicamente
    const resultado = await pool.query(
      `SELECT hc.*,
              u.nombre        AS medico_nombre,
              u.primer_apellido AS medico_apellido,
              e.nombre        AS especialidad,
              c.fecha         AS fecha_cita,
              c.hora_inicio   AS hora_cita
       FROM historias_clinicas hc
       JOIN medicos      m ON hc.id_medico    = m.id
       JOIN usuarios     u ON m.id_usuario    = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       JOIN citas        c ON hc.id_cita      = c.id
       WHERE hc.id_cita = $1
       ORDER BY hc.created_at ASC`,
      [id_cita]
    );

    const historia    = resultado.rows.find(r => r.tipo_registro === 'historia_principal') || null;
    const aclaraciones = resultado.rows.filter(r => r.tipo_registro !== 'historia_principal');

    return res.json({ historia, aclaraciones });
  } catch (err) {
    console.error('Error en obtenerHistoria:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia clínica.' });
  }
}

// ─── GET /historias/paciente/:id_paciente — Historial completo del paciente ───
async function historialPaciente(req, res) {
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;
  const { id_paciente } = req.params;

  try {
    if (rol === 'paciente') {
      if (parseInt(id_paciente) !== id_usuario_auth) {
        return res.status(403).json({ mensaje: 'No puedes ver el historial de otro paciente.' });
      }
    }

    if (rol === 'medico') {
      const medicoRes = await pool.query(
        'SELECT id FROM medicos WHERE id_usuario = $1',
        [id_usuario_auth]
      );
      if (medicoRes.rows.length === 0) {
        return res.status(403).json({ mensaje: 'Perfil de médico no encontrado.' });
      }
      const id_medico = medicoRes.rows[0].id;
      const tieneAcceso = await verificarAccesoMedicoPaciente(id_medico, parseInt(id_paciente));
      if (!tieneAcceso) {
        return res.status(403).json({
          mensaje: 'Acceso denegado. No existe cita entre tú y este paciente.',
        });
      }
    }

    // Solo historias principales para la lista del historial
    // Las aclaraciones se cargan individualmente al ver el detalle de cada historia
    const resultado = await pool.query(
      `SELECT hc.id, hc.id_cita, hc.tipo_registro, hc.estado,
              hc.motivo_consulta, hc.diagnostico_cie10, hc.descripcion_diagnostico,
              hc.created_at, hc.updated_at,
              u.nombre          AS medico_nombre,
              u.primer_apellido AS medico_apellido,
              e.nombre          AS especialidad,
              c.fecha           AS fecha_cita,
              c.hora_inicio     AS hora_cita,
              (
                SELECT COUNT(*) FROM historias_clinicas ac
                WHERE ac.id_historia_original = hc.id
              ) AS total_aclaraciones
       FROM historias_clinicas hc
       JOIN medicos      m ON hc.id_medico       = m.id
       JOIN usuarios     u ON m.id_usuario       = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       JOIN citas        c ON hc.id_cita         = c.id
       WHERE hc.id_paciente = $1
         AND hc.tipo_registro = 'historia_principal'
       ORDER BY hc.created_at DESC`,
      [id_paciente]
    );

    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en historialPaciente:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el historial clínico.' });
  }
}

// ─── GET /historias/:id/completa — Historia individual con todos sus datos ────
async function obtenerHistoriaCompleta(req, res) {
  const { id }          = req.params;
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;

  try {
    const historiaRes = await pool.query(
      `SELECT hc.*,
              u.nombre          AS medico_nombre,
              u.primer_apellido AS medico_apellido,
              u.numero_documento AS medico_documento,
              e.nombre          AS especialidad,
              c.fecha           AS fecha_cita,
              c.hora_inicio     AS hora_cita,
              c.tipo_consulta   AS tipo_cita,
              up.nombre          AS paciente_nombre,
              up.primer_apellido AS paciente_apellido,
              up.tipo_documento  AS paciente_tipo_doc,
              up.numero_documento AS paciente_num_doc,
              up.fecha_nacimiento AS paciente_fecha_nac,
              up.genero          AS paciente_genero,
              up.direccion       AS paciente_direccion,
              up.ciudad          AS paciente_ciudad,
              up.telefono        AS paciente_telefono
       FROM historias_clinicas hc
       JOIN medicos       m  ON hc.id_medico    = m.id
       JOIN usuarios      u  ON m.id_usuario    = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       JOIN citas         c  ON hc.id_cita      = c.id
       JOIN usuarios      up ON hc.id_paciente  = up.id
       WHERE hc.id = $1`,
      [id]
    );

    if (historiaRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Historia clínica no encontrada.' });
    }

    const historia = historiaRes.rows[0];

    // RBAC: validar acceso
    if (rol === 'paciente' && historia.id_paciente !== id_usuario_auth) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta historia clínica.' });
    }

    if (rol === 'medico') {
      const medicoRes = await pool.query(
        'SELECT id FROM medicos WHERE id_usuario = $1',
        [id_usuario_auth]
      );
      if (medicoRes.rows.length === 0) {
        return res.status(403).json({ mensaje: 'Perfil de médico no encontrado.' });
      }
      const id_medico = medicoRes.rows[0].id;
      const tieneAcceso = await verificarAccesoMedicoPaciente(id_medico, historia.id_paciente);
      if (!tieneAcceso) {
        return res.status(403).json({
          mensaje: 'Acceso denegado. No tienes cita vinculada con este paciente.',
        });
      }
    }

    // Aclaraciones vinculadas
    const aclaraciones = await pool.query(
      `SELECT hc2.*,
              u2.nombre AS medico_nombre, u2.primer_apellido AS medico_apellido
       FROM historias_clinicas hc2
       JOIN medicos m2 ON hc2.id_medico = m2.id
       JOIN usuarios u2 ON m2.id_usuario = u2.id
       WHERE hc2.id_historia_original = $1
       ORDER BY hc2.created_at ASC`,
      [id]
    );

    return res.json({ historia, aclaraciones: aclaraciones.rows });
  } catch (err) {
    console.error('Error en obtenerHistoriaCompleta:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la historia.' });
  }
}

// ─── POST /documentos — Registrar metadato de documento PDF ──────────────────
// El PDF en sí se genera en el frontend y se guarda externamente (Storage/S3/URL).
// El backend solo persiste los metadatos para auditoría y control de acceso.
async function registrarDocumento(req, res) {
  const id_usuario = req.usuario.id;
  const rol        = req.usuario.rol;

  const { id_historia, id_paciente, tipo_documento, nombre_archivo, url_pdf, descripcion } = req.body;

  if (!id_paciente || !tipo_documento || !url_pdf) {
    return res.status(400).json({ mensaje: 'id_paciente, tipo_documento y url_pdf son obligatorios.' });
  }

  const tiposValidos = ['historia_clinica', 'formula_medica', 'orden_examen', 'documento_externo'];
  if (!tiposValidos.includes(tipo_documento)) {
    return res.status(400).json({ mensaje: 'Tipo de documento no válido.' });
  }

  try {
    let id_medico = null;

    if (rol === 'medico') {
      const medicoRes = await pool.query(
        'SELECT id FROM medicos WHERE id_usuario = $1',
        [id_usuario]
      );
      if (medicoRes.rows.length === 0) {
        return res.status(403).json({ mensaje: 'Perfil de médico no encontrado.' });
      }
      id_medico = medicoRes.rows[0].id;

      const tieneAcceso = await verificarAccesoMedicoPaciente(id_medico, parseInt(id_paciente));
      if (!tieneAcceso) {
        return res.status(403).json({
          mensaje: 'No puedes registrar documentos para pacientes sin cita vinculada.',
        });
      }
    }

    if (rol === 'paciente') {
      if (parseInt(id_paciente) !== id_usuario) {
        return res.status(403).json({ mensaje: 'Solo puedes registrar tus propios documentos.' });
      }
      if (tipo_documento !== 'documento_externo') {
        return res.status(403).json({ mensaje: 'Los pacientes solo pueden subir documentos externos.' });
      }
    }

    const nuevo = await pool.query(
      `INSERT INTO documentos_clinicos
         (id_historia, id_paciente, id_medico, tipo_documento, origen, nombre_archivo, url_pdf, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        id_historia || null,
        parseInt(id_paciente),
        id_medico,
        tipo_documento,
        rol === 'medico' ? 'medico' : 'paciente',
        nombre_archivo || null,
        url_pdf,
        descripcion || null,
      ]
    );

    return res.status(201).json({ mensaje: 'Documento registrado.', documento: nuevo.rows[0] });
  } catch (err) {
    console.error('Error en registrarDocumento:', err.message);
    return res.status(500).json({ mensaje: 'Error al registrar el documento.' });
  }
}

// ─── GET /documentos/paciente/:id_paciente — Listar documentos del paciente ──
async function listarDocumentosPaciente(req, res) {
  const { id_paciente } = req.params;
  const id_usuario_auth = req.usuario.id;
  const rol             = req.usuario.rol;

  try {
    if (rol === 'paciente' && parseInt(id_paciente) !== id_usuario_auth) {
      return res.status(403).json({ mensaje: 'No puedes ver documentos de otro paciente.' });
    }

    if (rol === 'medico') {
      const medicoRes = await pool.query(
        'SELECT id FROM medicos WHERE id_usuario = $1',
        [id_usuario_auth]
      );
      if (medicoRes.rows.length === 0) {
        return res.status(403).json({ mensaje: 'Perfil de médico no encontrado.' });
      }
      const tieneAcceso = await verificarAccesoMedicoPaciente(medicoRes.rows[0].id, parseInt(id_paciente));
      if (!tieneAcceso) {
        return res.status(403).json({ mensaje: 'Acceso denegado. Sin cita vinculada.' });
      }
    }

    const condicionOculto = rol === 'paciente' ? 'AND dc.oculto_paciente = FALSE' : '';

    const resultado = await pool.query(
      `SELECT dc.*,
              u.nombre          AS medico_nombre,
              u.primer_apellido AS medico_apellido
       FROM documentos_clinicos dc
       LEFT JOIN medicos  m ON dc.id_medico  = m.id
       LEFT JOIN usuarios u ON m.id_usuario  = u.id
       WHERE dc.id_paciente = $1 ${condicionOculto}
       ORDER BY dc.created_at DESC`,
      [id_paciente]
    );

    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarDocumentosPaciente:', err.message);
    return res.status(500).json({ mensaje: 'Error al listar los documentos.' });
  }
}

// ─── PATCH /documentos/:id/ocultar — Paciente oculta un doc externo suyo ─────
async function ocultarDocumento(req, res) {
  const { id }     = req.params;
  const id_usuario = req.usuario.id;
  const rol        = req.usuario.rol;

  if (rol !== 'paciente') {
    return res.status(403).json({ mensaje: 'Solo los pacientes pueden ocultar documentos.' });
  }

  try {
    const doc = await pool.query(
      'SELECT id, id_paciente, origen FROM documentos_clinicos WHERE id = $1',
      [id]
    );
    if (doc.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Documento no encontrado.' });
    }

    if (doc.rows[0].id_paciente !== id_usuario) {
      return res.status(403).json({ mensaje: 'Este documento no te pertenece.' });
    }

    if (doc.rows[0].origen !== 'paciente') {
      return res.status(403).json({
        mensaje: 'Los documentos generados por un médico no pueden ser eliminados o ocultados (inmutabilidad legal).',
      });
    }

    await pool.query(
      'UPDATE documentos_clinicos SET oculto_paciente = TRUE, updated_at = NOW() WHERE id = $1',
      [id]
    );

    return res.json({ mensaje: 'Documento ocultado de tu perfil.' });
  } catch (err) {
    console.error('Error en ocultarDocumento:', err.message);
    return res.status(500).json({ mensaje: 'Error al ocultar el documento.' });
  }
}

module.exports = {
  crearHistoria,
  crearAclaracion,
  obtenerHistoria,
  obtenerHistoriaCompleta,
  historialPaciente,
  registrarDocumento,
  listarDocumentosPaciente,
  ocultarDocumento,
};