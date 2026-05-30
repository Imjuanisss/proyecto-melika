import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate }                               from 'react-router-dom';
import FullCalendar                                  from '@fullcalendar/react';
import dayGridPlugin                                 from '@fullcalendar/daygrid';
import timeGridPlugin                                from '@fullcalendar/timegrid';
import interactionPlugin                             from '@fullcalendar/interaction';
import esLocale                                      from '@fullcalendar/core/locales/es';
import { api }                                       from '../../lib/apiClient';
import './Agendarcita.css';

const PASOS = ['Especialidad y médico', 'Fecha y hora', 'Confirmación'];
const HOY   = new Date().toISOString().split('T')[0];

export default function Agendarcita() {
  const navigate    = useNavigate();
  const calendarRef = useRef(null);

  // ── Stepper ───────────────────────────────────────────────────────────
  const [paso,  setPaso]  = useState(0);
  const [exito, setExito] = useState(false);

  // ── Selecciones ───────────────────────────────────────────────────────
  const [especialidad, setEspecialidad] = useState(null);
  const [medico,       setMedico]       = useState(null);
  const [fecha,        setFecha]        = useState('');
  const [franja,       setFranja]       = useState(null);
  const [tipoConsulta, setTipoConsulta] = useState('presencial');
  const [motivo,       setMotivo]       = useState('');

  // ── Datos del servidor ────────────────────────────────────────────────
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos,        setMedicos]        = useState([]);

  // ── Carga / error ─────────────────────────────────────────────────────
  const [loadingEsp,   setLoadingEsp]   = useState(true);
  const [loadingMed,   setLoadingMed]   = useState(false);
  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [errorEsp,     setErrorEsp]     = useState(null);
  const [errorMed,     setErrorMed]     = useState(null);
  const [errorEnvio,   setErrorEnvio]   = useState(null);

  // Estado para saber si el día seleccionado tiene franjas
  const [sinFranjas, setSinFranjas]     = useState(false);

  // ── Cargar especialidades ─────────────────────────────────────────────
  useEffect(() => {
    api
      .get('/especialidades')
      .then((data) => setEspecialidades(data))
      .catch(() => setErrorEsp('No se pudieron cargar las especialidades.'))
      .finally(() => setLoadingEsp(false));
  }, []);

  // ── Cargar médicos al elegir especialidad ─────────────────────────────
  useEffect(() => {
    if (!especialidad) return;
    setLoadingMed(true);
    setErrorMed(null);
    setMedicos([]);
    setMedico(null);

    api
      .get(`/especialidades/${especialidad.id}/medicos`)
      .then((data) => setMedicos(data))
      .catch(() => setErrorMed('No se pudieron cargar los médicos.'))
      .finally(() => setLoadingMed(false));
  }, [especialidad]);

  // ── Resetear selecciones cuando cambia el médico ──────────────────────
  useEffect(() => {
    setFecha('');
    setFranja(null);
    setSinFranjas(false);
  }, [medico]);

  // ── Verificar si el día seleccionado tiene franjas (para el aviso) ────
  useEffect(() => {
    if (!medico || !fecha) {
      setSinFranjas(false);
      return;
    }
    api
      .get(`/especialidades/disponibilidad?medico_id=${medico.id}&fecha=${fecha}`)
      .then((data) => setSinFranjas(data.length === 0))
      .catch(() => setSinFranjas(false));
  }, [medico, fecha]);

  // ── Refrescar calendario al cambiar de médico o entrar al paso 1 ──────
  useEffect(() => {
    if (paso === 1 && medico) {
      // Pequeño delay para asegurar que el calendario está montado
      const t = setTimeout(() => {
        calendarRef.current?.getApi().refetchEvents();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [medico, paso]);

  // ── SOLUCIÓN al bug de eventClassNames/eventDidMount:
  //    Refrescar eventos al cambiar la franja seleccionada
  //    para que FullCalendar vuelva a evaluar las clases CSS ───────────────
  useEffect(() => {
    if (paso === 1) {
      calendarRef.current?.getApi().refetchEvents();
    }
  }, [franja, paso]);

  // ── Función de eventos FullCalendar — UNA sola query al backend ───────
  //    Usa el nuevo endpoint /disponibilidad-rango
  //    Dependencia: solo medico.id (no el objeto medico completo)
  const medicoid = medico?.id;

  const cargarEventosDisponibilidad = useCallback(
    (fetchInfo, successCallback, failureCallback) => {
      if (!medicoid) {
        successCallback([]);
        return;
      }

      const inicio = fetchInfo.startStr.split('T')[0];
      const fin    = fetchInfo.endStr.split('T')[0];

      api
        .get(
          `/especialidades/disponibilidad-rango?medico_id=${medicoid}&inicio=${inicio}&fin=${fin}`
        )
        .then((eventos) => successCallback(eventos))
        .catch(() => failureCallback());
    },
    [medicoid]  // solo se recrea cuando cambia el ID del médico
  );

  // ── Click en franja del calendario ────────────────────────────────────
  function handleEventClickAgendar(info) {
    const props = info.event.extendedProps;

    // Si hacen clic en la franja ya seleccionada, deseleccionar
    if (franja && franja.id === props.id_franja) {
      setFranja(null);
      return;
    }

    setFecha(props.fecha);
    setFranja({
      id:          props.id_franja,
      hora_inicio: props.hora_inicio,
      hora_fin:    props.hora_fin,
    });
  }

  // ── Click en día (establece fecha y resetea franja) ───────────────────
  function handleDateClickAgendar(info) {
    if (info.dateStr < HOY) return;  // no permitir fechas pasadas
    if (info.dateStr === fecha) return; // mismo día: no hacer nada
    setFecha(info.dateStr);
    setFranja(null);
  }

  // ── Colorear evento seleccionado correctamente via eventClassNames ─────
  //    Esta es la forma correcta de actualizar estilos en FullCalendar
  //    (eventDidMount solo corre al montar, no al actualizar estado React)
  function getEventClassNames(arg) {
    const esFranjaSeleccionada =
      franja &&
      String(arg.event.extendedProps.id_franja) === String(franja.id);
    return esFranjaSeleccionada ? ['fc-event--seleccionado'] : [];
  }

  // ── Marcar el día seleccionado ────────────────────────────────────────
  function getDayCellClassNames(arg) {
    const cellDate = arg.date.toISOString().split('T')[0];
    return cellDate === fecha ? ['fc-day--fecha-activa'] : [];
  }

  // ── Validar avance ────────────────────────────────────────────────────
  function puedeSiguiente() {
    if (paso === 0) return especialidad !== null && medico !== null;
    if (paso === 1) return fecha !== '' && franja !== null;
    return true;
  }

  // ── Confirmar cita ────────────────────────────────────────────────────
  async function confirmarCita() {
    setLoadingEnvio(true);
    setErrorEnvio(null);

    try {
      await api.post('/citas', {
        id_medico:       medico.id,
        id_especialidad: especialidad.id,
        id_franja:       franja.id,
        fecha,
        hora_inicio:     franja.hora_inicio,
        tipo_consulta:   tipoConsulta,
        motivo:          motivo || null,
      });
      setExito(true);
    } catch (err) {
      setErrorEnvio(err.message || 'Error al procesar la reserva. Intenta nuevamente.');
    } finally {
      setLoadingEnvio(false);
    }
  }

  // ── Reiniciar flujo completo ──────────────────────────────────────────
  function reiniciar() {
    setPaso(0);
    setExito(false);
    setEspecialidad(null);
    setMedico(null);
    setFecha('');
    setFranja(null);
    setTipoConsulta('presencial');
    setMotivo('');
    setSinFranjas(false);
  }

  // ── Helpers formato ───────────────────────────────────────────────────
  function formatHora(horaStr) {
    if (!horaStr) return '';
    return horaStr.substring(0, 5);
  }

  function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  // ── Pantalla de éxito ─────────────────────────────────────────────────
  if (exito) {
    return (
      <div className="agendar-pagina">
        <div className="agendar-exito">
          <span className="agendar-exito__icono">✅</span>
          <h2>¡Cita agendada con éxito!</h2>
          <div className="agendar-exito__resumen">
            <div className="resumen-fila">
              <span>Especialidad</span>
              <strong>{especialidad?.nombre}</strong>
            </div>
            <div className="resumen-fila">
              <span>Médico</span>
              <strong>Dr(a). {medico?.nombre} {medico?.primer_apellido}</strong>
            </div>
            <div className="resumen-fila">
              <span>Fecha</span>
              <strong>{formatFecha(fecha)}</strong>
            </div>
            <div className="resumen-fila">
              <span>Hora</span>
              <strong>{formatHora(franja?.hora_inicio)}</strong>
            </div>
            <div className="resumen-fila">
              <span>Tipo</span>
              <strong style={{ textTransform: 'capitalize' }}>{tipoConsulta}</strong>
            </div>
          </div>
          <div className="agendar-exito__acciones">
            <button className="btn-primario" onClick={() => navigate('/mis-citas')}>
              Ver mis citas
            </button>
            <button className="btn-secundario" onClick={reiniciar}>
              Agendar otra cita
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Vista principal ───────────────────────────────────────────────────
  return (
    <div className="agendar-pagina">
      <div className="contenedor">
        <h1 className="agendar-titulo">Agendar cita médica</h1>

        {/* Stepper */}
        <div className="stepper">
          {PASOS.map((p, i) => (
            <div
              key={i}
              className={`stepper__paso ${i === paso ? 'activo' : ''} ${i < paso ? 'completo' : ''}`}
            >
              <div className="stepper__num">{i < paso ? '✓' : i + 1}</div>
              <span className="stepper__label">{p}</span>
            </div>
          ))}
        </div>

        <div className="agendar-card">

          {/* ── PASO 0: Especialidad y médico ──────────────────────── */}
          {paso === 0 && (
            <div>
              <h2 className="agendar-card__titulo">Elige la especialidad</h2>

              {errorEsp && <div className="agendar-error">{errorEsp}</div>}

              <div className="opciones-grid">
                {loadingEsp
                  ? Array(6).fill(0).map((_, i) => (
                      <div key={i} className="opcion-skeleton" />
                    ))
                  : especialidades.map((e) => (
                      <button
                        key={e.id}
                        className={`opcion-card ${especialidad?.id === e.id ? 'opcion-card--activo' : ''}`}
                        onClick={() => setEspecialidad(e)}
                      >
                        <strong>{e.nombre}</strong>
                        {e.precio_base && (
                          <span>
                            Desde ${Number(e.precio_base).toLocaleString('es-CO')} COP
                          </span>
                        )}
                      </button>
                    ))}
              </div>

              {especialidad && (
                <div style={{ marginTop: 'var(--space-8)' }}>
                  <h2 className="agendar-card__titulo">
                    Elige el médico de {especialidad.nombre}
                  </h2>

                  {errorMed && <div className="agendar-error">{errorMed}</div>}

                  <div className="medicos-lista">
                    {loadingMed
                      ? Array(3).fill(0).map((_, i) => (
                          <div key={i} className="medico-skeleton" />
                        ))
                      : medicos.length === 0
                      ? (
                          <p className="agendar-vacio">
                            No hay médicos disponibles para esta especialidad.
                          </p>
                        )
                      : medicos.map((m) => (
                          <button
                            key={m.id}
                            className={`medico-card ${medico?.id === m.id ? 'medico-card--activo' : ''}`}
                            onClick={() => setMedico(m)}
                          >
                            <div className="medico-card__info">
                              <strong>
                                Dr(a). {m.nombre} {m.primer_apellido}
                              </strong>
                              <span>
                                ⭐ {m.calificacion} · $
                                {Number(m.tarifa).toLocaleString('es-CO')} COP
                              </span>
                              {m.acepta_teleconsulta && (
                                <span className="medico-card__badge">
                                  Teleconsulta disponible
                                </span>
                              )}
                            </div>
                            {medico?.id === m.id && (
                              <span className="medico-card__check">✓</span>
                            )}
                          </button>
                        ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PASO 1: Fecha y hora con FullCalendar ──────────────── */}
          {paso === 1 && (
            <div>
              <h2 className="agendar-card__titulo">
                Selecciona fecha y horario
              </h2>

              <p style={{
                fontSize: '14px',
                color:    'var(--melika-text-muted)',
                marginBottom: 'var(--space-4)',
              }}>
                Médico seleccionado:{' '}
                <strong style={{ color: 'var(--melika-text-primary)' }}>
                  Dr(a). {medico?.nombre} {medico?.primer_apellido}
                </strong>
                {' '}— Haz clic en un horario <span style={{ color: '#1A7A52', fontWeight: 700 }}>verde</span> para seleccionarlo.
              </p>

              {/* Leyenda */}
              <div className="agendar-fc-leyenda">
                <div className="agendar-fc-leyenda__item">
                  <div className="agendar-fc-leyenda__dot" style={{ background: '#1A7A52' }} />
                  Horario disponible
                </div>
                <div className="agendar-fc-leyenda__item">
                  <div className="agendar-fc-leyenda__dot" style={{ background: '#2351C4' }} />
                  Horario seleccionado
                </div>
                <div className="agendar-fc-leyenda__item">
                  <div
                    className="agendar-fc-leyenda__dot"
                    style={{ background: 'var(--melika-accent-light)', border: '1.5px solid var(--melika-accent)' }}
                  />
                  Día seleccionado
                </div>
              </div>

              {/* Calendario de disponibilidad */}
              <div className="agendar-fc-wrap">
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
                  validRange={{ start: HOY }}
                  events={cargarEventosDisponibilidad}
                  eventClick={handleEventClickAgendar}
                  dateClick={handleDateClickAgendar}
                  height="auto"
                  buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
                  nowIndicator
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                  allDaySlot={false}
                  // CORRECCIÓN PRINCIPAL: usar eventClassNames (reactivo al estado)
                  // en lugar de eventDidMount (que solo corre al montar)
                  eventClassNames={getEventClassNames}
                  dayCellClassNames={getDayCellClassNames}
                />
              </div>

              {/* Badge de franja seleccionada */}
              {franja && (
                <div className="franja-seleccionada-badge">
                  <span>
                    ✓ {formatFecha(fecha)} · {formatHora(franja.hora_inicio)} — {formatHora(franja.hora_fin)}
                  </span>
                  <button
                    className="franja-seleccionada-badge__btn-clear"
                    onClick={() => setFranja(null)}
                    title="Deseleccionar franja"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Aviso sin franjas en el día seleccionado */}
              {fecha && sinFranjas && !franja && (
                <div className="agendar-sin-franjas">
                  ⚠️ No hay horarios disponibles para el{' '}
                  <strong>{formatFecha(fecha)}</strong>. Elige otro día del calendario.
                </div>
              )}
            </div>
          )}

          {/* ── PASO 2: Confirmación ────────────────────────────────── */}
          {paso === 2 && (
            <div>
              <h2 className="agendar-card__titulo">Resumen y confirmación</h2>

              <div className="resumen-card">
                <div className="resumen-fila">
                  <span>Especialidad</span>
                  <strong>{especialidad?.nombre}</strong>
                </div>
                <div className="resumen-fila">
                  <span>Médico</span>
                  <strong>Dr(a). {medico?.nombre} {medico?.primer_apellido}</strong>
                </div>
                <div className="resumen-fila">
                  <span>Fecha</span>
                  <strong>{formatFecha(fecha)}</strong>
                </div>
                <div className="resumen-fila">
                  <span>Hora</span>
                  <strong>
                    {formatHora(franja?.hora_inicio)} — {formatHora(franja?.hora_fin)}
                  </strong>
                </div>
                <div className="resumen-fila">
                  <span>Valor</span>
                  <strong>
                    ${Number(medico?.tarifa || 0).toLocaleString('es-CO')} COP
                  </strong>
                </div>
              </div>

              {/* Tipo de consulta */}
              <div style={{ marginTop: 'var(--space-6)' }}>
                <label className="agendar-label">Tipo de consulta</label>
                <div className="tipo-consulta">
                  <button
                    className={`tipo-btn ${tipoConsulta === 'presencial' ? 'tipo-btn--activo' : ''}`}
                    onClick={() => setTipoConsulta('presencial')}
                  >
                    🏥 Presencial
                  </button>
                  {medico?.acepta_teleconsulta && (
                    <button
                      className={`tipo-btn ${tipoConsulta === 'teleconsulta' ? 'tipo-btn--activo' : ''}`}
                      onClick={() => setTipoConsulta('teleconsulta')}
                    >
                      💻 Teleconsulta
                    </button>
                  )}
                </div>
              </div>

              {/* Motivo */}
              <div style={{ marginTop: 'var(--space-5)' }}>
                <label className="agendar-label">
                  Motivo de consulta{' '}
                  <span style={{ color: 'var(--melika-text-muted)', fontWeight: 400 }}>
                    (opcional)
                  </span>
                </label>
                <textarea
                  className="agendar-textarea"
                  rows={3}
                  maxLength={300}
                  placeholder="Describe brevemente el motivo de tu consulta…"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
                <span style={{ fontSize: '12px', color: 'var(--melika-text-muted)' }}>
                  {motivo.length}/300
                </span>
              </div>

              {errorEnvio && (
                <div className="agendar-error" style={{ marginTop: 'var(--space-4)' }}>
                  {errorEnvio}
                </div>
              )}
            </div>
          )}

          {/* Navegación entre pasos */}
          <div className="agendar-nav">
            {paso > 0 && (
              <button
                className="btn-secundario"
                onClick={() => setPaso((p) => p - 1)}
              >
                ← Volver
              </button>
            )}

            {paso < 2 ? (
              <button
                className="btn-primario"
                disabled={!puedeSiguiente()}
                onClick={() => setPaso((p) => p + 1)}
              >
                Siguiente →
              </button>
            ) : (
              <button
                className="btn-primario"
                disabled={loadingEnvio}
                onClick={confirmarCita}
              >
                {loadingEnvio ? 'Agendando…' : 'Confirmar cita'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}