import { useState, useRef }    from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api }                 from '../../lib/apiClient';
import '../login/Login.css';
import '../verificar/Verificar.css';

export default function NuevaPassword() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const email          = searchParams.get('email') || '';

  const [digitos, setDigitos]       = useState(['', '', '', '', '', '']);
  const [nuevaPassword, setNueva]   = useState('');
  const [confirmar, setConfirmar]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [exito, setExito]           = useState(false);
  const inputs = useRef([]);

  function handleDigito(index, valor) {
    if (!/^\d?$/.test(valor)) return;
    const nuevos = [...digitos];
    nuevos[index] = valor;
    setDigitos(nuevos);
    if (valor && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digitos[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const texto = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const nuevos = ['', '', '', '', '', ''];
    texto.split('').forEach((c, i) => { nuevos[i] = c; });
    setDigitos(nuevos);
    inputs.current[Math.min(texto.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const codigo = digitos.join('');

    if (codigo.length < 6) {
      return setError('Ingresa el código de 6 dígitos completo.');
    }
    if (nuevaPassword.length < 6) {
      return setError('La contraseña debe tener mínimo 6 caracteres.');
    }
    if (nuevaPassword !== confirmar) {
      return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/nueva-password', {
        email,
        codigo,
        nueva_password: nuevaPassword,
      });
      setExito(true);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('expiró')) {
        setDigitos(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  if (exito) {
    return (
      <div className="auth-pagina">
        <div className="auth-card">
          <div className="auth-exito">
            <span className="auth-exito__icono">🔐</span>
            <h2>¡Contraseña actualizada!</h2>
            <p>Tu contraseña fue cambiada exitosamente.</p>
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
          <h1 className="auth-card__titulo">Nueva contraseña</h1>
          <p className="auth-card__sub">
            Ingresa el código enviado a <strong>{email}</strong> y tu nueva contraseña
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">

          <div style={{ marginBottom: 'var(--space-2)' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--melika-text-primary)', display: 'block', marginBottom: 'var(--space-2)' }}>
              Código de verificación
            </label>
            <div className="verificar__inputs" style={{ justifyContent: 'flex-start' }}>
              {digitos.map((d, i) => (
                <input
                  key={i}
                  ref={el => inputs.current[i] = el}
                  className="verificar__input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigito(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  autoFocus={i === 0}
                />
              ))}
            </div>
          </div>

          <div className="auth-campo">
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={nuevaPassword}
              onChange={e => setNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div className="auth-campo">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || digitos.join('').length < 6}
          >
            {loading ? 'Actualizando…' : 'Cambiar contraseña'}
          </button>
        </form>

        <p className="auth-pie">
          <Link to="/recuperar">← Solicitar nuevo código</Link>
        </p>
      </div>
    </div>
  );
}