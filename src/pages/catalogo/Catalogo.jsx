import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import './Catalogo.css';

// ── Tus Datos de Respaldo Recuperados ────────────────────────────────────────
const medicamentosDeRespaldo = [
  {
    id: 'm1',
    nombre_comercial: 'Losartán Potásico 50mg',
    principio_activo: 'Losartán',
    laboratorio: 'Genfar',
    categoria: 'Cardiología',
    tipo: 'Rx',
    registro_invima: 'INVIMA 2019M-0009432',
    presentaciones: 'Caja con 30 tabletas.',
    descripcion: 'Medicamento indicado para el control de la hipertensión arterial esencial.',
    indicaciones: 'Tomar una tableta al día, preferiblemente a la misma hora, según indicación médica.',
    contraindicaciones: 'No consumir durante el embarazo o lactancia. Hipersensibilidad al principio activo.'
  },
  {
    id: 'm2',
    nombre_comercial: 'Atorvastatina 20mg',
    principio_activo: 'Atorvastatina Cálcica',
    laboratorio: 'Lafrancol',
    categoria: 'Cardiología',
    tipo: 'Rx',
    registro_invima: 'INVIMA 2021M-0012455',
    presentaciones: 'Caja con 28 tabletas.',
    descripcion: 'Utilizado para disminuir los niveles de colesterol y triglicéridos en la sangre.',
    indicaciones: 'Administración por vía oral una vez al día. Se recomienda acompañar de una dieta baja en grasas.',
    contraindicaciones: 'Enfermedad hepática activa, embarazo y lactancia.'
  },
  {
    id: 'm3',
    nombre_comercial: 'Betametasona 0.05% Crema',
    principio_activo: 'Betametasona dipropionato',
    laboratorio: 'Tecnoquímicas',
    categoria: 'Dermatología',
    tipo: 'Rx',
    registro_invima: 'INVIMA 2018M-0004122',
    presentaciones: 'Tubo por 40g.',
    descripcion: 'Corticoide tópico para el alivio de manifestaciones inflamatorias y pruríticas de las dermatosis.',
    indicaciones: 'Aplicar una capa delgada sobre el área afectada 1 o 2 veces al día.',
    contraindicaciones: 'Infecciones cutáneas bacterianas, virales o fúngicas no tratadas.'
  },
  {
    id: 'm4',
    nombre_comercial: 'Acetaminofén Jarabe 150mg/5mL',
    principio_activo: 'Acetaminofén (Paracetamol)',
    laboratorio: 'MK',
    categoria: 'Pediatría',
    tipo: 'OTC',
    registro_invima: 'INVIMA 2020M-0019877',
    presentaciones: 'Frasco por 120mL con dosificador.',
    descripcion: 'Analgésico y antipirético ideal para el alivio del dolor y la fiebre en niños.',
    indicaciones: 'Dosificar según el peso y edad del niño. No superar la dosis máxima recomendada.',
    contraindicaciones: 'Hipersensibilidad al acetaminofén. Usar con precaución en pacientes con daño hepático.'
  }
];

const categoriasDeRespaldo = ['Cardiología', 'Dermatología', 'Pediatría', 'Neurología', 'Ginecología', 'Medicina General'];

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
      {tipo?.toUpperCase() === 'OTC' ? '🟢 Venta libre' : '🔴 Requiere Rx'}
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
  const [tipoActivo,      setTipoActivo]      = useState('Todos'); 
  const [buscar,          setBuscar]          = useState('');
  const [buscarInput,     setBuscarInput]     = useState('');   

  // ── Modal ────────────────────────────────────────────────────────────────
  const [selectedMed, setSelectedMed] = useState(null);

  // ─── Cargar categorías al montar ─────────────────────────────────────────
  useEffect(() => {
    api.get('/medicamentos/categorias')
      .then(data => {
        if (data && data.length > 0) {
          setCategorias(data);
        } else {
          setCategorias(categoriasDeRespaldo);
        }
      })
      .catch(() => setCategorias(categoriasDeRespaldo));
  }, []);

  // ─── Cargar medicamentos cuando cambian los filtros ───────────────────────
  const cargarMedicamentos = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (categoriaActiva !== 'Todos') params.set('categoria', categoriaActiva);
    if (tipoActivo      !== 'Todos') params.set('tipo',      tipoActivo);
    if (buscar.trim())                params.set('buscar',    buscar.trim());

    const query = params.toString() ? `?${params.toString()}` : '';

    api.get(`/medicamentos${query}`)
      .then(data => {
        // SI EL BACKEND RESPONDE VACÍO, METEMOS TUS DATOS MAQUETADOS APLICANDO LOS FILTROS LOCALMENTE
        if (!data || data.length === 0) {
          let filtrados = medicamentosDeRespaldo;
          
          if (categoriaActiva !== 'Todos') {
            filtrados = filtrados.filter(m => m.categoria === categoriaActiva);
          }
          if (tipoActivo !== 'Todos') {
            filtrados = filtrados.filter(m => m.tipo?.toUpperCase() === tipoActivo.toUpperCase());
          }
          if (buscar.trim()) {
            const termino = buscar.toLowerCase();
            filtrados = filtrados.filter(m => 
              m.nombre_comercial.toLowerCase().includes(termino) || 
              m.principio_activo.toLowerCase().includes(termino)
            );
          }
          setMedicamentos(filtrados);
        } else {
          setMedicamentos(data);
        }
      })
      .catch(() => {
        // En caso de que falle el backend por completo (ej. server apagado), mostramos tus datos como salvavidas
        let filtrados = medicamentosDeRespaldo;
        if (categoriaActiva !== 'Todos') filtrados = filtrados.filter(m => m.categoria === categoriaActiva);
        if (tipoActivo !== 'Todos') filtrados = filtrados.filter(m => m.tipo?.toUpperCase() === tipoActivo.toUpperCase());
        setMedicamentos(filtrados);
      })
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

      {/* Filtros por categoría */}
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

      {/* Resumen de resultados */}
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
                        med.nombre_comercial ? med.nombre_comercial.split(' ')[0] : 'Med'
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