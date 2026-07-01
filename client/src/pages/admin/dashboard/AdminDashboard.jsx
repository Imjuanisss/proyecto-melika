// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/apiClient';
import './AdminDashboard.css';

// Tarjeta de métrica
function MetricCard({ icono, titulo, valor, color, onClick }) {
  return (
    <button className={`metric-card metric-card--${color}`} onClick={onClick}>
      <span className="metric-card__icono">{icono}</span>
      <div>
        <p className="metric-card__titulo">{titulo}</p>
        <p className="metric-card__valor">{valor ?? '—'}</p>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get('/admin/stats')
      .then(data  => setStats(data))
      .catch(()   => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  }, []);

 function formatFecha(fechaStr) {
    if (!fechaStr) return '—';
    // Blindaje: si fechaStr viene como ISO completo (con hora/zona, p.ej.
    // "2024-01-01T00:00:00.000Z" porque el backend devolvió un Date crudo
    // de Postgres) en vez de "YYYY-MM-DD", split('T')[0] evita concatenar
    // dos fragmentos de hora y producir un Invalid Date.
    const soloFecha = String(fechaStr).split('T')[0];
    const fecha = new Date(`${soloFecha}T00:00:00`);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  function formatHora(h) {
    return h ? h.substring(0, 5) : '';
  }

  const BADGE_ESTADO = {
    pendiente:  'badge--naranja',
    confirmada: 'badge--azul',
    completada: 'badge--verde',
    cancelada:  'badge--rojo',
  };

  if (loading) return (
    <div className="admin-dashboard">
      <div className="admin-modulo__cabecera">
        <div><h1 className="admin-modulo__titulo">Dashboard</h1></div>
      </div>
      <div className="metrics-grid">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="metric-card metric-card--skeleton" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">

      {/* Cabecera */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Dashboard</h1>
          <p className="admin-modulo__subtitulo">
            Resumen general de MELIKA — {new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {stats && (
        <>
          {/* Métricas */}
          <div className="metrics-grid">
            <MetricCard icono="👥" titulo="Pacientes activos"   valor={stats.totales.pacientes}      color="azul"    onClick={() => navigate('/admin/usuarios')} />
            <MetricCard icono="🩺" titulo="Médicos activos"     valor={stats.totales.medicos}        color="verde"   onClick={() => navigate('/admin/medicos')} />
            <MetricCard icono="📋" titulo="Citas totales"       valor={stats.totales.citas}          color="naranja" onClick={() => navigate('/admin/citas')} />
            <MetricCard icono="📅" titulo="Citas hoy"           valor={stats.totales.citasHoy}       color="acento"  onClick={() => navigate('/admin/citas')} />
            <MetricCard icono="🏥" titulo="Especialidades"      valor={stats.totales.especialidades} color="morado"  onClick={() => navigate('/admin/especialidades')} />
            <MetricCard icono="💊" titulo="Medicamentos"        valor={stats.totales.medicamentos}   color="gris"    onClick={() => navigate('/admin/medicamentos')} />
          </div>

          {/* Grid inferior */}
          <div className="dashboard-grid">

            {/* Últimas citas */}
            <div className="dashboard-panel">
              <div className="dashboard-panel__cabecera">
                <h2 className="dashboard-panel__titulo">Últimas citas</h2>
                <button className="dashboard-panel__ver-todo" onClick={() => navigate('/admin/citas')}>
                  Ver todas →
                </button>
              </div>
              <div className="dashboard-panel__lista">
                {stats.ultimasCitas.length === 0
                  ? <p className="admin-vacio" style={{ padding: 'var(--space-6)' }}>Sin citas recientes.</p>
                  : stats.ultimasCitas.map(c => (
                    <div key={c.id} className="cita-row">
                      <div className="cita-row__info">
                        <p className="cita-row__nombre">{c.paciente_nombre} {c.paciente_apellido}</p>
                        <p className="cita-row__meta">
                          Dr(a). {c.medico_nombre} · {c.especialidad}
                        </p>
                        <p className="cita-row__meta">
                          {formatFecha(c.fecha)} {formatHora(c.hora_inicio)}
                        </p>
                      </div>
                      <span className={`badge ${BADGE_ESTADO[c.estado] || 'badge--gris'}`}>
                        {c.estado}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Médicos más solicitados */}
            <div className="dashboard-panel">
              <div className="dashboard-panel__cabecera">
                <h2 className="dashboard-panel__titulo">Top médicos</h2>
                <button className="dashboard-panel__ver-todo" onClick={() => navigate('/admin/medicos')}>
                  Ver todos →
                </button>
              </div>
              <div className="dashboard-panel__lista">
                {stats.medicosMasSolicitados.length === 0
                  ? <p className="admin-vacio" style={{ padding: 'var(--space-6)' }}>Sin datos aún.</p>
                  : stats.medicosMasSolicitados.map((m, i) => (
                    <div key={i} className="top-medico-row">
                      <div className="top-medico-row__rank">{i + 1}</div>
                      <div className="top-medico-row__info">
                        <p className="top-medico-row__nombre">Dr(a). {m.nombre} {m.primer_apellido}</p>
                        <p className="top-medico-row__esp">{m.especialidad}</p>
                      </div>
                      <div className="top-medico-row__total">
                        <strong>{m.total_citas}</strong>
                        <span>citas</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Citas por estado */}
            <div className="dashboard-panel dashboard-panel--estado">
              <div className="dashboard-panel__cabecera">
                <h2 className="dashboard-panel__titulo">Distribución de citas</h2>
              </div>
              <div className="estado-bars">
                {stats.citasPorEstado.map(s => {
                  const total = stats.citasPorEstado.reduce((a, b) => a + parseInt(b.total), 0);
                  const pct = total > 0 ? Math.round((parseInt(s.total) / total) * 100) : 0;
                  return (
                    <div key={s.estado} className="estado-bar">
                      <div className="estado-bar__cabecera">
                        <span className={`badge ${BADGE_ESTADO[s.estado] || 'badge--gris'}`}>{s.estado}</span>
                        <span className="estado-bar__num">{s.total} ({pct}%)</span>
                      </div>
                      <div className="estado-bar__track">
                        <div
                          className={`estado-bar__fill estado-bar__fill--${s.estado}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}