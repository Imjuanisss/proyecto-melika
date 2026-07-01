// client/src/pages/dashboard-medico/DashboardMedico.jsx
// MELIKA — Dashboard del Médico
// Lógica profesional end to end para gestión de horarios, agenda y disponibilidad.

import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { useAuth }       from '../../context/AuthContext';
import { api }           from '../../lib/apiClient';
import ModalHistoriaClinica from '../../components/historias/ModalHistoriaClinica';
import ClockPicker       from '../../components/ui/ClockPicker';
import HorariosSemana    from '../../components/horarios/HorariosSemana';
import './DashboardMedico.css';
import { pdf } from '@react-pdf/renderer';
import VisorPDFModal from '../../components/historias/VisorPDFModal';
import { PlantillaHistoriaPDF } from '../../components/historias/PlantillaHistoriaPDF';

const DURACION_FRANJA = 40;

const GESTION_INICIAL = {
  estado:        'completada',
  notas_medicas: '',
};

const DISPO_TABS = {
  DIARIA:  'diaria',
  SEMANAL: 'semanal',
};

export default function DashboardMedico() {
  const { usuario } = useAuth();
  const calendarRef = useRef(null);

  const [vistaActiva,       setVistaActiva]       = useState('agenda');
  const [dispoTab,          setDispoTab]          = useState(DISPO_TABS.DIARIA);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [citasDia,   setCitasDia]   = useState([]);
  const [loadingDia, setLoadingDia] = useState(true);
  const [errorDia,   setErrorDia]   = useState(null);

  const [franjas,        setFranjas]        = useState([]);
  const [loadingFranjas, setLoadingFranjas] = useState(false);
  const [errorFranjas,   setErrorFranjas]   = useState(null);

  const [idMedico, setIdMedico] = useState(null);

  const [nuevaFranja,     setNuevaFranja]     = useState({
    hora_inicio:     '',
    hora_fin:        '',
    tiene_descanso:  false,
    inicio_descanso: '',
    fin_descanso:    '',
  });
  const [guardandoFranja, setGuardandoFranja] = useState(false);

  const [citaHistoriaAbierta, setCitaHistoriaAbierta] = useState(null);
  const [visorUrl,      setVisorUrl]      = useState(null);
  const [visorNombre,   setVisorNombre]   = useState('historia.pdf');
  const [visorCargando, setVisorCargando] = useState(false);
  const [visorError,    setVisorError]    = useState(null);

  const [modalGestion,     setModalGestion]     = useState(null);
  const [formGestion,      setFormGestion]      = useState(GESTION_INICIAL);
  const [guardandoGestion, setGuardandoGestion] = useState(false);
  const [errorGestion,     setErrorGestion]     = useState(null);

  // ── Gestión de franjas seleccionadas directamente desde el calendario ──────
  // Permite editar o eliminar disponibilidad sin tener que ir a la pestaña
  // "Disponibilidad" — flujo end to end más rápido para el médico.
  const [franjaCalSel,       setFranjaCalSel]       = useState(null); // { id, fecha }
  const [formFranjaCal,      setFormFranjaCal]      = useState({ hora_inicio: '', hora_fin: '' });
  const [guardandoFranjaCal, setGuardandoFranjaCal] = useState(false);
  const [errorFranjaCal,     setErrorFranjaCal]     = useState(null);

  // Carga inicial de perfil
  useEffect(() => {
    api.get('/medico/perfil')
      .then(perfil => setIdMedico(perfil?.id || null))
      .catch(() => {});
  }, []);

  const cargarFranjas = useCallback(() => {
    setLoadingFranjas(true);
    setErrorFranjas(null);
    api.get(`/medico/franjas?fecha=${fechaSeleccionada}`)
      .then(data => setFranjas(data || []))
      .catch(() => setErrorFranjas('No se pudieron cargar las franjas horarias.'))
      .finally(() => setLoadingFranjas(false));
  }, [fechaSeleccionada]);

  const cargarAgenda = useCallback(() => {
    setLoadingDia(true);
    setErrorDia(null);
    api.get(`/medico/agenda?fecha=${fechaSeleccionada}`)
      .then(data  => setCitasDia(data.citas || []))
      .catch(() => setErrorDia('No se pudo cargar la agenda.'))
      .finally(() => setLoadingDia(false));
  }, [fechaSeleccionada]);

  useEffect(() => {
    if (vistaActiva === 'agenda') cargarAgenda();
    else if (dispoTab === DISPO_TABS.DIARIA) cargarFranjas();
  }, [fechaSeleccionada, vistaActiva, dispoTab, cargarAgenda, cargarFranjas]);

  // ── Interactividad del calendario ───────────────────────────────────────
  function handleDateClick(info) {
    setFechaSeleccionada(info.dateStr);
    const calApi = calendarRef.current?.getApi();
    if (calApi && calApi.view.type === 'dayGridMonth') {
      calApi.changeView('timeGridDay', info.dateStr);
    }
  }

  // Click en evento del calendario: si es una franja disponible (sin
  // paciente), abre el panel de gestión rápida (editar/eliminar). Si es
  // una cita reservada, simplemente enfoca esa fecha en la agenda lateral.
  function handleEventClick(info) {
    const { esFranjaDisponible } = info.event.extendedProps;

    if (esFranjaDisponible) {
      const id          = info.event.id.replace('franja-', '');
      const fecha        = info.event.startStr.split('T')[0];
      const hora_inicio  = info.event.startStr.split('T')[1]?.substring(0, 5) || '';
      const hora_fin     = info.event.endStr ? info.event.endStr.split('T')[1]?.substring(0, 5) : '';
      setFranjaCalSel({ id, fecha });
      setFormFranjaCal({ hora_inicio, hora_fin });
      setErrorFranjaCal(null);
      return;
    }

    setFechaSeleccionada(info.event.startStr.split('T')[0]);
  }

  function cargarEventos(fetchInfo, successCallback, failureCallback) {
    const inicio = fetchInfo.startStr.split('T')[0];
    const fin    = fetchInfo.endStr.split('T')[0];
    api.get(`/medico/agenda/rango?inicio=${inicio}&fin=${fin}`)
      .then(eventos => successCallback(eventos))
      .catch(() => failureCallback());
  }

  function previsualizarFranjas() {
    const { hora_inicio, hora_fin, tiene_descanso, inicio_descanso, fin_descanso } = nuevaFranja;
    if (!hora_inicio || !hora_fin) return null;
    const [ih, im] = hora_inicio.split(':').map(Number);
    const [fh, fm] = hora_fin.split(':').map(Number);
    const totalMin = (fh * 60 + fm) - (ih * 60 + im);
    if (totalMin <= 0) return null;
    let descMin = 0;
    if (tiene_descanso && inicio_descanso && fin_descanso) {
      const [dih, dim] = inicio_descanso.split(':').map(Number);
      const [dfh, dfm] = fin_descanso.split(':').map(Number);
      descMin = (dfh * 60 + dfm) - (dih * 60 + dim);
    }
    return Math.floor((totalMin - Math.max(0, descMin)) / DURACION_FRANJA);
  }

  async function handleCrearFranja(e) {
    e.preventDefault();
    const { hora_inicio, hora_fin } = nuevaFranja;
    if (!hora_inicio || !hora_fin) return;
    if (hora_inicio >= hora_fin) {
      setErrorFranjas('La hora de inicio debe ser anterior a la de fin.');
      return;
    }
    setGuardandoFranja(true);
    setErrorFranjas(null);
    try {
      await api.post('/medico/franjas', {
        fecha:           fechaSeleccionada,
        hora_inicio,
        hora_fin,
        inicio_descanso: nuevaFranja.tiene_descanso ? nuevaFranja.inicio_descanso : null,
        fin_descanso:    nuevaFranja.tiene_descanso ? nuevaFranja.fin_descanso    : null,
      });
      setNuevaFranja({ hora_inicio: '', hora_fin: '', tiene_descanso: false, inicio_descanso: '', fin_descanso: '' });
      cargarFranjas();
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      setErrorFranjas(err.message || 'Error al crear la franja horaria.');
    } finally {
      setGuardandoFranja(false);
    }
  }

  async function handleEliminarFranja(id) {
    if (!window.confirm('¿Eliminar esta franja de disponibilidad?')) return;
    try {
      await api.delete(`/medico/franjas/${id}`);
      setFranjas(prev => prev.filter(f => f.id !== id));
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      setErrorFranjas(err.message || 'No se pudo eliminar la franja horaria.');
    }
  }

  async function crearFranjaSemanasMedico({ fecha, hora_inicio, hora_fin, inicio_descanso, fin_descanso }) {
    return api.post('/medico/franjas', {
      fecha,
      hora_inicio,
      hora_fin,
      inicio_descanso: inicio_descanso || null,
      fin_descanso:    fin_descanso    || null,
    });
  }

  function onExitoSemanal() {
    calendarRef.current?.getApi().refetchEvents();
    if (dispoTab === DISPO_TABS.DIARIA) cargarFranjas();
  }

  // ── Gestión rápida de franja desde el calendario ────────────────────────
  function cerrarFranjaCalendario() {
    setFranjaCalSel(null);
    setFormFranjaCal({ hora_inicio: '', hora_fin: '' });
    setErrorFranjaCal(null);
  }

  async function handleGuardarFranjaCalendario() {
    if (!franjaCalSel) return;
    const { hora_inicio, hora_fin } = formFranjaCal;

    if (!hora_inicio || !hora_fin) {
      setErrorFranjaCal('Completa la hora de inicio y de fin.');
      return;
    }
    if (hora_inicio >= hora_fin) {
      setErrorFranjaCal('La hora de inicio debe ser anterior a la de fin.');
      return;
    }

    setGuardandoFranjaCal(true);
    setErrorFranjaCal(null);
    try {
      await api.patch(`/medico/franjas/${franjaCalSel.id}`, {
        fecha: franjaCalSel.fecha,
        hora_inicio,
        hora_fin,
      });
      calendarRef.current?.getApi().refetchEvents();
      if (dispoTab === DISPO_TABS.DIARIA) cargarFranjas();
      cerrarFranjaCalendario();
    } catch (err) {
      setErrorFranjaCal(err.message || 'No se pudo actualizar la franja. Verifica que no se solape con otra.');
    } finally {
      setGuardandoFranjaCal(false);
    }
  }

  async function handleEliminarFranjaCalendario() {
    if (!franjaCalSel) return;
    if (!window.confirm('¿Eliminar esta franja de disponibilidad?')) return;
    try {
      await api.delete(`/medico/franjas/${franjaCalSel.id}`);
      calendarRef.current?.getApi().refetchEvents();
      if (dispoTab === DISPO_TABS.DIARIA) cargarFranjas();
      cerrarFranjaCalendario();
    } catch (err) {
      setErrorFranjaCal(err.message || 'No se pudo eliminar la franja.');
    }
  }

  function abrirHistoria(cita) {
    if (cita.historia_id) verHistoriaClinicaPdf(cita.id);
    else setCitaHistoriaAbierta(cita);
  }

  async function verHistoriaClinicaPdf(idCita) {
    if (visorCargando) return;
    setVisorCargando(true);
    setVisorError(null);
    try {
      const respuesta = await api.get(`/historias/cita/${idCita}`);
      if (!respuesta?.historia) throw new Error('No hay historia clínica para esta cita.');
      const historia     = respuesta.historia;
      const aclaraciones = respuesta.aclaraciones || [];
      const blob    = await pdf(
        <PlantillaHistoriaPDF historia={historia} aclaraciones={aclaraciones} />
      ).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      setVisorNombre(`HC-${historia.id}.pdf`);
      setVisorUrl(blobUrl);
    } catch (err) {
      setVisorError(err.message || 'Error al generar el PDF de la historia clínica.');
    } finally {
      setVisorCargando(false);
    }
  }

  function cerrarVisor() {
    if (visorUrl) { URL.revokeObjectURL(visorUrl); setVisorUrl(null); }
    setVisorError(null);
    setVisorNombre('historia.pdf');
  }

  function alGuardarHistoria(historiaGuardada) {
    if (!historiaGuardada?.id_cita) return;
    setCitasDia(prev =>
      prev.map(c =>
        c.id === historiaGuardada.id_cita
          ? { ...c, historia_id: historiaGuardada.id }
          : c
      )
    );
  }

  function abrirGestion(cita) {
    setModalGestion(cita);
    setFormGestion({
      estado:        cita.estado === 'pendiente' ? 'completada' : cita.estado,
      notas_medicas: cita.notas_medicas || '',
    });
    setErrorGestion(null);
  }

  function cerrarGestion() {
    setModalGestion(null);
    setFormGestion(GESTION_INICIAL);
    setErrorGestion(null);
  }

  async function handleConfirmarGestion() {
    if (!formGestion.estado) return;
    setGuardandoGestion(true);
    setErrorGestion(null);
    try {
      await api.patch(`/medico/citas/${modalGestion.id}/gestionar`, {
        estado:        formGestion.estado,
        notas_medicas: formGestion.notas_medicas.trim() || null,
      });
      setCitasDia(prev =>
        prev.map(c =>
          c.id === modalGestion.id
            ? { ...c, estado: formGestion.estado, notas_medicas: formGestion.notas_medicas }
            : c
        )
      );
      calendarRef.current?.getApi().refetchEvents();
      cerrarGestion();
    } catch (err) {
      setErrorGestion(err.message || 'Error al gestionar la cita.');
    } finally {
      setGuardandoGestion(false);
    }
  }

  function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  function formatHora(horaStr) {
    if (!horaStr) return '';
    return horaStr.substring(0, 5);
  }

  const franjasPrevisualizadas = previsualizarFranjas();

  const dayCellClassNames = useCallback((arg) => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(arg.date.getTime() - tzOffset)).toISOString().split('T')[0];
    return localISOTime === fechaSeleccionada ? ['fc-dia-activo'] : [];
  }, [fechaSeleccionada]);

  return (
    <main className="dashboard-medico">
      <div className="contenedor">

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

          <div className="panel-calendario">
            <h2 className="panel-calendario__titulo">Calendario Semanal</h2>
            <p className="panel-calendario__hint">
              🟢 Disponible · 🟠 Pendiente · 🟢 Completada · ⚪ No asistió — haz clic en un bloque
              <strong> disponible</strong> para editarlo o eliminarlo.
            </p>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              firstDay={1}
              selectable={true}
              selectMirror={true}
              locale={esLocale}
              headerToolbar={{
                left:   'prev,next today',
                center: 'title',
                right:  'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={cargarEventos}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              dayCellClassNames={dayCellClassNames}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:40:00"
              nowIndicator={true}
              height="auto"
              eventColor="var(--melika-accent)"
              buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
              allDaySlot={false}
            />
          </div>

          {vistaActiva === 'agenda' && (
            <div className="panel-agenda">
              <div className="panel-agenda__cabecera">
                <h2 className="panel-agenda__titulo">Agenda del día</h2>
                <span className="panel-agenda__fecha">{formatFecha(fechaSeleccionada)}</span>
              </div>

              {errorDia && <div className="historia-error">{errorDia}</div>}

              {visorError && (
                <div className="historia-error" style={{ marginBottom: '0.75rem' }}>
                  {visorError}
                  <button
                    onClick={() => setVisorError(null)}
                    style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >✕</button>
                </div>
              )}

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
                      <div className="agenda-item__encabezado">
                        <span className="agenda-item__hora">{formatHora(cita.hora_inicio)}</span>
                        <span className={`agenda-item__badge agenda-badge--${cita.estado}`}>
                          {cita.estado === 'pendiente'  && 'Pendiente'}
                          {cita.estado === 'completada' && '✓ Completada'}
                          {cita.estado === 'no_asistio' && 'No asistió'}
                          {cita.estado === 'cancelada'  && 'Cancelada'}
                        </span>
                      </div>
                      <div className="agenda-item__paciente">
                        {cita.paciente_nombre} {cita.paciente_apellido}
                      </div>
                      <div className="agenda-item__tipo">
                        {cita.tipo_consulta === 'teleconsulta' ? '💻 Teleconsulta' : '🏥 Presencial'}
                        {cita.motivo && ` · ${cita.motivo.substring(0, 28)}…`}
                      </div>
                      {cita.notas_medicas && (
                        <div className="agenda-item__notas">📝 {cita.notas_medicas}</div>
                      )}
                      {cita.estado !== 'cancelada' && (
                        <div className="agenda-item__acciones">
                          <button
                            className="agenda-item__btn-historia"
                            onClick={() => abrirHistoria(cita)}
                            disabled={visorCargando}
                          >
                            {visorCargando ? '⏳ Cargando...'
                              : (cita.historia_id ? '📄 Ver historia' : '📝 Historia clínica')}
                          </button>
                          {cita.estado !== 'cancelada' && (
                            <button
                              className="agenda-item__btn-gestionar"
                              onClick={() => abrirGestion(cita)}
                            >
                              Gestionar cita
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

          {vistaActiva === 'disponibilidad' && (
            <div className="panel-agenda">
              <div className="panel-agenda__cabecera">
                <h2 className="panel-agenda__titulo">Disponibilidad</h2>
                <span className="panel-agenda__fecha">{formatFecha(fechaSeleccionada)}</span>
              </div>

              <div className="dispo-subtabs">
                <button
                  type="button"
                  className={`dispo-subtab ${dispoTab === DISPO_TABS.DIARIA ? 'dispo-subtab--activo' : ''}`}
                  onClick={() => setDispoTab(DISPO_TABS.DIARIA)}
                >
                  📅 Día específico
                </button>
                <button
                  type="button"
                  className={`dispo-subtab ${dispoTab === DISPO_TABS.SEMANAL ? 'dispo-subtab--activo' : ''}`}
                  onClick={() => setDispoTab(DISPO_TABS.SEMANAL)}
                >
                  🗓️ Semana completa
                </button>
              </div>

              {dispoTab === DISPO_TABS.DIARIA && (
                <>
                  {errorFranjas && <div className="historia-error">{errorFranjas}</div>}

                  <form onSubmit={handleCrearFranja} className="dispo-formulario">
                    <p className="dispo-instruccion">
                      Las citas se programarán en bloques de {DURACION_FRANJA} min automáticamente.
                    </p>

                    <div className="dispo-formulario__inputs">
                      <ClockPicker
                        label="Hora de inicio"
                        value={nuevaFranja.hora_inicio}
                        onChange={v => setNuevaFranja(p => ({ ...p, hora_inicio: v, hora_fin: '', inicio_descanso: '', fin_descanso: '' }))}
                      />
                      <ClockPicker
                        label="Hora de fin"
                        value={nuevaFranja.hora_fin}
                        onChange={v => setNuevaFranja(p => ({ ...p, hora_fin: v }))}
                        afterTime={nuevaFranja.hora_inicio || undefined}
                        disabled={!nuevaFranja.hora_inicio}
                      />
                    </div>

                    {franjasPrevisualizadas !== null && (
                      <div className="dispo-preview">
                        Se generarán <strong>{franjasPrevisualizadas} citas</strong> de {DURACION_FRANJA} min
                        {nuevaFranja.tiene_descanso && nuevaFranja.inicio_descanso && nuevaFranja.fin_descanso
                          ? ` (con descanso ${nuevaFranja.inicio_descanso}–${nuevaFranja.fin_descanso})`
                          : ''}
                      </div>
                    )}

                    <label className="dispo-toggle-descanso">
                      <input
                        type="checkbox"
                        checked={nuevaFranja.tiene_descanso}
                        onChange={e => setNuevaFranja(p => ({
                          ...p, tiene_descanso: e.target.checked,
                          inicio_descanso: '', fin_descanso: '',
                        }))}
                        disabled={!nuevaFranja.hora_inicio || !nuevaFranja.hora_fin}
                      />
                      Añadir descanso / almuerzo
                    </label>

                    {nuevaFranja.tiene_descanso && (
                      <div className="dispo-formulario__inputs dispo-formulario__inputs--descanso">
                        <ClockPicker
                          label="Inicio descanso"
                          value={nuevaFranja.inicio_descanso}
                          onChange={v => setNuevaFranja(p => ({ ...p, inicio_descanso: v, fin_descanso: '' }))}
                          afterTime={nuevaFranja.hora_inicio || undefined}
                          beforeTime={nuevaFranja.hora_fin   || undefined}
                        />
                        <ClockPicker
                          label="Fin descanso"
                          value={nuevaFranja.fin_descanso}
                          onChange={v => setNuevaFranja(p => ({ ...p, fin_descanso: v }))}
                          afterTime={nuevaFranja.inicio_descanso || undefined}
                          beforeTime={nuevaFranja.hora_fin        || undefined}
                          disabled={!nuevaFranja.inicio_descanso}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-guardar-historia"
                      style={{ width: '100%', marginTop: 'var(--space-2)' }}
                      disabled={guardandoFranja || !nuevaFranja.hora_inicio || !nuevaFranja.hora_fin}
                    >
                      {guardandoFranja ? 'Añadiendo…' : '＋ Añadir disponibilidad'}
                    </button>
                  </form>

                  <hr className="dispo-separador" />
                  <h3 className="dispo-subtitulo">Franjas del día</h3>

                  {loadingFranjas ? (
                    <div className="agenda-loading">
                      <div className="agenda-skeleton" style={{ height: '48px' }} />
                    </div>
                  ) : franjas.length === 0 ? (
                    <div className="agenda-vacio">
                      <span>⏰</span>Sin franjas para este día
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
                </>
              )}

              {dispoTab === DISPO_TABS.SEMANAL && idMedico && (
                <div className="dispo-semanal-wrap">
                  <p className="dispo-instruccion">
                    Configura toda tu semana de un vistazo. Se generan franjas de {DURACION_FRANJA} min automáticamente.
                  </p>
                  <HorariosSemana
                    medicos={null}
                    idMedicoFijo={idMedico}
                    onCrear={crearFranjaSemanasMedico}
                    onExito={onExitoSemanal}
                  />
                </div>
              )}

              {dispoTab === DISPO_TABS.SEMANAL && !idMedico && (
                <div className="agenda-vacio">
                  <span>⏳</span>Cargando perfil…
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {citaHistoriaAbierta && (
        <ModalHistoriaClinica
          cita={citaHistoriaAbierta}
          onCerrar={() => setCitaHistoriaAbierta(null)}
          onGuardada={alGuardarHistoria}
        />
      )}

      {modalGestion && (
        <div className="modal-overlay" onClick={cerrarGestion}>
          <div className="modal-gestion" onClick={e => e.stopPropagation()}>
            <div className="modal-gestion__cabecera">
              <div>
                <h3 className="modal-gestion__titulo">
                  {modalGestion.estado === 'pendiente'
                    ? 'Registrar resultado de cita'
                    : 'Corregir estado de cita'}
                </h3>
                <p className="modal-gestion__meta">
                  Paciente: {modalGestion.paciente_nombre} {modalGestion.paciente_apellido}
                </p>
                <p className="modal-gestion__meta">
                  {formatFecha(fechaSeleccionada)} · {formatHora(modalGestion.hora_inicio)}
                </p>
              </div>
              <button className="btn-cerrar" onClick={cerrarGestion}>✕</button>
            </div>

            {errorGestion && <div className="historia-error">{errorGestion}</div>}

            <div className="modal-gestion__opciones">
              <p className="modal-gestion__label">
                {modalGestion.estado === 'pendiente'
                  ? '¿Cuál fue el resultado de esta consulta?'
                  : 'Corregir el registro — estado actual: '}
                {modalGestion.estado !== 'pendiente' && (
                  <span
                    className={`agenda-badge--${modalGestion.estado}`}
                    style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    {modalGestion.estado === 'completada' ? '✓ Completada' : 'No asistió'}
                  </span>
                )}
              </p>

              <div className="modal-gestion__radio-grupo">
                <label className={`radio-opcion ${formGestion.estado === 'completada' ? 'radio-opcion--activa' : ''}`}>
                  <input
                    type="radio"
                    name="estado_gestion"
                    value="completada"
                    checked={formGestion.estado === 'completada'}
                    onChange={() => setFormGestion(p => ({ ...p, estado: 'completada' }))}
                  />
                  <span className="radio-opcion__icono">✅</span>
                  <div>
                    <strong>Consulta realizada</strong>
                    <small>El paciente asistió y fue atendido</small>
                  </div>
                </label>

                <label className={`radio-opcion ${formGestion.estado === 'no_asistio' ? 'radio-opcion--activa' : ''}`}>
                  <input
                    type="radio"
                    name="estado_gestion"
                    value="no_asistio"
                    checked={formGestion.estado === 'no_asistio'}
                    onChange={() => setFormGestion(p => ({ ...p, estado: 'no_asistio' }))}
                  />
                  <span className="radio-opcion__icono">🚫</span>
                  <div>
                    <strong>Paciente no asistió</strong>
                    <small>El paciente no se presentó a la cita</small>
                  </div>
                </label>
              </div>
            </div>

            <div className="modal-gestion__notas">
              <label className="modal-gestion__label">Notas de cierre (opcional)</label>
              <textarea
                className="modal-gestion__textarea"
                rows={3}
                placeholder="Observaciones de cierre de la cita…"
                value={formGestion.notas_medicas}
                onChange={e => setFormGestion(p => ({ ...p, notas_medicas: e.target.value }))}
              />
            </div>

            <div className="modal-gestion__acciones">
              <button
                className="btn-editar-historia"
                onClick={cerrarGestion}
                disabled={guardandoGestion}
              >
                Volver
              </button>
              <button
                className={`btn-gestion-confirmar ${formGestion.estado === 'no_asistio' ? 'btn-gestion-confirmar--ausente' : ''}`}
                onClick={handleConfirmarGestion}
                disabled={guardandoGestion}
              >
                {guardandoGestion
                  ? 'Guardando…'
                  : formGestion.estado === 'completada'
                    ? 'Confirmar consulta'
                    : 'Registrar ausencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gestión rápida de franja desde el calendario ──────────────────── */}
      {franjaCalSel && (
        <div className="modal-overlay" onClick={cerrarFranjaCalendario}>
          <div className="modal-gestion" onClick={e => e.stopPropagation()}>
            <div className="modal-gestion__cabecera">
              <div>
                <h3 className="modal-gestion__titulo">Gestionar disponibilidad</h3>
                <p className="modal-gestion__meta">{formatFecha(franjaCalSel.fecha)}</p>
              </div>
              <button className="btn-cerrar" onClick={cerrarFranjaCalendario}>✕</button>
            </div>

            {errorFranjaCal && <div className="historia-error">{errorFranjaCal}</div>}

            <p className="modal-gestion__label">
              Esta franja aún no tiene paciente asignado. Puedes editar su horario o eliminarla.
            </p>

            <div className="dispo-formulario__inputs">
              <ClockPicker
                label="Hora de inicio"
                value={formFranjaCal.hora_inicio}
                onChange={v => setFormFranjaCal(p => ({ ...p, hora_inicio: v, hora_fin: '' }))}
              />
              <ClockPicker
                label="Hora de fin"
                value={formFranjaCal.hora_fin}
                onChange={v => setFormFranjaCal(p => ({ ...p, hora_fin: v }))}
                afterTime={formFranjaCal.hora_inicio || undefined}
                disabled={!formFranjaCal.hora_inicio}
              />
            </div>

            <div className="modal-gestion__acciones">
              <button
                className="btn-gestion-confirmar btn-gestion-confirmar--ausente"
                onClick={handleEliminarFranjaCalendario}
                disabled={guardandoFranjaCal}
              >
                🗑️ Eliminar
              </button>
              <button
                className="btn-gestion-confirmar"
                onClick={handleGuardarFranjaCalendario}
                disabled={guardandoFranjaCal}
              >
                {guardandoFranjaCal ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {visorUrl && (
        <VisorPDFModal
          url={visorUrl}
          onCerrar={cerrarVisor}
          nombreArchivo={visorNombre}
        />
      )}
    </main>
  );
}