// src/pages/admin/UsuariosAdmin.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';
import './UsuariosAdmin.css';
import './admin-shared.css';

export default function UsuariosAdmin() {
  const [usuarios,     setUsuarios]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filtroRol,    setFiltroRol]    = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [buscar,       setBuscar]       = useState('');
  const [toggling,     setToggling]     = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filtroRol)         params.set('rol',    filtroRol);
    if (filtroActivo !== '') params.set('activo', filtroActivo);
    if (buscar.trim())     params.set('buscar', buscar.trim());

    api.get(`/admin/usuarios?${params.toString()}`)
      .then(data  => setUsuarios(data))
      .catch(()   => setError('No se pudieron cargar los usuarios.'))
      .finally(() => setLoading(false));
  }, [filtroRol, filtroActivo, buscar]);

  // Debounce de 300ms para evitar llamadas en cada tecla
  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  async function handleToggle(id) {
    setToggling(id);
    try {
      // ── FIX: se elimina `const res =` porque la respuesta no se usa ──
      await api.patch(`/admin/usuarios/${id}/estado`);
      setUsuarios(prev =>
        prev.map(u => u.id === id ? { ...u, activo: !u.activo } : u)
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(null);
    }
  }

  function formatFecha(f) {
    return new Date(f).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  const BADGE_ROL = {
    paciente: 'badge--azul',
    medico:   'badge--verde',
    admin:    'badge--naranja',
  };

  return (
    <div className="usuarios-admin">
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Usuarios</h1>
          <p className="admin-modulo__subtitulo">Gestión global de cuentas de usuario</p>
        </div>
        <div className="usuarios-conteo">
          <strong>{usuarios.length}</strong> resultado{usuarios.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros */}
      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="🔍  Buscar por nombre o email…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
        <select
          className="admin-filtros__select"
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value)}
        >
          <option value="">Todos los roles</option>
          <option value="paciente">Pacientes</option>
          <option value="medico">Médicos</option>
          <option value="admin">Admins</option>
        </select>
        <select
          className="admin-filtros__select"
          value={filtroActivo}
          onChange={e => setFiltroActivo(e.target.value)}
        >
          <option value="">Cualquier estado</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabla-wrap">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Verificado</th>
              <th>Ciudad</th>
              <th>Registrado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(6).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j}>
                      <div
                        className="skeleton-cell"
                        style={{ width: j === 0 ? '160px' : '80px' }}
                      />
                    </td>
                  ))}
                </tr>
              ))
              : usuarios.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="admin-vacio">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )
              : usuarios.map(u => (
                <tr key={u.id}>
                  <td>
                    <strong style={{ display: 'block', color: 'var(--melika-text-primary)' }}>
                      {u.nombre} {u.primer_apellido}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--melika-text-muted)' }}>
                      {u.email}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${BADGE_ROL[u.rol] || 'badge--gris'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.activo ? 'badge--verde' : 'badge--rojo'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.verificado ? 'badge--verde' : 'badge--gris'}`}>
                      {u.verificado ? '✓ Sí' : '— No'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{u.ciudad || '—'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--melika-text-muted)', whiteSpace: 'nowrap' }}>
                    {formatFecha(u.created_at)}
                  </td>
                  <td>
                    {u.rol !== 'admin' && (
                      <button
                        className={`btn-tabla ${u.activo ? 'btn-tabla--warning' : 'btn-tabla--success'}`}
                        disabled={toggling === u.id}
                        onClick={() => handleToggle(u.id)}
                      >
                        {toggling === u.id ? '…' : u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                    {u.rol === 'admin' && (
                      <span style={{ fontSize: '12px', color: 'var(--melika-text-muted)' }}>
                        — protegido
                      </span>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}