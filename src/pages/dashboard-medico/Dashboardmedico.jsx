import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import './DashboardMedico.css';

export default function DashboardMedico() {
    const { usuario } = useAuth();
    const calendarRef = useRef(null);

    // Agenda del día seleccionado
    const [fechaSeleccionada, setFechaSeleccionada] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [citasDia,    setCitasDia]    = useState([]);
    const [loadingDia,  setLoadingDia]  = useState(true);
    const [errorDia,    setErrorDia]    = useState(null);

    // Modal historia clínica
    const [modalHistoria,  setModalHistoria]  = useState(null); // cita completa
    const [historia,       setHistoria]       = useState(null);
    const [contenido,      setContenido]      = useState('');
    const [modoEdicion,    setModoEdicion]    = useState(false);
    const [guardandoHist,  setGuardandoHist]  = useState(false);
    const [errorHist,      setErrorHist]      = useState(null);
    const [loadingHist,    setLoadingHist]    = useState(false);

    // Cargar citas del día seleccionado
    useEffect(() => {
        setLoadingDia(true);
        setErrorDia(null);

        api.get(`/medico/agenda?fecha=${fechaSeleccionada}`)
            .then(data => setCitasDia(data.citas || []))
            .catch(() => setErrorDia('No se pudo cargar la agenda.'))
            .finally(() => setLoadingDia(false));
    }, [fechaSeleccionada]);

    // Al hacer clic en un día del calendario
    function handleDateClick(info) {
        setFechaSeleccionada(info.dateStr);
    }

    // Al hacer clic en un evento del calendario
    function handleEventClick(info) {
        const fecha = info.event.startStr.split('T')[0];
        setFechaSeleccionada(fecha);
    }

    // Función para que FullCalendar cargue eventos (rango)
    function cargarEventos(fetchInfo, successCallback, failureCallback) {
        const inicio = fetchInfo.startStr.split('T')[0];
        const fin    = fetchInfo.endStr.split('T')[0];

        api.get(`/medico/agenda/rango?inicio=${inicio}&fin=${fin}`)
            .then(eventos => successCallback(eventos))
            .catch(() => failureCallback());
    }

    // Abrir modal de historia clínica
    function abrirHistoria(cita) {
        setModalHistoria(cita);
        setHistoria(null);
        setContenido('');
        setModoEdicion(false);
        setErrorHist(null);
        setLoadingHist(true);

        api.get(`/historias/${cita.id}`)
            .then(data => {
                setHistoria(data.historia);
                setContenido(data.historia?.contenido || '');
                if (!data.historia) setModoEdicion(true); // nueva historia
            })
            .catch(() => setErrorHist('No se pudo cargar la historia clínica.'))
            .finally(() => setLoadingHist(false));
    }

    function cerrarHistoria() {
        setModalHistoria(null);
        setHistoria(null);
        setContenido('');
        setModoEdicion(false);
        setErrorHist(null);
    }

    async function handleGuardarHistoria() {
        if (!contenido.trim()) return;
        setGuardandoHist(true);
        setErrorHist(null);

        try {
            if (historia) {
                // Actualizar existente
                const res = await api.put(`/historias/${historia.id}`, { contenido });
                setHistoria(res.historia);
            } else {
                // Crear nueva
                const res = await api.post('/historias', {
                    contenido,
                    id_cita: modalHistoria.id,
                });
                setHistoria(res.historia);
            }
            setModoEdicion(false);
        } catch (err) {
            setErrorHist(err.message);
        } finally {
            setGuardandoHist(false);
        }
    }

    function formatFecha(fechaStr) {
        if (!fechaStr) return '';
        const f = new Date(fechaStr + 'T00:00:00');
        return f.toLocaleDateString('es-CO', {
            weekday: 'long', day: 'numeric', month: 'long',
        });
    }

    function formatHora(horaStr) {
        if (!horaStr) return '';
        return horaStr.substring(0, 5);
    }

    return (
        <main className="dashboard-medico">
            <div className="contenedor">

                <div className="dashboard-medico__cabecera">
                    <h1 className="dashboard-medico__titulo">
                        Bienvenido, Dr(a). {usuario?.nombre}
                    </h1>
                    <p className="dashboard-medico__sub">
                        Selecciona un día en el calendario para ver tus citas
                    </p>
                </div>

                <div className="dashboard-medico__grid">

                    {/* Calendario */}
                    <div className="panel-calendario">
                        <h2 className="panel-calendario__titulo">Calendario de citas</h2>
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
                            buttonText={{
                                today: 'Hoy',
                                month: 'Mes',
                                week:  'Semana',
                            }}
                        />
                    </div>

                    {/* Panel lateral: citas del día */}
                    <div className="panel-agenda">
                        <div className="panel-agenda__cabecera">
                            <h2 className="panel-agenda__titulo">Agenda del día</h2>
                            <span className="panel-agenda__fecha">
                                {formatFecha(fechaSeleccionada)}
                            </span>
                        </div>

                        {errorDia && (
                            <div className="historia-error">{errorDia}</div>
                        )}

                        {loadingDia ? (
                            <div className="agenda-loading">
                                {Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="agenda-skeleton" />
                                ))}
                            </div>
                        ) : citasDia.length === 0 ? (
                            <div className="agenda-vacio">
                                <span>📭</span>
                                No hay citas para este día
                            </div>
                        ) : (
                            <div className="agenda-lista">
                                {citasDia.map(cita => (
                                    <div
                                        key={cita.id}
                                        className={`agenda-item agenda-item--${cita.estado}`}
                                    >
                                        <div className="agenda-item__hora">
                                            {formatHora(cita.hora_inicio)}
                                        </div>
                                        <div className="agenda-item__paciente">
                                            {cita.paciente_nombre} {cita.paciente_apellido}
                                        </div>
                                        <div className="agenda-item__tipo">
                                            {cita.tipo_consulta === 'teleconsulta'
                                                ? '💻 Teleconsulta'
                                                : '🏥 Presencial'}
                                            {cita.motivo && ` · ${cita.motivo.substring(0, 30)}…`}
                                        </div>
                                        {cita.estado !== 'cancelada' && (
                                            <button
                                                className="agenda-item__btn-historia"
                                                onClick={() => abrirHistoria(cita)}
                                            >
                                                {cita.historia_id ? 'Ver historia' : 'Crear historia'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal historia clínica */}
            {modalHistoria && (
                <div className="modal-overlay" onClick={cerrarHistoria}>
                    <div className="modal-historia" onClick={e => e.stopPropagation()}>

                        <div className="modal-historia__cabecera">
                            <div>
                                <h3>Historia clínica</h3>
                                <p className="modal-historia__meta">
                                    {modalHistoria.paciente_nombre} {modalHistoria.paciente_apellido}
                                    · {formatHora(modalHistoria.hora_inicio)}
                                </p>
                                {historia?.updated_at && (
                                    <p className="modal-historia__meta">
                                        Última edición: {new Date(historia.updated_at).toLocaleString('es-CO')}
                                    </p>
                                )}
                            </div>
                            <button className="btn-cerrar" onClick={cerrarHistoria}>✕</button>
                        </div>

                        {errorHist && (
                            <div className="historia-error">{errorHist}</div>
                        )}

                        {loadingHist ? (
                            <div className="agenda-skeleton" style={{ height: '160px' }} />
                        ) : (
                            <>
                                <textarea
                                    className="historia-textarea"
                                    rows={8}
                                    value={contenido}
                                    onChange={e => setContenido(e.target.value)}
                                    disabled={!modoEdicion}
                                    placeholder="Escribe aquí los diagnósticos, observaciones y tratamientos…"
                                />

                                <div className="historia-acciones">
                                    {historia && !modoEdicion ? (
                                        <button
                                            className="btn-editar-historia"
                                            onClick={() => setModoEdicion(true)}
                                        >
                                            Editar
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-guardar-historia"
                                            disabled={guardandoHist || !contenido.trim()}
                                            onClick={handleGuardarHistoria}
                                        >
                                            {guardandoHist
                                                ? 'Guardando…'
                                                : historia ? 'Actualizar' : 'Guardar historia'}
                                        </button>
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