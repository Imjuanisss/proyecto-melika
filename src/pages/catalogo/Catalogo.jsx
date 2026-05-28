import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import './Catalogo.css';

// ── TUS ESPECIALIDADES MÉDICAS (FIJAS EN FRONTEND) ─────────────────────────
const misEspecialidades = ['Todos', 'Cardiología', 'Dermatología', 'Pediatría', 'Neurología', 'Ginecología', 'Medicina General'];

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
  const [loading,      setLoading]        = useState(true);
  const [error,        setError]          = useState(null);

  const [categoriaActiva, setCategoriaActiva] = useState('Todos'); // Filtrará por tu lista médica
  const [tipoActivo,      setTipoActivo]      = useState('Todos'); 
  const [buscar,          setBuscar]          = useState('');
  const [buscarInput,     setBuscarInput]     = useState('');   

  const [selectedMed, setSelectedMed] = useState(null);

  // ─── Función inteligente para mapear medicamentos a especialidades ────────
  const asignarEspecialidadAutomatica = (med) => {
    // Si el backend de tu compañero llega a traer una columna "especialidad", la usamos
    if (med.especialidad) return med.especialidad;
    
    const nombre = med.nombre_comercial?.toLowerCase() || '';
    const principio = med.principio_activo?.toLowerCase() || '';
    const catOriginal = med.categoria?.toLowerCase() || ''; // Por si viene de su tabla farmacéutica

    // Mapeo inteligente por palabras clave
    if (nombre.includes('losartán') || principio.includes('enalapril') || principio.includes('atorvastatina') || catOriginal.includes('cardio')) {
      return 'Cardiología';
    }
    if (nombre.includes('crema') || principio.includes('betametasona') || nombre.includes('gel') || catOriginal.includes('derma')) {
      return 'Dermatología';
    }
    if (nombre.includes('jarabe') || nombre.includes('pediátrico') || principio.includes('acetaminofén') || catOriginal.includes('pedia')) {
      return 'Pediatría';
    }
    if (nombre.includes('ácido') || principio.includes('ibuprofeno')) {
      return 'Medicina General';
    }
    
    // De respaldo si no coincide con ninguna
    return 'Medicina General';
  };

  // ─── Cargar medicamentos filtrados ───────────────────────────────────────
  const cargarMedicamentos = useCallback(() => {
    setLoading(true);
    setError(null);

    // Le pedimos todos los medicamentos al backend de tu compañero sin el filtro de categorías de él
    const params = new URLSearchParams();
    if (tipoActivo !== 'Todos') params.set('tipo', tipoActivo);
    if (buscar.trim())          params.set('buscar', buscar.trim());

    const query = params.toString() ? `?${params.toString()}` : '';

    api.get(`/medicamentos${query}`)
      .then(data => {
        const listaNormalizada = (data || []).map(med => ({
          ...med,
          // Le inyectamos tu especialidad médica de forma dinámica al objeto
          categoriaMedica: asignarEspecialidadAutomatica(med)
        }));

        // Aplicamos tu filtro por especialidades en el Frontend
        if (categoriaActiva !== 'Todos') {
          const filtrados = listaNormalizada.filter(m => m.categoriaMedica === categoriaActiva);
          setMedicamentos(filtrados);
        } else {
          setMedicamentos(listaNormalizada);
        }
      })
      .catch(() => setError('No se pudo conectar al servidor de Melika.'))
      .finally(() => setLoading(false));
  }, [categoriaActiva, tipoActivo, buscar]);

  useEffect(() => {
    cargarMedicamentos();
  }, [cargarMedicamentos]);

  useEffect(() => {
    const timer = setTimeout(() => setBuscar(buscarInput), 300);
    return () => clearTimeout(timer);
  }, [buscarInput]);

  function limpiarFiltros() {
    setCategoriaActiva('Todos');
    setTipoActivo('Todos');
    setBuscarInput('');
    setBuscar('');
  }

  const hayFiltrosActivos = categoriaActiva !== 'Todos' || tipoActivo !== 'Todos' || buscar.trim().length > 0;

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

      {/* TUS BOTONES DE ESPECIALIDADES MÉDICAS DEFINITIVOS */}
      <div className="filtros-container">
        {misEspecialidades.map(cat => (
          <button
            key={cat}
            className={`filtro-btn ${categoriaActiva === cat ? 'activo' : ''}`}
            onClick={() => setCategoriaActiva(cat)}
          >
            {cat}
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
                {/* Mostramos tu categoría médica inyectada */}
                <span className="badge-especialidad">{med.categoriaMedica}</span>
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

      {/* MODAL */}
      {selectedMed && (
        <div className="modal-overlay" onClick={() => setSelectedMed(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMed(null)}>&times;</button>
            <div className="modal-body">
              <div className="modal-header-info">
                <span className="modal-badge">{selectedMed.categoriaMedica}</span>
                <h2>{selectedMed.nombre_comercial}</h2>
              </div>
              <div className="modal-grid-info">
                <div className="info-block">
                  <h4>Principio activo</h4>
                  <p>{selectedMed.principio_activo}</p>
                </div>
                <div className="info-block">
                  <h4>Laboratorio</h4>
                  <p>{selectedMed.laboratorio || 'No especificado'}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="modal-agendar-btn" onClick={() => { setSelectedMed(null); navigate('/agendar'); }}>Solicitar cita médica →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}