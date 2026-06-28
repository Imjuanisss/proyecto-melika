// client/src/pages/admin/gestionhorarios/HorariosAdmin.jsx
// MELIKA — Gestión de horarios con DatePicker y TimePicker interactivos

import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { api }           from '../../../lib/apiClient';
import DatePicker        from '../../../components/ui/DatePicker';
import TimePicker        from '../../../components/ui/TimePicker';
import './HorariosAdmin.css';
import '../admin-shared.css';

// Paso 1 — elegir médico y fecha
// Paso 2 — elegir hora inicio y hora fin
const STEPS = ['Fecha', 'Horario'];

const FORM_INICIAL = { id_medico: '', fecha: '', hora_inicio: '', hora_fin: '' };

export default function HorariosAdmin() {
  const calendarRef = useRef(null);

  const [medicos,      setMedicos]      = useState([]);
  const [filtroMedico, setFiltroMedico] = useState('');

  // Modal nueva franja
  const [modal,     setModal]     = useState(false);
  const [paso,      setPaso]      = useState(0);   // 0 = fecha, 1 = horario
  const [form,      setForm]      = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);

  // Detalle al clic en evento
  const [eventoSel, setEventoSel] = useState(null);

  // ── Carga inicial de médicos ────────────────────────────────────────────
  useEffect(() => {
    api.get('/medicos').then(setMedicos).catch(() => {});
  }, []);

  // ── Función de eventos para FullCalendar ───────────────────────────────
  const cargarEventos = useCallback(
    (fetchInfo, successCallback, failureCallback) => {
      const inicio = fetchInfo.startStr.split('T')[0];
      const fin    = fetchInfo.endStr.split('T')[0];
      const qs     = filtroMedico
        ? `?inicio=${inicio}&fin=${fin}&id_medico=${filtroMedico}`
        : `?inicio=${inicio}&fin=${fin}`;
      api.get(`/admin/horarios${qs}`)
        .then(successCallback)
        .catch(failureCallback);
    },
    [filtroMedico]
  );

  // ── Handlers generales ─────────────────────────────────────────────────
  function handleFiltroChange(e) {
    setFiltroMedico(e.target.value);
    calendarRef.current?.getApi().refetchEvents();
  }

  function abrirModal() {
    setForm(FORM_INICIAL);
    setPaso(0);
    setErrorForm(null);
    setModal(true);
  }

  function cerrarModal() {
    setModal(false);
    setErrorForm(null);
  }

  // ── Navegación entre pasos ─────────────────────────────────────────────
  function puedeAvanzar() {
    if (paso === 0) return form.id_medico && form.fecha;
    return true;
  }

  function siguientePaso() {
    if (paso < STEPS.length - 1) setPaso(p => p + 1);
  }

  function pasoAnterior() {
    setPaso(p => Math.max(0, p - 1));
    setErrorForm(null);
  }

  // ── Envío del formulario ───────────────────────────────────────────────
  async function handleCrear() {
    setErrorForm(null);

    if (!form.hora_inicio || !form.hora_fin) {
      setErrorForm('Selecciona la hora de inicio y la hora de fin.');
      return;
    }
    if (form.hora_inicio >= form.hora_fin) {
      setErrorForm('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/admin/horarios', form);
      cerrarModal();
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      setErrorForm(err.message ?? 'Error al crear la franja.');
    } finally {
      setGuardando(false);
    }
  }

  // ── Eliminar franja desde el modal de detalle ──────────────────────────
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

  // ── Formateo de fecha para mostrar en el resumen ───────────────────────
  function labelFecha(iso) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  // ── Nombre del médico seleccionado (para el resumen del paso 2) ─────────
  const medicoLabel = medicos.find(m => String(m.id) === String(form.id_medico));

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="horarios-admin">

      {/* Cabecera */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Gestión de Horarios</h1>
          <p className="admin-modulo__subtitulo">Franjas de disponibilidad de todos los médicos</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
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
          <button className="btn-admin-primario" onClick={abrirModal}>
            + Añadir franja
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="horarios-leyenda">
        <span className="leyenda-item leyenda-item--libre">🟢 Disponible</span>
        <span className="leyenda-item leyenda-item--ocupada">🟠 Reservada</span>
      </div>

      {/* Calendario */}
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
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
          nowIndicator
          allDaySlot={false}
        />
      </div>

      {/* ── Modal detalle de evento ───────────────────────────────────────── */}
      {eventoSel && (
        <div className="admin-modal-overlay" onClick={() => setEventoSel(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: 400 }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Detalle de franja</h3>
            <div className="horarios-detalle">
              <p><strong>Médico:</strong> {eventoSel.extendedProps.medico_nombre}</p>
              <p><strong>Especialidad:</strong> {eventoSel.extendedProps.especialidad}</p>
              <p>
                <strong>Inicio:</strong>{' '}
                {new Date(eventoSel.start).toLocaleString('es-CO')}
              </p>
              <p>
                <strong>Fin:</strong>{' '}
                {new Date(eventoSel.end).toLocaleString('es-CO')}
              </p>
              <p>
                <strong>Estado:</strong>{' '}
                {eventoSel.extendedProps.disponible
                  ? <span className="badge badge--verde">Disponible</span>
                  : <span className="badge badge--naranja">Reservada</span>
                }
              </p>
              {eventoSel.extendedProps.paciente && (
                <p>
                  <strong>Paciente:</strong> {eventoSel.extendedProps.paciente}
                </p>
              )}
            </div>
            <div className="admin-modal__acciones">
              <button className="admin-modal__btn-cancelar" onClick={() => setEventoSel(null)}>
                Cerrar
              </button>
              {eventoSel.extendedProps.disponible && (
                <button
                  className="btn-tabla btn-tabla--danger"
                  onClick={() => handleEliminar(eventoSel.id)}
                >
                  🗑 Eliminar franja
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal crear franja — 2 pasos ─────────────────────────────────── */}
      {modal && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div
            className="admin-modal franja-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Header con steps */}
            <div className="franja-modal__header">
              <h3>Añadir franja de disponibilidad</h3>
              <div className="franja-modal__steps">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={[
                      'franja-modal__step',
                      i === paso     ? 'franja-modal__step--activo'    : '',
                      i < paso       ? 'franja-modal__step--completado' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="franja-modal__step-num">
                      {i < paso ? '✓' : i + 1}
                    </span>
                    <span className="franja-modal__step-label">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {errorForm && <div className="admin-error">{errorForm}</div>}

            {/* ─── PASO 0: Médico + Fecha ─────────────────────────────────── */}
            {paso === 0 && (
              <div className="franja-modal__body">
                <div className="admin-campo">
                  <label>Médico</label>
                  <select
                    value={form.id_medico}
                    onChange={e => setForm(p => ({ ...p, id_medico: e.target.value }))}
                  >
                    <option value="">Seleccionar médico…</option>
                    {medicos.filter(m => m.activo).map(m => (
                      <option key={m.id} value={m.id}>
                        Dr(a). {m.nombre} {m.primer_apellido} — {m.especialidad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-campo">
                  <label>Fecha</label>
                  <DatePicker
                    value={form.fecha}
                    onChange={fecha => setForm(p => ({ ...p, fecha }))}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}

            {/* ─── PASO 1: Hora inicio + Hora fin ─────────────────────────── */}
            {paso === 1 && (
              <div className="franja-modal__body">
                {/* Resumen visual de lo elegido */}
                <div className="franja-resumen">
                  <span className="franja-resumen__item">
                    👨‍⚕️ Dr(a). {medicoLabel?.nombre} {medicoLabel?.primer_apellido}
                  </span>
                  <span className="franja-resumen__item">
                    📅 {labelFecha(form.fecha)}
                  </span>
                </div>

                <div className="franja-modal__tiempos">
                  {/* Hora inicio */}
                  <div className="admin-campo">
                    <label>
                      Hora inicio
                      {form.hora_inicio && (
                        <strong className="franja-hora-badge">{form.hora_inicio}</strong>
                      )}
                    </label>
                    <TimePicker
                      value={form.hora_inicio}
                      onChange={h => setForm(p => ({ ...p, hora_inicio: h, hora_fin: '' }))}
                    />
                  </div>

                  {/* Hora fin — solo activa si hay inicio */}
                  <div className="admin-campo">
                    <label>
                      Hora fin
                      {form.hora_fin && (
                        <strong className="franja-hora-badge">{form.hora_fin}</strong>
                      )}
                    </label>
                    <TimePicker
                      value={form.hora_fin}
                      onChange={h => setForm(p => ({ ...p, hora_fin: h }))}
                      afterTime={form.hora_inicio}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="admin-modal__acciones">
              {paso === 0 ? (
                <button className="admin-modal__btn-cancelar" onClick={cerrarModal}>
                  Cancelar
                </button>
              ) : (
                <button className="admin-modal__btn-cancelar" onClick={pasoAnterior}>
                  ← Atrás
                </button>
              )}

              {paso < STEPS.length - 1 ? (
                <button
                  className="admin-modal__btn-guardar"
                  disabled={!puedeAvanzar()}
                  onClick={siguientePaso}
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  className="admin-modal__btn-guardar"
                  disabled={guardando || !form.hora_inicio || !form.hora_fin}
                  onClick={handleCrear}
                >
                  {guardando ? 'Creando…' : '✓ Crear franja'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}