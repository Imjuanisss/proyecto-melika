// src/pages/admin/AdminLayout.jsx  — v2
// Fix: layout autónomo, sin colisión con el Navbar global del sitio
// El Navbar global se oculta a nivel CSS via .admin-layout ~ el navbar
// (ver nota al pie), o bien desde App.jsx con condicional de ruta.

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';
import './admin-shared.css';

const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { to: '/admin',         icon: '▦',  label: 'Dashboard',      end: true },
    ],
  },
  {
    section: 'Clínica',
    items: [
      { to: '/admin/medicos',        icon: '⚕',  label: 'Médicos'        },
      { to: '/admin/especialidades', icon: '◈',  label: 'Especialidades' },
      { to: '/admin/horarios',       icon: '⊞',  label: 'Horarios'       },
      { to: '/admin/citas',          icon: '☷',  label: 'Citas'          },
    ],
  },
  {
    section: 'Gestión',
    items: [
      { to: '/admin/usuarios',     icon: '◉', label: 'Usuarios'     },
      { to: '/admin/medicamentos', icon: '⬡', label: 'Medicamentos' },
    ],
  },
];

// Mapa de labels para breadcrumb
const ROUTE_LABELS = {
  '/admin':                 'Dashboard',
  '/admin/medicos':         'Médicos',
  '/admin/especialidades':  'Especialidades',
  '/admin/horarios':        'Horarios',
  '/admin/citas':           'Citas',
  '/admin/usuarios':        'Usuarios',
  '/admin/medicamentos':    'Medicamentos',
};

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cerrar sidebar mobile al navegar
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Ocultar el Navbar global mientras el admin está montado
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = 'none';
    return () => { if (navbar) navbar.style.display = ''; };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const currentLabel = ROUTE_LABELS[location.pathname] || 'Admin';
  const initials = usuario?.nombre
    ? (usuario.nombre[0] + (usuario.primer_apellido?.[0] || '')).toUpperCase()
    : 'A';

  return (
    <div className="admin-layout">

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}>

        {/* Logo */}
        <NavLink to="/admin" className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-mark">M</div>
          <div className="admin-sidebar__logo-info">
            <span className="admin-sidebar__logo-text">ELIKA</span>
            <span className="admin-sidebar__logo-badge">Admin Panel</span>
          </div>
        </NavLink>

        {/* Nav */}
        <nav className="admin-sidebar__nav">
          {NAV_ITEMS.map(group => (
            <div key={group.section}>
              <div className="admin-sidebar__nav-section">{group.section}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `admin-sidebar__link${isActive ? ' admin-sidebar__link--activo' : ''}`
                  }
                >
                  <span className="admin-sidebar__link-icon">{item.icon}</span>
                  <span className="admin-sidebar__link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__avatar">{initials}</div>
          <div className="admin-sidebar__usuario">
            <span className="admin-sidebar__usuario-nombre">
              {usuario?.nombre} {usuario?.primer_apellido}
            </span>
            <span className="admin-sidebar__usuario-rol">Administrador</span>
          </div>
          <button
            className="admin-sidebar__logout"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            ↩
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="admin-sidebar__overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MAIN ────────────────────────────────────────────────── */}
      <main className="admin-main">

        {/* Topbar interno — desktop */}
        <div className="admin-topbar-inner">
          <div className="admin-topbar-inner__breadcrumb">
            <span>Panel</span>
            <span className="admin-topbar-inner__breadcrumb-sep">›</span>
            <strong>{currentLabel}</strong>
          </div>
          <div className="admin-topbar-inner__actions">
            <button
              className="admin-topbar-inner__pill"
              onClick={() => navigate('/')}
              title="Volver al sitio"
            >
              ← Ir al sitio
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="admin-topbar-inner__dot" />
              <span style={{ fontSize: 11, color: 'var(--adm-ink-400)', fontFamily: 'var(--adm-font-ui)' }}>
                Sistema activo
              </span>
            </div>
          </div>
        </div>

        {/* Topbar hamburger — mobile */}
        <div className="admin-topbar">
          <button
            className="admin-topbar__menu-btn"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="admin-topbar__titulo">{currentLabel}</span>
        </div>

        {/* Contenido con scroll independiente */}
        <div className="admin-main__contenido">
          <Outlet />
        </div>
      </main>
    </div>
  );
}