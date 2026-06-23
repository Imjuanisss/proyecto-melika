import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { useAuth }       from '../../context/AuthContext';
import { api }           from '../../lib/apiClient';
import './DashboardMedico.css';

// ── Valor inicial del formulario de historia ────────────────────────────
const HISTORIA_INICIAL = {
  motivo_consulta:        '',
  anamnesis:              '',
  examen_fisico:          '',
  diagnostico_cie10:      '',
  descripcion_diagnostico:'',
  plan_tratamiento:       '',
  medicamentos_recetados: '',
  observaciones:          '',
};

export default function DashboardMedico() {
  const { usuario }  = useAuth();
  const calendarRef  = useRef(null);

  // Vista activa: 'agenda' | 'disponibilidad'
  const [vistaActiva, setVistaActiva] = useState('agenda');

  // Fecha seleccionada en el calendario
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split('T')[0]
  );

  // ── Citas del día ────────────────────────────────────────────────────
  const [citasDia,   setCitasDia]   = useState([]);
  const [loadingDia, setLoadingDia] = useState(true);
  const [errorDia,   setErrorDia]   = useState(null);

  // ── Franjas de disponibilidad ────────────────────────────────────────
  const [franjas,         setFranjas]         = useState([]);
  const [loadingFranjas,  setLoadingFranjas]  = useState(false);
  const [errorFranjas,    setErrorFranjas]    = useState(null);
  const [nuevaFranja,     setNuevaFranja]     = useState({ hora_inicio: '', hora_fin: '' });
  const [guardandoFranja, setGuardandoFranja] = useState(false);

  // ── Modal historia clínica ───────────────────────────────────────────
  const [modalHistoria, setModalHistoria] = useState(null); // cita completa
  const [historia,      setHistoria]      = useState(null); // historia existente o null
  const [formHistoria,  setFormHistoria]  = useState(HISTORIA_INICIAL);
  const [modoEdicion,   setModoEdicion]   = useState(false);
  const [guardandoHist, setGuardandoHist] = useState(false);
  const [errorHist,     setErrorHist]     = useState(null);
  const [loadingHist,   setLoadingHist]   = useState(false);

  // ── Cargar franjas (memoizado) ───────────────────────────────────────
  const cargarFranjas = useCallback(() => {
    setLoadingFranjas(true);
    setErrorFranjas(null);
    api.get(`/medico/franjas?fecha=${fechaSeleccionada}`)
      .then(data => setFranjas(data || []))
      .catch(() => setErrorFranjas('No se pudieron cargar las franjas horarias.'))
      .finally(() => setLoadingFranjas(false));
  }, [fechaSeleccionada]);

  // ── Efecto: cargar citas o franjas según vista activa ───────────────
  useEffect(() => {
    if (vistaActiva === 'agenda') {
      setLoadingDia(true);
      setErrorDia(null);
      api.get(`/medico/agenda?fecha=${fechaSeleccionada}`)
        .then(data  => setCitasDia(data.citas || []))
        .catch(() => setErrorDia('No se pudo cargar la agenda.'))
        .finally(() => setLoadingDia(false));
    } else {
      cargarFranjas();
    }
  }, [fechaSeleccionada, vistaActiva, cargarFranjas]);

  // ── Handlers del calendario ─────────────────────────────────────────
  function handleDateClick(info)  { setFechaSeleccionada(info.dateStr); }
  function handleEventClick(info) { setFechaSeleccionada(info.event.startStr.split('T')[0]); }

  function cargarEventos(fetchInfo, successCallback, failureCallback) {
    const inicio = fetchInfo.startStr.split('T')[0];
    const fin    = fetchInfo.endStr.split('T')[0];
    api.get(`/medico/agenda/rango?inicio=${inicio}&fin=${fin}`)
      .then(eventos => successCallback(eventos))
      .catch(() => failureCallback());
  }

  // ── Crear franja ─────────────────────────────────────────────────────
  async function handleCrearFranja(e) {
    e.preventDefault();
    if (!nuevaFranja.hora_inicio || !nuevaFranja.hora_fin) return;
    setGuardandoFranja(true);
    setErrorFranjas(null);
    try {
      await api.post('/medico/franjas', {
        fecha:       fechaSeleccionada,
        hora_inicio: nuevaFranja.hora_inicio,
        hora_fin:    nuevaFranja.hora_fin,
      });
      setNuevaFranja({ hora_inicio: '', hora_fin: '' });
      cargarFranjas();
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      setErrorFranjas(err.message || 'Error al crear la franja horaria.');
    } finally {
      setGuardandoFranja(false);
    }
  }

  // ── Eliminar franja ──────────────────────────────────────────────────
  async function handleEliminarFranja(id) {
    if (!window.confirm('¿Eliminar esta franja de disponibilidad?')) return;
    try {
      await api.delete(`/medico/franjas/${id}`);
      setFranjas(prev => prev.filter(f => f.id !== id));
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar la franja horaria.');
    }
  }

  // ── TERMINAR CITA (NUEVA FUNCIÓN) ────────────────────────────────────
  async function handleTerminarCita(idCita) {
    if (!window.confirm('¿Estás seguro de que deseas dar por terminada esta cita?')) return;

    try {
      // Usamos tu propio apiClient para hacer la petición
      await api.patch(`/medico/citas/${idCita}/completar`);
      
      alert('✅ Cita terminada exitosamente.');
      
      // Actualizamos visualmente la lista de citas sin tener que recargar la página
      setCitasDia(prevCitas => 
        prevCitas.map(c => 
          c.id === idCita ? { ...c, estado: 'completada' } : c
        )
      );

      // Opcional: Actualizar el calendario principal
      calendarRef.current?.getApi().refetchEvents();
    } catch (error) {
      alert('❌ Error al terminar cita: ' + (error.message || 'Error de red.'));
    }
  }

  // ── Abrir modal historia ─────────────────────────────────────────────
  function abrirHistoria(cita) {
    setModalHistoria(cita);
    setHistoria(null);
    setFormHistoria(HISTORIA_INICIAL);
    setModoEdicion(false);
    setErrorHist(null);
    setLoadingHist(true);

    api.get(`/historias/cita/${cita.id}`)           // ← URL correcta
      .then(data => {
        const h = data.historia;
        setHistoria(h || null);
        if (h) {
          // Rellenar formulario con los datos existentes
          setFormHistoria({
            motivo_consulta:         h.motivo_consulta         || '',
            anamnesis:               h.anamnesis               || '',
            examen_fisico:           h.examen_fisico           || '',
            diagnostico_cie10:       h.diagnostico_cie10       || '',
            descripcion_diagnostico: h.descripcion_diagnostico || '',
            plan_tratamiento:        h.plan_tratamiento        || '',
            medicamentos_recetados:  h.medicamentos_recetados  || '',
            observaciones:           h.observaciones           || '',
          });
        } else {
          // Historia nueva → abrir en modo edición directamente
          setModoEdicion(true);
        }
      })
      .catch(() => setErrorHist('No se pudo cargar la historia clínica.'))
      .finally(() => setLoadingHist(false));
  }

  function cerrarHistoria() {
    setModalHistoria(null);
    setHistoria(null);
    setFormHistoria(HISTORIA_INICIAL);
    setModoEdicion(false);
    setErrorHist(null);
  }

  // ── Guardar / actualizar historia ────────────────────────────────────
  async function handleGuardarHistoria() {
    if (!formHistoria.motivo_consulta.trim()) {
      setErrorHist('El motivo de consulta es obligatorio.');
      return;
    }
    setGuardandoHist(true);
    setErrorHist(null);

    try {
      if (historia) {
        // Actualizar existente
        const res = await api.put(`/historias/${historia.id}`, formHistoria);
        setHistoria(res.historia);
      } else {
        // Crear nueva
        const res = await api.post('/historias', {
          ...formHistoria,
          id_cita: modalHistoria.id,
        });
        setHistoria(res.historia);
        // Actualizar el botón de la cita en la lista (historia_id ya existe)
        setCitasDia(prev =>
          prev.map(c =>
            c.id === modalHistoria.id ? { ...c, historia_id: res.historia?.id } : c
          )
        );
      }
      setModoEdicion(false);
    } catch (err) {
      setErrorHist(err.message);
    } finally {
      setGuardandoHist(false);
    }
  }

  // ── Helpers de formato ───────────────────────────────────────────────
  function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    const f = new Date(fechaStr + 'T00:00:00');
    return f.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function formatHora(horaStr) {
    if (!horaStr) return '';
    return horaStr.substring(0, 5);
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <main className="dashboard-medico">
      <div className="contenedor">

        {/* Cabecera + Tabs */}
        <div className="dashboard-medico__cabecera">
          <div>
            <h1 className="dashboard-medico__titulo">
              Bienvenido, Dr(a). {usuario?.nombre}
            </h1>
            <p className="dashboard-medico__sub">
              Gestiona tus consultas y disponibilidad desde tu panel
            </p>
          </div>

          <div className="dashboard-medico__tabs">
            <button
              className={`tab-btn ${vistaActiva === 'agenda' ? 'tab-btn--activo' : ''}`}
              onClick={() => setVistaActiva('agenda')}
            >
              🗓️ Agenda de citas
            </button>
            <button
              className={`tab-btn ${vistaActiva === 'disponibilidad' ? 'tab-btn--activo' : ''}`}
              onClick={() => setVistaActiva('disponibilidad')}
            >
              ⚙️ Disponibilidad
            </button>
          </div>
        </div>

        <div className="dashboard-medico__grid">

          {/* ── Calendario ────────────────────────────────────────────── */}
          <div className="panel-calendario">
            <h2 className="panel-calendario__titulo">Calendario</h2>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              headerToolbar={{
                left:   'prev,next today',
                center: 'title',
                right:  'dayGridMonth,timeGridWeek',
              }}
              events={cargarEventos}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              height="auto"
              eventColor="var(--melika-accent)"
              buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
            />
          </div>

          {/* ── VISTA: Agenda del día ──────────────────────────────────── */}
          {vistaActiva === 'agenda' && (
            <div className="panel-agenda">
              <div className="panel-agenda__cabecera">
                <h2 className="panel-agenda__titulo">Agenda del día</h2>
                <span className="panel-agenda__fecha">{formatFecha(fechaSeleccionada)}</span>
              </div>

              {errorDia && <div className="historia-error">{errorDia}</div>}

              {loadingDia ? (
                <div className="agenda-loading">
                  {Array(3).fill(0).map((_, i) => <div key={i} className="agenda-skeleton" />)}
                </div>
              ) : citasDia.length === 0 ? (
                <div className="agenda-vacio">
                  <span>📭</span>No hay citas para este día
                </div>
              ) : (
                <div className="agenda-lista">
                  {citasDia.map(cita => (
                    <div key={cita.id} className={`agenda-item agenda-item--${cita.estado}`}>
                      <div className="agenda-item__hora">{formatHora(cita.hora_inicio)}</div>
                      <div className="agenda-item__paciente">
                        {cita.paciente_nombre} {cita.paciente_apellido}
                      </div>
                      <div className="agenda-item__tipo">
                        {cita.tipo_consulta === 'teleconsulta' ? '💻 Teleconsulta' : '🏥 Presencial'}
                        {cita.motivo && ` · ${cita.motivo.substring(0, 28)}…`}
                      </div>
                      
                      {/* Aquí agrupamos los botones de Historia y Terminar Cita */}
                      {cita.estado !== 'cancelada' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button
                            className="agenda-item__btn-historia"
                            onClick={() => abrirHistoria(cita)}
                            style={{ flex: 1 }}
                          >
                            {cita.historia_id ? '📄 Ver historia' : '📝 Crear historia'}
                          </button>
                          
                          {/* BOTÓN NUEVO: TERMINAR CITA */}
                          {cita.estado !== 'completada' && (
                            <button
                              onClick={() => handleTerminarCita(cita.id)}
                              style={{
                                background: '#1A7A52',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                              }}
                              title="Marcar cita como completada"
                            >
                              ✅ Terminar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VISTA: Disponibilidad ──────────────────────────────────── */}
          {vistaActiva === 'disponibilidad' && (
            <div className="panel-agenda">
              <div className="panel-agenda__cabecera">
                <h2 className="panel-agenda__titulo">Disponibilidad</h2>
                <span className="panel-agenda__fecha">{formatFecha(fechaSeleccionada)}</span>
              </div>

              {errorFranjas && <div className="historia-error">{errorFranjas}</div>}

              {/* Formulario nueva franja */}
              <form onSubmit={handleCrearFranja} className="dispo-formulario">
                <div className="dispo-formulario__inputs">
                  <div className="dispo-campo">
                    <label>Hora inicio</label>
                    <input
                      type="time"
                      value={nuevaFranja.hora_inicio}
                      onChange={e => setNuevaFranja(p => ({ ...p, hora_inicio: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="dispo-campo">
                    <label>Hora fin</label>
                    <input
                      type="time"
                      value={nuevaFranja.hora_fin}
                      onChange={e => setNuevaFranja(p => ({ ...p, hora_fin: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn-guardar-historia"
                  style={{ width: '100%' }}
                  disabled={guardandoFranja}
                >
                  {guardandoFranja ? 'Añadiendo…' : '＋ Añadir franja libre'}
                </button>
              </form>

              <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid var(--melika-primary-50)' }} />

              <h3 className="panel-calendario__titulo" style={{ fontSize: '0.95rem', marginBottom: '10px' }}>
                Franjas del día
              </h3>

              {loadingFranjas ? (
                <div className="agenda-loading">
                  <div className="agenda-skeleton" style={{ height: '48px' }} />
                </div>
              ) : franjas.length === 0 ? (
                <div className="agenda-vacio">
                  <span>⏰</span>
                  Sin franjas para este día
                </div>
              ) : (
                <div className="dispo-lista">
                  {franjas.map(franja => (
                    <div key={franja.id} className="dispo-item">
                      <div className="dispo-item__info">
                        {franja.disponible ? '🟢' : '🔴'}{' '}
                        {formatHora(franja.hora_inicio)} — {formatHora(franja.hora_fin)}
                        {!franja.disponible && (
                          <span className="dispo-item__badge-reservada">Reservada</span>
                        )}
                      </div>
                      {franja.disponible && (
                        <button
                          type="button"
                          className="dispo-item__btn-eliminar"
                          onClick={() => handleEliminarFranja(franja.id)}
                          title="Eliminar franja"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL HISTORIA CLÍNICA ─────────────────────────────────── */}
      {modalHistoria && (
        <div className="modal-overlay" onClick={cerrarHistoria}>
          <div className="modal-historia" onClick={e => e.stopPropagation()}>

            <div className="modal-historia__cabecera">
              <div>
                <h3>Historia clínica</h3>
                <p className="modal-historia__meta">
                  Paciente: {modalHistoria.paciente_nombre} {modalHistoria.paciente_apellido}
                </p>
                <p className="modal-historia__meta">
                  Cita: {formatFecha(fechaSeleccionada)} · {formatHora(modalHistoria.hora_inicio)}
                </p>
                {historia?.updated_at && (
                  <p className="modal-historia__meta">
                    Última edición: {new Date(historia.updated_at).toLocaleString('es-CO')}
                  </p>
                )}
              </div>
              <button className="btn-cerrar" onClick={cerrarHistoria}>✕</button>
            </div>

            {errorHist && <div className="historia-error">{errorHist}</div>}

            {loadingHist ? (
              <div className="agenda-skeleton" style={{ height: '200px' }} />
            ) : (
              <>
                {/* ── Motivo (obligatorio) ──────────────────────────────── */}
                <div className="historia-campo">
                  <label>
                    Motivo de consulta <span className="historia-campo__requerido">*</span>
                  </label>
                  <textarea
                    className="historia-textarea"
                    rows={3}
                    value={formHistoria.motivo_consulta}
                    onChange={e => setFormHistoria(p => ({ ...p, motivo_consulta: e.target.value }))}
                    disabled={!modoEdicion}
                    placeholder="Describa el motivo principal de la consulta…"
                  />
                </div>

                {/* ── Anamnesis ─────────────────────────────────────────── */}
                <div className="historia-campo">
                  <label>Anamnesis</label>
                  <textarea
                    className="historia-textarea"
                    rows={3}
                    value={formHistoria.anamnesis}
                    onChange={e => setFormHistoria(p => ({ ...p, anamnesis: e.target.value }))}
                    disabled={!modoEdicion}
                    placeholder="Historia de la enfermedad actual…"
                  />
                </div>

                {/* ── Examen físico ─────────────────────────────────────── */}
                <div className="historia-campo">
                  <label>Examen físico</label>
                  <textarea
                    className="historia-textarea"
                    rows={2}
                    value={formHistoria.examen_fisico}
                    onChange={e => setFormHistoria(p => ({ ...p, examen_fisico: e.target.value }))}
                    disabled={!modoEdicion}
                    placeholder="Hallazgos del examen físico…"
                  />
                </div>

                {/* ── Diagnóstico CIE-10 + descripción ─────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="historia-campo">
                    <label>CIE-10</label>
                    <textarea
                      className="historia-textarea"
                      rows={2}
                      value={formHistoria.diagnostico_cie10}
                      onChange={e => setFormHistoria(p => ({ ...p, diagnostico_cie10: e.target.value }))}
                      disabled={!modoEdicion}
                      placeholder="Ej: J00"
                      style={{ minHeight: '60px' }}
                    />
                  </div>
                  <div className="historia-campo">
                    <label>Descripción diagnóstico</label>
                    <textarea
                      className="historia-textarea"
                      rows={2}
                      value={formHistoria.descripcion_diagnostico}
                      onChange={e => setFormHistoria(p => ({ ...p, descripcion_diagnostico: e.target.value }))}
                      disabled={!modoEdicion}
                      placeholder="Nombre y detalle del diagnóstico…"
                      style={{ minHeight: '60px' }}
                    />
                  </div>
                </div>

                {/* ── Plan de tratamiento ───────────────────────────────── */}
                <div className="historia-campo">
                  <label>Plan de tratamiento</label>
                  <textarea
                    className="historia-textarea"
                    rows={2}
                    value={formHistoria.plan_tratamiento}
                    onChange={e => setFormHistoria(p => ({ ...p, plan_tratamiento: e.target.value }))}
                    disabled={!modoEdicion}
                    placeholder="Tratamiento indicado, conducta a seguir…"
                  />
                </div>

                {/* ── Medicamentos recetados ────────────────────────────── */}
                <div className="historia-campo">
                  <label>Medicamentos recetados</label>
                  <textarea
                    className="historia-textarea"
                    rows={2}
                    value={formHistoria.medicamentos_recetados}
                    onChange={e => setFormHistoria(p => ({ ...p, medicamentos_recetados: e.target.value }))}
                    disabled={!modoEdicion}
                    placeholder="Nombre, dosis y posología…"
                  />
                </div>

                {/* ── Observaciones ─────────────────────────────────────── */}
                <div className="historia-campo">
                  <label>Observaciones</label>
                  <textarea
                    className="historia-textarea"
                    rows={2}
                    value={formHistoria.observaciones}
                    onChange={e => setFormHistoria(p => ({ ...p, observaciones: e.target.value }))}
                    disabled={!modoEdicion}
                    placeholder="Notas adicionales…"
                  />
                </div>

                {/* Acciones */}
                <div className="historia-acciones">
                  {historia && !modoEdicion ? (
                    <button
                      className="btn-editar-historia"
                      onClick={() => setModoEdicion(true)}
                    >
                      ✏️ Editar historia
                    </button>
                  ) : (
                    <>
                      {historia && (
                        <button
                          className="btn-editar-historia"
                          onClick={() => { setModoEdicion(false); setErrorHist(null); }}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        className="btn-guardar-historia"
                        disabled={guardandoHist || !formHistoria.motivo_consulta.trim()}
                        onClick={handleGuardarHistoria}
                      >
                        {guardandoHist
                          ? 'Guardando…'
                          : historia ? 'Actualizar historia' : 'Guardar historia'}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}