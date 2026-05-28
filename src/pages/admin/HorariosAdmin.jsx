// src/pages/admin/HorariosAdmin.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { api }           from '../../lib/apiClient';
import './HorariosAdmin.css';
import './admin-shared.css';

export default function HorariosAdmin() {
  const calendarRef = useRef(null);

  const [medicos,      setMedicos]      = useState([]);
  const [filtroMedico, setFiltroMedico] = useState('');
  // ── FIX: se elimina [error, setError] porque nunca se usaba en el JSX ──
  // Si en el futuro quieres mostrar errores de carga del calendario,
  // añade aquí: const [errorCal, setErrorCal] = useState(null);

  // Modal nueva franja
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ id_medico: '', fecha: '', hora_inicio: '', hora_fin: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);

  // Detalle al clic en evento
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  // Carga inicial de médicos para el selector de filtro
  useEffect(() => {
    api.get('/medicos').then(data => setMedicos(data)).catch(() => {});
  }, []);

  // Función de carga de eventos para FullCalendar (memoizada)
  const cargarEventos = useCallback((fetchInfo, successCallback, failureCallback) => {
    const inicio = fetchInfo.startStr.split('T')[0];
    const fin    = fetchInfo.endStr.split('T')[0];
    const query  = filtroMedico
      ? `/admin/horarios?inicio=${inicio}&fin=${fin}&id_medico=${filtroMedico}`
      : `/admin/horarios?inicio=${inicio}&fin=${fin}`;

    api.get(query)
      .then(eventos => successCallback(eventos))
      .catch(() => failureCallback());
  }, [filtroMedico]);

  function handleEventClick(info) {
    setEventoSeleccionado(info.event);
  }

  function handleFiltroChange(e) {
    setFiltroMedico(e.target.value);
    // Refetch al cambiar el filtro
    calendarRef.current?.getApi().refetchEvents();
  }

  async function handleCrear(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      await api.post('/admin/horarios', form);
      setModal(false);
      setForm({ id_medico: '', fecha: '', hora_inicio: '', hora_fin: '' });
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta franja de disponibilidad?')) return;
    try {
      await api.delete(`/admin/horarios/${id}`);
      setEventoSeleccionado(null);
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="horarios-admin">

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
          <button className="btn-admin-primario" onClick={() => setModal(true)}>
            + Añadir franja
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="horarios-leyenda">
        <span className="leyenda-item leyenda-item--libre">🟢 Disponible</span>
        <span className="leyenda-item leyenda-item--ocupada">🟠 Reservada</span>
      </div>

      {/* Calendario FullCalendar */}
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
          eventClick={handleEventClick}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
          nowIndicator
          allDaySlot={false}
        />
      </div>

      {/* Modal detalle del evento seleccionado */}
      {eventoSeleccionado && (
        <div className="admin-modal-overlay" onClick={() => setEventoSeleccionado(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: '400px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Detalle de franja</h3>
            <div className="horarios-detalle">
              <p>
                <strong>Médico:</strong>{' '}
                {eventoSeleccionado.extendedProps.medico_nombre}
              </p>
              <p>
                <strong>Especialidad:</strong>{' '}
                {eventoSeleccionado.extendedProps.especialidad}
              </p>
              <p>
                <strong>Inicio:</strong>{' '}
                {new Date(eventoSeleccionado.start).toLocaleString('es-CO')}
              </p>
              <p>
                <strong>Fin:</strong>{' '}
                {new Date(eventoSeleccionado.end).toLocaleString('es-CO')}
              </p>
              <p>
                <strong>Estado:</strong>{' '}
                {eventoSeleccionado.extendedProps.disponible
                  ? <span className="badge badge--verde">Disponible</span>
                  : <span className="badge badge--naranja">Reservada</span>
                }
              </p>
              {eventoSeleccionado.extendedProps.paciente && (
                <p>
                  <strong>Paciente:</strong>{' '}
                  {eventoSeleccionado.extendedProps.paciente}
                </p>
              )}
            </div>
            <div className="admin-modal__acciones">
              <button
                className="admin-modal__btn-cancelar"
                onClick={() => setEventoSeleccionado(null)}
              >
                Cerrar
              </button>
              {eventoSeleccionado.extendedProps.disponible && (
                <button
                  className="btn-tabla btn-tabla--danger"
                  onClick={() => handleEliminar(eventoSeleccionado.id)}
                >
                  🗑 Eliminar franja
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal crear nueva franja */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Añadir franja de disponibilidad</h3>
            {errorForm && <div className="admin-error">{errorForm}</div>}
            <form onSubmit={handleCrear}>
              <div className="admin-form-grid">
                <div className="admin-campo admin-form-grid--full">
                  <label>Médico</label>
                  <select
                    value={form.id_medico}
                    onChange={e => setForm(p => ({ ...p, id_medico: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar médico…</option>
                    {medicos.filter(m => m.activo).map(m => (
                      <option key={m.id} value={m.id}>
                        Dr(a). {m.nombre} {m.primer_apellido} — {m.especialidad}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-campo admin-form-grid--full">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div className="admin-campo">
                  <label>Hora inicio</label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))}
                    required
                  />
                </div>
                <div className="admin-campo">
                  <label>Hora fin</label>
                  <input
                    type="time"
                    value={form.hora_fin}
                    onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="admin-modal__acciones">
                <button
                  type="button"
                  className="admin-modal__btn-cancelar"
                  onClick={() => setModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-modal__btn-guardar"
                  disabled={guardando}
                >
                  {guardando ? 'Creando…' : 'Crear franja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}