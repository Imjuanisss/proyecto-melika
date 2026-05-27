// src/pages/activar-cuenta/ActivarCuenta.jsx
import { useState }                       from 'react';
import { useSearchParams, useNavigate }   from 'react-router-dom';
import { api }                            from '../../lib/apiClient';
import '../login/Login.css';

export default function ActivarCuenta() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get('token') || '';

  const [form, setForm]   = useState({ password: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmar)
      return setError('Las contraseñas no coinciden.');
    if (form.password.length < 6)
      return setError('La contraseña debe tener mínimo 6 caracteres.');

    setLoading(true);
    setError(null);

    try {
      await api.post('/medicos/activar', { token, password: form.password });
      setExito(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-pagina">
        <div className="auth-card">
          <div className="auth-error">Token de activación no encontrado en la URL.</div>
        </div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="auth-pagina">
        <div className="auth-card">
          <div className="auth-exito">
            <span className="auth-exito__icono">🩺</span>
            <h2>¡Cuenta activada!</h2>
            <p>Tu cuenta de médico MELIKA está lista. Ya puedes iniciar sesión.</p>
            <button className="auth-btn" onClick={() => navigate('/login')}>
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-pagina">
      <div className="auth-card">
        <div className="auth-card__cabecera">
          <h1 className="auth-card__titulo">Activa tu cuenta</h1>
          <p className="auth-card__sub">
            Bienvenido a MELIKA. Establece tu contraseña para comenzar.
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-campo">
            <label>Nueva contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="auth-campo">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              name="confirmar"
              value={form.confirmar}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Activando…' : 'Activar cuenta y continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}