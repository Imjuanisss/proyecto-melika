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

            // Redirigir según rol
            const rol = data.usuario.rol;
            if (rol === 'medico') {
                navigate('/dashboard-medico');
            } else if (rol === 'admin') {
                navigate('/admin/medicos');
            } else {
                navigate('/dashboard');
            }
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
                    <h1 className="auth-card__titulo">Iniciar sesión</h1>
                    <p className="auth-card__sub">Bienvenido de vuelta a MELIKA</p>
                </div>

                {error && (
                    <div className="auth-error">{error}</div>
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