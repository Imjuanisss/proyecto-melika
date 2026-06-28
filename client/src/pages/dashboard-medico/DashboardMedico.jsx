// client/src/pages/dashboard-medico/DashboardMedico.jsx
// MELIKA — Dashboard del Médico

import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { useAuth }       from '../../context/AuthContext';
import { api }           from '../../lib/apiClient';
import ModalHistoriaClinica from '../../components/historias/ModalHistoriaClinica';
import './DashboardMedico.css';
import { pdf } from '@react-pdf/renderer';
import VisorPDFModal from '../../components/historias/VisorPDFModal';
import { PlantillaHistoriaPDF } from '../../components/historias/PlantillaHistoriaPDF';

const GESTION_INICIAL = {
  estado:        'completada',
  notas_medicas: '',
};

export default function DashboardMedico() {
  const { usuario } = useAuth();
  const calendarRef = useRef(null);

  const [vistaActiva, setVistaActiva] = useState('agenda');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [citasDia,   setCitasDia]   = useState([]);
  const [loadingDia, setLoadingDia] = useState(true);
  const [errorDia,   setErrorDia]   = useState(null);

  const [franjas,         setFranjas]         = useState([]);
  const [loadingFranjas,  setLoadingFranjas]  = useState(false);
  const [errorFranjas,    setErrorFranjas]    = useState(null);
  const [nuevaFranja,     setNuevaFranja]     = useState({ hora_inicio: '', hora_fin: '' });
  const [guardandoFranja, setGuardandoFranja] = useState(false);

  // Modal para CREAR/EDITAR historia (formulario de tu compañero)
  const [citaHistoriaAbierta, setCitaHistoriaAbierta] = useState(null);

  // Estados para VER historia (Visor PDF)
  const [visorUrl, setVisorUrl] = useState(null);
  const [visorNombre, setVisorNombre] = useState('historia.pdf');
  const [visorCargando, setVisorCargando] = useState(false);
  const [visorError, setVisorError] = useState(null);

  const [modalGestion,     setModalGestion]     = useState(null);
  const [formGestion,      setFormGestion]      = useState(GESTION_INICIAL);
  const [guardandoGestion, setGuardandoGestion] = useState(false);
  const [errorGestion,     setErrorGestion]     = useState(null);

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
    if (vistaActiva === 'agenda') {
      cargarAgenda();
    } else {
      cargarFranjas();
    }
  }, [fechaSeleccionada, vistaActiva, cargarAgenda, cargarFranjas]);

  function handleDateClick(info)  { setFechaSeleccionada(info.dateStr); }
  function handleEventClick(info) { setFechaSeleccionada(info.event.startStr.split('T')[0]); }

  function cargarEventos(fetchInfo, successCallback, failureCallback) {
    const inicio = fetchInfo.startStr.split('T')[0];
    const fin    = fetchInfo.endStr.split('T')[0];
    api.get(`/medico/agenda/rango?inicio=${inicio}&fin=${fin}`)
      .then(eventos => successCallback(eventos))
      .catch(() => failureCallback());
  }

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

  // ── LÓGICA INTELIGENTE PARA EL BOTÓN DE HISTORIA ────────────────────────
  function abrirHistoria(cita) {
    if (cita.historia_id) {
      // Si ya tiene historia, abrimos el PDF
      verHistoriaClinicaPdf(cita.id);
    } else {
      // Si no tiene historia, abrimos el formulario para crearla
      setCitaHistoriaAbierta(cita);
    }
  }

  // ── Generador del Visor PDF ───────────────────────────────────────────────
  async function verHistoriaClinicaPdf(idCita) {
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
      // Mostramos el error en la interfaz usando el estado de error de la agenda
      setErrorDia('Error al generar el PDF de la historia clínica.'); 
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

  function cerrarHistoria() {
    setCitaHistoriaAbierta(null);
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

  function citaEsGestionable(cita) {
    return cita.estado !== 'cancelada';
  }

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
                        <div className="agenda-item__notas">
                          📝 {cita.notas_medicas}
                        </div>
                      )}

                      {cita.estado !== 'cancelada' && (
                        <div className="agenda-item__acciones">
                          <button
                            className="agenda-item__btn-historia"
                            onClick={() => abrirHistoria(cita)}
                            disabled={visorCargando}
                          >
                            {visorCargando 
                              ? '⏳ Cargando...' 
                              : (cita.historia_id ? '📄 Ver historia' : '📝 Historia clínica')}
                          </button>

                          {citaEsGestionable(cita) && (
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

              {errorFranjas && <div className="historia-error">{errorFranjas}</div>}

              <form onSubmit={handleCrearFranja} className="dispo-formulario">
                <div className="dispo-formulario__inputs">
                  <div className="dispo-campo">
                    <label>Hora inicio</label>
                    <input type="time" value={nuevaFranja.hora_inicio} onChange={e => setNuevaFranja(p => ({ ...p, hora_inicio: e.target.value }))} required />
                  </div>
                  <div className="dispo-campo">
                    <label>Hora fin</label>
                    <input type="time" value={nuevaFranja.hora_fin} onChange={e => setNuevaFranja(p => ({ ...p, hora_fin: e.target.value }))} required />
                  </div>
                </div>
                <button type="submit" className="btn-guardar-historia" style={{ width: '100%' }} disabled={guardandoFranja}>
                  {guardandoFranja ? 'Añadiendo…' : '＋ Añadir franja libre'}
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
                        {franja.disponible ? '🟢' : '🔴'} {formatHora(franja.hora_inicio)} — {formatHora(franja.hora_fin)}
                        {!franja.disponible && <span className="dispo-item__badge-reservada">Reservada</span>}
                      </div>
                      {franja.disponible && (
                        <button type="button" className="dispo-item__btn-eliminar" onClick={() => handleEliminarFranja(franja.id)} title="Eliminar franja">
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

      {citaHistoriaAbierta && (
        <ModalHistoriaClinica
          cita={citaHistoriaAbierta}
          onCerrar={cerrarHistoria}
          onGuardada={alGuardarHistoria}
        />
      )}

      {modalGestion && (
        <div className="modal-overlay" onClick={cerrarGestion}>
          <div className="modal-gestion" onClick={e => e.stopPropagation()}>
            <div className="modal-gestion__cabecera">
              <div>
                <h3 className="modal-gestion__titulo">
                  {modalGestion.estado === 'pendiente' ? 'Registrar resultado de cita' : 'Corregir estado de cita'}
                </h3>
                <p className="modal-gestion__meta">Paciente: {modalGestion.paciente_nombre} {modalGestion.paciente_apellido}</p>
                <p className="modal-gestion__meta">{formatFecha(fechaSeleccionada)} · {formatHora(modalGestion.hora_inicio)}</p>
              </div>
              <button className="btn-cerrar" onClick={cerrarGestion}>✕</button>
            </div>

            {errorGestion && <div className="historia-error">{errorGestion}</div>}

            <div className="modal-gestion__opciones">
              <p className="modal-gestion__label">
                {modalGestion.estado === 'pendiente' ? '¿Cuál fue el resultado de esta consulta?' : 'Corregir el registro — estado actual: '}
                {modalGestion.estado !== 'pendiente' && (
                  <span className={`agenda-badge--${modalGestion.estado}`} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {modalGestion.estado === 'completada' ? '✓ Completada' : 'No asistió'}
                  </span>
                )}
              </p>

              <div className="modal-gestion__radio-grupo">
                <label className={`radio-opcion ${formGestion.estado === 'completada' ? 'radio-opcion--activa' : ''}`}>
                  <input type="radio" name="estado_gestion" value="completada" checked={formGestion.estado === 'completada'} onChange={() => setFormGestion(p => ({ ...p, estado: 'completada' }))} />
                  <span className="radio-opcion__icono">✅</span>
                  <div><strong>Consulta realizada</strong><small>El paciente asistió y fue atendido</small></div>
                </label>

                <label className={`radio-opcion ${formGestion.estado === 'no_asistio' ? 'radio-opcion--activa' : ''}`}>
                  <input type="radio" name="estado_gestion" value="no_asistio" checked={formGestion.estado === 'no_asistio'} onChange={() => setFormGestion(p => ({ ...p, estado: 'no_asistio' }))} />
                  <span className="radio-opcion__icono">🚫</span>
                  <div><strong>Paciente no asistió</strong><small>El paciente no se presentó a la cita</small></div>
                </label>
              </div>
            </div>

            <div className="modal-gestion__notas">
              <label className="modal-gestion__label">Notas de cierre (opcional)</label>
              <textarea className="modal-gestion__textarea" rows={3} placeholder="Observaciones de cierre de la cita…" value={formGestion.notas_medicas} onChange={e => setFormGestion(p => ({ ...p, notas_medicas: e.target.value }))} />
            </div>

            <div className="modal-gestion__acciones">
              <button className="btn-editar-historia" onClick={cerrarGestion} disabled={guardandoGestion}>Volver</button>
              <button className={`btn-gestion-confirmar ${formGestion.estado === 'no_asistio' ? 'btn-gestion-confirmar--ausente' : ''}`} onClick={handleConfirmarGestion} disabled={guardandoGestion}>
                {guardandoGestion ? 'Guardando…' : formGestion.estado === 'completada' ? 'Confirmar consulta' : 'Registrar ausencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VISOR PDF — pdfslick v4 (Aparece cuando el médico ya llenó la historia)
      ════════════════════════════════════════════════════════════════════ */}
      {visorUrl && (
        <VisorPDFModal url={visorUrl} onCerrar={cerrarVisor} nombreArchivo={visorNombre} />
      )}

    </main>
  );
}