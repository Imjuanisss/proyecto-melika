import { useState }     from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api }          from '../../lib/apiClient';
import '../login/Login.css';

export default function RecuperarPassword() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError]     = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMensaje(null);

    try {
      await api.post('/auth/recuperar-password', { email });
      // Siempre redirigir a nueva-password (el backend no revela si el email existe)
      navigate(`/nueva-password?email=${encodeURIComponent(email)}`);
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
          <h1 className="auth-card__titulo">Recuperar contraseña</h1>
          <p className="auth-card__sub">
            Ingresa tu correo y te enviaremos un código de recuperación
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-campo">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar código de recuperación'}
          </button>
        </form>

        <p className="auth-pie">
          <Link to="/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}