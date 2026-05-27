import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Boton from '../ui/Boton';
import './Navbar.css';
 
const LINKS_PUBLICOS = [
    { label: 'Inicio',        to: '/' },
    { label: 'Especialidades', to: '/#especialidades' },
    { label: 'Medicamentos',  to: '/catalogo' },
];
 
const LINKS_PRIVADOS = [
    { label: 'Inicio',      to: '/' },
    { label: 'Agendar',     to: '/agendar' },
    { label: 'Mis citas',   to: '/mis-citas' },
];
 
export default function Navbar() {
    const { usuario, logout }      = useAuth();
    const [scrolled, setScrolled]  = useState(false);
    const [menuOpen, setMenuOpen]  = useState(false);
    const location  = useLocation();
    const navigate  = useNavigate();
 
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
 
    function handleLogout() {
        logout();
        navigate('/login');
        setMenuOpen(false);
    }
 
    const links = usuario ? LINKS_PRIVADOS : LINKS_PUBLICOS;
    const cerrar = () => setMenuOpen(false);
 
    return (
        <>
            <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
                <div className="navbar__inner">
 
                    {/* Logo */}
                    <Link to="/" className="navbar__logo" onClick={cerrar}>
                        <div className="navbar__logo-mark">M</div>
                        <span>ELIKA</span>
                    </Link>
 
                    {/* Links de navegación */}
                    <nav className="navbar__links">
                        {links.map(l => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className={`navbar__link ${location.pathname === l.to ? 'navbar__link--activo' : ''}`}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
 
                    {/* Acciones según estado de sesión */}
                    <div className="navbar__acciones">
                        {usuario ? (
                            <>
                                <Link 
                                    to={
                                        usuario.rol === 'medico' ? '/dashboard-medico' :
                                        usuario.rol === 'admin'  ? '/admin/medicos'    :
                                        '/dashboard'
                                    } 
                                    className="navbar__saludo"
                                >
                                    Hola, {usuario.nombre}
                                </Link>
                                {usuario.rol === 'admin' && (
                                    <Link to="/admin/medicos" className="navbar__link">
                                        Panel Admin
                                    </Link>
                                )}
                                <button className="navbar__logout-btn" onClick={handleLogout}>
                                    Cerrar sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Boton variante="ghost" size="sm">Iniciar sesión</Boton>
                                </Link>
                                <Link to="/registro">
                                    <Boton variante="primary" size="sm">Registrarse</Boton>
                                </Link>
                            </>
                        )}
                    </div>
 
                    {/* Hamburger para mobile */}
                    <button
                        className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--abierto' : ''}`}
                        onClick={() => setMenuOpen(v => !v)}
                        aria-label="Abrir menú"
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </header>
 
            {/* Overlay oscuro detrás del drawer */}
            {menuOpen && (
                <div className="navbar__overlay" onClick={cerrar} />
            )}
 
            {/* Drawer mobile */}
            <div className={`navbar__drawer ${menuOpen ? 'navbar__drawer--abierto' : ''}`}>
                <nav className="navbar__drawer-links">
                    {links.map(l => (
                        <Link
                            key={l.to}
                            to={l.to}
                            className="navbar__drawer-link"
                            onClick={cerrar}
                        >
                            {l.label}
                        </Link>
                    ))}
                    {/* Enlace de administración también en el menú móvil si corresponde */}
                    {usuario && usuario.rol === 'admin' && (
                        <Link to="/admin/medicos" className="navbar__drawer-link" onClick={cerrar}>
                            Panel Admin
                        </Link>
                    )}
                </nav>
                <div className="navbar__drawer-acciones">
                    {usuario ? (
                        <button className="navbar__logout-btn" onClick={handleLogout} style={{ width: '100%', textAlign: 'center' }}>
                            Cerrar sesión
                        </button>
                    ) : (
                        <>
                            <Link to="/login" onClick={cerrar}>
                                <Boton variante="outline" size="md" fullWidth>Iniciar sesión</Boton>
                            </Link>
                            <Link to="/registro" onClick={cerrar}>
                                <Boton variante="primary" size="md" fullWidth>Registrarse</Boton>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}