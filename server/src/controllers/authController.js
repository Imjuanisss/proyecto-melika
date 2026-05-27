const pool   = require('../config/db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// ─── Configuración de correo ─────────────────────────────────────────────────
// Las credenciales van en server/.env:
//   EMAIL_USER=tu_correo@gmail.com
//   EMAIL_PASS=tu_app_password_gmail
//   EMAIL_FROM=MELIKA Salud <tu_correo@gmail.com>

function crearTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function generarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Templates de correo ─────────────────────────────────────────────────────

function templateVerificacion(nombre, codigo) {
  return `
    <div style="font-family: 'Sora', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #F6F9FF; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #0B1A36; font-size: 28px; margin: 0;">
          <span style="color: #E8856A;">M</span>ELIKA
        </h1>
        <p style="color: #4A5978; margin: 8px 0 0;">Tu salud, sin esperas ni papeleo</p>
      </div>
      
      <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #D9E4F7;">
        <h2 style="color: #0B1A36; margin: 0 0 16px;">¡Hola, ${nombre}! 👋</h2>
        <p style="color: #4A5978; line-height: 1.6;">
          Gracias por registrarte en MELIKA. Para activar tu cuenta, 
          ingresa el siguiente código en la aplicación:
        </p>
        
        <div style="background: #F6F9FF; border: 2px solid #3B6EE8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #4A5978; font-size: 14px;">Tu código de verificación</p>
          <div style="font-size: 42px; font-weight: 800; color: #0B1A36; letter-spacing: 12px;">
            ${codigo}
          </div>
        </div>
        
        <p style="color: #8A9BBE; font-size: 14px; margin: 16px 0 0;">
          ⏱ Este código expira en <strong>15 minutos</strong>.<br>
          Si no creaste esta cuenta, puedes ignorar este correo.
        </p>
      </div>
      
      <p style="text-align: center; color: #8A9BBE; font-size: 12px; margin-top: 24px;">
        © 2025 MELIKA — Plataforma de Salud Digital Colombia
      </p>
    </div>
  `;
}

function templateRecuperacion(nombre, codigo) {
  return `
    <div style="font-family: 'Sora', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #F6F9FF; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #0B1A36; font-size: 28px; margin: 0;">
          <span style="color: #E8856A;">M</span>ELIKA
        </h1>
      </div>
      
      <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #D9E4F7;">
        <h2 style="color: #0B1A36; margin: 0 0 16px;">Recuperación de contraseña</h2>
        <p style="color: #4A5978; line-height: 1.6;">
          Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer 
          la contraseña de tu cuenta en MELIKA.
        </p>
        
        <div style="background: #FEF3C7; border: 2px solid #B45309; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #B45309; font-size: 14px;">Código de recuperación</p>
          <div style="font-size: 42px; font-weight: 800; color: #0B1A36; letter-spacing: 12px;">
            ${codigo}
          </div>
        </div>
        
        <p style="color: #8A9BBE; font-size: 14px;">
          ⏱ Este código expira en <strong>15 minutos</strong>.<br>
          Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.
        </p>
      </div>
    </div>
  `;
}

// ─── REGISTRO ────────────────────────────────────────────────────────────────

async function register(req, res) {
  const { nombre, primer_apellido, email, password } = req.body;

  if (!nombre || !primer_apellido || !email || !password) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });
  }

  try {
    const existe = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ mensaje: 'Este correo ya está registrado.' });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, primer_apellido, email, password_hash, rol, activo, verificado)
       VALUES ($1, $2, $3, $4, 'paciente', FALSE, FALSE)`,
      [nombre, primer_apellido, email, hash]
    );

    // Generar y guardar código de verificación
    const codigo = generarCodigo();
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Eliminar códigos previos del mismo email + tipo
    await pool.query(
      'DELETE FROM codigos_verificacion WHERE email = $1 AND tipo = $2',
      [email, 'registro']
    );

    await pool.query(
      `INSERT INTO codigos_verificacion (email, codigo, tipo, expira_en)
       VALUES ($1, $2, 'registro', $3)`,
      [email, codigo, expira]
    );

    // Enviar correo
    try {
      const transporter = crearTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `MELIKA Salud <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `${codigo} — Tu código de verificación MELIKA`,
        html: templateVerificacion(nombre, codigo),
      });
    } catch (emailError) {
      console.error('Error enviando correo:', emailError.message);
      // No bloqueamos el registro si falla el correo,
      // pero lo informamos en dev. En prod se debería reintentar.
    }

    res.status(201).json({
      mensaje: 'Cuenta creada. Revisa tu correo para obtener el código de verificación.',
      email, // para pre-llenar la pantalla de verificación
    });
  } catch (error) {
    console.error('Error en register:', error.message);
    res.status(500).json({ mensaje: 'Error al crear la cuenta.' });
  }
}

// ─── REENVIAR CÓDIGO ─────────────────────────────────────────────────────────

async function reenviarCodigo(req, res) {
  const { email, tipo = 'registro' } = req.body;

  if (!email) {
    return res.status(400).json({ mensaje: 'El correo es obligatorio.' });
  }

  try {
    const usuario = await pool.query(
      'SELECT nombre, verificado FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ mensaje: 'No existe una cuenta con este correo.' });
    }

    if (tipo === 'registro' && usuario.rows[0].verificado) {
      return res.status(400).json({ mensaje: 'Esta cuenta ya fue verificada.' });
    }

    const codigo = generarCodigo();
    const expira = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'DELETE FROM codigos_verificacion WHERE email = $1 AND tipo = $2',
      [email, tipo]
    );

    await pool.query(
      `INSERT INTO codigos_verificacion (email, codigo, tipo, expira_en)
       VALUES ($1, $2, $3, $4)`,
      [email, codigo, tipo, expira]
    );

    try {
      const transporter = crearTransporter();
      const html = tipo === 'registro'
        ? templateVerificacion(usuario.rows[0].nombre, codigo)
        : templateRecuperacion(usuario.rows[0].nombre, codigo);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `MELIKA Salud <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `${codigo} — Tu código MELIKA`,
        html,
      });
    } catch (emailError) {
      console.error('Error reenviando correo:', emailError.message);
    }

    res.json({ mensaje: 'Código reenviado. Revisa tu correo.' });
  } catch (error) {
    console.error('Error en reenviarCodigo:', error.message);
    res.status(500).json({ mensaje: 'Error al reenviar el código.' });
  }
}

// ─── VERIFICAR CÓDIGO DE CUENTA ──────────────────────────────────────────────

async function verifyCode(req, res) {
  const { email, codigo } = req.query;

  if (!email || !codigo) {
    return res.status(400).json({ mensaje: 'Email y código son obligatorios.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT * FROM codigos_verificacion
       WHERE email = $1 AND codigo = $2 AND tipo = 'registro'
       ORDER BY created_at DESC LIMIT 1`,
      [email, codigo]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).json({ mensaje: 'Código incorrecto. Verifica e intenta de nuevo.' });
    }

    const registro = resultado.rows[0];

    if (new Date() > new Date(registro.expira_en)) {
      await pool.query(
        'DELETE FROM codigos_verificacion WHERE id = $1',
        [registro.id]
      );
      return res.status(400).json({
        mensaje: 'El código expiró. Solicita uno nuevo.',
        expirado: true,
      });
    }

    // Activar cuenta
    await pool.query(
      'UPDATE usuarios SET activo = TRUE, verificado = TRUE WHERE email = $1',
      [email]
    );

    // Eliminar código usado
    await pool.query(
      'DELETE FROM codigos_verificacion WHERE id = $1',
      [registro.id]
    );

    res.json({ mensaje: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en verifyCode:', error.message);
    res.status(500).json({ mensaje: 'Error al verificar el código.' });
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios.' });
  }

  try {
    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    const usuario = resultado.rows[0];

    if (!usuario.verificado) {
      return res.status(403).json({
        mensaje: 'Debes verificar tu cuenta primero. Revisa tu correo.',
        sinVerificar: true,
        email: usuario.email,
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({ mensaje: 'Tu cuenta está desactivada. Contacta soporte.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id:              usuario.id,
        nombre:          usuario.nombre,
        primer_apellido: usuario.primer_apellido,
        email:           usuario.email,
        rol:             usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ mensaje: 'Error al iniciar sesión.' });
  }
}

// ─── SOLICITAR RECUPERACIÓN DE CONTRASEÑA ────────────────────────────────────

async function solicitarRecuperacion(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ mensaje: 'El correo es obligatorio.' });
  }

  try {
    const usuario = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );

    // Siempre responder igual por seguridad (no revelar si el email existe)
    if (usuario.rows.length === 0) {
      return res.json({
        mensaje: 'Si el correo está registrado, recibirás un código en breve.',
      });
    }

    const codigo = generarCodigo();
    const expira = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'DELETE FROM codigos_verificacion WHERE email = $1 AND tipo = $2',
      [email, 'recuperacion']
    );

    await pool.query(
      `INSERT INTO codigos_verificacion (email, codigo, tipo, expira_en)
       VALUES ($1, $2, 'recuperacion', $3)`,
      [email, codigo, expira]
    );

    try {
      const transporter = crearTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `MELIKA Salud <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `${codigo} — Recupera tu contraseña MELIKA`,
        html: templateRecuperacion(usuario.rows[0].nombre, codigo),
      });
    } catch (emailError) {
      console.error('Error enviando correo recuperación:', emailError.message);
    }

    res.json({ mensaje: 'Si el correo está registrado, recibirás un código en breve.' });
  } catch (error) {
    console.error('Error en solicitarRecuperacion:', error.message);
    res.status(500).json({ mensaje: 'Error al procesar la solicitud.' });
  }
}

// ─── CAMBIAR CONTRASEÑA CON CÓDIGO ───────────────────────────────────────────

async function cambiarPassword(req, res) {
  const { email, codigo, nueva_password } = req.body;

  if (!email || !codigo || !nueva_password) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  if (nueva_password.length < 6) {
    return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT * FROM codigos_verificacion
       WHERE email = $1 AND codigo = $2 AND tipo = 'recuperacion'
       ORDER BY created_at DESC LIMIT 1`,
      [email, codigo]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).json({ mensaje: 'Código incorrecto o inválido.' });
    }

    const registro = resultado.rows[0];

    if (new Date() > new Date(registro.expira_en)) {
      await pool.query('DELETE FROM codigos_verificacion WHERE id = $1', [registro.id]);
      return res.status(400).json({
        mensaje: 'El código expiró. Solicita uno nuevo.',
        expirado: true,
      });
    }

    const hash = await bcrypt.hash(nueva_password, 10);

    await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE email = $2',
      [hash, email]
    );

    await pool.query('DELETE FROM codigos_verificacion WHERE id = $1', [registro.id]);

    res.json({ mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en cambiarPassword:', error.message);
    res.status(500).json({ mensaje: 'Error al cambiar la contraseña.' });
  }
}

module.exports = {
  register,
  login,
  verifyCode,
  reenviarCodigo,
  solicitarRecuperacion,
  cambiarPassword,
};