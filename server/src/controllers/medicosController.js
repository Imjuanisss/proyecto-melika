// server/src/controllers/medicosController.js
const pool       = require('../db');
const bcrypt     = require('bcrypt');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');

function crearTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

// ─── POST /medicos — Crear médico (solo Admin) ─────────────────────────────
async function crearMedico(req, res) {
  const {
    nombre, primer_apellido, email,
    numero_registro, id_especialidad, tarifa,
    acepta_teleconsulta, acepta_presencial,
    biografia, anos_experiencia,
  } = req.body;

  if (!nombre || !primer_apellido || !email || !numero_registro || !id_especialidad || !tarifa) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios.' });
  }

  try {
    // Verificar duplicados
    const [regExiste, emailExiste] = await Promise.all([
      pool.query('SELECT id FROM medicos WHERE numero_registro = $1', [numero_registro]),
      pool.query('SELECT id FROM usuarios WHERE email = $1', [email]),
    ]);

    if (regExiste.rows.length > 0)
      return res.status(409).json({ mensaje: 'El número de registro ya existe.' });
    if (emailExiste.rows.length > 0)
      return res.status(409).json({ mensaje: 'Este correo ya está registrado.' });

    // Crear usuario con contraseña aleatoria (el médico la cambiará al activar)
    const hashTemp = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

    const nuevoUsuario = await pool.query(
      `INSERT INTO usuarios
         (nombre, primer_apellido, email, password_hash, rol, activo, verificado)
       VALUES ($1, $2, $3, $4, 'medico', FALSE, TRUE)
       RETURNING id`,
      [nombre, primer_apellido, email, hashTemp]
    );
    const id_usuario = nuevoUsuario.rows[0].id;

    // Crear perfil médico
    const nuevoMedico = await pool.query(
      `INSERT INTO medicos
         (id_usuario, id_especialidad, numero_registro, tarifa,
          acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
       RETURNING *`,
      [
        id_usuario, id_especialidad, numero_registro, tarifa,
        acepta_teleconsulta ?? true,
        acepta_presencial   ?? true,
        biografia           || '',
        anos_experiencia    || 0,
      ]
    );

    // Generar token de invitación (expira en 72 horas)
    const token    = crypto.randomBytes(48).toString('hex');
    const expiraEn = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO tokens_invitacion (id_usuario, token, expira_en)
       VALUES ($1, $2, $3)`,
      [id_usuario, token, expiraEn]
    );

    // Enviar email de activación
    const urlActivacion = `${process.env.FRONTEND_URL}/activar-cuenta?token=${token}`;
    try {
      const transporter = crearTransporter();
      await transporter.sendMail({
        from:    process.env.EMAIL_FROM,
        to:      email,
        subject: 'Bienvenido a MELIKA — Activa tu cuenta',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
            <h1 style="color:#0B1A36">Bienvenido a <span style="color:#E8856A">MELIKA</span></h1>
            <p>Hola Dr(a). <strong>${nombre} ${primer_apellido}</strong>,</p>
            <p>Has sido registrado como especialista en la plataforma MELIKA. 
               Para activar tu cuenta y establecer tu contraseña, haz clic en el botón:</p>
            <a href="${urlActivacion}"
               style="display:inline-block;background:#E8856A;color:#fff;padding:14px 28px;
                      border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0;">
              Activar mi cuenta
            </a>
            <p style="color:#8A9BBE;font-size:13px;">
              Este enlace expira en <strong>72 horas</strong>.<br>
              Si no esperabas este correo, ignóralo.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Error enviando email de invitación:', emailErr.message);
    }

    res.status(201).json({
      mensaje: `Médico creado. Se envió un email de activación a ${email}.`,
      medico:  { ...nuevoMedico.rows[0], nombre, primer_apellido, email },
    });
  } catch (err) {
    console.error('Error en crearMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al crear el médico.' });
  }
}


// ─── POST /medicos/activar — El médico activa su cuenta con token ──────────
async function activarCuenta(req, res) {
  const { token, password } = req.body;

  if (!token || !password)
    return res.status(400).json({ mensaje: 'Token y contraseña son obligatorios.' });
  if (password.length < 6)
    return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });

  try {
    const resultado = await pool.query(
      `SELECT ti.*, u.id as uid
       FROM tokens_invitacion ti
       JOIN usuarios u ON ti.id_usuario = u.id
       WHERE ti.token = $1 AND ti.usado = FALSE`,
      [token]
    );

    if (resultado.rows.length === 0)
      return res.status(400).json({ mensaje: 'Token inválido o ya utilizado.' });

    const registro = resultado.rows[0];

    if (new Date() > new Date(registro.expira_en))
      return res.status(400).json({ mensaje: 'El enlace de activación expiró. Contacta al administrador.' });

    const hash = await bcrypt.hash(password, 10);

    await Promise.all([
      pool.query(
        'UPDATE usuarios SET password_hash = $1, activo = TRUE WHERE id = $2',
        [hash, registro.uid]
      ),
      pool.query(
        'UPDATE tokens_invitacion SET usado = TRUE WHERE id = $1',
        [registro.id]
      ),
    ]);

    res.json({ mensaje: 'Cuenta activada exitosamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('Error en activarCuenta:', err.message);
    res.status(500).json({ mensaje: 'Error al activar la cuenta.' });
  }
}


// ─── GET /medicos — Listar todos los médicos (Admin) ──────────────────────
async function listarMedicos(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT
         m.id, m.numero_registro, m.tarifa, m.calificacion,
         m.acepta_teleconsulta, m.acepta_presencial,
         m.biografia, m.anos_experiencia, m.activo,
         m.id_especialidad,
         u.id AS id_usuario, u.nombre, u.primer_apellido,
         u.email, u.activo AS usuario_activo,
         e.nombre AS especialidad
       FROM medicos m
       JOIN usuarios u ON m.id_usuario = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       ORDER BY u.nombre`
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarMedicos:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener médicos.' });
  }
}


// ─── PUT /medicos/:id — Actualizar médico (Admin) ─────────────────────────
async function actualizarMedico(req, res) {
  const { id } = req.params;
  const {
    nombre, primer_apellido, id_especialidad, tarifa,
    acepta_teleconsulta, acepta_presencial,
    biografia, anos_experiencia,
  } = req.body;

  try {
    const existe = await pool.query('SELECT * FROM medicos WHERE id = $1', [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado.' });

    const id_usuario = existe.rows[0].id_usuario;

    await Promise.all([
      pool.query(
        'UPDATE usuarios SET nombre=$1, primer_apellido=$2, updated_at=NOW() WHERE id=$3',
        [nombre, primer_apellido, id_usuario]
      ),
      pool.query(
        `UPDATE medicos SET
           id_especialidad=$1, tarifa=$2, acepta_teleconsulta=$3,
           acepta_presencial=$4, biografia=$5, anos_experiencia=$6,
           updated_at=NOW()
         WHERE id=$7`,
        [id_especialidad, tarifa, acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, id]
      ),
    ]);

    res.json({ mensaje: 'Médico actualizado correctamente.' });
  } catch (err) {
    console.error('Error en actualizarMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al actualizar el médico.' });
  }
}


// ─── PATCH /medicos/:id/estado — Activar/Desactivar (Admin) ───────────────
async function toggleEstadoMedico(req, res) {
  const { id } = req.params;

  try {
    const existe = await pool.query('SELECT activo FROM medicos WHERE id = $1', [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado.' });

    const nuevoEstado = !existe.rows[0].activo;

    await pool.query(
      'UPDATE medicos SET activo=$1, updated_at=NOW() WHERE id=$2',
      [nuevoEstado, id]
    );

    res.json({ mensaje: nuevoEstado ? 'Médico activado.' : 'Médico desactivado.' });
  } catch (err) {
    console.error('Error en toggleEstadoMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al cambiar estado.' });
  }
}


// ─── GET /medico/perfil — Perfil del médico autenticado ───────────────────
async function perfilMedico(req, res) {
  const id_usuario = req.usuario.id;
  try {
    const resultado = await pool.query(
      `SELECT m.*, u.nombre, u.primer_apellido, u.email, u.telefono,
              e.nombre AS especialidad
       FROM medicos m
       JOIN usuarios u ON m.id_usuario = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       WHERE m.id_usuario = $1`,
      [id_usuario]
    );

    if (resultado.rows.length === 0)
      return res.status(404).json({ mensaje: 'Perfil de médico no encontrado.' });

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error en perfilMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener el perfil.' });
  }
}


// ─── GET /medico/agenda?fecha= — Agenda del médico autenticado ────────────
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
       JOIN usuarios u     ON c.id_paciente    = u.id
       JOIN especialidades e ON c.id_especialidad = e.id
       LEFT JOIN historias_clinicas hc ON hc.id_cita = c.id
       WHERE c.id_medico = $1 AND c.fecha = $2
       ORDER BY c.hora_inicio`,
      [id_medico, fechaConsulta]
    );

    res.json({ fecha: fechaConsulta, citas: resultado.rows });
  } catch (err) {
    console.error('Error en agendaMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener la agenda.' });
  }
}


// ─── GET /medico/agenda/rango?inicio=&fin= — Para FullCalendar ────────────
async function agendaRango(req, res) {
  const id_usuario  = req.usuario.id;
  const { inicio, fin } = req.query;

  if (!inicio || !fin)
    return res.status(400).json({ mensaje: 'Se requiere inicio y fin.' });

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

    res.json(eventos);
  } catch (err) {
    console.error('Error en agendaRango:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener el rango.' });
  }
}


// ─── POST /medico/franjas — Crear franja horaria (Médico) ─────────────────
async function crearFranja(req, res) {
  const id_usuario = req.usuario.id;
  const { fecha, hora_inicio, hora_fin } = req.body;

  if (!fecha || !hora_inicio || !hora_fin)
    return res.status(400).json({ mensaje: 'Fecha, hora_inicio y hora_fin son obligatorios.' });

  if (hora_inicio >= hora_fin)
    return res.status(400).json({ mensaje: 'La hora de inicio debe ser menor a la hora de fin.' });

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1 AND activo = TRUE',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(403).json({ mensaje: 'No tienes perfil de médico activo.' });

    const id_medico = medicoRes.rows[0].id;

    const nueva = await pool.query(
      `INSERT INTO franjas_horarias (id_medico, fecha, hora_inicio, hora_fin)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id_medico, fecha, hora_inicio, hora_fin]
    );

    res.status(201).json({ mensaje: 'Franja creada.', franja: nueva.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ mensaje: 'Ya existe una franja para esa fecha y hora.' });
    console.error('Error en crearFranja:', err.message);
    res.status(500).json({ mensaje: 'Error al crear la franja.' });
  }
}


// ─── GET /medico/franjas?fecha= — Listar franjas del médico ───────────────
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

    res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarFranjas:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener las franjas.' });
  }
}


// ─── DELETE /medico/franjas/:id — Eliminar franja libre (Médico) ──────────
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

    const franja = await pool.query(
      'SELECT * FROM franjas_horarias WHERE id=$1 AND id_medico=$2',
      [id, id_medico]
    );

    if (franja.rows.length === 0)
      return res.status(404).json({ mensaje: 'Franja no encontrada.' });

    if (!franja.rows[0].disponible)
      return res.status(400).json({ mensaje: 'No puedes eliminar una franja que ya tiene una cita reservada.' });

    await pool.query('DELETE FROM franjas_horarias WHERE id=$1', [id]);
    res.json({ mensaje: 'Franja eliminada correctamente.' });
  } catch (err) {
    console.error('Error en eliminarFranja:', err.message);
    res.status(500).json({ mensaje: 'Error al eliminar la franja.' });
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
};