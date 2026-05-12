import { useState, useEffect } from 'react';
import { api }                 from '../../lib/apiClient';
import './MisCitas.css';
 
export default function MisCitas() {
    const [citas, setCitas]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
 
    // Modal de confirmación
    const [modal, setModal] = useState(null); // { tipo: 'cancelar'|'eliminar', id, id_franja }
 
    // Estado de la operación en curso
    const [procesando, setProcesando] = useState(false);
 
    // Cargar citas al montar el componente
    // .then().catch().finally() en useEffect (regla del proyecto)
    useEffect(() => {
        api.get('/citas/mis-citas')
            .then(data  => setCitas(data))
            .catch(()   => setError('No se pudieron cargar tus citas.'))
            .finally(() => setLoading(false));
    }, []);
 
    // Cancelar cita — async/await en eventos de usuario
    async function cancelar(id) {
        setProcesando(true);
        try {
            await api.patch(`/citas/${id}`, {
                razon_cancelacion: 'Cancelada por el paciente',
            });
            // Actualizar estado local sin recargar la página
            setCitas(prev =>
                prev.map(c => c.id === id ? { ...c, estado: 'cancelada' } : c)
            );
        } catch (err) {
            alert(err.message);
        } finally {
            setProcesando(false);
            setModal(null);
        }
    }
 
    // Eliminar cita — async/await en eventos de usuario
    async function eliminar(id) {
        setProcesando(true);
        try {
            await api.delete(`/citas/${id}`);
            // Quitar la cita del estado local sin recargar
            setCitas(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert(err.message);
        } finally {
            setProcesando(false);
            setModal(null);
        }
    }
 
    function confirmarModal() {
        if (modal.tipo === 'cancelar') cancelar(modal.id);
        if (modal.tipo === 'eliminar') eliminar(modal.id);
    }
 
    function formatFecha(fechaStr) {
        if (!fechaStr) return '';
        const f = new Date(fechaStr + 'T00:00:00');
        return f.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
 
    function formatHora(horaStr) {
        if (!horaStr) return '';
        return horaStr.substring(0, 5);
    }
 
    return (
        <main className="miscitas-pagina">
            <div className="contenedor">
                <h1 className="miscitas-titulo">Mis citas</h1>
 
                {/* Estado de error */}
                {error && (
                    <div className="miscitas-error">{error}</div>
                )}
 
                {/* Skeleton mientras carga */}
                {loading && (
                    <div className="miscitas-lista">
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className="cita-skeleton" />
                        ))}
                    </div>
                )}
 
                {/* Sin citas */}
                {!loading && citas.length === 0 && !error && (
                    <div className="miscitas-vacio">
                        <p>Aún no tienes citas agendadas.</p>
                        <a href="/agendar" className="btn-primario" style={{ display: 'inline-block', textDecoration: 'none' }}>
                            Agendar mi primera cita
                        </a>
                    </div>
                )}
 
                {/* Lista de citas */}
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
                                        📅 {formatFecha(c.fecha)} · 🕐 {formatHora(c.hora_inicio)}
                                    </p>
 
                                    <p className="cita-card__tipo">
                                        {c.tipo_consulta === 'teleconsulta' ? '💻 Teleconsulta' : '🏥 Presencial'}
                                        {c.tarifa_cobrada && (
                                            <span className="cita-card__tarifa">
                                                · ${Number(c.tarifa_cobrada).toLocaleString('es-CO')} COP
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
 
                                {/* Acciones según estado */}
                                <div className="cita-card__acciones">
                                    {c.estado === 'pendiente' && (
                                        <button
                                            className="btn-cancelar"
                                            onClick={() => setModal({ tipo: 'cancelar', id: c.id })}
                                        >
                                            Cancelar cita
                                        </button>
                                    )}
                                    {c.estado === 'cancelada' && (
                                        <button
                                            className="btn-eliminar"
                                            onClick={() => setModal({ tipo: 'eliminar', id: c.id })}
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
 
            {/* Modal de confirmación */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>
                            {modal.tipo === 'cancelar'
                                ? '¿Cancelar esta cita?'
                                : '¿Eliminar esta cita?'}
                        </h3>
                        <p>
                            {modal.tipo === 'cancelar'
                                ? 'La cita pasará a estado cancelado y la franja horaria quedará disponible.'
                                : 'La cita se eliminará permanentemente. Esta acción no se puede deshacer.'}
                        </p>
                        <div className="modal-acciones">
                            <button
                                className="btn-secundario"
                                onClick={() => setModal(null)}
                                disabled={procesando}
                            >
                                Volver
                            </button>
                            <button
                                className={modal.tipo === 'cancelar' ? 'btn-cancelar' : 'btn-eliminar'}
                                onClick={confirmarModal}
                                disabled={procesando}
                            >
                                {procesando
                                    ? 'Procesando…'
                                    : modal.tipo === 'cancelar' ? 'Sí, cancelar' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
 