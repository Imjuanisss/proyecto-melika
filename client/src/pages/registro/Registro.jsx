import { useState }          from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api }               from '../../lib/apiClient';
import '../login/Login.css';

export default function Registro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: '', 
    primer_apellido: '', 
    email: '', 
    password: '',
    tipo_documento: 'CC',
    numero_documento: '',
    fecha_nacimiento: '', // <-- NUEVO CAMPO
    genero: 'M'           // <-- NUEVO CAMPO
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validación básica de edad (opcional pero recomendada)
    const fechaNac = new Date(form.fecha_nacimiento);
    const hoy = new Date();
    if (fechaNac > hoy) {
      setError('La fecha de nacimiento no puede ser en el futuro.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', form);
      navigate(`/verificar?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-pagina">
      <div className="auth-card">

        <div className="auth-card__cabecera">
          <h1 className="auth-card__titulo">Crear cuenta</h1>
          <p className="auth-card__sub">Únete a MELIKA y agenda sin filas</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
              type="text" name="numero_documento" value={form.numero_documento}
              onChange={handleChange} placeholder="Ej: 1234567890" required
            />
          </div>

          {/* ─── NUEVOS CAMPOS CLÍNICOS ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="auth-campo">
              <label>Fecha de Nacimiento</label>
              <input
                type="date" name="fecha_nacimiento" value={form.fecha_nacimiento}
                onChange={handleChange} required
                max={new Date().toISOString().split("T")[0]} // No permite fechas futuras
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
          {/* ──────────────────────────────── */}

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

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-pie">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}