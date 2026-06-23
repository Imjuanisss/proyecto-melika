// server/src/controllers/medicosController.js
// ─── REESCRITURA COMPLETA — todos los bugs de schema corregidos ────────────────
// Bugs corregidos:
// 1. tokens_invitacion usa columna "email" (no "id_usuario" como estaba antes)
// 2. usuarios requiere numero_documento NOT NULL UNIQUE → ahora se recibe del form
// 3. tarifa NOT NULL en medicos → se guarda como 0 (el admin no la gestiona públicamente)
// 4. listarMedicos incluye todos los campos nuevos del JOIN y el campo foto_url
// 5. CORRECCIÓN SQL: Sintaxis válida para la inserción de ciudad en PostgreSQL
// 6. CORRECCIÓN INFRA: el envío de correo ya NO usa Nodemailer/SMTP (bloqueado
//    por el firewall de Railway). Ahora usa emailService.js (Gmail API / HTTPS),
//    el mismo servicio centralizado que usa authController.js.

const pool       = require('../config/db');
const bcrypt      = require('bcrypt');
const crypto      = require('crypto');
const { enviarCorreo } = require('../services/emailService');

// ─── POST /medicos — Crear médico (solo Admin) ─────────────────────────────────
async function crearMedico(req, res) {
  const {
    nombre,
    primer_apellido,
    email,
    tipo_documento,
    numero_documento,
    ciudad,
    numero_registro,
    id_especialidad,
    acepta_teleconsulta,
    acepta_presencial,
    biografia,
    anos_experiencia,
    foto_url, // <-- ¡NUEVO CAMPO RECIBIDO DEL FRONTEND!
  } = req.body;

  // Validación de campos obligatorios
  if (
    !nombre ||
    !primer_apellido ||
    !email ||
    !tipo_documento ||
    !numero_documento ||
    !numero_registro ||
    !id_especialidad
  ) {
    return res.status(400).json({
      mensaje: 'Faltan campos obligatorios: nombre, apellido, email, tipo y número de documento, número de registro y especialidad.',
    });
  }

  // Validar tipo de documento
  const tiposValidos = ['CC', 'CE', 'PASAPORTE'];
  if (!tiposValidos.includes(tipo_documento)) {
    return res.status(400).json({ mensaje: 'Tipo de documento inválido. Use CC, CE o PASAPORTE.' });
  }

  try {
    // ── Verificar duplicados en paralelo ──────────────────────────────────────
    const [regExiste, emailExiste, docExiste] = await Promise.all([
      pool.query('SELECT id FROM medicos WHERE numero_registro = $1', [numero_registro]),
      pool.query('SELECT id FROM usuarios WHERE email = $1', [email]),
      pool.query('SELECT id FROM usuarios WHERE numero_documento = $1', [numero_documento]),
    ]);

    if (regExiste.rows.length > 0)
      return res.status(409).json({ mensaje: 'El número de registro médico ya está en uso.' });
    if (emailExiste.rows.length > 0)
      return res.status(409).json({ mensaje: 'Este correo electrónico ya está registrado.' });
    if (docExiste.rows.length > 0)
      return res.status(409).json({ mensaje: 'Este número de documento ya está registrado.' });

    // ── Crear usuario con contraseña temporal aleatoria ───────────────────────
    const hashTemp = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

    const nuevoUsuario = await pool.query(
      `INSERT INTO usuarios
         (nombre, primer_apellido, email, password_hash,
          rol, activo, verificado,
          tipo_documento, numero_documento, ciudad) 
       VALUES ($1, $2, $3, $4, 'medico', FALSE, TRUE, $5, $6, $7) 
       RETURNING id`,
      [
        nombre,
        primer_apellido,
        email,
        hashTemp,
        tipo_documento,
        numero_documento,
        ciudad || null,
      ]
    );
    const id_usuario = nuevoUsuario.rows[0].id;

    // ── Crear perfil médico con la columna foto_url incluida ───────────────────
    const nuevoMedico = await pool.query(
      `INSERT INTO medicos
         (id_usuario, id_especialidad, numero_registro, tarifa,
          acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, foto_url, activo)
       VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8, TRUE)
       RETURNING *`,
      [
        id_usuario,
        id_especialidad,
        numero_registro,
        acepta_teleconsulta !== false,
        acepta_presencial !== false,
        biografia || '',
        parseInt(anos_experiencia) || 0,
        foto_url || null, // <-- Asignado al parámetro $8
      ]
    );

    // ── Generar token de invitación (72 horas) ───────────────────────────────
    const token    = crypto.randomBytes(48).toString('hex');
    const expiraEn = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await pool.query('DELETE FROM tokens_invitacion WHERE email = $1', [email]);

    await pool.query(
      `INSERT INTO tokens_invitacion (email, token, rol, expira_en)
       VALUES ($1, $2, 'medico', $3)`,
      [email, token, expiraEn]
    );

    // ── Enviar email de activación (Gmail API — HTTPS, no SMTP) ───────────────
    const urlActivacion = `${process.env.FRONTEND_URL}/activar-cuenta?token=${token}`;
    let correoEnviado = true;

    try {
      await enviarCorreo({
        to: email,
        subject: 'Bienvenido a MELIKA — Activa tu cuenta médica',
        html: `
          <div style="font-family:'Sora',Arial,sans-serif;max-width:600px;margin:0 auto;
                      padding:32px;background:#F6F9FF;border-radius:16px;">
            <div style="text-align:center;margin-bottom:28px;">
              <h1 style="color:#0B1A36;font-size:28px;margin:0;">
                <span style="color:#E8856A;">M</span>ELIKA
              </h1>
              <p style="color:#4A5978;margin:6px 0 0;font-size:14px;">
                Plataforma de Salud Digital · Colombia
              </p>
            </div>
            <div style="background:#fff;border-radius:12px;padding:32px;
                        border:1px solid #D9E4F7;">
              <h2 style="color:#0B1A36;margin:0 0 16px;">
                ¡Bienvenido/a, Dr(a). ${nombre} ${primer_apellido}!
              </h2>
              <p style="color:#4A5978;line-height:1.7;">
                Has sido registrado/a como especialista en la plataforma MELIKA.
                Para activar tu cuenta y establecer tu contraseña, haz clic en el botón:
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${urlActivacion}"
                   style="display:inline-block;background:#E8856A;color:#fff;
                          padding:14px 32px;border-radius:8px;
                          text-decoration:none;font-weight:700;font-size:16px;">
                  Activar mi cuenta médica →
                </a>
              </div>
              <p style="color:#8A9BBE;font-size:13px;margin-top:16px;">
                ⏱ Este enlace expira en <strong>72 horas</strong>.<br>
                Si no esperabas este correo, puedes ignorarlo.
              </p>
            </div>
            <p style="text-align:center;color:#8A9BBE;font-size:12px;margin-top:24px;">
              © 2026 MELIKA — Plataforma de Salud Digital Colombia
            </p>
          </div>
        `,
      });
      console.log(`✅ [Gmail API] Invitación de médico enviada a ${email}`);
    } catch (emailErr) {
      correoEnviado = false;
      console.error('⚠️  [Gmail API] Error enviando email de invitación:', emailErr.message);
    }

    return res.status(201).json({
      mensaje: correoEnviado
        ? `Médico creado exitosamente. Se envió un email de activación a ${email}.`
        : `Médico creado, pero no pudimos enviar el email de activación a ${email}. Reenvíalo manualmente o contacta soporte.`,
      correoEnviado,
      medico: {
        ...nuevoMedico.rows[0],
        nombre,
        primer_apellido,
        email,
        tipo_documento,
        numero_documento,
        ciudad: ciudad || null,
      },
    });
  } catch (err) {
    console.error('Error en crearMedico:', err.message);
    if (err.code === '23505') {
      if (err.constraint?.includes('numero_registro'))
        return res.status(409).json({ mensaje: 'El número de registro ya existe.' });
      if (err.constraint?.includes('email'))
        return res.status(409).json({ mensaje: 'El correo electrónico ya está registrado.' });
      if (err.constraint?.includes('numero_documento'))
        return res.status(409).json({ mensaje: 'El número de documento ya está registrado.' });
      return res.status(409).json({ mensaje: 'Dato duplicado. Verifique los campos únicos.' });
    }
    return res.status(500).json({ mensaje: 'Error interno al crear el médico.' });
  }
}

// ─── POST /medicos/activar — El médico activa su cuenta con token ──────────────
async function activarCuenta(req, res) {
  const { token, password } = req.body;

  if (!token || !password)
    return res.status(400).json({ mensaje: 'Token y contraseña son obligatorios.' });
  if (password.length < 6)
    return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });

  try {
    const resultado = await pool.query(
      `SELECT ti.id AS token_id, ti.email, ti.expira_en, u.id AS id_usuario
       FROM tokens_invitacion ti
       JOIN usuarios u ON u.email = ti.email
       WHERE ti.token = $1 AND ti.usado = FALSE`,
      [token]
    );

    if (resultado.rows.length === 0)
      return res.status(400).json({ mensaje: 'Token inválido o ya utilizado.' });

    const registro = resultado.rows[0];

    if (new Date() > new Date(registro.expira_en))
      return res.status(400).json({
        mensaje: 'El enlace de activación expiró. Contacta al administrador para recibir uno nuevo.',
      });

    const hash = await bcrypt.hash(password, 10);

    await Promise.all([
      pool.query(
        'UPDATE usuarios SET password_hash = $1, activo = TRUE, updated_at = NOW() WHERE id = $2',
        [hash, registro.id_usuario]
      ),
      pool.query(
        'UPDATE tokens_invitacion SET usado = TRUE WHERE id = $1',
        [registro.token_id]
      ),
    ]);

    return res.json({
      mensaje: 'Cuenta activada exitosamente. Ya puedes iniciar sesión en MELIKA.',
    });
  } catch (err) {
    console.error('Error en activarCuenta:', err.message);
    return res.status(500).json({ mensaje: 'Error al activar la cuenta.' });
  }
}

// ─── GET /medicos — Listar todos los médicos con datos completos (Admin) ────────
async function listarMedicos(req, res) {
  try {
    // Agregamos m.foto_url a las columnas devueltas por el SELECT
    const resultado = await pool.query(
      `SELECT
          m.id,
          m.numero_registro,
          m.tarifa,
          m.calificacion,
          m.acepta_teleconsulta,
          m.acepta_presencial,
          m.biografia,
          m.anos_experiencia,
          m.foto_url, -- <-- ¡FOTO_URL AHORA DISPONIBLE PARA EL FRONTEND!
          m.activo,
          m.id_especialidad,
          m.created_at,
          u.id              AS id_usuario,
          u.nombre,
          u.primer_apellido,
          u.email,
          u.tipo_documento,
          u.numero_documento,
          u.ciudad,
          u.activo          AS usuario_activo,
          e.nombre          AS especialidad
       FROM medicos m
       JOIN usuarios      u ON m.id_usuario      = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       ORDER BY u.nombre, u.primer_apellido`
    );
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarMedicos:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el listado de médicos.' });
  }
}

// ─── PUT /medicos/:id — Actualizar datos del médico (Admin) ───────────────────
async function actualizarMedico(req, res) {
  const { id } = req.params;
  const {
    nombre,
    primer_apellido,
    tipo_documento,
    numero_documento,
    ciudad,
    id_especialidad,
    numero_registro,
    acepta_teleconsulta,
    acepta_presencial,
    biografia,
    anos_experiencia,
    foto_url, // <-- ¡NUEVO CAMPO RECIBIDO PARA ACTUALIZACIONES!
  } = req.body;

  try {
    const medicoRes = await pool.query(
      'SELECT id, id_usuario FROM medicos WHERE id = $1',
      [id]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado.' });

    const id_usuario = medicoRes.rows[0].id_usuario;

    const [docConflicto, regConflicto] = await Promise.all([
      pool.query(
        'SELECT id FROM usuarios WHERE numero_documento = $1 AND id != $2',
        [numero_documento, id_usuario]
      ),
      pool.query(
        'SELECT id FROM medicos WHERE numero_registro = $1 AND id != $2',
        [numero_registro, id]
      ),
    ]);

    if (docConflicto.rows.length > 0)
      return res.status(409).json({ mensaje: 'El número de documento ya pertenece a otro usuario.' });
    if (regConflicto.rows.length > 0)
      return res.status(409).json({ mensaje: 'El número de registro ya está en uso.' });

    await Promise.all([
      pool.query(
        `UPDATE usuarios
         SET nombre=$1, primer_apellido=$2,
             tipo_documento=$3, numero_documento=$4,
             ciudad=$5, updated_at=NOW()
         WHERE id=$6`,
        [nombre, primer_apellido, tipo_documento, numero_documento, ciudad || null, id_usuario]
      ),
      // Añadimos foto_url = $7 y corremos el ID del médico al parámetro $8
      pool.query(
        `UPDATE medicos
         SET id_especialidad=$1, numero_registro=$2,
             acepta_teleconsulta=$3, acepta_presencial=$4,
             biografia=$5, anos_experiencia=$6, foto_url=$7,
             updated_at=NOW()
         WHERE id=$8`,
        [
          id_especialidad,
          numero_registro,
          acepta_teleconsulta !== false,
          acepta_presencial !== false,
          biografia || '',
          parseInt(anos_experiencia) || 0,
          foto_url || null, // <-- Parámetro $7
          id,               // <-- Parámetro $8
        ]
      ),
    ]);

    return res.json({ mensaje: 'Médico actualizado correctamente.' });
  } catch (err) {
    console.error('Error en actualizarMedico:', err.message);
    if (err.code === '23505')
      return res.status(409).json({ mensaje: 'Dato duplicado. Verifique los campos únicos.' });
    return res.status(500).json({ mensaje: 'Error al actualizar el médico.' });
  }
}

// ─── PATCH /medicos/:id/estado — Activar o Desactivar médico (Admin) ──────────
async function toggleEstadoMedico(req, res) {
  const { id } = req.params;

  try {
    const medicoRes = await pool.query(
      'SELECT m.activo, m.id_usuario FROM medicos m WHERE m.id = $1',
      [id]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado.' });

    const nuevoEstado  = !medicoRes.rows[0].activo;
    const id_usuario   = medicoRes.rows[0].id_usuario;

    await Promise.all([
      pool.query('UPDATE medicos  SET activo=$1, updated_at=NOW() WHERE id=$2',         [nuevoEstado, id]),
      pool.query('UPDATE usuarios SET activo=$1, updated_at=NOW() WHERE id=$2',         [nuevoEstado, id_usuario]),
    ]);

    return res.json({
      mensaje: nuevoEstado ? 'Médico activado correctamente.' : 'Médico desactivado correctamente.',
      activo: nuevoEstado,
    });
  } catch (err) {
    console.error('Error en toggleEstadoMedico:', err.message);
    return res.status(500).json({ mensaje: 'Error al cambiar el estado del médico.' });
  }
}

// ─── GET /medico/perfil — Perfil del médico autenticado ───────────────────────
async function perfilMedico(req, res) {
  const id_usuario = req.usuario.id;
  try {
    const resultado = await pool.query(
      `SELECT m.*, u.nombre, u.primer_apellido, u.email, u.telefono,
              u.tipo_documento, u.numero_documento, u.ciudad,
              e.nombre AS especialidad
       FROM medicos m
       JOIN usuarios      u ON m.id_usuario      = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       WHERE m.id_usuario = $1`,
      [id_usuario]
    );
    if (resultado.rows.length === 0)
      return res.status(404).json({ mensaje: 'Perfil de médico no encontrado.' });
    return res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error en perfilMedico:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el perfil.' });
  }
}

// ─── GET /medico/agenda?fecha= — Agenda del médico autenticado ────────────────
async function agendaMedico(req, res) {
  const id_usuario = req.usuario.id;
  const { fecha }  = req.query;
  const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Perfil de médico no encontrado.' });

    const id_medico = medicoRes.rows[0].id;

    const resultado = await pool.query(
      `SELECT
          c.id, c.fecha, c.hora_inicio, c.tipo_consulta,
          c.motivo, c.estado,
          u.nombre AS paciente_nombre, u.primer_apellido AS paciente_apellido,
          u.telefono AS paciente_telefono,
          e.nombre AS especialidad,
          hc.id AS historia_id
       FROM citas c
       JOIN usuarios      u  ON c.id_paciente    = u.id
       JOIN especialidades e ON c.id_especialidad = e.id
       LEFT JOIN historias_clinicas hc ON hc.id_cita = c.id
       WHERE c.id_medico = $1 AND c.fecha = $2
       ORDER BY c.hora_inicio`,
      [id_medico, fechaConsulta]
    );

    return res.json({ fecha: fechaConsulta, citas: resultado.rows });
  } catch (err) {
    console.error('Error en agendaMedico:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener la agenda.' });
  }
}

// ─── GET /medico/agenda/rango?inicio=&fin= — Para FullCalendar ────────────────
async function agendaRango(req, res) {
  const id_usuario = req.usuario.id;
  const { inicio, fin } = req.query;

  if (!inicio || !fin)
    return res.status(400).json({ mensaje: 'Se requieren los parámetros inicio y fin.' });

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Perfil de médico no encontrado.' });

    const id_medico = medicoRes.rows[0].id;

    const resultado = await pool.query(
      `SELECT c.id, c.fecha, c.hora_inicio, c.tipo_consulta, c.estado,
              u.nombre AS paciente_nombre, u.primer_apellido AS paciente_apellido
       FROM citas c
       JOIN usuarios u ON c.id_paciente = u.id
       WHERE c.id_medico = $1
         AND c.fecha BETWEEN $2 AND $3
         AND c.estado != 'cancelada'
       ORDER BY c.fecha, c.hora_inicio`,
      [id_medico, inicio, fin]
    );

    const eventos = resultado.rows.map(c => ({
      id:    c.id,
      title: `${c.paciente_nombre} ${c.paciente_apellido}`,
      start: `${c.fecha.toISOString().split('T')[0]}T${c.hora_inicio}`,
      extendedProps: { tipo: c.tipo_consulta, estado: c.estado },
    }));

    return res.json(eventos);
  } catch (err) {
    console.error('Error en agendaRango:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el rango de agenda.' });
  }
}

// ─── POST /medico/franjas — Crear franja horaria (Médico autenticado) ─────────
async function crearFranja(req, res) {
  const id_usuario = req.usuario.id;
  const { fecha, hora_inicio, hora_fin } = req.body;

  if (!fecha || !hora_inicio || !hora_fin)
    return res.status(400).json({ mensaje: 'Fecha, hora de inicio y hora de fin son obligatorios.' });

  if (hora_inicio >= hora_fin)
    return res.status(400).json({ mensaje: 'La hora de inicio debe ser anterior a la hora de fin.' });

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1 AND activo = TRUE',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(403).json({ mensaje: 'No tienes un perfil médico activo.' });

    const id_medico = medicoRes.rows[0].id;

    const nueva = await pool.query(
      `INSERT INTO franjas_horarias (id_medico, fecha, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id_medico, fecha, hora_inicio, hora_fin]
    );

    return res.status(201).json({ mensaje: 'Franja horaria creada.', franja: nueva.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ mensaje: 'Ya existe una franja para esa fecha y hora.' });
    console.error('Error en crearFranja:', err.message);
    return res.status(500).json({ mensaje: 'Error al crear la franja horaria.' });
  }
}

// ─── GET /medico/franjas?fecha= — Listar franjas del médico ───────────────────
async function listarFranjas(req, res) {
  const id_usuario = req.usuario.id;
  const { fecha }  = req.query;

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Perfil de médico no encontrado.' });

    const id_medico  = medicoRes.rows[0].id;
    const condFecha  = fecha ? 'AND f.fecha = $2' : '';
    const params     = fecha ? [id_medico, fecha] : [id_medico];

    const resultado = await pool.query(
      `SELECT f.*, c.id AS cita_id
       FROM franjas_horarias f
       LEFT JOIN citas c ON c.id_franja = f.id AND c.estado != 'cancelada'
       WHERE f.id_medico = $1 ${condFecha}
       ORDER BY f.fecha, f.hora_inicio`,
      params
    );

    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarFranjas:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener las franjas horarias.' });
  }
}

// ─── DELETE /medico/franjas/:id — Eliminar franja libre (Médico) ──────────────
async function eliminarFranja(req, res) {
  const { id }     = req.params;
  const id_usuario = req.usuario.id;

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Perfil de médico no encontrado.' });

    const id_medico = medicoRes.rows[0].id;
    const franja    = await pool.query(
      'SELECT * FROM franjas_horarias WHERE id = $1 AND id_medico = $2',
      [id, id_medico]
    );

    if (franja.rows.length === 0)
      return res.status(404).json({ mensaje: 'Franja no encontrada.' });

    if (!franja.rows[0].disponible)
      return res.status(400).json({
        mensaje: 'No puedes eliminar una franja que ya tiene una cita reservada.',
      });

    await pool.query('DELETE FROM franjas_horarias WHERE id = $1', [id]);
    return res.json({ mensaje: 'Franja horaria eliminada correctamente.' });
  } catch (err) {
    console.error('Error en eliminarFranja:', err.message);
    return res.status(500).json({ mensaje: 'Error al eliminar la franja horaria.' });
  }
}

// ─── PATCH /medico/citas/:id/completar — El médico termina la cita ──────────
async function completarCita(req, res) {
  const { id } = req.params;
  const id_usuario = req.usuario.id; // ID del usuario (médico) logueado

  try {
    // 1. Buscamos la cita y verificamos que pertenezca a este médico
    const citaRes = await pool.query(
      `SELECT c.id, c.estado, m.id_usuario 
       FROM citas c
       JOIN medicos m ON c.id_medico = m.id
       WHERE c.id = $1`,
      [id]
    );

    if (citaRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Cita no encontrada.' });
    }

    const cita = citaRes.rows[0];

    // 2. Seguridad: ¿Es este médico el dueño de esta cita?
    if (cita.id_usuario !== id_usuario) {
      return res.status(403).json({ mensaje: 'No tienes permiso para modificar esta cita.' });
    }

    // 3. Validaciones de estado
    if (cita.estado === 'completada') {
      return res.status(400).json({ mensaje: 'La cita ya estaba terminada.' });
    }
    if (cita.estado === 'cancelada') {
      return res.status(400).json({ mensaje: 'No puedes terminar una cita cancelada.' });
    }

    // 4. ¡Actualizamos a completada!
    await pool.query(
      "UPDATE citas SET estado = 'completada', updated_at = NOW() WHERE id = $1",
      [id]
    );

    return res.json({ mensaje: 'Cita terminada exitosamente. ¡Buen trabajo, Doc!' });
  } catch (error) {
    console.error('Error en completarCita:', error.message);
    return res.status(500).json({ mensaje: 'Error al terminar la cita.' });
  }
}

module.exports = {
  crearMedico,
  activarCuenta,
  listarMedicos,
  actualizarMedico,
  toggleEstadoMedico,
  perfilMedico,
  agendaMedico,
  agendaRango,
  crearFranja,
  listarFranjas,
  eliminarFranja,
  completarCita,
  

};