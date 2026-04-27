// src/components/layout/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Boton from '../ui/Boton';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Inicio',        to: '/' },
  { label: 'Especialidades', to: '/#especialidades' },
  { label: 'Medicamentos',  to: '/catalogo' },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

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
          <nav className="navbar__links" aria-label="Navegación principal">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`navbar__link ${
                  location.pathname === l.to ? 'navbar__link--activo' : ''
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Acciones */}
          <div className="navbar__acciones">
            <Link to="/login">
              <Boton variante="ghost" size="sm">Iniciar sesión</Boton>
            </Link>
            <Link to="/registro">
              <Boton variante="primary-azul" size="sm">Registrarse</Boton>
            </Link>
          </div>

          {/* Hamburger mobile */}
          <button
            className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--abierto' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Overlay mobile */}
      {menuOpen && (
        <div className="navbar__overlay" onClick={cerrar} aria-hidden="true" />
      )}

      {/* Drawer mobile */}
      <div
        className={`navbar__drawer ${menuOpen ? 'navbar__drawer--abierto' : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav className="navbar__drawer-links">
          {NAV_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="navbar__drawer-link"
              onClick={cerrar}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="navbar__drawer-acciones">
          <Link to="/login" onClick={cerrar}>
            <Boton variante="outline" size="md" fullWidth>Iniciar sesión</Boton>
          </Link>
          <Link to="/registro" onClick={cerrar}>
            <Boton variante="primary-azul" size="md" fullWidth>Registrarse</Boton>
          </Link>
        </div>
      </div>
    </>
  );
}