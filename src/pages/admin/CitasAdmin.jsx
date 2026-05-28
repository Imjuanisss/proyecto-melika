// src/pages/admin/CitasAdmin.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';
import './CitasAdmin.css';
import './admin-shared.css';

const ESTADOS = ['pendiente','confirmada','completada','cancelada'];

export default function CitasAdmin() {
  const [citas,    setCitas]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filtros,  setFiltros]  = useState({ estado: '', buscar: '', fecha_desde: '', fecha_hasta: '' });
  const [modal,    setModal]    = useState(null); // cita seleccionada
  const [nuevoEstado,    setNuevoEstado]    = useState('');
  const [razonCancel,    setRazonCancel]    = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
    api.get(`/admin/citas?${params.toString()}`)
      .then(data  => setCitas(data))
      .catch(()   => setError('No se pudieron cargar las citas.'))
      .finally(() => setLoading(false));
  }, [filtros]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  function handleFiltro(campo, valor) {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  }

  function abrirModal(cita) {
    setModal(cita);
    setNuevoEstado(cita.estado);
    setRazonCancel('');
  }

  async function handleCambiarEstado() {
    if (!modal) return;
    setGuardando(true);
    try {
      await api.patch(`/admin/citas/${modal.id}/estado`, {
        estado: nuevoEstado,
        razon_cancelacion: nuevoEstado === 'cancelada' ? razonCancel : undefined,
      });
      setCitas(prev =>
        prev.map(c => c.id === modal.id
          ? { ...c, estado: nuevoEstado, razon_cancelacion: razonCancel || c.razon_cancelacion }
          : c
        )
      );
      setModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  function formatFecha(f) {
    return new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' });
  }

  const BADGE = {
    pendiente:  'badge--naranja',
    confirmada: 'badge--azul',
    completada: 'badge--verde',
    cancelada:  'badge--rojo',
  };

  return (
    <div className="citas-admin">
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Citas</h1>
          <p className="admin-modulo__subtitulo">Vista global y gestión de todas las citas</p>
        </div>
        <div className="citas-admin__conteo">
          <strong>{citas.length}</strong> resultado{citas.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros */}
      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="🔍  Buscar por paciente o médico…"
          value={filtros.buscar}
          onChange={e => handleFiltro('buscar', e.target.value)}
        />
        <select className="admin-filtros__select" value={filtros.estado}
          onChange={e => handleFiltro('estado', e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="admin-filtros__select" style={{ padding: '8px 12px' }}
          value={filtros.fecha_desde} onChange={e => handleFiltro('fecha_desde', e.target.value)}
          title="Fecha desde" />
        <input type="date" className="admin-filtros__select" style={{ padding: '8px 12px' }}
          value={filtros.fecha_hasta} onChange={e => handleFiltro('fecha_hasta', e.target.value)}
          title="Fecha hasta" />
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabla-wrap">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Paciente</th>
              <th>Médico</th>
              <th>Especialidad</th>
              <th>Fecha · Hora</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(8).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton-cell" style={{ width: j === 1 ? '140px' : '80px' }} /></td>
                  ))}
                </tr>
              ))
              : citas.length === 0
              ? <tr><td colSpan={8} className="admin-vacio">No se encontraron citas.</td></tr>
              : citas.map(c => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--melika-text-muted)', fontSize: '12px' }}>#{c.id}</td>
                  <td>
                    <strong style={{ display:'block' }}>{c.paciente_nombre} {c.paciente_apellido}</strong>
                    <span style={{ fontSize:'12px', color:'var(--melika-text-muted)' }}>{c.paciente_email}</span>
                  </td>
                  <td>Dr(a). {c.medico_nombre} {c.medico_apellido}</td>
                  <td>{c.especialidad}</td>
                  <td style={{ whiteSpace:'nowrap' }}>
                    {formatFecha(c.fecha)}<br />
                    <span style={{ fontSize:'12px', color:'var(--melika-text-muted)' }}>
                      {c.hora_inicio?.substring(0,5)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge--gris">
                      {c.tipo_consulta === 'teleconsulta' ? '💻' : '🏥'} {c.tipo_consulta}
                    </span>
                  </td>
                  <td><span className={`badge ${BADGE[c.estado] || 'badge--gris'}`}>{c.estado}</span></td>
                  <td>
                    <button className="btn-tabla btn-tabla--editar" onClick={() => abrirModal(c)}>
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal gestionar cita */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Gestionar cita #{modal.id}</h3>
            <div className="cita-admin-detalle">
              <p><strong>Paciente:</strong> {modal.paciente_nombre} {modal.paciente_apellido}</p>
              <p><strong>Médico:</strong> Dr(a). {modal.medico_nombre} {modal.medico_apellido}</p>
              <p><strong>Especialidad:</strong> {modal.especialidad}</p>
              <p><strong>Fecha:</strong> {formatFecha(modal.fecha)} · {modal.hora_inicio?.substring(0,5)}</p>
              <p><strong>Tipo:</strong> {modal.tipo_consulta}</p>
              {modal.motivo && <p><strong>Motivo:</strong> {modal.motivo}</p>}
            </div>

            <div className="admin-campo" style={{ marginTop: 'var(--space-4)' }}>
              <label>Cambiar estado</label>
              <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {nuevoEstado === 'cancelada' && (
              <div className="admin-campo" style={{ marginTop: 'var(--space-3)' }}>
                <label>Razón de cancelación</label>
                <input
                  type="text"
                  value={razonCancel}
                  onChange={e => setRazonCancel(e.target.value)}
                  placeholder="Motivo de cancelación…"
                />
              </div>
            )}

            <div className="admin-modal__acciones">
              <button className="admin-modal__btn-cancelar" onClick={() => setModal(null)}>Cerrar</button>
              <button
                className="admin-modal__btn-guardar"
                disabled={guardando || nuevoEstado === modal.estado}
                onClick={handleCambiarEstado}
              >
                {guardando ? 'Guardando…' : 'Confirmar cambio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}