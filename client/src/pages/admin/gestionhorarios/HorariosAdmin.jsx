// client/src/pages/admin/gestionhorarios/HorariosAdmin.jsx
// MELIKA — Gestión de horarios (Admin)
// Refactorizado: usa HorariosSemana reutilizable, modal sin overflow-hidden
// que corte los selects de hora. Franja puntual también con selects nativos.

import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { api }           from '../../../lib/apiClient';
import DatePicker        from '../../../components/ui/DatePicker';
import HorariosSemana    from '../../../components/horarios/HorariosSemana';
import './HorariosAdmin.css';
import '../admin-shared.css';

const DURACION_FRANJA = 40;

// Horas de 06:00 a 21:00 cada 10 min
function generarOpciones() {
  const opts = [];
  for (let h = 6; h <= 21; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 21 && m > 0) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}
const HORAS_OPCIONES = generarOpciones();

// Select de hora nativo reutilizable (inline, nunca se corta por overflow)
function SelectHora({ label, value, onChange, afterTime, beforeTime, disabled }) {
  const opts = HORAS_OPCIONES.filter(h => {
    if (afterTime  && h <= afterTime)  return false;
    if (beforeTime && h >= beforeTime) return false;
    return true;
  });

  return (
    <div className="admin-campo">
      {label && <label>{label}</label>}
      <select
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6,
          border: '1px solid var(--melika-primary-100)',
          fontSize: '0.88rem', fontFamily: 'var(--font-body)',
          background: disabled ? 'var(--melika-bg-secondary)' : 'var(--melika-bg)',
          color: value ? 'var(--melika-text-primary)' : 'var(--melika-text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Seleccionar hora…</option>
        {opts.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

export default function HorariosAdmin() {
  const calendarRef = useRef(null);

  const [medicos,      setMedicos]      = useState([]);
  const [filtroMedico, setFiltroMedico] = useState('');

  // Modal
  const [modal,  setModal]  = useState(false); // 'semana' | 'puntual' | false
  const [tab,    setTab]    = useState('semana');

  // Franja puntual
  const [puntuMedico,   setPuntuMedico]   = useState('');
  const [puntuFecha,    setPuntuFecha]    = useState('');
  const [puntuInicio,   setPuntuInicio]   = useState('');
  const [puntuFin,      setPuntuFin]      = useState('');
  const [puntuDescanso, setPuntuDescanso] = useState(false);
  const [puntuIniDesc,  setPuntuIniDesc]  = useState('');
  const [puntuFinDesc,  setPuntuFinDesc]  = useState('');
  const [errorPuntual,  setErrorPuntual]  = useState(null);
  const [guardandoPuntual, setGuardandoPuntual] = useState(false);
  const [resultadoPuntual, setResultadoPuntual] = useState(null);

  // Detalle evento
  const [eventoSel, setEventoSel] = useState(null);

  // ── Carga médicos ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/medicos').then(setMedicos).catch(() => {});
  }, []);

  // ── Eventos calendario ────────────────────────────────────────────────────
  const cargarEventos = useCallback(
    (fetchInfo, successCb, failureCb) => {
      const inicio = fetchInfo.startStr.split('T')[0];
      const fin    = fetchInfo.endStr.split('T')[0];
      const qs     = filtroMedico
        ? `?inicio=${inicio}&fin=${fin}&id_medico=${filtroMedico}`
        : `?inicio=${inicio}&fin=${fin}`;
      api.get(`/admin/horarios${qs}`).then(successCb).catch(failureCb);
    },
    [filtroMedico]
  );

  function handleFiltroChange(e) {
    setFiltroMedico(e.target.value);
    calendarRef.current?.getApi().refetchEvents();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function abrirModal(tabInicial = 'semana') {
    setTab(tabInicial);
    resetPuntual();
    setModal(true);
  }

  function cerrarModal() {
    setModal(false);
    resetPuntual();
  }

  function resetPuntual() {
    setPuntuMedico(''); setPuntuFecha(''); setPuntuInicio(''); setPuntuFin('');
    setPuntuDescanso(false); setPuntuIniDesc(''); setPuntuFinDesc('');
    setErrorPuntual(null); setResultadoPuntual(null);
  }

  // ── API: crear franja (llamado desde HorariosSemana) ─────────────────────
  async function crearFranjaSemana({ id_medico, fecha, hora_inicio, hora_fin, inicio_descanso, fin_descanso }) {
    return api.post('/admin/horarios/masivo', {
      id_medico, fecha, hora_inicio, hora_fin, inicio_descanso, fin_descanso,
    });
  }

  function onExitoSemana() {
    calendarRef.current?.getApi().refetchEvents();
  }

  // ── Franja puntual ────────────────────────────────────────────────────────
  function previsualizarPuntual() {
    if (!puntuInicio || !puntuFin) return null;
    const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const total = toMin(puntuFin) - toMin(puntuInicio);
    if (total <= 0) return null;
    let desc = 0;
    if (puntuDescanso && puntuIniDesc && puntuFinDesc)
      desc = Math.max(0, toMin(puntuFinDesc) - toMin(puntuIniDesc));
    return Math.floor((total - desc) / DURACION_FRANJA);
  }

  async function handleCrearPuntual() {
    if (!puntuMedico) { setErrorPuntual('Selecciona un médico.'); return; }
    if (!puntuFecha)  { setErrorPuntual('Selecciona una fecha.'); return; }
    if (!puntuInicio || !puntuFin) { setErrorPuntual('Completa las horas de inicio y fin.'); return; }
    if (puntuInicio >= puntuFin) { setErrorPuntual('La hora de inicio debe ser anterior al fin.'); return; }
    if (puntuDescanso && (!puntuIniDesc || !puntuFinDesc)) {
      setErrorPuntual('Completa las horas del descanso.'); return;
    }
    setErrorPuntual(null);
    setGuardandoPuntual(true);
    try {
      const res = await api.post('/admin/horarios/masivo', {
        fecha:           puntuFecha,
        id_medico:       parseInt(puntuMedico),
        hora_inicio:     puntuInicio,
        hora_fin:        puntuFin,
        inicio_descanso: puntuDescanso ? puntuIniDesc : null,
        fin_descanso:    puntuDescanso ? puntuFinDesc : null,
      });
      setResultadoPuntual({ franjas: res.insertadas || 0 });
      calendarRef.current?.getApi().refetchEvents();
    } catch (e) {
      setErrorPuntual(e.message || 'Error al crear las franjas.');
    } finally {
      setGuardandoPuntual(false);
    }
  }

  // ── Eliminar franja ───────────────────────────────────────────────────────
  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta franja de disponibilidad?')) return;
    try {
      await api.delete(`/admin/horarios/${id}`);
      setEventoSel(null);
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      alert(err.message);
    }
  }

  const nFranjasPuntual = previsualizarPuntual();

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="horarios-admin">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Gestión de Horarios</h1>
          <p className="admin-modulo__subtitulo">
            Configura la disponibilidad de los médicos por semana o por franja individual
          </p>
        </div>
        <div className="horarios-cabecera-acciones">
          <select
            className="admin-filtros__select"
            value={filtroMedico}
            onChange={handleFiltroChange}
          >
            <option value="">Todos los médicos</option>
            {medicos.map(m => (
              <option key={m.id} value={m.id}>
                Dr(a). {m.nombre} {m.primer_apellido} — {m.especialidad}
              </option>
            ))}
          </select>
          <button className="btn-admin-secundario" onClick={() => abrirModal('puntual')}>
            + Franja puntual
          </button>
          <button className="btn-admin-primario" onClick={() => abrirModal('semana')}>
            📅 Configurar semana
          </button>
        </div>
      </div>

      {/* ── Leyenda ───────────────────────────────────────────────────────── */}
      <div className="horarios-leyenda">
        <span className="leyenda-item">🟢 Disponible</span>
        <span className="leyenda-item">🟠 Reservada</span>
        <span className="leyenda-item" style={{ color: 'var(--melika-text-muted)', fontSize: 12 }}>
          Franjas de {DURACION_FRANJA} min
        </span>
      </div>

      {/* ── Calendario ───────────────────────────────────────────────────── */}
      <div className="horarios-calendar-wrap">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          headerToolbar={{
            left:   'prev,next today',
            center: 'title',
            right:  'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={cargarEventos}
          eventClick={e => setEventoSel(e.event)}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:40:00"
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
          nowIndicator
          allDaySlot={false}
        />
      </div>

      {/* ── Modal detalle evento ──────────────────────────────────────────── */}
      {eventoSel && (
        <div className="admin-modal-overlay" onClick={() => setEventoSel(null)}>
          <div className="admin-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3>Detalle de franja</h3>
            <div className="horarios-detalle">
              <p><strong>Médico:</strong> {eventoSel.extendedProps.medico_nombre}</p>
              <p><strong>Especialidad:</strong> {eventoSel.extendedProps.especialidad}</p>
              <p><strong>Inicio:</strong> {new Date(eventoSel.start).toLocaleString('es-CO')}</p>
              <p><strong>Fin:</strong> {new Date(eventoSel.end).toLocaleString('es-CO')}</p>
              <p>
                <strong>Estado:</strong>{' '}
                {eventoSel.extendedProps.disponible
                  ? <span className="badge badge--verde">Disponible</span>
                  : <span className="badge badge--naranja">Reservada</span>}
              </p>
              {eventoSel.extendedProps.paciente && (
                <p><strong>Paciente:</strong> {eventoSel.extendedProps.paciente}</p>
              )}
            </div>
            <div className="admin-modal__acciones">
              <button className="admin-modal__btn-cancelar" onClick={() => setEventoSel(null)}>Cerrar</button>
              {eventoSel.extendedProps.disponible && (
                <button className="btn-tabla btn-tabla--danger" onClick={() => handleEliminar(eventoSel.id)}>
                  🗑 Eliminar franja
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL PRINCIPAL — ancho completo, sin overflow que corte selects
      ═══════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div
            className="horarios-modal-wide"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="horarios-modal__header">
              <div>
                <h3 className="horarios-modal__titulo">Añadir disponibilidad</h3>
                <p className="horarios-modal__sub">
                  Franjas de {DURACION_FRANJA} min generadas automáticamente
                </p>
              </div>
              <button className="btn-cerrar-modal" onClick={cerrarModal} aria-label="Cerrar">✕</button>
            </div>

            {/* Tabs */}
            <div className="horarios-modo-tabs">
              <button
                type="button"
                className={`horarios-modo-tab ${tab === 'semana' ? 'horarios-modo-tab--activo' : ''}`}
                onClick={() => setTab('semana')}
              >
                📅 Semana completa
              </button>
              <button
                type="button"
                className={`horarios-modo-tab ${tab === 'puntual' ? 'horarios-modo-tab--activo' : ''}`}
                onClick={() => setTab('puntual')}
              >
                🕐 Franja puntual
              </button>
            </div>

            {/* Body — sin overflow:hidden para que los selects no se corten */}
            <div className="horarios-modal-wide__body">

              {/* ── SEMANA ── */}
              {tab === 'semana' && (
                <HorariosSemana
                  medicos={medicos}
                  onCrear={crearFranjaSemana}
                  onExito={onExitoSemana}
                />
              )}

              {/* ── PUNTUAL ── */}
              {tab === 'puntual' && (
                <div className="horarios-puntual">
                  {resultadoPuntual ? (
                    <div className="sh-resultado">
                      <div className="sh-resultado__icono">✅</div>
                      <h4 className="sh-resultado__titulo">¡Franjas creadas!</h4>
                      <p className="sh-resultado__detalle">
                        Se generaron <strong>{resultadoPuntual.franjas} franjas</strong> de {DURACION_FRANJA} min.
                      </p>
                      <div className="sh-resultado__acciones">
                        <button className="sh-btn sh-btn--secundario" onClick={resetPuntual}>Crear otra</button>
                        <button className="sh-btn sh-btn--primario" onClick={cerrarModal}>Listo</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {errorPuntual && <div className="sh-error">{errorPuntual}</div>}

                      <div className="horarios-fila-2">
                        <div className="admin-campo">
                          <label>Médico</label>
                          <select
                            value={puntuMedico}
                            onChange={e => setPuntuMedico(e.target.value)}
                          >
                            <option value="">Seleccionar médico…</option>
                            {medicos.filter(m => m.activo).map(m => (
                              <option key={m.id} value={m.id}>
                                Dr(a). {m.nombre} {m.primer_apellido}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="admin-campo">
                          <label>Fecha</label>
                          <DatePicker
                            value={puntuFecha}
                            onChange={setPuntuFecha}
                            minDate={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>

                      <div className="horarios-fila-2">
                        <SelectHora
                          label="Inicio jornada"
                          value={puntuInicio}
                          onChange={v => { setPuntuInicio(v); setPuntuFin(''); setPuntuIniDesc(''); setPuntuFinDesc(''); }}
                        />
                        <SelectHora
                          label="Fin jornada"
                          value={puntuFin}
                          onChange={v => { setPuntuFin(v); setPuntuIniDesc(''); setPuntuFinDesc(''); }}
                          afterTime={puntuInicio || undefined}
                          disabled={!puntuInicio}
                        />
                      </div>

                      {nFranjasPuntual !== null && (
                        <div className="horarios-preview-pill">
                          Se generarán <strong>{nFranjasPuntual} franjas</strong> de {DURACION_FRANJA} min
                          {puntuDescanso && puntuIniDesc && puntuFinDesc
                            ? ` (con descanso ${puntuIniDesc}–${puntuFinDesc})` : ''}
                        </div>
                      )}

                      <label className="horarios-dia__check-descanso" style={{ marginTop: 4 }}>
                        <input
                          type="checkbox"
                          checked={puntuDescanso}
                          disabled={!puntuInicio || !puntuFin}
                          onChange={e => {
                            setPuntuDescanso(e.target.checked);
                            if (!e.target.checked) { setPuntuIniDesc(''); setPuntuFinDesc(''); }
                          }}
                        />
                        Incluir descanso / almuerzo
                      </label>

                      {puntuDescanso && (
                        <div className="horarios-fila-2">
                          <SelectHora
                            label="Inicio descanso"
                            value={puntuIniDesc}
                            onChange={v => { setPuntuIniDesc(v); setPuntuFinDesc(''); }}
                            afterTime={puntuInicio || undefined}
                            beforeTime={puntuFin   || undefined}
                          />
                          <SelectHora
                            label="Fin descanso"
                            value={puntuFinDesc}
                            onChange={setPuntuFinDesc}
                            afterTime={puntuIniDesc || undefined}
                            beforeTime={puntuFin    || undefined}
                            disabled={!puntuIniDesc}
                          />
                        </div>
                      )}

                      <div className="admin-modal__acciones" style={{ borderTop: '1px solid var(--melika-primary-50)', paddingTop: 16, marginTop: 8 }}>
                        <button className="admin-modal__btn-cancelar" onClick={cerrarModal} disabled={guardandoPuntual}>
                          Cancelar
                        </button>
                        <button className="admin-modal__btn-guardar" onClick={handleCrearPuntual} disabled={guardandoPuntual}>
                          {guardandoPuntual ? 'Creando…' : '✓ Crear franja'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}