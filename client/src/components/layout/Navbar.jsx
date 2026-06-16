import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Boton from '../ui/Boton';
import './Navbar.css';

// ─── Links por rol — declarados fuera del componente ─────────────────────────
//
// REGLA: Especialidades (/especialidades) y Medicamentos (/catalogo) son
// secciones de plataforma disponibles para TODOS los usuarios sin excepción.
// Aparecen en todos los árboles de navegación.

const LINKS_PUBLICOS = [
  { label: 'Inicio',         to: '/' },
  { label: 'Especialidades', to: '/especialidades' },
  { label: 'Medicamentos',   to: '/catalogo' },
];

const LINKS_PACIENTE = [
  { label: 'Inicio',         to: '/' },
  { label: 'Especialidades', to: '/especialidades' },
  { label: 'Medicamentos',   to: '/catalogo' },
  { label: 'Agendar',        to: '/agendar' },
  { label: 'Mis Citas',      to: '/mis-citas' },
];

const LINKS_MEDICO = [
  { label: 'Inicio',         to: '/' },
  { label: 'Especialidades', to: '/especialidades' },
  { label: 'Medicamentos',   to: '/catalogo' },
];

// Admin tiene su propio sidebar con navegación completa — solo conservamos
// las secciones públicas de plataforma para contexto y coherencia de marca.
const LINKS_ADMIN = [
  { label: 'Inicio',         to: '/' },
  { label: 'Especialidades', to: '/especialidades' },
  { label: 'Medicamentos',   to: '/catalogo' },
];

function getLinksParaRol(usuario) {
  if (!usuario)                   return LINKS_PUBLICOS;
  if (usuario.rol === 'paciente') return LINKS_PACIENTE;
  if (usuario.rol === 'medico')   return LINKS_MEDICO;
  if (usuario.rol === 'admin')    return LINKS_ADMIN;
  return LINKS_PUBLICOS;
}

// ─── Helpers de JSX por rol — funciones puras FUERA del componente ────────────
function renderAccionesDesktop(usuario, handleLogout) {
  if (!usuario) {
    return (
      <>
        <Link to="/login">
          <Boton variante="ghost" size="sm">Iniciar sesión</Boton>
        </Link>
        <Link to="/registro">
          <Boton variante="primary" size="sm">Registrarse</Boton>
        </Link>
      </>
    );
  }

  if (usuario.rol === 'paciente') {
    return (
      <div className="navbar__acciones-auth">
        <span className="navbar__saludo-texto" aria-hidden="true">
          Hola, {usuario.nombre}
        </span>
        <Link to="/dashboard" className="navbar__btn-panel navbar__btn-panel--paciente">
          Mi Panel
        </Link>
        <button className="navbar__logout-btn" onClick={handleLogout}>
          Salir
        </button>
      </div>
    );
  }

  if (usuario.rol === 'medico') {
    return (
      <div className="navbar__acciones-auth">
        <span className="navbar__saludo-texto" aria-hidden="true">
          Dr(a). {usuario.nombre}
        </span>
        <Link to="/dashboard-medico" className="navbar__btn-panel navbar__btn-panel--medico">
          🩺 Mi Panel
        </Link>
        <button className="navbar__logout-btn" onClick={handleLogout}>
          Salir
        </button>
      </div>
    );
  }

  if (usuario.rol === 'admin') {
    return (
      <div className="navbar__acciones-auth">
        <span className="navbar__saludo-texto" aria-hidden="true">
          {usuario.nombre}
        </span>
        <Link to="/admin" className="navbar__btn-panel navbar__btn-panel--admin">
          ▦ Panel Admin
        </Link>
        <button className="navbar__logout-btn" onClick={handleLogout}>
          Salir
        </button>
      </div>
    );
  }

  return null;
}

function renderAccionesDrawer(usuario, handleLogout, cerrar) {
  if (!usuario) {
    return (
      <div className="navbar__drawer-acciones">
        <Link to="/login" onClick={cerrar}>
          <Boton variante="outline" size="md" fullWidth>Iniciar sesión</Boton>
        </Link>
        <Link to="/registro" onClick={cerrar}>
          <Boton variante="primary" size="md" fullWidth>Registrarse</Boton>
        </Link>
      </div>
    );
  }

  return (
    <div className="navbar__drawer-acciones">
      {usuario.rol === 'paciente' && (
        <Link
          to="/dashboard"
          className="navbar__drawer-link navbar__drawer-link--panel"
          onClick={cerrar}
        >
          Mi Panel de Paciente →
        </Link>
      )}
      {usuario.rol === 'medico' && (
        <Link
          to="/dashboard-medico"
          className="navbar__drawer-link navbar__drawer-link--panel"
          onClick={cerrar}
        >
          🩺 Mi Panel Médico →
        </Link>
      )}
      {usuario.rol === 'admin' && (
        <Link
          to="/admin"
          className="navbar__drawer-link navbar__drawer-link--panel"
          onClick={cerrar}
        >
          ▦ Panel Administrador →
        </Link>
      )}
      <button
        className="navbar__logout-btn"
        onClick={handleLogout}
        style={{ width: '100%', textAlign: 'center' }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Navbar() {
  const { usuario, logout }     = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location                = useLocation();
  const navigate                = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const cerrar = () => setMenuOpen(false);
  const links  = getLinksParaRol(usuario);

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner">

          {/* Logo */}
          <Link to="/" className="navbar__logo" onClick={cerrar}>
            <div className="navbar__logo-mark">M</div>
            <span>ELIKA</span>
          </Link>

          {/* Links de navegación — árbol segregado por rol */}
          {links.length > 0 && (
            <nav className="navbar__links" aria-label="Navegación principal">
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`navbar__link${location.pathname === l.to ? ' navbar__link--activo' : ''}`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Acciones desktop */}
          <div className="navbar__acciones">
            {renderAccionesDesktop(usuario, handleLogout)}
          </div>

          {/* Hamburger mobile */}
          <button
            className={`navbar__hamburger${menuOpen ? ' navbar__hamburger--abierto' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>

        </div>
      </header>

      {/* Overlay */}
      {menuOpen && (
        <div className="navbar__overlay" onClick={cerrar} aria-hidden="true" />
      )}

      {/* Drawer mobile */}
      <div
        className={`navbar__drawer${menuOpen ? ' navbar__drawer--abierto' : ''}`}
        role="dialog"
        aria-label="Menú de navegación"
        aria-modal="true"
      >
        <nav className="navbar__drawer-links">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`navbar__drawer-link${location.pathname === l.to ? ' navbar__drawer-link--activo' : ''}`}
              onClick={cerrar}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {renderAccionesDrawer(usuario, handleLogout, cerrar)}
      </div>
    </>
  );
}