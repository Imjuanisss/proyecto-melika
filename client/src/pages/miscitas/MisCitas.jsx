// client/src/pages/miscitas/MisCitas.jsx
// MELIKA — Mis Citas del paciente
// Integra pdfslick v4 + @react-pdf/renderer para visualización y descarga
// de la Historia Clínica directamente desde la lista y el calendario de citas.
//
// FLUJO PDF:
//   1. Paciente hace clic en "Ver historia clínica"
//   2. GET /historias/cita/:id_cita  → verifica que existe la historia
//   3. GET /historias/:id/completa   → datos enriquecidos (médico, paciente, especialidad)
//   4. pdf(<PlantillaHistoriaPDF />).toBlob() → genera PDF en memoria
//   5. URL.createObjectURL(blob)     → blobUrl efímera
//   6. <VisorPDFModal>               → pdfslick renderiza el PDF embebido
//   7. Al cerrar → URL.revokeObjectURL(blobUrl) → libera memoria
//
// CORRECCIONES APLICADAS:
//   - cancelar(): endpoint corregido a PATCH /citas/:id (sin /cancelar)
//     ya que citasRoutes.js registra: router.patch('/:id', verifyToken, cancelarCita)
//   - Import de PlantillaHistoriaPDF con P mayúscula (case-sensitive en Linux/Railway)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate }                               from 'react-router-dom';
import FullCalendar                                  from '@fullcalendar/react';
import dayGridPlugin                                 from '@fullcalendar/daygrid';
import timeGridPlugin                                from '@fullcalendar/timegrid';
import interactionPlugin                             from '@fullcalendar/interaction';
import esLocale                                      from '@fullcalendar/core/locales/es';
import { pdf }                                       from '@react-pdf/renderer';
import { api }                                       from '../../lib/apiClient';
import VisorPDFModal                                 from '../../components/historias/VisorPDFModal';
import { PlantillaHistoriaPDF }                      from '../../components/historias/PlantillaHistoriaPDF';
import './MisCitas.css';

// ─── Colores de leyenda del calendario ───────────────────────────────────────
const LEYENDA = [
  { estado: 'pendiente',  color: '#B45309', label: 'Pendiente'  },
  { estado: 'completada', color: '#1A7A52', label: 'Completada' },
  { estado: 'cancelada',  color: '#DC2626', label: 'Cancelada'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function MisCitas() {
  const navigate    = useNavigate();
  const calendarRef = useRef(null);

  // Vista activa del módulo
  const [vista, setVista] = useState('calendario');

  // Lista de citas del paciente
  const [citas,   setCitas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Cita seleccionada en el panel de detalle (calendario)
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);

  // Modal de confirmación para cancelar o eliminar
  const [modal,      setModal]      = useState(null); // { tipo: 'cancelar'|'eliminar', id }
  const [procesando, setProcesando] = useState(false);

  // Razón de cancelación que escribe el paciente
  const [razonCancelacion, setRazonCancelacion] = useState('');

  // ── Estado del visor PDF pdfslick ─────────────────────────────────────────
  const [visorUrl,      setVisorUrl]      = useState(null);
  const [visorNombre,   setVisorNombre]   = useState('historia.pdf');
  const [visorCargando, setVisorCargando] = useState(false);
  const [visorError,    setVisorError]    = useState(null);

  // ── Cargar lista de citas al montar ──────────────────────────────────────
  useEffect(() => {
    api
      .get('/citas/mis-citas')
      .then(data => setCitas(data))
      .catch(() => setError('No se pudieron cargar tus citas.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Eventos para FullCalendar (carga dinámica por rango de fechas) ────────
  const cargarEventos = useCallback(
    (fetchInfo, successCallback, failureCallback) => {
      const inicio = fetchInfo.startStr.split('T')[0];
      const fin    = fetchInfo.endStr.split('T')[0];
      api
        .get(`/citas/calendario?inicio=${inicio}&fin=${fin}`)
        .then(eventos => successCallback(eventos))
        .catch(() => failureCallback());
    },
    []
  );

  // ── Click en un evento del calendario ────────────────────────────────────
  function handleEventClick(info) {
    const props = info.event.extendedProps;
    setVisorError(null);
    setCitaSeleccionada({
      id:            info.event.id,
      title:         info.event.title,
      start:         info.event.start,
      estado:        props.estado,
      tipo_consulta: props.tipo_consulta,
      medico_nombre: props.medico_nombre,
      especialidad:  props.especialidad,
      motivo:        props.motivo,
      tarifa:        props.tarifa,
    });
  }

  // ── Cancelar cita ─────────────────────────────────────────────────────────
  // CORRECCIÓN: el backend tiene router.patch('/:id', verifyToken, cancelarCita)
  // La ruta es PATCH /citas/:id, NO /citas/:id/cancelar
  async function cancelar() {
    if (!modal?.id) return;
    setProcesando(true);
    const idNum = Number(modal.id);

    try {
      await api.patch(`/citas/${modal.id}`, {
        razon_cancelacion: razonCancelacion.trim() || 'Cancelado por el paciente',
      });

      // Actualizar estado local sin refetch completo
      setCitas(prev =>
        prev.map(c => c.id === idNum ? { ...c, estado: 'cancelada' } : c)
      );

      calendarRef.current?.getApi().refetchEvents();
      setCitaSeleccionada(null);
    } catch (err) {
      alert(err.message || 'Error al cancelar la cita.');
    } finally {
      setProcesando(false);
      setModal(null);
      setRazonCancelacion('');
    }
  }

  // ── Eliminar cita ─────────────────────────────────────────────────────────
  async function eliminar() {
    if (!modal?.id) return;
    setProcesando(true);
    const idNum = Number(modal.id);

    try {
      await api.delete(`/citas/${modal.id}`);
      setCitas(prev => prev.filter(c => c.id !== idNum));
      calendarRef.current?.getApi().refetchEvents();
      setCitaSeleccionada(null);
    } catch (err) {
      alert(err.message || 'Error al eliminar la cita.');
    } finally {
      setProcesando(false);
      setModal(null);
    }
  }

  function confirmarModal() {
    if (modal?.tipo === 'cancelar') cancelar();
    if (modal?.tipo === 'eliminar') eliminar();
  }

  // ── Ver historia clínica — genera PDF y abre visor pdfslick ──────────────
  async function verHistoriaClinica(idCita) {
    if (visorCargando) return;

    setVisorCargando(true);
    setVisorError(null);

    try {
      // 1. Verificar que existe la historia para esta cita
      const respuesta = await api.get(`/historias/cita/${idCita}`);

      if (!respuesta.historia) {
        setVisorError('El médico aún no ha registrado la historia clínica de esta consulta.');
        return;
      }

      // 2. Obtener datos completos enriquecidos para el PDF
      const datosCompletos = await api.get(`/historias/${respuesta.historia.id}/completa`);
      const historia       = datosCompletos.historia;
      const aclaraciones   = datosCompletos.aclaraciones || [];

      // 3. Generar el blob PDF en memoria
      const blob = await pdf(
        <PlantillaHistoriaPDF historia={historia} aclaraciones={aclaraciones} />
      ).toBlob();

      // 4. Crear URL efímera y abrir el visor
      const blobUrl       = URL.createObjectURL(blob);
      const nombreArchivo = `HC-${historia.id}-${historia.paciente_apellido || 'paciente'}.pdf`;

      setVisorNombre(nombreArchivo);
      setVisorUrl(blobUrl);

    } catch (err) {
      console.error('Error generando PDF de historia clínica:', err);
      setVisorError(err.message || 'No se pudo cargar la historia clínica. Intenta de nuevo.');
    } finally {
      setVisorCargando(false);
    }
  }

  // ── Cerrar visor y liberar memoria del blob ────────────────────────────────
  function cerrarVisor() {
    if (visorUrl) {
      URL.revokeObjectURL(visorUrl);
      setVisorUrl(null);
    }
    setVisorError(null);
    setVisorNombre('historia.pdf');
  }

  // ── Helpers de formato ────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="miscitas-pagina">
      <div className="contenedor">

        {/* ── Cabecera con toggle de vista ── */}
        <div className="miscitas-cabecera">
          <h1 className="miscitas-titulo">Mis citas</h1>

          <div className="miscitas-toggle" role="group" aria-label="Cambiar vista">
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

        {/* ══════════════════════════════════════════════════════════════════
            VISTA: CALENDARIO
        ══════════════════════════════════════════════════════════════════ */}
        {vista === 'calendario' && (
          <>
            {/* Leyenda de colores */}
            <div className="miscitas-leyenda" aria-label="Leyenda de estados">
              {LEYENDA.map(l => (
                <div key={l.estado} className="leyenda-item">
                  <div className="leyenda-dot" style={{ background: l.color }} aria-hidden="true" />
                  {l.label}
                </div>
              ))}
            </div>

            <div className="miscitas-grid">

              {/* Calendario FullCalendar */}
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

              {/* Panel de detalle lateral */}
              <div className="miscitas-detalle-panel">
                <p className="miscitas-detalle-panel__titulo">🗓️ Detalle de cita</p>

                {!citaSeleccionada ? (
                  <div className="miscitas-detalle-vacio">
                    <span aria-hidden="true">👆</span>
                    Haz clic en una cita del calendario para ver sus detalles y opciones.
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

                    {/* Acciones según estado */}
                    <div className="detalle-cita__acciones">

                      {citaSeleccionada.estado === 'pendiente' && (
                        <button
                          className="btn-cancelar-detalle"
                          disabled={procesando}
                          onClick={() => setModal({ tipo: 'cancelar', id: citaSeleccionada.id })}
                        >
                          Cancelar esta cita
                        </button>
                      )}

                      {citaSeleccionada.estado === 'cancelada' && (
                        <button
                          className="btn-eliminar-detalle"
                          disabled={procesando}
                          onClick={() => setModal({ tipo: 'eliminar', id: citaSeleccionada.id })}
                        >
                          Eliminar registro
                        </button>
                      )}

                      {citaSeleccionada.estado === 'completada' && (
                        <div className="detalle-cita__historia">
                          {visorError && (
                            <p className="miscitas-visor-error" role="alert">
                              {visorError}
                            </p>
                          )}
                          <button
                            className="btn-historia btn-historia--bloque"
                            onClick={() => verHistoriaClinica(citaSeleccionada.id)}
                            disabled={visorCargando}
                          >
                            {visorCargando
                              ? <><span className="miscitas-spinner" aria-hidden="true" /> Generando PDF…</>
                              : '📄 Ver historia clínica'}
                          </button>
                        </div>
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

        {/* ══════════════════════════════════════════════════════════════════
            VISTA: LISTA
        ══════════════════════════════════════════════════════════════════ */}
        {vista === 'lista' && (
          <>
            {error && (
              <div className="miscitas-error" role="alert">{error}</div>
            )}

            {loading && (
              <div className="miscitas-lista" aria-label="Cargando citas">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="cita-skeleton" aria-hidden="true" />
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
                {citas.map(c => (
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
                          Motivo de cancelación: {c.razon_cancelacion}
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
                        <div className="cita-card__historia">
                          <button
                            className="btn-historia"
                            onClick={() => verHistoriaClinica(c.id)}
                            disabled={visorCargando}
                          >
                            {visorCargando
                              ? <><span className="miscitas-spinner" aria-hidden="true" /> Generando…</>
                              : '📄 Historia clínica'}
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            )}

            {visorError && (
              <div className="miscitas-visor-error miscitas-visor-error--lista" role="alert">
                ⚠️ {visorError}
              </div>
            )}
          </>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: CONFIRMAR CANCELACIÓN O ELIMINACIÓN
      ════════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => { setModal(null); setRazonCancelacion(''); }}
        >
          <div className="modal-card" onClick={e => e.stopPropagation()}>

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
                onChange={e => setRazonCancelacion(e.target.value)}
                rows={3}
                maxLength={300}
                aria-label="Motivo de cancelación"
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
                className={modal.tipo === 'cancelar' ? 'btn-cancelar-lista' : 'btn-eliminar-lista'}
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

      {/* ════════════════════════════════════════════════════════════════════
          VISOR PDF — pdfslick v4
          Se monta cuando hay una blobUrl activa.
          Al cerrar → cerrarVisor() revoca el objeto URL y libera memoria.
      ════════════════════════════════════════════════════════════════════ */}
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