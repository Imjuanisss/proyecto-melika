import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import './Dashboardmedico.css';

export default function DashboardMedico() {
    const { usuario } = useAuth();
    const calendarRef = useRef(null);

    // Control de vista: 'agenda' o 'disponibilidad'
    const [vistaActiva, setVistaActiva] = useState('agenda');

    // Agenda del día seleccionado
    const [fechaSeleccionada, setFechaSeleccionada] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [citasDia,    setCitasDia]    = useState([]);
    const [loadingDia,  setLoadingDia]  = useState(true);
    const [errorDia,    setErrorDia]    = useState(null);

    // Gestión de Franjas de Disponibilidad
    const [franjas, setFranjas] = useState([]);
    const [loadingFranjas, setLoadingFranjas] = useState(false);
    const [errorFranjas, setErrorFranjas] = useState(null);
    const [nuevaFranja, setNuevaFranja] = useState({ hora_inicio: '', hora_fin: '' });
    const [guardandoFranja, setGuardandoFranja] = useState(false);

    // Modal historia clínica
    const [modalHistoria,  setModalHistoria]  = useState(null); // cita completa
    const [historia,       setHistoria]       = useState(null);
    const [contenido,      setContenido]      = useState('');
    const [modoEdicion,    setModoEdicion]    = useState(false);
    const [guardandoHist,  setGuardandoHist]  = useState(false);
    const [errorHist,      setErrorHist]      = useState(null);
    const [loadingHist,    setLoadingHist]    = useState(false);

    // Memorizar cargarFranjas con useCallback para evitar re-creaciones de función innecesarias
    const cargarFranjas = useCallback(() => {
        setLoadingFranjas(true);
        setErrorFranjas(null);
        api.get(`/medico/franjas?fecha=${fechaSeleccionada}`)
            .then(data => setFranjas(data || []))
            .catch(() => setErrorFranjas('No se pudieron cargar las franjas horarias.'))
            .finally(() => setLoadingFranjas(false));
    }, [fechaSeleccionada]);

    // Cargar citas del día seleccionado o franjas según la vista activa
    useEffect(() => {
        if (vistaActiva === 'agenda') {
            setLoadingDia(true);
            setErrorDia(null);

            api.get(`/medico/agenda?fecha=${fechaSeleccionada}`)
                .then(data => setCitasDia(data.citas || []))
                .catch(() => setErrorDia('No se pudo cargar la agenda.'))
                .finally(() => setLoadingDia(false));
        } else if (vistaActiva === 'disponibilidad') {
            cargarFranjas();
        }
    }, [fechaSeleccionada, vistaActiva, cargarFranjas]);

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

    // Crear una nueva franja horaria
    async function handleCrearFranja(e) {
        e.preventDefault();
        if (!nuevaFranja.hora_inicio || !nuevaFranja.hora_fin) return;
        setGuardandoFranja(true);
        setErrorFranjas(null);

        try {
            await api.post('/medico/franjas', {
                fecha: fechaSeleccionada,
                hora_inicio: nuevaFranja.hora_inicio,
                hora_fin: nuevaFranja.hora_fin
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

    // Eliminar una franja horaria
    async function handleEliminarFranja(id) {
        if (!window.confirm('¿Estás seguro de eliminar esta franja de disponibilidad?')) return;
        try {
            await api.delete(`/medico/franjas/${id}`);
            setFranjas(prev => prev.filter(f => f.id !== id));
            calendarRef.current?.getApi().refetchEvents();
        } catch {
            alert('No se pudo eliminar la franja horaria.');
        }
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
                setHistoria(res.res_historia || res.historia);
            } else {
                // Crear nueva
                const res = await api.post('/historias', {
                    contenido,
                    id_cita: modalHistoria.id,
                });
                setHistoria(res.res_historia || res.historia);
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
                    <div>
                        <h1 className="dashboard-medico__titulo">
                            Bienvenido, Dr(a). {usuario?.nombre}
                        </h1>
                        <p className="dashboard-medico__sub">
                            Gestiona tus consultas y horarios disponibles desde tu panel
                        </p>
                    </div>
                    
                    {/* Selector de Pestañas / Vistas */}
                    <div className="dashboard-medico__tabs">
                        <button 
                            className={`tab-btn ${vistaActiva === 'agenda' ? 'tab-btn--activo' : ''}`}
                            onClick={() => setVistaActiva('agenda')}
                        >
                            🗓️ Agenda de Citas
                        </button>
                        <button 
                            className={`tab-btn ${vistaActiva === 'disponibilidad' ? 'tab-btn--activo' : ''}`}
                            onClick={() => setVistaActiva('disponibilidad')}
                        >
                            ⚙️ Gestionar Disponibilidad
                        </button>
                    </div>
                </div>

                <div className="dashboard-medico__grid">

                    {/* Calendario (Compartido por ambas vistas) */}
                    <div className="panel-calendario">
                        <h2 className="panel-calendario__titulo">Calendario de gestión</h2>
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

                    {/* VISTA 1: PANEL DE CITAS DEL DÍA */}
                    {vistaActiva === 'agenda' && (
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
                    )}

                    {/* VISTA 2: PANEL DE GESTIÓN DE DISPONIBILIDAD */}
                    {vistaActiva === 'disponibilidad' && (
                        <div className="panel-agenda">
                            <div className="panel-agenda__cabecera">
                                <h2 className="panel-agenda__titulo">Franjas de Disponibilidad</h2>
                                <span className="panel-agenda__fecha">
                                    {formatFecha(fechaSeleccionada)}
                                </span>
                            </div>

                            {errorFranjas && (
                                <div className="historia-error">{errorFranjas}</div>
                            )}

                            {/* Formulario para añadir nueva franja */}
                            <form onSubmit={handleCrearFranja} className="dispo-formulario">
                                <div className="dispo-formulario__inputs">
                                    <div className="dispo-campo">
                                        <label>Hora Inicio</label>
                                        <input 
                                            type="time" 
                                            value={nuevaFranja.hora_inicio}
                                            onChange={e => setNuevaFranja(p => ({ ...p, hora_inicio: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="dispo-campo">
                                        <label>Hora Fin</label>
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
                                    style={{ width: '100%', marginTop: '10px' }}
                                    disabled={guardandoFranja}
                                >
                                    {guardandoFranja ? 'Añadiendo...' : '＋ Añadir Franja Libre'}
                                </button>
                            </form>

                            <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

                            {/* Listado de franjas del día */}
                            <h3 className="panel-calendario__titulo" style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                                Franjas horarias del día
                            </h3>

                            {loadingFranjas ? (
                                <div className="agenda-loading">
                                    <div className="agenda-skeleton" style={{ height: '50px' }} />
                                </div>
                            ) : franjas.length === 0 ? (
                                <div className="agenda-vacio">
                                    <span>⏰</span>
                                    No has definido franjas libres para este día.
                                </div>
                            ) : (
                                <div className="dispo-lista">
                                    {franjas.map(franja => (
                                        <div key={franja.id} className="dispo-item">
                                            <div className="dispo-item__info">
                                                🟢 <span>{formatHora(franja.hora_inicio)} - {formatHora(franja.hora_fin)}</span>
                                            </div>
                                            <button 
                                                type="button"
                                                className="dispo-item__btn-eliminar"
                                                onClick={() => handleEliminarFranja(franja.id)}
                                                title="Eliminar disponibilidad"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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