import { useState }          from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api }               from '../../lib/apiClient';
import '../login/Login.css';

export default function Registro() {
  const navigate = useNavigate();

  // Se añaden tipo_documento (con el default de la DB) y numero_documento al estado inicial
  const [form, setForm] = useState({
    nombre: '', 
    primer_apellido: '', 
    email: '', 
    password: '',
    tipo_documento: 'CC',
    numero_documento: ''
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

    try {
      await api.post('/auth/register', form);
      // Redirigir a verificación con el email
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

          {/* Nuevos campos alineados con las restricciones de la Base de Datos */}
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