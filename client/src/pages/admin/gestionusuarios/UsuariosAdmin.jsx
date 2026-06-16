// src/pages/admin/gestion-usuarios/UsuariosAdmin.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/apiClient';
import './UsuariosAdmin.css';
import '../admin-shared.css';

const ROLES = ['todos', 'paciente', 'medico', 'admin'];


const ROL_BADGE = {
  paciente: 'badge--azul',
  medico:   'badge--verde',
  admin:    'badge--morado',
};

function generarAvatar(nombre, apellido) {
  const ini = `${(nombre?.[0] ?? '').toUpperCase()}${(apellido?.[0] ?? '').toUpperCase()}`;
  const colores = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
  const idx = (nombre?.charCodeAt(0) ?? 0) % colores.length;
  return { iniciales: ini || '?', color: colores[idx] };
}

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filtros,  setFiltros]  = useState({ buscar: '', rol: '', estado: '' });
  const [modal,    setModal]    = useState(null);
  const [guardando,setGuardando]= useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.buscar) params.set('buscar', filtros.buscar);
    if (filtros.rol && filtros.rol !== 'todos') params.set('rol', filtros.rol);
    if (filtros.estado && filtros.estado !== 'todos') params.set('estado', filtros.estado);
    api.get(`/admin/usuarios?${params.toString()}`)
      .then(data  => { setUsuarios(data); setError(null); })
      .catch(()   => setError('No se pudieron cargar los usuarios.'))
      .finally(() => setLoading(false));
  }, [filtros]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  async function handleToggleEstado(usuario) {
    const nuevoEstado = usuario.activo ? false : true;
    setGuardando(true);
    try {
      await api.patch(`/admin/usuarios/${usuario.id}/estado`, { activo: nuevoEstado });
      setUsuarios(prev =>
        prev.map(u => u.id === usuario.id ? { ...u, activo: nuevoEstado } : u)
      );
      if (modal?.id === usuario.id) setModal(prev => ({ ...prev, activo: nuevoEstado }));
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const totalPorRol = ROLES.slice(1).reduce((acc, r) => {
    acc[r] = usuarios.filter(u => u.rol === r).length;
    return acc;
  }, {});

  return (
    <div className="usuarios-admin">
      {/* ── Cabecera ── */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Usuarios</h1>
          <p className="admin-modulo__subtitulo">Gestión de pacientes, médicos y administradores</p>
        </div>
        <div className="usuarios-admin__total">
          <span>{usuarios.length}</span> usuarios
        </div>
      </div>

      {/* ── Chips de roles ── */}
      {!loading && (
        <div className="usuarios-admin__chips">
          {ROLES.map(r => (
            <button
              key={r}
              className={`usuarios-admin__chip ${filtros.rol === (r === 'todos' ? '' : r) ? 'usuarios-admin__chip--activo' : ''}`}
              onClick={() => setFiltros(prev => ({ ...prev, rol: r === 'todos' ? '' : r }))}
            >
              {r === 'todos' ? 'Todos' : r.charAt(0).toUpperCase() + r.slice(1)}
              {r !== 'todos' && <span className="chip__num">{totalPorRol[r] ?? 0}</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="🔍  Buscar por nombre, apellido o email…"
          value={filtros.buscar}
          onChange={e => setFiltros(prev => ({ ...prev, buscar: e.target.value }))}
        />
        <select
          className="admin-filtros__select"
          value={filtros.estado}
          onChange={e => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* ── Grid de tarjetas ── */}
      <div className="usuarios-admin__grid">
        {loading
          ? Array(8).fill(0).map((_, i) => (
            <div key={i} className="usuario-card usuario-card--skeleton">
              <div className="skeleton-block" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-block" style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton-block" style={{ width: '80%', height: '12px' }} />
              </div>
            </div>
          ))
          : usuarios.length === 0
          ? (
            <div className="admin-vacio-full">
              <span>👥</span>
              <p>No se encontraron usuarios.</p>
            </div>
          )
          : usuarios.map(u => {
            const av = generarAvatar(u.nombre, u.primer_apellido);
            return (
              <div
                key={u.id}
                className={`usuario-card ${!u.activo ? 'usuario-card--inactivo' : ''}`}
                onClick={() => setModal(u)}
              >
                <div className="usuario-card__avatar" style={{ background: av.color }}>
                  {av.iniciales}
                </div>
                <div className="usuario-card__info">
                  <p className="usuario-card__nombre">
                    {u.nombre} {u.primer_apellido} {u.segundo_apellido ?? ''}
                  </p>
                  <p className="usuario-card__email">{u.email}</p>
                  <div className="usuario-card__badges">
                    <span className={`badge ${ROL_BADGE[u.rol] ?? 'badge--gris'}`}>{u.rol}</span>
                    {!u.activo && <span className="badge badge--rojo">Inactivo</span>}
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* ── Modal detalle ── */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Detalle de usuario</h3>
              <button className="admin-modal__cerrar" onClick={() => setModal(null)}>✕</button>
            </div>

            {(() => {
              const av = generarAvatar(modal.nombre, modal.primer_apellido);
              return (
                <div className="usuario-modal-perfil">
                  <div className="usuario-modal-avatar" style={{ background: av.color }}>
                    {av.iniciales}
                  </div>
                  <div>
                    <p className="usuario-modal-nombre">
                      {modal.nombre} {modal.primer_apellido} {modal.segundo_apellido ?? ''}
                    </p>
                    <p className="usuario-modal-email">{modal.email}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <span className={`badge ${ROL_BADGE[modal.rol] ?? 'badge--gris'}`}>{modal.rol}</span>
                      <span className={`badge ${modal.activo ? 'badge--verde' : 'badge--rojo'}`}>
                        {modal.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="cita-detalle-grid" style={{ marginTop: 'var(--space-4)' }}>
              {modal.telefono && (
                <div className="cita-detalle-item">
                  <label>Teléfono</label>
                  <p>{modal.telefono}</p>
                </div>
              )}
              {modal.fecha_nacimiento && (
                <div className="cita-detalle-item">
                  <label>Fecha de nacimiento</label>
                  <p>{new Date(modal.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-CO')}</p>
                </div>
              )}
              {modal.d_at && (
                <div className="ccreateita-detalle-item">
                  <label>Registrado</label>
                  <p>{new Date(modal.created_at).toLocaleDateString('es-CO')}</p>
                </div>
              )}
            </div>

            <div className="admin-modal__acciones">
              <button className="admin-modal__btn-cancelar" onClick={() => setModal(null)}>
                Cerrar
              </button>
              <button
                className={`admin-modal__btn-guardar ${modal.activo ? 'btn--danger' : ''}`}
                disabled={guardando}
                onClick={() => handleToggleEstado(modal)}
              >
                {guardando
                  ? 'Actualizando…'
                  : modal.activo
                  ? 'Desactivar cuenta'
                  : 'Activar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}