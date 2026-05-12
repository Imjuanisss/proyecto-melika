import { useState }          from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api }               from '../../lib/apiClient';
import '../login/Login.css';
 
export default function Registro() {
    const navigate = useNavigate();
 
    const [form, setForm] = useState({
        nombre:          '',
        primer_apellido: '',
        email:           '',
        password:        '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);
    const [exito, setExito]     = useState(false);
 
    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }
 
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
 
        try {
            await api.post('/auth/register', form);
            setExito(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
 
    if (exito) {
        return (
            <div className="auth-pagina">
                <div className="auth-card">
                    <div className="auth-exito">
                        <span className="auth-exito__icono">🎉</span>
                        <h2>¡Cuenta creada!</h2>
                        <p>Tu cuenta fue creada exitosamente. Ya puedes iniciar sesión.</p>
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
                    <h1 className="auth-card__titulo">Crear cuenta</h1>
                    <p className="auth-card__sub">Únete a MELIKA y agenda sin filas</p>
                </div>
 
                {error && (
                    <div className="auth-error">{error}</div>
                )}
 
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-campo">
                        <label>Nombre</label>
                        <input
                            type="text"
                            name="nombre"
                            value={form.nombre}
                            onChange={handleChange}
                            placeholder="Tu nombre"
                            required
                        />
                    </div>
 
                    <div className="auth-campo">
                        <label>Apellido</label>
                        <input
                            type="text"
                            name="primer_apellido"
                            value={form.primer_apellido}
                            onChange={handleChange}
                            placeholder="Tu apellido"
                            required
                        />
                    </div>
 
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
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                            required
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
 