import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import './Catalogo.css';

function MedicamentoSkeleton() {
  return (
    <div className="medicamento-card medicamento-card--skeleton">
      <div className="medicamento-imagen-container skeleton-box" />
      <div className="medicamento-detalles" style={{ background: '#1a1e27' }}>
        <div className="skeleton-line" style={{ width: '60%', marginBottom: '10px' }} />
        <div className="skeleton-line" style={{ width: '90%', marginBottom: '6px' }} />
        <div className="skeleton-line" style={{ width: '75%', marginBottom: '6px' }} />
        <div className="skeleton-line" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

function TipoBadge({ tipo }) {
  return (
    <span className={`badge-tipo badge-tipo--${tipo?.toLowerCase()}`}>
      {tipo?.toUpperCase() === 'OTC' ? '🟢 Venta libre' : '🔴 Requiere Rx'}
    </span>
  );
}

export default function Catalogo() {
  const navigate = useNavigate();

  // ── Estados ──────────────────────────────────────────────────────────────
  const [medicamentos, setMedicamentos]   = useState([]);
  const [especialidades, setEspecialidades] = useState([]); // <-- Extrae las reales de la BD
  const [loading,      setLoading]        = useState(true);
  const [error,        setError]          = useState(null);

  const [especialidadActiva, setEspecialidadActiva] = useState(''); // '' = Todos
  const [tipoActivo,      setTipoActivo]      = useState('Todos'); 
  const [buscar,          setBuscar]          = useState('');
  const [buscarInput,     setBuscarInput]     = useState('');   

  const [selectedMed, setSelectedMed] = useState(null);

  // ─── Cargar especialidades al iniciar la página ──────────────────────────
  useEffect(() => {
    api.get('/especialidades')
      .then(res => {
        const data = res.data ? res.data : res;
        setEspecialidades(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Error cargando especialidades:", err));
  }, []);

  // ─── Cargar medicamentos filtrados usando consultas reales a PostgreSQL ──
  const cargarMedicamentos = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (tipoActivo !== 'Todos') params.set('tipo', tipoActivo);
    if (buscar.trim())          params.set('buscar', buscar.trim());
    
    // Le mandamos el ID numérico al backend para que haga el trabajo pesado
    if (especialidadActiva)     params.set('id_especialidad', especialidadActiva); 

    const query = params.toString() ? `?${params.toString()}` : '';

    api.get(`/medicamentos${query}`)
      .then(res => {
        const data = res.data ? res.data : res;
        setMedicamentos(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('No se pudo conectar al servidor de Melika.'))
      .finally(() => setLoading(false));
  }, [especialidadActiva, tipoActivo, buscar]);

  useEffect(() => {
    cargarMedicamentos();
  }, [cargarMedicamentos]);

  useEffect(() => {
    const timer = setTimeout(() => setBuscar(buscarInput), 300);
    return () => clearTimeout(timer);
  }, [buscarInput]);

  function limpiarFiltros() {
    setEspecialidadActiva('');
    setTipoActivo('Todos');
    setBuscarInput('');
    setBuscar('');
  }

  const hayFiltrosActivos = especialidadActiva !== '' || tipoActivo !== 'Todos' || buscar.trim().length > 0;

  // Busca el nombre de la especialidad para pintar la etiqueta azul en la tarjeta
  const obtenerNombreEspecialidad = (id_esp) => {
    const esp = especialidades.find(e => e.id === id_esp);
    return esp ? esp.nombre : 'Medicina General';
  };

  return (
    <div className="catalogo-page">
      <div className="catalogo-header-container">
        <h1 className="catalogo-main-title">Catálogo de Medicamentos</h1>
        <p className="catalogo-subtitle">
          Información técnica organizada por Especialidades Médicas · MELIKA
        </p>
      </div>

      <div className="catalogo-busqueda">
        <input
          type="text"
          className="catalogo-busqueda__input"
          placeholder="Buscar por nombre comercial o principio activo…"
          value={buscarInput}
          onChange={e => setBuscarInput(e.target.value)}
        />
        {buscarInput && (
          <button className="catalogo-busqueda__limpiar" onClick={() => setBuscarInput('')}>✕</button>
        )}
      </div>

      <div className="filtros-tipo">
        {['Todos', 'OTC', 'Rx'].map(t => (
          <button
            key={t}
            className={`filtro-tipo-btn ${tipoActivo === t ? 'activo' : ''}`}
            onClick={() => setTipoActivo(t)}
          >
            {t === 'Todos' && 'Todos los tipos'}
            {t === 'OTC'   && '🟢 Venta libre (OTC)'}
            {t === 'Rx'    && '🔴 Con receta (Rx)'}
          </button>
        ))}
      </div>

      {/* BOTONES DE ESPECIALIDADES DINÁMICOS CONECTADOS A LA BD */}
      <div className="filtros-container">
        <button
          className={`filtro-btn ${especialidadActiva === '' ? 'activo' : ''}`}
          onClick={() => setEspecialidadActiva('')}
        >
          Todos
        </button>
        {especialidades.map(esp => (
          <button
            key={esp.id}
            className={`filtro-btn ${especialidadActiva === esp.id ? 'activo' : ''}`}
            onClick={() => setEspecialidadActiva(esp.id)}
          >
            {esp.nombre}
          </button>
        ))}
      </div>

      <div className="catalogo-resultados-bar">
        {!loading && (
          <span className="catalogo-resultados-texto">
            {medicamentos.length === 0 ? 'Sin resultados' : `${medicamentos.length} medicamento${medicamentos.length !== 1 ? 's' : ''}`}
          </span>
        )}
        {hayFiltrosActivos && <button className="catalogo-limpiar-btn" onClick={limpiarFiltros}>Limpiar filtros</button>}
      </div>

      {error && <div className="catalogo-error"><span>⚠️ {error}</span><button onClick={cargarMedicamentos}>Reintentar</button></div>}

      <div className="medicamentos-grid">
        {loading
          ? Array(6).fill(0).map((_, i) => <MedicamentoSkeleton key={i} />)
          : medicamentos.length === 0 && !error
          ? (
            <div className="sin-resultados">
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
              <p>No hay fármacos registrados bajo esta especialidad médica.</p>
              <button className="filtro-btn" style={{ marginTop: '1rem' }} onClick={limpiarFiltros}>Ver todos</button>
            </div>
          )
          : medicamentos.map(med => (
            <div key={med.id} className="medicamento-card">
              <div className="medicamento-imagen-container">
                <img
                  src={med.imagen_url || '/medicamentos/default.png'}
                  alt={med.nombre_comercial}
                  className="medicamento-imagen"
                  onError={e => {
                    e.target.src = `https://placehold.co/200x200/f5f5f5/9ca3af?text=${encodeURIComponent(med.nombre_comercial?.split(' ')[0] || 'Med')}`;
                  }}
                />
              </div>

              <div className="medicamento-detalles">
                {/* Imprimimos el nombre de la especialidad buscándolo por su ID */}
                <span className="badge-especialidad">
                  {obtenerNombreEspecialidad(med.id_especialidad)}
                </span>
                <TipoBadge tipo={med.tipo} />

                <h3 className="medicamento-nombre">{med.nombre_comercial}</h3>

                <div className="medicamento-metadatos">
                  <div className="metadato-row">
                    <span className="etiqueta-pequena">Principio activo:</span>
                    <span className="etiqueta-valor">{med.principio_activo}</span>
                  </div>
                  {med.laboratorio && (
                    <div className="metadato-row">
                      <span className="etiqueta-pequena">Laboratorio:</span>
                      <span className="etiqueta-valor">{med.laboratorio}</span>
                    </div>
                  )}
                </div>

                <button className="ver-ficha-btn" onClick={() => setSelectedMed(med)}>Ver ficha técnica →</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* MODAL FICHA TÉCNICA */}
      {selectedMed && (
        <div className="modal-overlay" onClick={() => setSelectedMed(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMed(null)}>&times;</button>
            <div className="modal-body">
              <div className="modal-header-info">
                <span className="modal-badge">{obtenerNombreEspecialidad(selectedMed.id_especialidad)}</span>
                <h2 style={{ marginBottom: '8px' }}>{selectedMed.nombre_comercial}</h2>
                <TipoBadge tipo={selectedMed.tipo} />
              </div>

              {/* AQUÍ AGREGAMOS LA DESCRIPCIÓN */}
              {selectedMed.descripcion && (
                <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.5px' }}>
                    Indicaciones / Descripción
                  </h4>
                  <p style={{ color: '#334155', lineHeight: '1.6', margin: 0, fontSize: '15px' }}>
                    {selectedMed.descripcion}
                  </p>
                </div>
              )}

              <div className="modal-grid-info">
                <div className="info-block">
                  <h4>Principio activo</h4>
                  <p>{selectedMed.principio_activo}</p>
                </div>
                
                <div className="info-block">
                  <h4>Laboratorio</h4>
                  <p>{selectedMed.laboratorio || 'No especificado'}</p>
                </div>

                {/* AQUÍ AGREGAMOS LA PRESENTACIÓN (Ej: Caja x 30) */}
                {selectedMed.presentaciones && (
                  <div className="info-block">
                    <h4>Presentación</h4>
                    <p>{selectedMed.presentaciones}</p>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button 
                  className="modal-agendar-btn" 
                  onClick={() => { 
                    setSelectedMed(null); 
                    navigate('/agendar'); 
                  }}
                >
                  Solicitar cita médica →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}