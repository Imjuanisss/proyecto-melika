import { useState }          from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api }               from '../../lib/apiClient';
import '../login/Login.css';

const ESTADO_INICIAL = {
  nombre: '',
  primer_apellido: '',
  email: '',
  password: '',
  tipo_documento: 'CC',
  numero_documento: '',
  fecha_nacimiento: '',
  genero: 'M',
};

const REGEX_NOMBRE         = /^[a-zA-ZÀ-ÿñÑ\s'-]+$/;
const REGEX_SOLO_DIGITOS   = /^[0-9]{5,15}$/;
const EDAD_MAXIMA_ANIOS    = 120;

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN PROFESIONAL — debe reflejar exactamente las reglas del backend
// (server/src/utils/validacionesRegistro.js) para que el usuario nunca
// llegue al servidor con datos inconsistentes, y para dar feedback inmediato.
// ─────────────────────────────────────────────────────────────────────────────
function esTextoTrivial(valor) {
  const v = String(valor).trim();
  if (v.length === 0) return true;
  if (/^\d+$/.test(v)) return true;
  if (/^[.,;:\-_*#/\\\s]+$/.test(v)) return true;
  if (/^(.)\1{2,}$/i.test(v)) return true;
  return false;
}

function calcularEdadAnios(fechaStr) {
  if (!fechaStr) return null;
  const nac = new Date(fechaStr);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function validarFormulario(form) {
  const errores = [];

  // Nombre / apellido
  [['nombre', 'El nombre'], ['primer_apellido', 'El apellido']].forEach(([campo, label]) => {
    const v = form[campo].trim();
    if (!v) {
      errores.push(`${label} es obligatorio.`);
    } else if (v.length < 2 || esTextoTrivial(v)) {
      errores.push(`${label} no es válido: escriba un nombre real, no números ni caracteres repetidos.`);
    } else if (!REGEX_NOMBRE.test(v)) {
      errores.push(`${label} solo puede contener letras y espacios.`);
    }
  });

  // Documento
  if (!form.numero_documento.trim()) {
    errores.push('El número de documento es obligatorio.');
  } else if (!REGEX_SOLO_DIGITOS.test(form.numero_documento.trim())) {
    errores.push('El número de documento debe contener solo números (5 a 15 dígitos), sin letras ni símbolos.');
  }

  // Fecha de nacimiento
  if (!form.fecha_nacimiento) {
    errores.push('La fecha de nacimiento es obligatoria.');
  } else {
    const fecha = new Date(form.fecha_nacimiento);
    const hoy   = new Date();
    if (Number.isNaN(fecha.getTime())) {
      errores.push('La fecha de nacimiento no es válida.');
    } else if (fecha > hoy) {
      errores.push('La fecha de nacimiento no puede ser en el futuro.');
    } else {
      const edad = calcularEdadAnios(form.fecha_nacimiento);
      if (edad === null || edad < 0 || edad > EDAD_MAXIMA_ANIOS) {
        errores.push(`La fecha de nacimiento no es coherente (edad fuera de rango: 0-${EDAD_MAXIMA_ANIOS} años).`);
      }
    }
  }

  // Género
  if (!['M', 'F', 'O'].includes(form.genero)) {
    errores.push('El género debe ser Masculino, Femenino u Otro.');
  }

  // Email — validación ligera; el formato estricto lo hace el input type="email"
  if (!form.email.trim()) {
    errores.push('El correo electrónico es obligatorio.');
  }

  // Password
  if (!form.password) {
    errores.push('La contraseña es obligatoria.');
  } else if (form.password.length < 6) {
    errores.push('La contraseña debe tener mínimo 6 caracteres.');
  } else if (esTextoTrivial(form.password) && form.password.length < 8) {
    errores.push('La contraseña es demasiado débil (evita repetir el mismo carácter).');
  }

  return errores;
}

export default function Registro() {
  const navigate = useNavigate();

  const [form, setForm]       = useState(ESTADO_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [erroresDetalle, setErroresDetalle] = useState([]);

  // ── Estado del correo de verificación ─────────────────────────────────────
  // La cuenta puede quedar creada en el backend aunque el envío del correo
  // falle (por ejemplo, un problema temporal con la API de Gmail). En ese
  // caso NO debemos avanzar a la pantalla de "verificar código" — el usuario
  // no tendría ningún código que ingresar. En su lugar, mostramos un aviso
  // claro y un botón para reintentar el envío, y solo navegamos cuando el
  // correo efectivamente salió.
  const [cuentaCreada, setCuentaCreada] = useState(false);
  const [reenviando,   setReenviando]   = useState(false);
  const [avisoCorreo,  setAvisoCorreo]  = useState(null);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setErroresDetalle([]);
    setAvisoCorreo(null);

    const errores = validarFormulario(form);
    if (errores.length > 0) {
      setErroresDetalle(errores);
      setError(errores.join(' '));
      return;
    }

    setLoading(true);
    try {
      const emailNormalizado = form.email.trim().toLowerCase();
      const res = await api.post('/auth/register', {
        ...form,
        nombre:           form.nombre.trim(),
        primer_apellido:  form.primer_apellido.trim(),
        email:            emailNormalizado,
        numero_documento: form.numero_documento.trim(),
      });

      // La cuenta ya quedó creada en la base de datos — a partir de aquí
      // un reintento de /auth/register fallaría con 409 "correo ya
      // registrado", así que cualquier reintento debe hacerse contra
      // /auth/reenviar-codigo, no volviendo a enviar el formulario.
      setCuentaCreada(true);

      if (res?.correoEnviado === false) {
        // ⚠️ NO navegamos: no hay código útil esperando al usuario.
        setAvisoCorreo(
          'Tu cuenta fue creada, pero no pudimos enviarte el correo con el código de verificación. ' +
          'Intenta reenviarlo con el botón de abajo.'
        );
      } else {
        navigate(`/verificar?email=${encodeURIComponent(emailNormalizado)}`);
      }
    } catch (err) {
      const detalle = Array.isArray(err?.errores) ? err.errores : [];
      setErroresDetalle(detalle);
      setError(detalle.length > 0 ? detalle.join(' ') : (err.message || 'No se pudo crear la cuenta.'));
    } finally {
      setLoading(false);
    }
  }

  // ── Reintentar el envío del correo de verificación ────────────────────────
  // Solo navega a /verificar cuando el reenvío efectivamente tuvo éxito.
  async function handleReenviarCodigo() {
    const emailNormalizado = form.email.trim().toLowerCase();
    setReenviando(true);
    setAvisoCorreo(null);
    try {
      const res = await api.post('/auth/reenviar-codigo', {
        email: emailNormalizado,
        tipo:  'registro',
      });

      if (res?.correoEnviado === false) {
        setAvisoCorreo(
          'Seguimos sin poder enviar el correo. Verifica tu conexión o intenta de nuevo en unos minutos.'
        );
        return;
      }

      navigate(`/verificar?email=${encodeURIComponent(emailNormalizado)}`);
    } catch (err) {
      setAvisoCorreo(err?.mensaje || err?.message || 'No se pudo reenviar el código. Intenta de nuevo.');
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="auth-pagina">
      <div className="auth-card">

        <div className="auth-card__cabecera">
          <h1 className="auth-card__titulo">Crear cuenta</h1>
          <p className="auth-card__sub">Únete a MELIKA y agenda sin filas</p>
        </div>

        {error && (
          <div className="auth-error">
            {erroresDetalle.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {erroresDetalle.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            ) : error}
          </div>
        )}

        {/* ── Aviso: cuenta creada pero el correo de verificación falló ──
            No navegamos a /verificar en este caso porque el usuario no
            tendría ningún código válido esperándolo. Se ofrece reintentar
            el envío explícitamente. */}
        {avisoCorreo && (
          <div className="auth-error" style={{ background: '#FEF3C7', borderColor: '#B45309', color: '#92400E' }}>
            <p style={{ margin: '0 0 10px' }}>⚠️ {avisoCorreo}</p>
            <button
              type="button"
              className="auth-btn"
              onClick={handleReenviarCodigo}
              disabled={reenviando}
              style={{ width: 'auto', padding: '8px 18px' }}
            >
              {reenviando ? 'Reenviando…' : '📩 Reenviar código'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-campo">
            <label>Nombre</label>
            <input
              type="text" name="nombre" value={form.nombre}
              onChange={handleChange} placeholder="Tu nombre" required
            />
          </div>

          <div className="auth-campo">
            <label>Apellido</label>
            <input
              type="text" name="primer_apellido" value={form.primer_apellido}
              onChange={handleChange} placeholder="Tu apellido" required
            />
          </div>

          <div className="auth-campo">
            <label>Tipo de documento</label>
            <select
              name="tipo_documento"
              value={form.tipo_documento}
              onChange={handleChange}
              required
            >
              <option value="CC">Cédula de Ciudadanía (CC)</option>
              <option value="CE">Cédula de Extranjería (CE)</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>

          <div className="auth-campo">
            <label>Número de documento</label>
            <input
              type="text"
              name="numero_documento"
              value={form.numero_documento}
              onChange={e => {
                // Solo permite dígitos mientras se escribe — evita que el
                // usuario pueda siquiera teclear letras en este campo.
                const soloDigitos = e.target.value.replace(/\D/g, '');
                setForm(prev => ({ ...prev, numero_documento: soloDigitos }));
              }}
              placeholder="Ej: 1234567890"
              inputMode="numeric"
              pattern="[0-9]{5,15}"
              maxLength={15}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="auth-campo">
              <label>Fecha de Nacimiento</label>
              <input
                type="date" name="fecha_nacimiento" value={form.fecha_nacimiento}
                onChange={handleChange} required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="auth-campo">
              <label>Género</label>
              <select
                name="genero"
                value={form.genero}
                onChange={handleChange}
                required
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
          </div>

          <div className="auth-campo">
            <label>Correo electrónico</label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="tu@correo.com" required
            />
          </div>

          <div className="auth-campo">
            <label>Contraseña</label>
            <input
              type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="Mínimo 6 caracteres"
              minLength={6} required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading || cuentaCreada}>
            {loading ? 'Creando cuenta…' : cuentaCreada ? 'Cuenta creada ✓' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-pie">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}