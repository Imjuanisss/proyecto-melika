// client/src/pages/admin/gestionhorarios/HorariosAdmin.jsx
// MELIKA — Gestión de horarios (Admin)
// Refactorizado end-to-end:
// · ClockPicker profesional en lugar de selects nativos de hora
// · HorariosSemana con navegador interactivo de semanas
// · Modal con layout limpio y secciones bien diferenciadas
// · Franja puntual con DatePicker + ClockPicker integrados

import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { api }           from '../../../lib/apiClient';
import DatePicker        from '../../../components/ui/DatePicker';
import ClockPicker       from '../../../components/ui/ClockPicker';
import HorariosSemana    from '../../../components/horarios/HorariosSemana';
import './HorariosAdmin.css';
import '../admin-shared.css';

const DURACION_FRANJA = 40;

// ─── Helper de previsualización ───────────────────────────────────────────────
function calcularFranjasPreview(inicio, fin, iniDesc, finDesc) {
  if (!inicio || !fin) return null;
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const total = toMin(fin) - toMin(inicio);
  if (total <= 0) return null;
  let desc = 0;
  if (iniDesc && finDesc) desc = Math.max(0, toMin(finDesc) - toMin(iniDesc));
  return Math.floor((total - desc) / DURACION_FRANJA);
}

// ─── Componente: Resumen de franja puntual ────────────────────────────────────
function ResumenFranja({ inicio, fin, iniDesc, finDesc, fecha }) {
  const n = calcularFranjasPreview(inicio, fin, iniDesc, finDesc);
  if (!inicio || !fin || n === null) return null;
  return (
    <div className="ha-franja-preview">
      <div className="ha-franja-preview__num">{n}</div>
      <div className="ha-franja-preview__info">
        <span>franja{n !== 1 ? 's' : ''} de {DURACION_FRANJA} min</span>
        {fecha && <span className="ha-franja-preview__fecha">{fecha}</span>}
      </div>
    </div>
  );
}

// ─── Componente: Campo de horario con ClockPicker ─────────────────────────────
function CampoClock({ label, value, onChange, afterTime, beforeTime, disabled, placeholder }) {
  return (
    <div className="ha-campo-clock">
      {label && <span className="ha-campo-clock__label">{label}</span>}
      <ClockPicker
        value={value}
        onChange={onChange}
        afterTime={afterTime}
        beforeTime={beforeTime}
        disabled={disabled}
        placeholder={placeholder || '-- : --'}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function HorariosAdmin() {
  const calendarRef = useRef(null);

  const [medicos,      setMedicos]      = useState([]);
  const [filtroMedico, setFiltroMedico] = useState('');

  // Modal
  const [modal, setModal] = useState(false); // 'semana' | 'puntual' | false
  const [tab,   setTab]   = useState('semana');

  // Franja puntual — estado limpio y tipado
  const estadoPuntualInicial = {
    medico:      '',
    fecha:       '',
    inicio:      '',
    fin:         '',
    descanso:    false,
    iniDesc:     '',
    finDesc:     '',
  };
  const [puntual,           setPuntual]           = useState(estadoPuntualInicial);
  const [errorPuntual,      setErrorPuntual]       = useState(null);
  const [guardandoPuntual,  setGuardandoPuntual]   = useState(false);
  const [resultadoPuntual,  setResultadoPuntual]   = useState(null);

  // Detalle evento seleccionado
  const [eventoSel, setEventoSel] = useState(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/medicos').then(setMedicos).catch(() => {});
  }, []);

  // ── Eventos del calendario ────────────────────────────────────────────────
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
    setPuntual(estadoPuntualInicial);
    setErrorPuntual(null);
    setResultadoPuntual(null);
  }

  function setPuntuCampo(campo, valor) {
    setPuntual(prev => {
      const next = { ...prev, [campo]: valor };
      // Cascade: si cambia inicio, limpiar fin y descansos
      if (campo === 'inicio') {
        next.fin = '';
        next.iniDesc = '';
        next.finDesc = '';
      }
      if (campo === 'fin') {
        next.iniDesc = '';
        next.finDesc = '';
      }
      if (campo === 'iniDesc') {
        next.finDesc = '';
      }
      if (campo === 'descanso' && !valor) {
        next.iniDesc = '';
        next.finDesc = '';
      }
      return next;
    });
  }

  // ── API: semana (via HorariosSemana) ──────────────────────────────────────
  async function crearFranjaSemana({ id_medico, fecha, hora_inicio, hora_fin, inicio_descanso, fin_descanso }) {
    return api.post('/admin/horarios/masivo', {
      id_medico, fecha, hora_inicio, hora_fin, inicio_descanso, fin_descanso,
    });
  }

  function onExitoSemana() {
    calendarRef.current?.getApi().refetchEvents();
  }

  // ── API: franja puntual ───────────────────────────────────────────────────
  async function handleCrearPuntual() {
    const { medico, fecha, inicio, fin, descanso, iniDesc, finDesc } = puntual;

    if (!medico) { setErrorPuntual('Selecciona un médico.'); return; }
    if (!fecha)  { setErrorPuntual('Selecciona una fecha.'); return; }
    if (!inicio || !fin) { setErrorPuntual('Completa el horario de inicio y fin de jornada.'); return; }
    if (inicio >= fin)   { setErrorPuntual('La hora de inicio debe ser anterior al fin.'); return; }
    if (descanso && (!iniDesc || !finDesc)) {
      setErrorPuntual('Completa el horario del descanso.'); return;
    }

    setErrorPuntual(null);
    setGuardandoPuntual(true);

    try {
      const res = await api.post('/admin/horarios/masivo', {
        fecha,
        id_medico:       parseInt(medico),
        hora_inicio:     inicio,
        hora_fin:        fin,
        inicio_descanso: descanso ? iniDesc : null,
        fin_descanso:    descanso ? finDesc : null,
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

  const nFranjasPuntual = calcularFranjasPreview(
    puntual.inicio, puntual.fin,
    puntual.descanso ? puntual.iniDesc : null,
    puntual.descanso ? puntual.finDesc : null,
  );

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="horarios-admin">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Gestión de horarios</h1>
          <p className="admin-modulo__subtitulo">
            Configura la disponibilidad de los médicos por semana o franja individual
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
            Franja puntual
          </button>
          <button className="btn-admin-primario" onClick={() => abrirModal('semana')}>
            Configurar semana
          </button>
        </div>
      </div>

      {/* ── Leyenda ───────────────────────────────────────────────────────── */}
      <div className="horarios-leyenda">
        <span className="leyenda-item">
          <span className="leyenda-dot leyenda-dot--libre" aria-hidden="true" />
          Disponible
        </span>
        <span className="leyenda-item">
          <span className="leyenda-dot leyenda-dot--reservada" aria-hidden="true" />
          Reservada
        </span>
        <span className="leyenda-item leyenda-item--muted">
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

      {/* ── Modal detalle de evento ───────────────────────────────────────── */}
      {eventoSel && (
        <div className="admin-modal-overlay" onClick={() => setEventoSel(null)}>
          <div className="admin-modal ha-modal-detalle" onClick={e => e.stopPropagation()}>
            <div className="ha-modal-detalle__header">
              <div>
                <h3 className="ha-modal-detalle__titulo">Detalle de franja</h3>
                <p className="ha-modal-detalle__medico">{eventoSel.extendedProps.medico_nombre}</p>
              </div>
              <button
                className="ha-btn-cerrar"
                onClick={() => setEventoSel(null)}
                aria-label="Cerrar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="ha-modal-detalle__body">
              <div className="ha-dato">
                <span className="ha-dato__label">Especialidad</span>
                <span className="ha-dato__valor">{eventoSel.extendedProps.especialidad}</span>
              </div>
              <div className="ha-dato">
                <span className="ha-dato__label">Inicio</span>
                <span className="ha-dato__valor">
                  {new Date(eventoSel.start).toLocaleString('es-CO', {
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="ha-dato">
                <span className="ha-dato__label">Fin</span>
                <span className="ha-dato__valor">
                  {new Date(eventoSel.end).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="ha-dato">
                <span className="ha-dato__label">Estado</span>
                <span className={`ha-badge ${eventoSel.extendedProps.disponible ? 'ha-badge--verde' : 'ha-badge--naranja'}`}>
                  {eventoSel.extendedProps.disponible ? 'Disponible' : 'Reservada'}
                </span>
              </div>
              {eventoSel.extendedProps.paciente && (
                <div className="ha-dato">
                  <span className="ha-dato__label">Paciente</span>
                  <span className="ha-dato__valor">{eventoSel.extendedProps.paciente}</span>
                </div>
              )}
            </div>

            <div className="ha-modal-detalle__footer">
              <button className="ha-btn-secundario" onClick={() => setEventoSel(null)}>Cerrar</button>
              {eventoSel.extendedProps.disponible && (
                <button
                  className="ha-btn-danger"
                  onClick={() => handleEliminar(eventoSel.id)}
                >
                  Eliminar franja
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL PRINCIPAL — Semana / Franja puntual
      ═══════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div className="ha-modal-wide" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="ha-modal-wide__header">
              <div>
                <h3 className="ha-modal-wide__titulo">Añadir disponibilidad</h3>
                <p className="ha-modal-wide__sub">
                  Franjas de {DURACION_FRANJA} min generadas automáticamente
                </p>
              </div>
              <button
                className="ha-btn-cerrar"
                onClick={cerrarModal}
                aria-label="Cerrar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="ha-modal-wide__tabs">
              <button
                type="button"
                className={`ha-tab ${tab === 'semana' ? 'ha-tab--activo' : ''}`}
                onClick={() => setTab('semana')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Semana completa
              </button>
              <button
                type="button"
                className={`ha-tab ${tab === 'puntual' ? 'ha-tab--activo' : ''}`}
                onClick={() => setTab('puntual')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Franja puntual
              </button>
            </div>

            {/* Body */}
            <div className="ha-modal-wide__body">

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
                <div className="ha-puntual">
                  {resultadoPuntual ? (
                    <div className="ha-puntual__resultado">
                      <div className="ha-puntual__resultado-icono" aria-hidden="true">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="9 12 11 14 15 10"/>
                        </svg>
                      </div>
                      <h4>Franjas creadas</h4>
                      <p>
                        {resultadoPuntual.franjas} franja{resultadoPuntual.franjas !== 1 ? 's' : ''}
                        {' '}de {DURACION_FRANJA} min generadas correctamente.
                      </p>
                      <div className="ha-puntual__resultado-acciones">
                        <button className="ha-btn-secundario" onClick={resetPuntual}>Crear otra</button>
                        <button className="ha-btn-primario" onClick={cerrarModal}>Listo</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {errorPuntual && (
                        <div className="ha-error" role="alert">{errorPuntual}</div>
                      )}

                      {/* Sección 1: Médico + fecha */}
                      <div className="ha-puntual__seccion">
                        <h4 className="ha-puntual__seccion-titulo">Médico y fecha</h4>
                        <div className="ha-puntual__fila-2">
                          <div className="ha-puntual__campo">
                            <label className="ha-puntual__label">Médico</label>
                            <select
                              className="ha-puntual__select"
                              value={puntual.medico}
                              onChange={e => setPuntuCampo('medico', e.target.value)}
                            >
                              <option value="">Seleccionar médico…</option>
                              {medicos.filter(m => m.activo).map(m => (
                                <option key={m.id} value={m.id}>
                                  Dr(a). {m.nombre} {m.primer_apellido} — {m.especialidad}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="ha-puntual__campo">
                            <label className="ha-puntual__label">Fecha</label>
                            <DatePicker
                              value={puntual.fecha}
                              onChange={v => setPuntuCampo('fecha', v)}
                              minDate={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sección 2: Horario de jornada */}
                      <div className="ha-puntual__seccion">
                        <h4 className="ha-puntual__seccion-titulo">Horario de jornada</h4>
                        <div className="ha-puntual__fila-2">
                          <CampoClock
                            label="Inicio"
                            value={puntual.inicio}
                            onChange={v => setPuntuCampo('inicio', v)}
                          />
                          <CampoClock
                            label="Fin"
                            value={puntual.fin}
                            onChange={v => setPuntuCampo('fin', v)}
                            afterTime={puntual.inicio || undefined}
                            disabled={!puntual.inicio}
                          />
                        </div>

                        {/* Preview de franjas */}
                        {nFranjasPuntual !== null && (
                          <ResumenFranja
                            inicio={puntual.inicio}
                            fin={puntual.fin}
                            iniDesc={puntual.descanso ? puntual.iniDesc : null}
                            finDesc={puntual.descanso ? puntual.finDesc : null}
                          />
                        )}
                      </div>

                      {/* Sección 3: Descanso (opcional) */}
                      <div className="ha-puntual__seccion">
                        <label className={`ha-puntual__toggle-descanso ${!puntual.inicio || !puntual.fin ? 'ha-puntual__toggle-descanso--disabled' : ''}`}>
                          <input
                            type="checkbox"
                            checked={puntual.descanso}
                            disabled={!puntual.inicio || !puntual.fin}
                            onChange={e => setPuntuCampo('descanso', e.target.checked)}
                          />
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          Incluir descanso / almuerzo
                        </label>

                        {puntual.descanso && (
                          <div className="ha-puntual__descanso-horas">
                            <CampoClock
                              label="Inicio descanso"
                              value={puntual.iniDesc}
                              onChange={v => setPuntuCampo('iniDesc', v)}
                              afterTime={puntual.inicio   || undefined}
                              beforeTime={puntual.fin     || undefined}
                            />
                            <CampoClock
                              label="Fin descanso"
                              value={puntual.finDesc}
                              onChange={v => setPuntuCampo('finDesc', v)}
                              afterTime={puntual.iniDesc  || puntual.inicio || undefined}
                              beforeTime={puntual.fin     || undefined}
                              disabled={!puntual.iniDesc}
                            />
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="ha-puntual__acciones">
                        <button
                          className="ha-btn-secundario"
                          onClick={cerrarModal}
                          disabled={guardandoPuntual}
                        >
                          Cancelar
                        </button>
                        <button
                          className="ha-btn-primario"
                          onClick={handleCrearPuntual}
                          disabled={guardandoPuntual}
                        >
                          {guardandoPuntual ? 'Creando…' : 'Crear franjas'}
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