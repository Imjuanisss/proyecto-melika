// client/src/pages/miscitas/MisCitas.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { pdf } from '@react-pdf/renderer';
import { api } from '../../lib/apiClient';
import VisorPDFModal from '../../components/historias/VisorPDFModal';
import { 
  PlantillaHistoriaPDF, 
  PlantillaFormulaPDF, 
  PlantillaExamenesPDF 
} from '../../components/historias/PlantillaHistoriaPDF';
import './MisCitas.css';

const LEYENDA = [
  { estado: 'pendiente',  color: '#B45309', label: 'Pendiente'  },
  { estado: 'completada', color: '#1A7A52', label: 'Completada' },
  { estado: 'cancelada',  color: '#DC2626', label: 'Cancelada'  },
];

export default function MisCitas() {
  const navigate    = useNavigate();
  const calendarRef = useRef(null);

  const [vista, setVista] = useState('calendario');
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [modal, setModal] = useState(null); 
  const [procesando, setProcesando] = useState(false);
  const [razonCancelacion, setRazonCancelacion] = useState('');

  const [visorUrl, setVisorUrl] = useState(null);
  const [visorNombre, setVisorNombre] = useState('historia.pdf');
  const [visorCargando, setVisorCargando] = useState(false);
  const [visorError, setVisorError] = useState(null);

  useEffect(() => {
    api
      .get('/citas/mis-citas')
      .then(data => setCitas(data))
      .catch(() => setError('No se pudieron cargar tus citas.'))
      .finally(() => setLoading(false));
  }, []);

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

  async function cancelar() {
    if (!modal?.id) return;
    setProcesando(true);
    const idNum = Number(modal.id);
    try {
      await api.patch(`/citas/${modal.id}`, {
        razon_cancelacion: razonCancelacion.trim() || 'Cancelado por el paciente',
      });
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

  // ── 1. Ver historia clínica principal en Modal ──────────────────────────────
  async function verHistoriaClinica(idCita) {
    if (visorCargando) return;
    setVisorCargando(true);
    setVisorError(null);

    try {
      let respuesta = await api.get(`/historias/cita/${idCita}`);
      if (!respuesta?.historia) throw new Error('No hay historia');

      const historia = respuesta.historia;
      const aclaraciones = respuesta.aclaraciones || [];

      const blob = await pdf(
        <PlantillaHistoriaPDF historia={historia} aclaraciones={aclaraciones} />
      ).toBlob();

      const blobUrl = URL.createObjectURL(blob);
      setVisorNombre(`HC-${historia.id}.pdf`);
      setVisorUrl(blobUrl);

    } catch (err) {
      console.error('Error generando PDF:', err);
      setVisorError('El médico aún no ha registrado la historia clínica.');
    } finally {
      setVisorCargando(false);
    }
  }

  // ── 2. Función genérica para descargar CUALQUIER PDF ──────────────────────
  async function descargarDocumentoPDF(idCita, tipoDocumento) {
    if (visorCargando) return;
    setVisorCargando(true);
    setVisorError(null);

    try {
      let respuesta = await api.get(`/historias/cita/${idCita}`);
      if (!respuesta?.historia) throw new Error('No hay historia');

      const historia = respuesta.historia;
      const aclaraciones = respuesta.aclaraciones || [];
      const recetas = respuesta.recetas || [];
      const examenes = respuesta.examenes || [];

      let blob;
      let nombreArchivo;

      if (tipoDocumento === 'historia') {
        blob = await pdf(<PlantillaHistoriaPDF historia={historia} aclaraciones={aclaraciones} />).toBlob();
        nombreArchivo = `Historia_Clinica_${historia.id}.pdf`;
      } 
      else if (tipoDocumento === 'formula') {
        if (recetas.length === 0 && !historia.medicamentos_recetados) throw new Error('No hay medicamentos');
        blob = await pdf(<PlantillaFormulaPDF historia={historia} recetas={recetas} />).toBlob();
        nombreArchivo = `Formula_Medica_${historia.id}.pdf`;
      } 
      else if (tipoDocumento === 'examenes') {
        if (examenes.length === 0) throw new Error('No hay exámenes');
        blob = await pdf(<PlantillaExamenesPDF historia={historia} examenes={examenes} />).toBlob();
        nombreArchivo = `Orden_Examenes_${historia.id}.pdf`;
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      setVisorError(err.message || `No se pudo generar/descargar el documento (${tipoDocumento}).`);
    } finally {
      setVisorCargando(false);
    }
  }

  function cerrarVisor() {
    if (visorUrl) {
      URL.revokeObjectURL(visorUrl);
      setVisorUrl(null);
    }
    setVisorError(null);
    setVisorNombre('historia.pdf');
  }

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

  return (
    <main className="miscitas-pagina">
      <div className="contenedor">
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

        {/* ── VISTA CALENDARIO ── */}
        {vista === 'calendario' && (
          <>
            <div className="miscitas-leyenda">
              {LEYENDA.map(l => (
                <div key={l.estado} className="leyenda-item">
                  <div className="leyenda-dot" style={{ background: l.color }} aria-hidden="true" />
                  {l.label}
                </div>
              ))}
            </div>

            <div className="miscitas-grid">
              <div className="miscitas-calendar-wrap">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale={esLocale}
                  headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                  events={cargarEventos}
                  eventClick={handleEventClick}
                  height="auto"
                  buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
                  nowIndicator
                  eventDisplay="block"
                />
              </div>

              <div className="miscitas-detalle-panel">
                <p className="miscitas-detalle-panel__titulo">🗓️ Detalle de cita</p>

                {!citaSeleccionada ? (
                  <div className="miscitas-detalle-vacio">
                    <span aria-hidden="true">👆</span>
                    Haz clic en una cita del calendario para ver sus detalles.
                  </div>
                ) : (
                  <div className="detalle-cita">
                    <div className="detalle-cita__header">
                      <p className="detalle-cita__especialidad">{citaSeleccionada.especialidad}</p>
                      <span className={`badge-${citaSeleccionada.estado}`}>{citaSeleccionada.estado}</span>
                    </div>

                    <div className="detalle-fila">
                      <span className="detalle-fila__etiqueta">Médico</span>
                      <span className="detalle-fila__valor">Dr(a). {citaSeleccionada.medico_nombre}</span>
                    </div>
                    <div className="detalle-fila">
                      <span className="detalle-fila__etiqueta">Fecha</span>
                      <span className="detalle-fila__valor">{formatFechaDate(citaSeleccionada.start)}</span>
                    </div>
                    <div className="detalle-fila">
                      <span className="detalle-fila__etiqueta">Hora</span>
                      <span className="detalle-fila__valor">{formatHoraDate(citaSeleccionada.start)}</span>
                    </div>

                    <div className="detalle-cita__acciones">
                      {citaSeleccionada.estado === 'pendiente' && (
                        <button className="btn-cancelar-detalle" disabled={procesando} onClick={() => setModal({ tipo: 'cancelar', id: citaSeleccionada.id })}>
                          Cancelar esta cita
                        </button>
                      )}
                      {citaSeleccionada.estado === 'cancelada' && (
                        <button className="btn-eliminar-detalle" disabled={procesando} onClick={() => setModal({ tipo: 'eliminar', id: citaSeleccionada.id })}>
                          Eliminar registro
                        </button>
                      )}

                      {/* --- BOTONES DEL PACIENTE EN EL PANEL DEL CALENDARIO --- */}
                      {citaSeleccionada.estado === 'completada' && (
                        <div className="detalle-cita__historia">
                          {visorError && <p className="miscitas-visor-error" role="alert">{visorError}</p>}
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                              className="btn-historia btn-historia--bloque"
                              onClick={() => verHistoriaClinica(citaSeleccionada.id)}
                              disabled={visorCargando}
                            >
                              {visorCargando ? 'Procesando…' : '👁️ Ver Historia en pantalla'}
                            </button>
                            
                            <hr style={{ borderTop: '1px dashed #ccc', margin: '5px 0' }}/>
                            <p style={{ fontSize: '11px', textAlign: 'center', color: '#666', margin: 0 }}>Descargas PDF:</p>
                            
                            <button
                              className="btn-historia btn-historia--bloque"
                              style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981', padding: '6px' }}
                              onClick={() => descargarDocumentoPDF(citaSeleccionada.id, 'historia')}
                              disabled={visorCargando}
                            >
                              ⬇️ Descargar Historia
                            </button>

                            <button
                              className="btn-historia btn-historia--bloque"
                              style={{ backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6', padding: '6px' }}
                              onClick={() => descargarDocumentoPDF(citaSeleccionada.id, 'formula')}
                              disabled={visorCargando}
                            >
                              💊 Descargar Fórmula
                            </button>

                            <button
                              className="btn-historia btn-historia--bloque"
                              style={{ backgroundColor: '#059669', color: 'white', borderColor: '#059669', padding: '6px' }}
                              onClick={() => descargarDocumentoPDF(citaSeleccionada.id, 'examenes')}
                              disabled={visorCargando}
                            >
                              🔬 Descargar Exámenes
                            </button>

                          </div>
                        </div>
                      )}

                      <button className="btn-agendar-nueva" style={{marginTop: '15px'}} onClick={() => navigate('/agendar')}>
                        + Agendar nueva cita
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── VISTA LISTA ── */}
        {vista === 'lista' && (
          <>
            {error && <div className="miscitas-error" role="alert">{error}</div>}
            
            {loading && (
              <div className="miscitas-lista" aria-label="Cargando citas">
                {Array(4).fill(0).map((_, i) => <div key={i} className="cita-skeleton" aria-hidden="true" />)}
              </div>
            )}

            {!loading && citas.length === 0 && !error && (
              <div className="miscitas-vacio">
                <p>Aún no tienes citas agendadas.</p>
                <button className="btn-agendar-nueva" onClick={() => navigate('/agendar')}>
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
                      <p className="cita-card__medico">Dr(a). {c.medico_nombre} {c.medico_apellido}</p>
                      <p className="cita-card__fecha">📅 {formatFechaStr(c.fecha)} · 🕐 {formatHoraStr(c.hora_inicio)}</p>
                    </div>

                    <div className="cita-card__acciones">
                      {c.estado === 'pendiente' && (
                        <button className="btn-cancelar-lista" onClick={() => setModal({ tipo: 'cancelar', id: c.id })}>Cancelar</button>
                      )}
                      {c.estado === 'cancelada' && (
                        <button className="btn-eliminar-lista" onClick={() => setModal({ tipo: 'eliminar', id: c.id })}>Eliminar</button>
                      )}
                      
                      {/* --- BOTONES DEL PACIENTE EN LA VISTA DE LISTA --- */}
                      {c.estado === 'completada' && (
                        <div className="cita-card__historia" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="btn-historia"
                            onClick={() => verHistoriaClinica(c.id)}
                            disabled={visorCargando}
                          >
                            {visorCargando ? '⏳' : '👁️ Ver Historia'}
                          </button>
                          
                          <button
                            className="btn-historia"
                            style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}
                            onClick={() => descargarDocumentoPDF(c.id, 'historia')}
                            disabled={visorCargando}
                          >
                            ⬇️ PDF Historia
                          </button>
                          
                          <button
                            className="btn-historia"
                            style={{ backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                            onClick={() => descargarDocumentoPDF(c.id, 'formula')}
                            disabled={visorCargando}
                          >
                            💊 Fórmula
                          </button>

                          <button
                            className="btn-historia"
                            style={{ backgroundColor: '#059669', color: 'white', borderColor: '#059669' }}
                            onClick={() => descargarDocumentoPDF(c.id, 'examenes')}
                            disabled={visorCargando}
                          >
                            🔬 Exámenes
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {visorError && <div className="miscitas-visor-error miscitas-visor-error--lista" role="alert">⚠️ {visorError}</div>}
          </>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => { setModal(null); setRazonCancelacion(''); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{modal.tipo === 'cancelar' ? '¿Cancelar esta cita?' : '¿Eliminar esta cita?'}</h3>
            <p>{modal.tipo === 'cancelar' ? 'La franja horaria quedará disponible.' : 'Esta acción no se puede deshacer.'}</p>
            {modal.tipo === 'cancelar' && (
              <textarea className="modal-textarea" placeholder="Motivo (opcional)" value={razonCancelacion} onChange={e => setRazonCancelacion(e.target.value)} rows={3} />
            )}
            <div className="modal-acciones">
              <button className="btn-secundario" onClick={() => { setModal(null); setRazonCancelacion(''); }} disabled={procesando}>Volver</button>
              <button className={modal.tipo === 'cancelar' ? 'btn-cancelar-lista' : 'btn-eliminar-lista'} onClick={confirmarModal} disabled={procesando}>
                {procesando ? 'Procesando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {visorUrl && (
        <VisorPDFModal url={visorUrl} onCerrar={cerrarVisor} nombreArchivo={visorNombre} />
      )}
    </main>
  );
}