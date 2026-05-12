import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { api }                 from '../../lib/apiClient';
import './Agendarcita.css';

const PASOS = ['Especialidad y médico', 'Fecha y hora', 'Confirmación'];

export default function Agendarcita() {
    const navigate = useNavigate();

    // ── Estado del stepper ──────────────────────────────────────
    const [paso,  setPaso]  = useState(0);
    const [exito, setExito] = useState(false);

    // ── Selecciones del paciente ────────────────────────────────
    const [especialidad, setEspecialidad] = useState(null);
    const [medico,       setMedico]       = useState(null);
    const [fecha,        setFecha]        = useState('');
    const [franja,       setFranja]       = useState(null);
    const [tipoConsulta, setTipoConsulta] = useState('presencial');
    const [motivo,       setMotivo]       = useState('');

    // ── Datos del servidor ──────────────────────────────────────
    const [especialidades, setEspecialidades] = useState([]);
    const [medicos,        setMedicos]        = useState([]);
    const [franjas,        setFranjas]        = useState([]);

    // ── Estados de carga ────────────────────────────────────────
    const [loadingEsp,     setLoadingEsp]     = useState(true);
    const [loadingMed,     setLoadingMed]     = useState(false);
    const [loadingFranjas, setLoadingFranjas] = useState(false);
    const [loadingEnvio,   setLoadingEnvio]   = useState(false);

    // ── Estados de error ────────────────────────────────────────
    const [errorEsp,     setErrorEsp]     = useState(null);
    const [errorMed,     setErrorMed]     = useState(null);
    const [errorFranjas, setErrorFranjas] = useState(null);
    const [errorEnvio,   setErrorEnvio]   = useState(null);

    // ── Cargar especialidades al montar el componente ───────────
    useEffect(() => {
        api.get('/especialidades')
            .then(data => setEspecialidades(data))
            .catch(() => setErrorEsp('No se pudieron cargar las especialidades.'))
            .finally(() => setLoadingEsp(false));
    }, []);

    // ── Cargar médicos cuando el paciente elige una especialidad ─
    useEffect(() => {
        if (!especialidad) return;

        setLoadingMed(true);
        setErrorMed(null);
        setMedicos([]);
        setMedico(null);

        api.get(`/especialidades/${especialidad.id}/medicos`)
            .then(data => setMedicos(data))
            .catch(() => setErrorMed('No se pudieron cargar los médicos.'))
            .finally(() => setLoadingMed(false));
    }, [especialidad]);

    // ── Cargar franjas cuando elige médico y fecha ───────────────
    useEffect(() => {
        if (!medico || !fecha) return;

        setLoadingFranjas(true);
        setErrorFranjas(null);
        setFranjas([]);
        setFranja(null);

        api.get(`/especialidades/disponibilidad?medico_id=${medico.id}&fecha=${fecha}`)
            .then(data => setFranjas(data))
            .catch(() => setErrorFranjas('No se pudo cargar la disponibilidad.'))
            .finally(() => setLoadingFranjas(false));
    }, [medico, fecha]);

    // ── Validar si puede avanzar al siguiente paso ───────────────
    function puedeSiguiente() {
        if (paso === 0) return especialidad !== null && medico !== null;
        if (paso === 1) return fecha !== '' && franja !== null;
        return true;
    }

    // ── Confirmar y crear la cita en el backend ──────────────────
    async function confirmarCita() {
        setLoadingEnvio(true);
        setErrorEnvio(null);

        try {
            await api.post('/citas', {
                id_medico:       medico.id,
                id_especialidad: especialidad.id,
                id_franja:       franja.id,
                fecha:           fecha,
                hora_inicio:     franja.hora_inicio,
                tipo_consulta:   tipoConsulta,
                motivo:          motivo,
            });
            setExito(true);
        } catch (err) {
            setErrorEnvio(err.message);
        } finally {
            setLoadingEnvio(false);
        }
    }

    function reiniciar() {
        setPaso(0);
        setExito(false);
        setEspecialidad(null);
        setMedico(null);
        setFecha('');
        setFranja(null);
        setTipoConsulta('presencial');
        setMotivo('');
    }

    function formatHora(horaStr) {
        if (!horaStr) return '';
        return horaStr.substring(0, 5);
    }

    function formatFecha(fechaStr) {
        if (!fechaStr) return '';
        const f = new Date(fechaStr + 'T00:00:00');
        return f.toLocaleDateString('es-CO', {
            weekday: 'long',
            day:     'numeric',
            month:   'long',
            year:    'numeric',
        });
    }

    // ── Pantalla de éxito ────────────────────────────────────────
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

    // ── Vista principal con stepper ──────────────────────────────
    return (
        <div className="agendar-pagina">
            <div className="contenedor">
                <h1 className="agendar-titulo">Agendar cita médica</h1>

                {/* Indicador de pasos */}
                <div className="stepper">
                    {PASOS.map((p, i) => (
                        <div
                            key={i}
                            className={`stepper__paso ${i === paso ? 'activo' : ''} ${i < paso ? 'completo' : ''}`}
                        >
                            <div className="stepper__num">
                                {i < paso ? '✓' : i + 1}
                            </div>
                            <span className="stepper__label">{p}</span>
                        </div>
                    ))}
                </div>

                {/* Tarjeta principal del paso */}
                <div className="agendar-card">

                    {/* ─── PASO 0: Especialidad y médico ─── */}
                    {paso === 0 && (
                        <div>
                            <h2 className="agendar-card__titulo">Elige la especialidad</h2>

                            {errorEsp && <div className="agendar-error">{errorEsp}</div>}

                            <div className="opciones-grid">
                                {loadingEsp
                                    ? Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="opcion-skeleton" />
                                      ))
                                    : especialidades.map(e => (
                                        <button
                                            key={e.id}
                                            className={`opcion-card ${especialidad?.id === e.id ? 'opcion-card--activo' : ''}`}
                                            onClick={() => setEspecialidad(e)}
                                        >
                                            <strong>{e.nombre}</strong>
                                            {e.precio_base && (
                                                <span>Desde ${Number(e.precio_base).toLocaleString('es-CO')} COP</span>
                                            )}
                                        </button>
                                      ))
                                }
                            </div>

                            {/* Médicos — aparecen al elegir especialidad */}
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
                                                ? <p className="agendar-vacio">No hay médicos disponibles para esta especialidad.</p>
                                                : medicos.map(m => (
                                                    <button
                                                        key={m.id}
                                                        className={`medico-card ${medico?.id === m.id ? 'medico-card--activo' : ''}`}
                                                        onClick={() => setMedico(m)}
                                                    >
                                                        <div className="medico-card__info">
                                                            <strong>Dr(a). {m.nombre} {m.primer_apellido}</strong>
                                                            <span>
                                                                ⭐ {m.calificacion} · ${Number(m.tarifa).toLocaleString('es-CO')} COP
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
                                                  ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── PASO 1: Fecha y franja horaria ─── */}
                    {paso === 1 && (
                        <div>
                            <h2 className="agendar-card__titulo">Selecciona la fecha</h2>

                            <div className="campo-fecha">
                                <label>Fecha de la cita</label>
                                <input
                                    type="date"
                                    value={fecha}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setFecha(e.target.value)}
                                />
                            </div>

                            {fecha && (
                                <>
                                    <h2 className="agendar-card__titulo" style={{ marginTop: 'var(--space-8)' }}>
                                        Elige una franja horaria
                                    </h2>

                                    {errorFranjas && <div className="agendar-error">{errorFranjas}</div>}

                                    {loadingFranjas ? (
                                        <div className="franjas-grid">
                                            {Array(6).fill(0).map((_, i) => (
                                                <div key={i} className="franja-skeleton" />
                                            ))}
                                        </div>
                                    ) : franjas.length === 0 ? (
                                        <p className="agendar-vacio">
                                            No hay franjas disponibles para esta fecha. Prueba con otro día.
                                        </p>
                                    ) : (
                                        <div className="franjas-grid">
                                            {franjas.map(f => (
                                                <button
                                                    key={f.id}
                                                    className={`franja-btn ${franja?.id === f.id ? 'franja-btn--activo' : ''}`}
                                                    onClick={() => setFranja(f)}
                                                >
                                                    {formatHora(f.hora_inicio)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ─── PASO 2: Confirmación ─── */}
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

                            {/* Motivo (opcional) */}
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
                                    onChange={e => setMotivo(e.target.value)}
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
                                onClick={() => setPaso(p => p - 1)}
                            >
                                ← Volver
                            </button>
                        )}

                        {paso < 2 ? (
                            <button
                                className="btn-primario"
                                disabled={!puedeSiguiente()}
                                onClick={() => setPaso(p => p + 1)}
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