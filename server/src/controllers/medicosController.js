// server/src/controllers/medicosController.js
// ─── REESCRITURA COMPLETA — todos los bugs de schema corregidos ────────────────
// Incluye: completarCita expandida a gestionarCita con soporte de notas y asistencia.
// FIX: agendaRango ahora también devuelve las franjas disponibles (antes solo
//      devolvía citas, por lo que la disponibilidad creada por el médico nunca
//      se veía en su propio calendario) y usa TO_CHAR para evitar desfases de
//      fecha por zona horaria al construir los eventos de FullCalendar.

const pool       = require('../config/db');
const bcrypt     = require('bcrypt');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');

function crearTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

// ─── HELPER: Generador de Franjas Horarias con Descanso ────────────────────
function generarFranjasConDescanso(horaInicio, horaFin, duracionMinutos, inicioDescanso, finDescanso) {
  const franjas = [];
  let actual = new Date(`2000-01-01T${horaInicio}:00`);
  const finJornada = new Date(`2000-01-01T${horaFin}:00`);
  
  let inicioBreak = null;
  let finBreak = null;
  
  if (inicioDescanso && finDescanso) {
      inicioBreak = new Date(`2000-01-01T${inicioDescanso}:00`);
      finBreak = new Date(`2000-01-01T${finDescanso}:00`);
  }

  while (actual < finJornada) {
    let finFranja = new Date(actual.getTime() + duracionMinutos * 60000);

    if (inicioBreak && finBreak && actual < finBreak && finFranja > inicioBreak) {
      actual = new Date(finBreak);
      continue; 
    }

    if (finFranja <= finJornada) {
      franjas.push({
        hora_inicio: actual.toTimeString().substring(0, 5),
        hora_fin: finFranja.toTimeString().substring(0, 5)
      });
    }
    actual = finFranja;
  }
  return franjas;
}

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
    foto_url,
  } = req.body;

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

  const tiposValidos = ['CC', 'CE', 'PASAPORTE'];
  if (!tiposValidos.includes(tipo_documento)) {
    return res.status(400).json({ mensaje: 'Tipo de documento inválido. Use CC, CE o PASAPORTE.' });
  }

  try {
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

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hash         = await bcrypt.hash(tempPassword, 10);

    const usuarioRes = await pool.query(
      `INSERT INTO usuarios
         (nombre, primer_apellido, email, password_hash, rol, activo, verificado, tipo_documento, numero_documento, ciudad)
       VALUES ($1,$2,$3,$4,'medico',FALSE,FALSE,$5,$6,$7)
       RETURNING id`,
      [nombre, primer_apellido, email, hash, tipo_documento, numero_documento, ciudad || null]
    );

    const id_usuario = usuarioRes.rows[0].id;

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO tokens_invitacion (email, token, rol, expira_en)
       VALUES ($1,$2,'medico',$3)`,
      [email, token, expira]
    );

    await pool.query(
      `INSERT INTO medicos
         (id_usuario, id_especialidad, numero_registro, tarifa,
          acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, foto_url)
       VALUES ($1,$2,$3,0,$4,$5,$6,$7,$8)`,
      [
        id_usuario, id_especialidad, numero_registro,
        acepta_teleconsulta !== false,
        acepta_presencial   !== false,
        biografia           || null,
        anos_experiencia    || 0,
        foto_url            || null,
      ]
    );

    try {
      const activationUrl = `${process.env.FRONTEND_URL}/activar-cuenta?token=${token}`;
      const transporter   = crearTransporter();
      await transporter.sendMail({
        from:    process.env.EMAIL_FROM || `MELIKA Salud <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: 'Bienvenido a MELIKA — Activa tu cuenta médica',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2>Bienvenido/a, Dr(a). ${nombre} ${primer_apellido}</h2>
            <p>Tu cuenta médica en <strong>MELIKA Salud</strong> ha sido creada.</p>
            <p>Haz clic en el botón para activarla y establecer tu contraseña:</p>
            <a href="${activationUrl}"
               style="display:inline-block;background:#E8856A;color:#fff;
                      padding:12px 24px;border-radius:6px;text-decoration:none;
                      font-weight:700;margin:16px 0">
              Activar mi cuenta
            </a>
            <p style="font-size:13px;color:#666">Este enlace expira en 72 horas.</p>
          </div>`,
      });
    } catch (emailErr) {
      console.error('Error enviando correo de activación:', emailErr.message);
    }

    res.status(201).json({ mensaje: `Médico creado. Se envió un correo de activación a ${email}.` });
  } catch (err) {
    console.error('Error en crearMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al crear el médico.' });
  }
}

// ─── POST /medicos/activar — Activar cuenta de médico ─────────────────────────
async function activarCuenta(req, res) {
  const { token, nueva_password } = req.body;

  if (!token || !nueva_password)
    return res.status(400).json({ mensaje: 'Token y nueva contraseña son obligatorios.' });
  if (nueva_password.length < 6)
    return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });

  try {
    const tokenRes = await pool.query(
      `SELECT * FROM tokens_invitacion
       WHERE token = $1 AND rol = 'medico' AND usado = FALSE`,
      [token]
    );

    if (tokenRes.rows.length === 0)
      return res.status(400).json({ mensaje: 'Token inválido o ya utilizado.' });

    const inv = tokenRes.rows[0];

    if (new Date() > new Date(inv.expira_en))
      return res.status(400).json({ mensaje: 'El enlace de activación expiró. Contacta al administrador.' });

    const hash = await bcrypt.hash(nueva_password, 10);

    await pool.query(
      'UPDATE usuarios SET password_hash=$1, activo=TRUE, verificado=TRUE WHERE email=$2',
      [hash, inv.email]
    );

    await pool.query(
      'UPDATE tokens_invitacion SET usado=TRUE WHERE id=$1',
      [inv.id]
    );

    res.json({ mensaje: 'Cuenta activada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('Error en activarCuenta:', err.message);
    res.status(500).json({ mensaje: 'Error al activar la cuenta.' });
  }
}

// ─── GET /medicos — Listar médicos (Admin) ─────────────────────────────────────
async function listarMedicos(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT m.id, m.numero_registro, m.tarifa, m.calificacion, m.activo,
              m.acepta_teleconsulta, m.acepta_presencial, m.biografia,
              m.anos_experiencia, m.foto_url,
              u.id AS id_usuario, u.nombre, u.primer_apellido, u.email,
              u.telefono, u.ciudad, u.tipo_documento, u.numero_documento,
              e.id AS id_especialidad, e.nombre AS especialidad
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

// ─── PUT /medicos/:id — Actualizar médico (Admin) ──────────────────────────────
async function actualizarMedico(req, res) {
  const { id } = req.params;
  const {
    nombre, primer_apellido, ciudad, id_especialidad,
    tarifa, acepta_teleconsulta, acepta_presencial,
    biografia, anos_experiencia, foto_url,
  } = req.body;

  try {
    const medicoRes = await pool.query(
      'SELECT id_usuario FROM medicos WHERE id = $1',
      [id]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado.' });

    const id_usuario = medicoRes.rows[0].id_usuario;

    await pool.query(
      `UPDATE usuarios
       SET nombre=$1, primer_apellido=$2, ciudad=$3, updated_at=NOW()
       WHERE id=$4`,
      [nombre, primer_apellido, ciudad || null, id_usuario]
    );

    await pool.query(
      `UPDATE medicos
       SET id_especialidad=$1, tarifa=$2,
           acepta_teleconsulta=$3, acepta_presencial=$4,
           biografia=$5, anos_experiencia=$6, foto_url=$7,
           updated_at=NOW()
       WHERE id=$8`,
      [
        id_especialidad, tarifa || 0,
        acepta_teleconsulta !== false,
        acepta_presencial   !== false,
        biografia           || null,
        anos_experiencia    || 0,
        foto_url            || null,
        id,
      ]
    );

    res.json({ mensaje: 'Médico actualizado correctamente.' });
  } catch (err) {
    console.error('Error en actualizarMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al actualizar el médico.' });
  }
}

// ─── PATCH /medicos/:id/estado — Activar / Desactivar médico (Admin) ──────────
async function toggleEstadoMedico(req, res) {
  const { id } = req.params;

  try {
    const medico = await pool.query(
      'SELECT id, activo, id_usuario FROM medicos WHERE id = $1',
      [id]
    );
    if (medico.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado.' });

    const nuevoEstado = !medico.rows[0].activo;

    await pool.query(
      'UPDATE medicos SET activo=$1, updated_at=NOW() WHERE id=$2',
      [nuevoEstado, id]
    );
    await pool.query(
      'UPDATE usuarios SET activo=$1, updated_at=NOW() WHERE id=$2',
      [nuevoEstado, medico.rows[0].id_usuario]
    );

    res.json({ mensaje: nuevoEstado ? 'Médico activado.' : 'Médico desactivado.' });
  } catch (err) {
    console.error('Error en toggleEstadoMedico:', err.message);
    res.status(500).json({ mensaje: 'Error al cambiar el estado del médico.' });
  }
}

// ─── GET /medico/perfil — Perfil del médico autenticado ───────────────────────
async function perfilMedico(req, res) {
  const id_usuario = req.usuario.id;

  try {
    const resultado = await pool.query(
      `SELECT m.id, m.numero_registro, m.tarifa, m.calificacion,
              m.acepta_teleconsulta, m.acepta_presencial,
              m.biografia, m.anos_experiencia, m.foto_url,
              u.nombre, u.primer_apellido, u.email, u.telefono, u.ciudad,
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

// ─── GET /medico/agenda?fecha= — Agenda del día ───────────────────────────────
async function agendaMedico(req, res) {
  const id_usuario    = req.usuario.id;
  const fechaConsulta = req.query.fecha || new Date().toISOString().split('T')[0];

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
          c.id,
          TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
          c.hora_inicio,
          c.tipo_consulta,
          c.motivo,
          c.estado,
          c.notas_medicas,
          u.nombre  AS paciente_nombre,
          u.primer_apellido AS paciente_apellido,
          u.telefono AS paciente_telefono,
          e.nombre  AS especialidad,
          hc.id     AS historia_id
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

// =============================================================================
// GET /medico/agenda/rango?inicio=&fin= — Para FullCalendar
// =============================================================================
// FIX PROFESIONAL:
//   1) Antes esta función SOLO consultaba la tabla `citas`. Eso significa que
//      cuando el médico creaba disponibilidad (franja puntual o semana
//      completa), esas franjas jamás se traducían en eventos del calendario
//      porque la query nunca tocaba `franjas_horarias`. Ahora se consultan
//      ambas fuentes y se combinan en un solo array de eventos.
//   2) Se usa TO_CHAR(..., 'YYYY-MM-DD') en lugar de invocar .toISOString()
//      sobre el objeto Date que entrega node-postgres, evitando el desfase
//      de día que ocurre cuando el servidor no corre en UTC.
// =============================================================================
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

    // 1. Citas del médico en el rango solicitado
    const citasRes = await pool.query(
      `SELECT c.id,
              TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha_str,
              c.hora_inicio, c.tipo_consulta, c.estado,
              u.nombre AS paciente_nombre, u.primer_apellido AS paciente_apellido
       FROM citas c
       JOIN usuarios u ON c.id_paciente = u.id
       WHERE c.id_medico = $1
         AND c.fecha BETWEEN $2 AND $3
         AND c.estado != 'cancelada'
       ORDER BY c.fecha, c.hora_inicio`,
      [id_medico, inicio, fin]
    );

    // 2. Franjas de disponibilidad libres del médico en el rango solicitado
    const franjasRes = await pool.query(
      `SELECT id,
              TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha_str,
              hora_inicio, hora_fin
       FROM franjas_horarias
       WHERE id_medico = $1
         AND fecha BETWEEN $2 AND $3
         AND disponible = TRUE
       ORDER BY fecha, hora_inicio`,
      [id_medico, inicio, fin]
    );

    const COLOR_ESTADO = {
      pendiente:  { bg: '#B45309', border: '#92400E' },
      completada: { bg: '#1A7A52', border: '#145C3E' },
      no_asistio: { bg: '#6B7280', border: '#4B5563' },
    };

    const eventosCitas = citasRes.rows.map(c => {
      const colores = COLOR_ESTADO[c.estado] || { bg: '#E8856A', border: '#C96848' };
      return {
        id:              `cita-${c.id}`,
        title:           `${c.paciente_nombre} ${c.paciente_apellido}`,
        start:           `${c.fecha_str}T${c.hora_inicio}`,
        backgroundColor: colores.bg,
        borderColor:     colores.border,
        textColor:       '#fff',
        extendedProps: {
          tipo:               c.tipo_consulta,
          estado:             c.estado,
          esFranjaDisponible: false,
        },
      };
    });

    // Espacios libres ya configurados por el médico — se distinguen visualmente
    // (verde suave) de las citas reservadas para que el médico confirme de
    // inmediato que su disponibilidad quedó registrada en el día/hora correctos.
    const eventosFranjas = franjasRes.rows.map(f => ({
      id:              `franja-${f.id}`,
      title:           '🟢 Disponible',
      start:           `${f.fecha_str}T${f.hora_inicio}`,
      end:             `${f.fecha_str}T${f.hora_fin}`,
      backgroundColor: '#D1FAE5',
      borderColor:     '#1A7A52',
      textColor:       '#065F46',
      display:         'block',
      extendedProps: {
        esFranjaDisponible: true,
      },
    }));

    return res.json([...eventosFranjas, ...eventosCitas]);
  } catch (err) {
    console.error('Error en agendaRango:', err.message);
    return res.status(500).json({ mensaje: 'Error al obtener el rango de agenda.' });
  }
}

// ─── POST /medico/franjas — Crear franja horaria ───────────────────────────────
async function crearFranja(req, res) {
  const id_usuario = req.usuario.id;
  // Agregamos inicio_descanso y fin_descanso al body
  const { fecha, hora_inicio, hora_fin, inicio_descanso, fin_descanso } = req.body;

  if (!fecha || !hora_inicio || !hora_fin) {
    return res.status(400).json({ mensaje: "Faltan parámetros obligatorios." });
  }

  try {
    const medicoRes = await pool.query('SELECT id FROM medicos WHERE id_usuario=$1', [id_usuario]);
    if (medicoRes.rows.length === 0) return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });
    
    const id_medico = medicoRes.rows[0].id;

    // 1. Llamamos al generador de 40 minutos
    const franjasGeneradas = generarFranjasConDescanso(
        hora_inicio, 
        hora_fin, 
        40, // Los 40 minutos fijos que definimos
        inicio_descanso, 
        fin_descanso
    );

    if(franjasGeneradas.length === 0){
        return res.status(400).json({ mensaje: "El rango de horas no permite crear franjas completas de 40 min." });
    }

    // 2. Guardamos en la base de datos verificando que no existan duplicados
    let insertadas = 0;
    for (const franja of franjasGeneradas) {
        const existe = await pool.query(
            `SELECT id FROM franjas_horarias WHERE id_medico=$1 AND fecha=$2 AND hora_inicio=$3`,
            [id_medico, fecha, franja.hora_inicio]
        );
        if (existe.rows.length === 0) {
           await pool.query(
              `INSERT INTO franjas_horarias (id_medico, fecha, hora_inicio, hora_fin, estado)
               VALUES ($1, $2, $3, $4, 'disponible')`,
              [id_medico, fecha, franja.hora_inicio, franja.hora_fin]
            );
            insertadas++;
        }
    }
    
    res.status(201).json({ 
        mensaje: `Se crearon ${insertadas} citas de 40 minutos exitosamente.`,
        franjas_intentadas: franjasGeneradas.length
    });

  } catch (error) {
    console.error('Error en crearFranja masiva:', error.message);
    res.status(500).json({ mensaje: 'Error al generar la disponibilidad.' });
  }
}

// ─── GET /medico/franjas?fecha= — Listar franjas ──────────────────────────────
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

    const id_medico = medicoRes.rows[0].id;
    const condFecha = fecha ? 'AND f.fecha = $2' : '';
    const params    = fecha ? [id_medico, fecha] : [id_medico];

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

// ─── DELETE /medico/franjas/:id — Eliminar franja libre ───────────────────────
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
      'SELECT * FROM franjas_horarias WHERE id=$1 AND id_medico=$2',
      [id, id_medico]
    );

    if (franja.rows.length === 0)
      return res.status(404).json({ mensaje: 'Franja no encontrada.' });
    if (!franja.rows[0].disponible)
      return res.status(400).json({ mensaje: 'No puedes eliminar una franja con cita reservada.' });

    await pool.query('DELETE FROM franjas_horarias WHERE id=$1', [id]);
    return res.json({ mensaje: 'Franja horaria eliminada correctamente.' });
  } catch (err) {
    console.error('Error en eliminarFranja:', err.message);
    return res.status(500).json({ mensaje: 'Error al eliminar la franja horaria.' });
  }
}

// =============================================================================
// ─── PATCH /medico/citas/:id/gestionar — Gestión profesional de cita ──────────
// =============================================================================
// Expande la idea del amigo (completarCita) en un flujo completo:
//   - El médico puede marcar la cita como 'completada' o 'no_asistio'
//   - Puede añadir notas médicas (campo notas_medicas ya existe en el schema)
//   - Valida que la cita le pertenezca
//   - Valida que los estados de transición sean coherentes
//   - No puede gestionar citas ya canceladas
// =============================================================================
async function gestionarCita(req, res) {
  const { id }                    = req.params;
  const { estado, notas_medicas } = req.body;
  const id_usuario                = req.usuario.id;

  // Solo estos dos estados puede asignar el médico
  const estadosPermitidos = ['completada', 'no_asistio'];
  if (!estadosPermitidos.includes(estado)) {
    return res.status(400).json({
      mensaje: 'Estado no válido. El médico solo puede marcar una cita como "completada" o "no_asistio".',
    });
  }

  try {
    // 1. Obtener id_medico del usuario autenticado
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id_usuario = $1',
      [id_usuario]
    );
    if (medicoRes.rows.length === 0)
      return res.status(403).json({ mensaje: 'No tienes perfil de médico.' });

    const id_medico = medicoRes.rows[0].id;

    // 2. Obtener la cita y verificar que pertenece a este médico
    const citaRes = await pool.query(
      'SELECT id, estado, fecha FROM citas WHERE id=$1 AND id_medico=$2',
      [id, id_medico]
    );
    if (citaRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Cita no encontrada o no te pertenece.' });

    const cita = citaRes.rows[0];

    // 3. Única restricción: no gestionar citas canceladas.
    //    El médico puede corregir libremente entre completada y no_asistio
    //    sin bloqueos — un error de registro debe poder corregirse.
    if (cita.estado === 'cancelada') {
      return res.status(400).json({ mensaje: 'No puedes gestionar una cita cancelada.' });
    }

    // 4. Actualizar — notas_medicas es opcional; si no se envía, se mantiene el valor previo
    const resultado = await pool.query(
      `UPDATE citas
       SET estado        = $1,
           notas_medicas = COALESCE($2, notas_medicas),
           updated_at    = NOW()
       WHERE id = $3
       RETURNING id, estado, notas_medicas`,
      [estado, notas_medicas?.trim() || null, id]
    );

    const mensajes = {
      completada: '✅ Cita marcada como completada.',
      no_asistio: '📋 Paciente registrado como no asistente.',
    };

    return res.json({
      mensaje: mensajes[estado],
      cita:    resultado.rows[0],
    });
  } catch (err) {
    console.error('Error en gestionarCita:', err.message);
    return res.status(500).json({ mensaje: 'Error al gestionar la cita.' });
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
  gestionarCita,
};