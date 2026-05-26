import { useState }          from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth }           from '../../context/AuthContext';
import { api }               from '../../lib/apiClient';
import './Login.css';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
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
      const data = await api.post('/auth/login', form);
      login(data.token, data.usuario);

      const rol = data.usuario.rol;
      if (rol === 'medico') navigate('/dashboard-medico');
      else if (rol === 'admin') navigate('/admin/medicos');
      else navigate('/dashboard');

    } catch (err) {
      // Si el error es "sin verificar", ofrecer ir a verificar
      if (err.message.includes('verificar')) {
        setError({
          tipo: 'sinVerificar',
          texto: err.message,
          email: form.email,
        });
      } else {
        setError({ tipo: 'normal', texto: err.message });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-pagina">
      <div className="auth-card">

        <div className="auth-card__cabecera">
          <h1 className="auth-card__titulo">Iniciar sesión</h1>
          <p className="auth-card__sub">Bienvenido de vuelta a MELIKA</p>
        </div>

        {error && (
          <div className={`auth-error ${error.tipo === 'sinVerificar' ? 'auth-error--warning' : ''}`}>
            {error.texto}
            {error.tipo === 'sinVerificar' && (
              <div style={{ marginTop: '8px' }}>
                <Link
                  to={`/verificar?email=${encodeURIComponent(error.email)}`}
                  style={{ color: 'var(--melika-primary-600)', fontWeight: 700 }}
                >
                  Verificar mi cuenta →
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-campo">
            <label>Correo electrónico</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div className="auth-campo">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Tu contraseña"
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: '-8px' }}>
            <Link to="/recuperar" className="auth-link-secundario">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="auth-pie">
          ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}