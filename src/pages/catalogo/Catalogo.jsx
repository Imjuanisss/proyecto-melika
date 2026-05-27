// src/pages/catalogo/Catalogo.jsx
import { useState, useEffect } from 'react';
import './Catalogo.css';

const initialMedicationData = [
  // 1. CARDIOLOGÍA
  {
    id: 1,
    especialidad: 'Cardiología',
    image: '/medicamentos/losartan.jpg',
    nombre: 'Losartán Potásico 50mg',
    principioActivo: 'Losartán',
    laboratorio: 'Genfar',
    presentacion: 'Caja con 30 tabletas.',
    descripcion: 'Antihipertensivo indicado para el tratamiento de la hipertensión arterial esencial. Ayuda a proteger los riñones en pacientes con diabetes tipo 2 y reduce el riesgo de accidente cerebrovascular.'
  },
  {
    id: 2,
    especialidad: 'Cardiología',
    image: '/medicamentos/atorvastatina.jpg',
    nombre: 'Atorvastatina 20mg',
    principioActivo: 'Atorvastatina Cálcica',
    laboratorio: 'Lafrancol',
    presentacion: 'Caja con 28 tabletas recubiertas.',
    descripcion: 'Estatina indicada para reducir los niveles de colesterol total, colesterol LDL ("malo") y triglicéridos en sangre, previniendo eventos cardiovasculares como infartos en pacientes de alto riesgo.'
  },

  // 2. DERMATOLOGÍA
  {
    id: 3,
    especialidad: 'Dermatología',
    image: '/medicamentos/acido-retinoico.jpg',
    nombre: 'Betametasona 0.05% Crema',
    principioActivo: 'Betametasona dipropionato',
    laboratorio: 'Tecnoquímicas',
    presentacion: 'Tubo por 40g.',
    descripcion: 'Corticoide tópico de alta potencia indicado para el alivio de manifestaciones inflamatorias y prurito en dermatosis que responden a corticosteroides, como psoriasis y eccemas rebeldes.'
  },

  // 3. PEDIATRÍA
  {
    id: 4,
    especialidad: 'Pediatría',
    image: '/medicamentos/acetaminofen-jarabe.jpg',
    nombre: 'Acetaminofén Jarabe 150mg/5mL',
    principioActivo: 'Acetaminofén (Paracetamol)',
    laboratorio: 'MK',
    presentacion: 'Frasco por 60 mL sabor a fresa.',
    descripcion: 'Analgésico y antipirético de uso pediátrico. Indicado para el control de la fiebre y el alivio del dolor leve a moderado en niños, como el causado por procesos virales o dentición.'
  },

  // 4. NEUROLOGÍA
  {
    id: 5,
    especialidad: 'Neurología',
    image: '/medicamentos/gabapentina.jpg',
    nombre: 'Gabapentina 300mg',
    principioActivo: 'Gabapentina',
    laboratorio: 'Procaps',
    presentacion: 'Caja con 30 cápsulas.',
    descripcion: 'Anticonvulsivo utilizado para el tratamiento del dolor neuropático periférico, como la neuralgia postherpética o la neuropatía diabética, y como terapia añadida en crisis convulsivas parciales.'
  },

  // 5. GINECOLOGÍA
  {
    id: 6,
    especialidad: 'Ginecología',
    image: '/medicamentos/acido-folico.jpg',
    nombre: 'Ácido Fólico 5mg',
    principioActivo: 'Ácido Fólico (Vitamina B9)',
    laboratorio: 'Sanofi',
    presentacion: 'Caja con 30 tabletas.',
    descripcion: 'Suplemento vitamínico esencial previene defectos del tubo neural (como espina bífida) en el feto. Recomendado antes de la concepción y durante los primeros meses del embarazo.'
  },

  // 6. MEDICINA GENERAL
  {
    id: 7,
    especialidad: 'Medicina General',
    image: '/medicamentos/ibuprofeno.jpg',
    nombre: 'Ibuprofeno 400mg',
    principioActivo: 'Ibuprofeno',
    laboratorio: 'Laproff',
    presentacion: 'Caja con 20 tabletas.',
    descripcion: 'Antiinflamatorio no esteroideo (AINE) con acción analgésica y antipirética. Indicado para aliviar dolores de cabeza, articulares, musculares y dolores menstruales ordinarios.'
  }
];

function Catalogo() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');

  // Lista de especialidades basada en tu sección de la web
  const especialidades = ['Todos', 'Cardiología', 'Dermatología', 'Pediatría', 'Neurología', 'Ginecología', 'Medicina General'];

  useEffect(() => {
    setMedicamentos(initialMedicationData);
  }, []);

  // Filtrado lógico de los medicamentos
  const medicamentosFiltrados = categoriaActiva === 'Todos'
    ? medicamentos
    : medicamentos.filter(med => med.especialidad === categoriaActiva);

  return (
    <div className="catalogo-page">
      <div className="catalogo-header-container">
        <h1 className="catalogo-main-title">Catálogo Especializado de Medicamentos</h1>
        <p className="catalogo-subtitle">Información técnica clasificada por especialidad médica</p>
      </div>

      {/* Menú de Filtros por Especialidad */}
      <div className="filtros-container">
        {especialidades.map((esp) => (
          <button
            key={esp}
            className={`filtro-btn ${categoriaActiva === esp ? 'activo' : ''}`}
            onClick={() => setCategoriaActiva(esp)}
          >
            {esp}
          </button>
        ))}
      </div>

      {/* Grid de medicamentos filtrados */}
      <div className="medicamentos-grid">
        {medicamentosFiltrados.length > 0 ? (
          medicamentosFiltrados.map(med => (
            <div key={med.id} className="medicamento-card">
              <div className="medicamento-imagen-container">
                {med.image ? (
                  <img src={med.image} alt={med.nombre} className="medicamento-imagen" />
                ) : (
                  <img src="https://placehold.co/200x200/f5f5f5/cccccc?text=Medicina" alt="No disponible" className="medicamento-placeholder" />
                )}
              </div>
              
              <div className="medicamento-detalles">
                <span className="badge-especialidad">{med.especialidad}</span>
                <h3 className="medicamento-nombre">{med.nombre}</h3>
                
                <div className="medicamento-metadatos">
                  <div className="metadato-row">
                    <span className="etiqueta-pequena">Componente:</span>
                    <span className="etiqueta-valor">{med.principioActivo}</span>
                  </div>
                  <div className="metadato-row">
                    <span className="etiqueta-pequena">Laboratorio:</span>
                    <span className="etiqueta-valor">{med.laboratorio}</span>
                  </div>
                </div>
                
                <p className="medicamento-presentacion"><b>Presentación:</b> {med.presentacion}</p>
                <p className="medicamento-descripcion">{med.descripcion}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="sin-resultados">No hay medicamentos registrados en esta especialidad.</p>
        )}
      </div>
    </div>
  );
}

export default Catalogo;