// src/pages/admin/AdminLayout.jsx
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

const NAV_ITEMS = [
  { to: '/admin',               icon: '📊', label: 'Dashboard',     end: true },
  { to: '/admin/medicos',       icon: '🩺', label: 'Médicos'                  },
  { to: '/admin/horarios',      icon: '📅', label: 'Horarios'                 },
  { to: '/admin/usuarios',      icon: '👥', label: 'Usuarios'                 },
  { to: '/admin/citas',         icon: '📋', label: 'Citas'                    },
  { to: '/admin/especialidades',icon: '🏥', label: 'Especialidades'           },
  { to: '/admin/medicamentos',  icon: '💊', label: 'Medicamentos'             },
];

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="admin-layout">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-mark">M</div>
          <div>
            <span className="admin-sidebar__logo-text">ELIKA</span>
            <span className="admin-sidebar__logo-badge">Admin</span>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--activo' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-sidebar__link-icon">{item.icon}</span>
              <span className="admin-sidebar__link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__usuario">
            <div className="admin-sidebar__avatar">
              {usuario?.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="admin-sidebar__usuario-info">
              <span className="admin-sidebar__usuario-nombre">{usuario?.nombre}</span>
              <span className="admin-sidebar__usuario-rol">Administrador</span>
            </div>
          </div>
          <button className="admin-sidebar__logout" onClick={handleLogout} title="Cerrar sesión">
            ↩
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="admin-sidebar__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Área de contenido ───────────────────── */}
      <main className="admin-main">
        {/* Topbar mobile */}
        <div className="admin-topbar">
          <button
            className="admin-topbar__menu-btn"
            onClick={() => setSidebarOpen(v => !v)}
          >
            ☰
          </button>
          <span className="admin-topbar__titulo">Panel Admin</span>
        </div>

        <div className="admin-main__contenido">
          <Outlet />
        </div>
      </main>
    </div>
  );
}