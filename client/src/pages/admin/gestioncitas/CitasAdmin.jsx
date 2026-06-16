// src/pages/admin/gestion-citas/CitasAdmin.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/apiClient';
import './CitasAdmin.css';
import '../admin-shared.css';

// Estados alineados con el CHECK del schema de PostgreSQL
const ESTADOS = ['pendiente', 'completada', 'cancelada', 'no_asistio'];

const BADGE_CLASS = {
  pendiente:  'badge--naranja',
  completada: 'badge--verde',
  cancelada:  'badge--rojo',
  no_asistio: 'badge--gris',
};

const ESTADO_LABEL = {
  pendiente:  'Pendiente',
  completada: 'Completada',
  cancelada:  'Cancelada',
  no_asistio: 'No asistió',
};

export default function CitasAdmin() {
  const [citas,       setCitas]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [filtros,     setFiltros]     = useState({ estado: '', buscar: '', fecha_desde: '', fecha_hasta: '' });
  const [modal,       setModal]       = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [razonCancel, setRazonCancel] = useState('');
  const [guardando,   setGuardando]   = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
    api.get(`/admin/citas?${params.toString()}`)
      .then(data  => { setCitas(data); setError(null); })
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
    if (!f) return '—';
    return new Date(f + 'T00:00:00').toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  const resumen = ESTADOS.reduce((acc, e) => {
    acc[e] = citas.filter(c => c.estado === e).length;
    return acc;
  }, {});

  return (
    <div className="citas-admin">
      {/* ── Cabecera ── */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Gestión de Citas</h1>
          <p className="admin-modulo__subtitulo">Vista global y control de todos los agendamientos</p>
        </div>
        <div className="citas-admin__conteo">
          <strong>{citas.length}</strong>
          <span>resultado{citas.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Chips de resumen ── */}
      {!loading && (
        <div className="citas-admin__chips">
          {ESTADOS.map(e => (
            <button
              key={e}
              className={`citas-admin__chip ${filtros.estado === e ? 'citas-admin__chip--activo' : ''} chip--${e}`}
              onClick={() => handleFiltro('estado', filtros.estado === e ? '' : e)}
            >
              <span className="chip__dot" />
              {ESTADO_LABEL[e]}
              <span className="chip__num">{resumen[e]}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="🔍  Buscar por paciente o médico…"
          value={filtros.buscar}
          onChange={e => handleFiltro('buscar', e.target.value)}
        />
        <select
          className="admin-filtros__select"
          value={filtros.estado}
          onChange={e => handleFiltro('estado', e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => (
            <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
          ))}
        </select>
        <div className="admin-filtros__fecha-grupo">
          <label>Desde</label>
          <input
            type="date"
            className="admin-filtros__select"
            value={filtros.fecha_desde}
            onChange={e => handleFiltro('fecha_desde', e.target.value)}
          />
        </div>
        <div className="admin-filtros__fecha-grupo">
          <label>Hasta</label>
          <input
            type="date"
            className="admin-filtros__select"
            value={filtros.fecha_hasta}
            onChange={e => handleFiltro('fecha_hasta', e.target.value)}
          />
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* ── Tabla ── */}
      <div className="admin-tabla-wrap">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Paciente</th>
              <th>Médico · Especialidad</th>
              <th>Fecha · Hora</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(6).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton-cell" /></td>
                  ))}
                </tr>
              ))
              : citas.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="admin-vacio">
                    <span>📋</span>
                    <p>No se encontraron citas con los filtros aplicados.</p>
                  </td>
                </tr>
              )
              : citas.map(c => (
                <tr key={c.id}>
                  <td className="admin-tabla__id">#{c.id}</td>
                  <td>
                    <p className="admin-tabla__nombre">{c.paciente_nombre} {c.paciente_apellido}</p>
                    <p className="admin-tabla__meta">{c.paciente_email}</p>
                  </td>
                  <td>
                    <p className="admin-tabla__nombre">Dr(a). {c.medico_nombre} {c.medico_apellido}</p>
                    <p className="admin-tabla__meta">{c.especialidad}</p>
                  </td>
                  <td className="admin-tabla__fecha">
                    <p>{formatFecha(c.fecha)}</p>
                    <p className="admin-tabla__meta">
                      {c.hora_inicio?.substring(0, 5)}
                      {c.hora_fin ? ` — ${c.hora_fin.substring(0, 5)}` : ''}
                    </p>
                  </td>
                  <td>
                    <span className={`badge ${c.tipo_consulta === 'teleconsulta' ? 'badge--azul' : 'badge--gris'}`}>
                      {c.tipo_consulta === 'teleconsulta' ? '💻' : '🏥'} {c.tipo_consulta}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${BADGE_CLASS[c.estado] ?? 'badge--gris'}`}>
                      {ESTADO_LABEL[c.estado] ?? c.estado}
                    </span>
                  </td>
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

      {/* ── Modal ── */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Gestionar cita <span className="admin-modal__id">#{modal.id}</span></h3>
              <button className="admin-modal__cerrar" onClick={() => setModal(null)}>✕</button>
            </div>

            <div className="cita-detalle-grid">
              <div className="cita-detalle-item">
                <label>Paciente</label>
                <p>{modal.paciente_nombre} {modal.paciente_apellido}</p>
              </div>
              <div className="cita-detalle-item">
                <label>Médico</label>
                <p>Dr(a). {modal.medico_nombre} {modal.medico_apellido}</p>
              </div>
              <div className="cita-detalle-item">
                <label>Especialidad</label>
                <p>{modal.especialidad}</p>
              </div>
              <div className="cita-detalle-item">
                <label>Fecha y hora</label>
                <p>{formatFecha(modal.fecha)} · {modal.hora_inicio?.substring(0, 5)}</p>
              </div>
              <div className="cita-detalle-item">
                <label>Tipo</label>
                <p>{modal.tipo_consulta}</p>
              </div>
              {modal.motivo && (
                <div className="cita-detalle-item cita-detalle-item--full">
                  <label>Motivo</label>
                  <p>{modal.motivo}</p>
                </div>
              )}
              {modal.razon_cancelacion && (
                <div className="cita-detalle-item cita-detalle-item--full">
                  <label>Razón de cancelación previa</label>
                  <p>{modal.razon_cancelacion}</p>
                </div>
              )}
            </div>

            <div className="admin-campo">
              <label>Cambiar estado</label>
              <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                {ESTADOS.map(s => (
                  <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
                ))}
              </select>
            </div>

            {nuevoEstado === 'cancelada' && (
              <div className="admin-campo">
                <label>Razón de cancelación</label>
                <input
                  type="text"
                  value={razonCancel}
                  onChange={e => setRazonCancel(e.target.value)}
                  placeholder="Describe el motivo de cancelación…"
                />
              </div>
            )}

            <div className="admin-modal__acciones">
              <button className="admin-modal__btn-cancelar" onClick={() => setModal(null)}>
                Cerrar
              </button>
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