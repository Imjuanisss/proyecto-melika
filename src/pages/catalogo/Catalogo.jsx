import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import './Catalogo.css';

// ── Skeleton de tarjeta ────────────────────────────────────────────────────
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

// ── Badge por tipo ─────────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  return (
    <span className={`badge-tipo badge-tipo--${tipo?.toLowerCase()}`}>
      {tipo === 'OTC' ? '🟢 Venta libre' : '🔴 Requiere Rx'}
    </span>
  );
}

export default function Catalogo() {
  const navigate = useNavigate();

  // ── Estado de datos ──────────────────────────────────────────────────────
  const [medicamentos, setMedicamentos]   = useState([]);
  const [categorias,   setCategorias]     = useState([]);
  const [loading,      setLoading]        = useState(true);
  const [error,        setError]          = useState(null);

  // ── Estado de filtros ────────────────────────────────────────────────────
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [tipoActivo,      setTipoActivo]      = useState('Todos'); // 'Todos' | 'OTC' | 'Rx'
  const [buscar,          setBuscar]          = useState('');
  const [buscarInput,     setBuscarInput]     = useState('');   // estado del input (debounce)

  // ── Modal ────────────────────────────────────────────────────────────────
  const [selectedMed, setSelectedMed] = useState(null);

  // ─── Cargar categorías al montar ─────────────────────────────────────────
  useEffect(() => {
    api.get('/medicamentos/categorias')
      .then(data => setCategorias(data || []))
      .catch(() => setCategorias([])); // sin categorías => el filtro igualmente funciona
  }, []);

  // ─── Cargar medicamentos cuando cambian los filtros ───────────────────────
  const cargarMedicamentos = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (categoriaActiva !== 'Todos') params.set('categoria', categoriaActiva);
    if (tipoActivo      !== 'Todos') params.set('tipo',      tipoActivo);
    if (buscar.trim())               params.set('buscar',    buscar.trim());

    const query = params.toString() ? `?${params.toString()}` : '';

    api.get(`/medicamentos${query}`)
      .then(data => setMedicamentos(data || []))
      .catch(() => setError('No se pudo cargar el catálogo. Intenta nuevamente.'))
      .finally(() => setLoading(false));
  }, [categoriaActiva, tipoActivo, buscar]);

  useEffect(() => {
    cargarMedicamentos();
  }, [cargarMedicamentos]);

  // ─── Debounce del campo de búsqueda (300ms) ───────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setBuscar(buscarInput), 300);
    return () => clearTimeout(timer);
  }, [buscarInput]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function limpiarFiltros() {
    setCategoriaActiva('Todos');
    setTipoActivo('Todos');
    setBuscarInput('');
    setBuscar('');
  }

  const hayFiltrosActivos =
    categoriaActiva !== 'Todos' || tipoActivo !== 'Todos' || buscar.trim().length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="catalogo-page">

      {/* Encabezado */}
      <div className="catalogo-header-container">
        <h1 className="catalogo-main-title">Catálogo de Medicamentos</h1>
        <p className="catalogo-subtitle">
          Información técnica verificada · Medicamentos OTC y con receta (Rx)
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="catalogo-busqueda">
        <input
          type="text"
          className="catalogo-busqueda__input"
          placeholder="Buscar por nombre comercial o principio activo…"
          value={buscarInput}
          onChange={e => setBuscarInput(e.target.value)}
        />
        {buscarInput && (
          <button className="catalogo-busqueda__limpiar" onClick={() => setBuscarInput('')}>
            ✕
          </button>
        )}
      </div>

      {/* Filtros de tipo (OTC / Rx) */}
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

      {/* Filtros por categoría (dinámicos desde la BD) */}
      {categorias.length > 0 && (
        <div className="filtros-container">
          <button
            className={`filtro-btn ${categoriaActiva === 'Todos' ? 'activo' : ''}`}
            onClick={() => setCategoriaActiva('Todos')}
          >
            Todas las categorías
          </button>
          {categorias.map(cat => (
            <button
              key={cat}
              className={`filtro-btn ${categoriaActiva === cat ? 'activo' : ''}`}
              onClick={() => setCategoriaActiva(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Resumen de resultados + botón limpiar */}
      <div className="catalogo-resultados-bar">
        {!loading && (
          <span className="catalogo-resultados-texto">
            {medicamentos.length === 0
              ? 'Sin resultados'
              : `${medicamentos.length} medicamento${medicamentos.length !== 1 ? 's' : ''}`}
          </span>
        )}
        {hayFiltrosActivos && (
          <button className="catalogo-limpiar-btn" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="catalogo-error">
          <span>⚠️ {error}</span>
          <button onClick={cargarMedicamentos}>Reintentar</button>
        </div>
      )}

      {/* Grid de medicamentos */}
      <div className="medicamentos-grid">
        {loading
          ? Array(6).fill(0).map((_, i) => <MedicamentoSkeleton key={i} />)
          : medicamentos.length === 0 && !error
          ? (
            <div className="sin-resultados">
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
              <p>No se encontraron medicamentos con los filtros seleccionados.</p>
              <button className="filtro-btn" style={{ marginTop: '1rem' }} onClick={limpiarFiltros}>
                Ver todos
              </button>
            </div>
          )
          : medicamentos.map(med => (
            <div key={med.id} className="medicamento-card">

              {/* Imagen */}
              <div className="medicamento-imagen-container">
                <img
                  src={med.imagen_url || '/medicamentos/default.png'}
                  alt={med.nombre_comercial}
                  className="medicamento-imagen"
                  onError={e => {
                    e.target.src =
                      `https://placehold.co/200x200/f5f5f5/9ca3af?text=${encodeURIComponent(
                        med.nombre_comercial.split(' ')[0]
                      )}`;
                  }}
                />
              </div>

              {/* Detalles */}
              <div className="medicamento-detalles">
                {med.categoria && (
                  <span className="badge-especialidad">{med.categoria}</span>
                )}
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
                  {med.registro_invima && (
                    <div className="metadato-row">
                      <span className="etiqueta-pequena">INVIMA:</span>
                      <span className="etiqueta-valor" style={{ fontSize: '0.78rem' }}>
                        {med.registro_invima}
                      </span>
                    </div>
                  )}
                </div>

                {med.presentaciones && (
                  <p className="medicamento-presentacion">
                    <b>Presentación:</b> {med.presentaciones}
                  </p>
                )}

                {med.descripcion && (
                  <p className="medicamento-descripcion">{med.descripcion}</p>
                )}

                <button
                  className="ver-ficha-btn"
                  onClick={() => setSelectedMed(med)}
                >
                  Ver ficha técnica →
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── MODAL Ficha Técnica ───────────────────────────────────────────── */}
      {selectedMed && (
        <div className="modal-overlay" onClick={() => setSelectedMed(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMed(null)}>&times;</button>

            <div className="modal-body">
              {/* Header */}
              <div className="modal-header-info">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {selectedMed.categoria && (
                    <span className="modal-badge">{selectedMed.categoria}</span>
                  )}
                  <TipoBadge tipo={selectedMed.tipo} />
                </div>
                <h2>{selectedMed.nombre_comercial}</h2>
                {selectedMed.laboratorio && (
                  <p className="modal-lab">Fabricado por: {selectedMed.laboratorio}</p>
                )}
              </div>

              {/* Grid datos básicos */}
              <div className="modal-grid-info">
                <div className="info-block">
                  <h4>Principio activo</h4>
                  <p>{selectedMed.principio_activo}</p>
                </div>
                {selectedMed.presentaciones && (
                  <div className="info-block">
                    <h4>Presentaciones</h4>
                    <p>{selectedMed.presentaciones}</p>
                  </div>
                )}
                {selectedMed.registro_invima && (
                  <div className="info-block">
                    <h4>Registro INVIMA</h4>
                    <p style={{ fontSize: '0.85rem' }}>{selectedMed.registro_invima}</p>
                  </div>
                )}
                {selectedMed.descripcion && (
                  <div className="info-block" style={{ gridColumn: '1 / -1' }}>
                    <h4>Descripción</h4>
                    <p>{selectedMed.descripcion}</p>
                  </div>
                )}
              </div>

              {/* Sección técnica */}
              {(selectedMed.indicaciones || selectedMed.contraindicaciones) && (
                <div className="modal-technical-section">
                  {selectedMed.indicaciones && (
                    <div className="tech-item">
                      <span className="tech-icon">📋</span>
                      <div>
                        <h5>Indicaciones y modo de uso</h5>
                        <p>{selectedMed.indicaciones}</p>
                      </div>
                    </div>
                  )}
                  {selectedMed.contraindicaciones && (
                    <div className="tech-item danger">
                      <span className="tech-icon">🚫</span>
                      <div>
                        <h5>Contraindicaciones</h5>
                        <p>{selectedMed.contraindicaciones}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="modal-footer">
                <p>
                  La información es de carácter instructivo. Consulta siempre a tu médico antes de
                  iniciar o modificar cualquier tratamiento.
                </p>
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