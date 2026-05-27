import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import '../login/Login.css';
import './Verificar.css';

export default function Verificar() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const email          = searchParams.get('email') || '';

  const [digitos, setDigitos]     = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [exito, setExito]         = useState(false);
  const [reenvioLoading, setReenvioLoading] = useState(false);
  const [reenvioMensaje, setReenvioMensaje] = useState(null);
  const [segundos, setSegundos]   = useState(0);

  const inputs = useRef([]);

  // Countdown para reenvío (60 segundos)
  useEffect(() => {
    if (segundos <= 0) return;
    const t = setTimeout(() => setSegundos(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  function handleDigito(index, valor) {
    // Solo números
    if (!/^\d?$/.test(valor)) return;

    const nuevos = [...digitos];
    nuevos[index] = valor;
    setDigitos(nuevos);

    // Avanzar al siguiente input
    if (valor && index < 5) {
      inputs.current[index + 1]?.focus();
    }
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
    // Enfocar el último dígito pegado o el siguiente
    const foco = Math.min(texto.length, 5);
    inputs.current[foco]?.focus();
  }

  async function handleVerificar(e) {
    e.preventDefault();
    const codigo = digitos.join('');
    if (codigo.length < 6) return;

    setLoading(true);
    setError(null);

    try {
      await api.get(`/auth/verify-code?email=${encodeURIComponent(email)}&codigo=${codigo}`);
      setExito(true);
    } catch (err) {
      setError(err.message);
      // Si expiró, limpiar los dígitos
      if (err.message.includes('expiró')) {
        setDigitos(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReenviar() {
    if (segundos > 0) return;
    setReenvioLoading(true);
    setReenvioMensaje(null);

    try {
      await api.post('/auth/reenviar-codigo', { email, tipo: 'registro' });
      setReenvioMensaje('¡Código reenviado! Revisa tu correo.');
      setSegundos(60);
      setDigitos(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err) {
      setReenvioMensaje(err.message);
    } finally {
      setReenvioLoading(false);
    }
  }

  if (exito) {
    return (
      <div className="auth-pagina">
        <div className="auth-card">
          <div className="auth-exito">
            <span className="auth-exito__icono">✅</span>
            <h2>¡Cuenta verificada!</h2>
            <p>Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión.</p>
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
      <div className="auth-card auth-card--verificar">

        <div className="auth-card__cabecera" style={{ textAlign: 'center' }}>
          <div className="verificar__icono-correo">📧</div>
          <h1 className="auth-card__titulo">Verifica tu cuenta</h1>
          <p className="auth-card__sub">
            Enviamos un código de 6 dígitos a<br />
            <strong>{email || 'tu correo electrónico'}</strong>
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {reenvioMensaje && (
          <div className={`auth-error ${reenvioMensaje.includes('reenviado') ? 'auth-error--success' : ''}`}>
            {reenvioMensaje}
          </div>
        )}

        <form onSubmit={handleVerificar}>
          <div className="verificar__inputs">
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

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || digitos.join('').length < 6}
            style={{ marginTop: '24px' }}
          >
            {loading ? 'Verificando…' : 'Verificar cuenta'}
          </button>
        </form>

        <div className="verificar__reenvio">
          <p>¿No recibiste el código?</p>
          <button
            className="verificar__btn-reenvio"
            onClick={handleReenviar}
            disabled={reenvioLoading || segundos > 0}
          >
            {reenvioLoading
              ? 'Reenviando…'
              : segundos > 0
                ? `Reenviar en ${segundos}s`
                : 'Reenviar código'}
          </button>
        </div>

        <p className="auth-pie">
          <Link to="/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}