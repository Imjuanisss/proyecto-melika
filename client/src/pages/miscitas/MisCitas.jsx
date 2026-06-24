import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate }                               from 'react-router-dom';
import FullCalendar                                  from '@fullcalendar/react';
import dayGridPlugin                                 from '@fullcalendar/daygrid';
import timeGridPlugin                                from '@fullcalendar/timegrid';
import interactionPlugin                             from '@fullcalendar/interaction';
import esLocale                                      from '@fullcalendar/core/locales/es';
import { api }                                       from '../../lib/apiClient';
import './MisCitas.css';

const LEYENDA = [
  { estado: 'pendiente',  color: '#B45309', label: 'Pendiente'  },
  { estado: 'confirmada', color: '#2351C4', label: 'Confirmada' },
  { estado: 'completada', color: '#1A7A52', label: 'Completada' },
];

// ── Bloque reutilizable para cada campo de la historia clínica ───────────
// Si el campo viene vacío (null / '' / undefined) no se renderiza nada,
// así el modal no muestra secciones en blanco.
function SeccionHistoria({ titulo, texto }) {
  if (!texto) return null;
  return (
    <div className="historia-seccion">
      <h4 className="historia-seccion__titulo">{titulo}</h4>
      <p className="historia-seccion__texto">{texto}</p>
    </div>
  );
}

export default function MisCitas() {
  const navigate    = useNavigate();
  const calendarRef = useRef(null);

  const [vista, setVista]                       = useState('calendario');
  const [citas, setCitas]                       = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [modal, setModal]                       = useState(null);
  const [procesando, setProcesando]             = useState(false);

  // ── Modal de historia clínica: { cargando, error, datos } ──────────────
  const [historiaModal, setHistoriaModal] = useState(null);

  // ── Motivo de cancelación, escrito por el paciente en el modal ─────────
  const [razonCancelacion, setRazonCancelacion] = useState('');

  // ── Cargar lista de citas ─────────────────────────────────────────────
  useEffect(() => {
    api
      .get('/citas/mis-citas')
      .then((data) => setCitas(data))
      .catch(() => setError('No se pudieron cargar tus citas.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Eventos para FullCalendar ─────────────────────────────────────────
  const cargarEventos = useCallback(
    (fetchInfo, successCallback, failureCallback) => {
      const inicio = fetchInfo.startStr.split('T')[0];
      const fin    = fetchInfo.endStr.split('T')[0];

      api
        .get(`/citas/calendario?inicio=${inicio}&fin=${fin}`)
        .then((eventos) => successCallback(eventos))
        .catch(() => failureCallback());
    },
    []
  );

  // ── Click en evento del calendario ────────────────────────────────────
  function handleEventClick(info) {
    const props = info.event.extendedProps;
    setCitaSeleccionada({
      id:            info.event.id,     // string — se usará como string en las llamadas API
      title:         info.event.title,
      start:         info.event.start,  // Date object de FullCalendar
      estado:        props.estado,
      tipo_consulta: props.tipo_consulta,
      medico_nombre: props.medico_nombre,
      especialidad:  props.especialidad,
      motivo:        props.motivo,
      tarifa:        props.tarifa,
    });
  }

  // ── Cancelar cita (bug corregido: comparación numérica en setCitas) ───
  async function cancelar(id) {
    setProcesando(true);
    const idNum = Number(id); // normalizar a number para comparar con c.id

    try {
      await api.patch(`/citas/${modal.id}/cancelar`, { 
  razon_cancelacion: razonCancelacion  // <-- Se envía en el body al controlador
});

      // Actualizar lista local — c.id es number en PostgreSQL
      setCitas((prev) =>
        prev.map((c) =>
          c.id === idNum ? { ...c, estado: 'cancelada' } : c
        )
      );

      // Refrescar calendario
      calendarRef.current?.getApi().refetchEvents();

      // Cerrar panel detalle
      setCitaSeleccionada(null);
    } catch (err) {
      alert(err.message || 'Error al cancelar la cita.');
    } finally {
      setProcesando(false);
      setModal(null);
      setRazonCancelacion('');
    }
  }

  // ── Eliminar cita (bug corregido: comparación numérica en setCitas) ───
  async function eliminar(id) {
    setProcesando(true);
    const idNum = Number(id);

    try {
      await api.delete(`/citas/${id}`);

      // Filtrar por number
      setCitas((prev) => prev.filter((c) => c.id !== idNum));

      // Refrescar calendario
      calendarRef.current?.getApi().refetchEvents();

      // Cerrar panel detalle
      setCitaSeleccionada(null);
    } catch (err) {
      alert(err.message || 'Error al eliminar la cita.');
    } finally {
      setProcesando(false);
      setModal(null);
    }
  }

  function confirmarModal() {
    if (modal.tipo === 'cancelar') cancelar(modal.id);
    if (modal.tipo === 'eliminar') eliminar(modal.id);
  }

  // ── Ver historia clínica de una cita completada ────────────────────────
  // GET /historias/cita/:id_cita devuelve { historia: null } si el médico
  // aún no la ha registrado, y { historia: {...} } cuando ya existe.
  async function verHistoriaClinica(idCita) {
    setHistoriaModal({ cargando: true, error: null, datos: null });

    try {
      const data = await api.get(`/historias/cita/${idCita}`);

      if (!data.historia) {
        setHistoriaModal({
          cargando: false,
          error:    'El médico aún no ha registrado la historia clínica de esta consulta.',
          datos:    null,
        });
      } else {
        setHistoriaModal({ cargando: false, error: null, datos: data.historia });
      }
    } catch (err) {
      setHistoriaModal({
        cargando: false,
        error:    err.message || 'No se pudo cargar la historia clínica.',
        datos:    null,
      });
    }
  }

  function cerrarHistoriaModal() {
    setHistoriaModal(null);
  }

  // ── Helpers formato ───────────────────────────────────────────────────
  function formatFechaStr(fechaStr) {
    if (!fechaStr) return '';
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function formatFechaDate(dateObj) {
    if (!dateObj) return '';
    return dateObj.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function formatHoraStr(horaStr) {
    if (!horaStr) return '';
    return horaStr.substring(0, 5);
  }

  function formatHoraDate(dateObj) {
    if (!dateObj) return '';
    return dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main className="miscitas-pagina">
      <div className="contenedor">

        {/* Cabecera */}
        <div className="miscitas-cabecera">
          <h1 className="miscitas-titulo">Mis citas</h1>
          <div className="miscitas-toggle">
            <button
              className={`miscitas-toggle__btn ${vista === 'calendario' ? 'miscitas-toggle__btn--activo' : ''}`}
              onClick={() => setVista('calendario')}
            >
              📅 Calendario
            </button>
            <button
              className={`miscitas-toggle__btn ${vista === 'lista' ? 'miscitas-toggle__btn--activo' : ''}`}
              onClick={() => setVista('lista')}
            >
              📋 Lista
            </button>
          </div>
        </div>

        {/* ── VISTA CALENDARIO ────────────────────────────────────── */}
        {vista === 'calendario' && (
          <>
            <div className="miscitas-leyenda">
              {LEYENDA.map((l) => (
                <div key={l.estado} className="leyenda-item">
                  <div className="leyenda-dot" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>

            <div className="miscitas-grid">

              {/* Calendario */}
              <div className="miscitas-calendar-wrap">
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
                  eventClick={handleEventClick}
                  height="auto"
                  buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
                  nowIndicator
                  eventDisplay="block"
                />
              </div>

              {/* Panel detalle */}
              <div className="miscitas-detalle-panel">
                <p className="miscitas-detalle-panel__titulo">🗓️ Detalle de cita</p>

                {!citaSeleccionada ? (
                  <div className="miscitas-detalle-vacio">
                    <span>👆</span>
                    Haz clic en una cita del calendario para ver sus detalles y opciones de gestión.
                  </div>
                ) : (
                  <div className="detalle-cita">
                    <div className="detalle-cita__header">
                      <p className="detalle-cita__especialidad">
                        {citaSeleccionada.especialidad}
                      </p>
                      <span className={`badge-${citaSeleccionada.estado}`}>
                        {citaSeleccionada.estado}
                      </span>
                    </div>

                    <div className="detalle-fila">
                      <span className="detalle-fila__etiqueta">Médico</span>
                      <span className="detalle-fila__valor">
                        Dr(a). {citaSeleccionada.medico_nombre}
                      </span>
                    </div>

                    <div className="detalle-fila">
                      <span className="detalle-fila__etiqueta">Fecha</span>
                      <span className="detalle-fila__valor">
                        {formatFechaDate(citaSeleccionada.start)}
                      </span>
                    </div>

                    <div className="detalle-fila">
                      <span className="detalle-fila__etiqueta">Hora</span>
                      <span className="detalle-fila__valor">
                        {formatHoraDate(citaSeleccionada.start)}
                      </span>
                    </div>

                    <div className="detalle-fila">
                      <span className="detalle-fila__etiqueta">Tipo</span>
                      <span className="detalle-fila__valor">
                        {citaSeleccionada.tipo_consulta === 'teleconsulta'
                          ? '💻 Teleconsulta'
                          : '🏥 Presencial'}
                      </span>
                    </div>

                    {citaSeleccionada.tarifa && (
                      <div className="detalle-fila">
                        <span className="detalle-fila__etiqueta">Valor</span>
                        <span className="detalle-fila__valor">
                          ${Number(citaSeleccionada.tarifa).toLocaleString('es-CO')} COP
                        </span>
                      </div>
                    )}

                    {citaSeleccionada.motivo && (
                      <div className="detalle-fila">
                        <span className="detalle-fila__etiqueta">Motivo</span>
                        <span className="detalle-fila__valor">
                          {citaSeleccionada.motivo}
                        </span>
                      </div>
                    )}

                    <div className="detalle-cita__acciones">
                      {citaSeleccionada.estado === 'pendiente' && (
                        <button
                          className="btn-cancelar-detalle"
                          disabled={procesando}
                          onClick={() =>
                            setModal({ tipo: 'cancelar', id: citaSeleccionada.id })
                          }
                        >
                          Cancelar esta cita
                        </button>
                      )}
                      {citaSeleccionada.estado === 'cancelada' && (
                        <button
                          className="btn-eliminar-detalle"
                          disabled={procesando}
                          onClick={() =>
                            setModal({ tipo: 'eliminar', id: citaSeleccionada.id })
                          }
                        >
                          Eliminar registro
                        </button>
                      )}
                      {citaSeleccionada.estado === 'completada' && (
                        <button
                          className="btn-historia btn-historia--bloque"
                          onClick={() => verHistoriaClinica(citaSeleccionada.id)}
                        >
                          📄 Ver historia clínica
                        </button>
                      )}
                      <button
                        className="btn-agendar-nueva"
                        onClick={() => navigate('/agendar')}
                      >
                        + Agendar nueva cita
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── VISTA LISTA ─────────────────────────────────────────── */}
        {vista === 'lista' && (
          <>
            {error && <div className="miscitas-error">{error}</div>}

            {loading && (
              <div className="miscitas-lista">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="cita-skeleton" />
                ))}
              </div>
            )}

            {!loading && citas.length === 0 && !error && (
              <div className="miscitas-vacio">
                <p>Aún no tienes citas agendadas.</p>
                <button
                  className="btn-agendar-nueva"
                  style={{ display: 'inline-block', width: 'auto', padding: 'var(--space-3) var(--space-8)' }}
                  onClick={() => navigate('/agendar')}
                >
                  Agendar mi primera cita
                </button>
              </div>
            )}

            {!loading && citas.length > 0 && (
              <div className="miscitas-lista">
                {citas.map((c) => (
                  <div key={c.id} className="cita-card">
                    <div className="cita-card__cuerpo">
                      <div className="cita-card__encabezado">
                        <h3 className="cita-card__especialidad">{c.especialidad}</h3>
                        <span className={`badge-${c.estado}`}>{c.estado}</span>
                      </div>
                      <p className="cita-card__medico">
                        Dr(a). {c.medico_nombre} {c.medico_apellido}
                      </p>
                      <p className="cita-card__fecha">
                        📅 {formatFechaStr(c.fecha)} · 🕐 {formatHoraStr(c.hora_inicio)}
                      </p>
                      <p className="cita-card__tipo">
                        {c.tipo_consulta === 'teleconsulta' ? '💻 Teleconsulta' : '🏥 Presencial'}
                        {c.tarifa_cobrada && (
                          <span className="cita-card__tarifa">
                            {' '}· ${Number(c.tarifa_cobrada).toLocaleString('es-CO')} COP
                          </span>
                        )}
                      </p>
                      {c.motivo && (
                        <p className="cita-card__motivo">"{c.motivo}"</p>
                      )}
                      {c.razon_cancelacion && (
                        <p className="cita-card__razon">
                          Cancelación: {c.razon_cancelacion}
                        </p>
                      )}
                    </div>
                    <div className="cita-card__acciones">
                      {c.estado === 'pendiente' && (
                        <button
                          className="btn-cancelar-lista"
                          onClick={() => setModal({ tipo: 'cancelar', id: c.id })}
                        >
                          Cancelar
                        </button>
                      )}
                      {c.estado === 'cancelada' && (
                        <button
                          className="btn-eliminar-lista"
                          onClick={() => setModal({ tipo: 'eliminar', id: c.id })}
                        >
                          Eliminar
                        </button>
                      )}
                      {c.estado === 'completada' && (
                        <button
                          className="btn-historia"
                          onClick={() => verHistoriaClinica(c.id)}
                        >
                          📄 Ver historia clínica
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal confirmación (cancelar / eliminar) */}
      {modal && (
        <div
          className="modal-overlay"
          onClick={() => { setModal(null); setRazonCancelacion(''); }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modal.tipo === 'cancelar' ? '¿Cancelar esta cita?' : '¿Eliminar esta cita?'}
            </h3>
            <p>
              {modal.tipo === 'cancelar'
                ? 'La cita pasará a estado cancelado y la franja horaria quedará disponible para otros pacientes.'
                : 'La cita se eliminará permanentemente. Esta acción no se puede deshacer.'}
            </p>

            {modal.tipo === 'cancelar' && (
              <textarea
                className="modal-textarea"
                placeholder="Cuéntanos brevemente por qué cancelas (opcional)"
                value={razonCancelacion}
                onChange={(e) => setRazonCancelacion(e.target.value)}
                rows={3}
                maxLength={300}
              />
            )}

            <div className="modal-acciones">
              <button
                className="btn-secundario"
                onClick={() => { setModal(null); setRazonCancelacion(''); }}
                disabled={procesando}
              >
                Volver
              </button>
              <button
                className={
                  modal.tipo === 'cancelar' ? 'btn-cancelar-lista' : 'btn-eliminar-lista'
                }
                onClick={confirmarModal}
                disabled={procesando}
              >
                {procesando
                  ? 'Procesando…'
                  : modal.tipo === 'cancelar'
                  ? 'Sí, cancelar'
                  : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de historia clínica */}
      {historiaModal && (
        <div className="modal-overlay" onClick={cerrarHistoriaModal}>
          <div className="modal-card modal-card--historia" onClick={(e) => e.stopPropagation()}>

            <div className="historia-modal__header">
              <h3>📄 Historia clínica</h3>
              <button
                className="historia-modal__cerrar"
                onClick={cerrarHistoriaModal}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {historiaModal.cargando && (
              <div className="historia-modal__skeleton" />
            )}

            {!historiaModal.cargando && historiaModal.error && (
              <p className="historia-modal__vacio">{historiaModal.error}</p>
            )}

            {!historiaModal.cargando && historiaModal.datos && (
              <div className="historia-modal__cuerpo">

                <div className="historia-modal__meta">
                  <span>
                    👨‍⚕️ Dr(a). {historiaModal.datos.medico_nombre} {historiaModal.datos.medico_apellido}
                    {historiaModal.datos.especialidad && ` · ${historiaModal.datos.especialidad}`}
                  </span>
                  <span>
                    📅 {formatFechaStr(historiaModal.datos.fecha)} · 🕐 {formatHoraStr(historiaModal.datos.hora_inicio)}
                  </span>
                </div>

                <SeccionHistoria titulo="Motivo de consulta" texto={historiaModal.datos.motivo_consulta} />
                <SeccionHistoria titulo="Anamnesis"          texto={historiaModal.datos.anamnesis} />
                <SeccionHistoria titulo="Examen físico"      texto={historiaModal.datos.examen_fisico} />

                {(historiaModal.datos.diagnostico_cie10 || historiaModal.datos.descripcion_diagnostico) && (
                  <div className="historia-seccion">
                    <h4 className="historia-seccion__titulo">Diagnóstico</h4>
                    <p className="historia-seccion__texto">
                      {historiaModal.datos.diagnostico_cie10 && (
                        <span className="historia-cie10">{historiaModal.datos.diagnostico_cie10}</span>
                      )}
                      {historiaModal.datos.descripcion_diagnostico}
                    </p>
                  </div>
                )}

                <SeccionHistoria titulo="Plan de tratamiento"      texto={historiaModal.datos.plan_tratamiento} />
                <SeccionHistoria titulo="Medicamentos recetados"   texto={historiaModal.datos.medicamentos_recetados} />
                <SeccionHistoria titulo="Observaciones"            texto={historiaModal.datos.observaciones} />

              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}