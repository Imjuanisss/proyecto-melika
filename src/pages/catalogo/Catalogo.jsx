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
    descripcion: 'Antihipertensivo indicado para el tratamiento de la hipertensión arterial esencial. Ayuda a proteger los riñones en pacientes con diabetes tipo 2 y reduce el riesgo de accidente cerebrovascular.',
    uso: 'Tomar 1 tableta al día, preferiblemente a la misma hora, con o sin alimentos según indicación médica.',
    advertencias: 'Puede causar mareos al inicio del tratamiento. Controle su presión arterial regularmente.',
    contraindicaciones: 'Hipersensibilidad al componente, segundo y tercer trimestre de embarazo, insuficiencia hepática grave.'
  },
  {
    id: 2,
    especialidad: 'Cardiología',
    image: '/medicamentos/atorvastatina.jpg',
    nombre: 'Atorvastatina 20mg',
    principioActivo: 'Atorvastatina Cálcica',
    laboratorio: 'Lafrancol',
    presentacion: 'Caja con 28 tabletas recubiertas.',
    descripcion: 'Estatina indicada para reducir los niveles de colesterol total, colesterol LDL ("malo") y triglicéridos en sangre, previniendo eventos cardiovasculares como infartos en pacientes de alto riesgo.',
    uso: 'Tomar 1 tableta una vez al día, idealmente en la noche junto con una dieta balanceada baja en grasas.',
    advertencias: 'Realizar exámenes de control hepático periódicos. Suspender si presenta dolor muscular injustificado.',
    contraindicaciones: 'Enfermedad hepática activa, embarazo, lactancia y menores de 10 años.'
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
    descripcion: 'Corticoide tópico de alta potencia indicado para el alivio de manifestaciones inflamatorias y prurito en dermatosis que responden a corticosteroides, como psoriasis y eccemas rebeldes.',
    uso: 'Aplicar una capa delgada sobre el área afectada 1 o 2 veces al día frotando suavemente.',
    advertencias: 'No aplicar en la cara por periodos prolongados. Evitar el contacto con los ojos y heridas abiertas.',
    contraindicaciones: 'Infecciones cutáneas virales (como herpes o varicela), bacterianas o fúngicas no tratadas.'
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
    descripcion: 'Analgésico y antipirético de uso pediátrico. Indicado para el control de la fiebre y el alivio del dolor leve a moderado en niños, como el causado por procesos virales o dentición.',
    uso: 'La dosis se calcula según el peso del paciente. Usualmente 10-15 mg/kg por dosis cada 4 a 6 horas.',
    advertencias: 'No superar la dosis máxima diaria recomendada para evitar riesgo de toxicidad hepática.',
    contraindicaciones: 'Hipersensibilidad al paracetamol, insuficiencia hepática grave o enfermedad celíaca (si contiene gluten).'
  },

  // 4. NEUROLOGÍA
  {
    id: 5,
    especialidad: 'Neurología',
    image: '/medicamentos/gabapentina.png',
    nombre: 'Gabapentina 300mg',
    principioActivo: 'Gabapentina',
    laboratorio: 'Procaps',
    presentacion: 'Caja con 30 cápsulas.',
    descripcion: 'Anticonvulsivo utilizado para el tratamiento del dolor neuropático periférico, como la neuralgia postherpética o la neuropatía diabética, y como terapia añadida en crisis convulsivas parciales.',
    uso: 'Iniciar con dosis bajas e incrementar paulatinamente siguiendo el esquema recetado por el neurólogo.',
    advertencias: 'Puede producir somnolencia y reducir los reflejos. No suspender el tratamiento de forma abrupta.',
    contraindicaciones: 'Hipersensibilidad al medicamento, antecedentes de pancreatitis aguda.'
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
    descripcion: 'Suplemento vitamínico esencial previene defectos del tubo neural (como espina bífida) en el feto. Recomendado antes de la concepción y durante los primeros meses del embarazo.',
    uso: 'Tomar 1 tableta diaria, preferiblemente en las mañanas antes de la comida principal.',
    advertencias: 'Dosis elevadas pueden enmascarar síntomas de anemia perniciosa por deficiencia de vitamina B12.',
    contraindicaciones: 'Anemia perniciosa no tratada o hipersensibilidad al principio activo.'
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
    descripcion: 'Antiinflamatorio no esteroideo (AINE) con acción analgésica y antipirética. Indicado para aliviar dolores de cabeza, articulares, musculares y dolores menstruales ordinarios.',
    uso: 'Tomar 1 tableta cada 6 u 8 horas acompañado de alimentos para proteger el estómago.',
    advertencias: 'Evitar uso prolongado sin supervisión debido a riesgos gastrointestinales y renales.',
    contraindicaciones: 'Úlcera péptica activa, sangrado gastrointestinal, insuficiencia cardíaca grave y último trimestre de embarazo.'
  }
];

function Catalogo() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [selectedMed, setSelectedMed] = useState(null); // 👈 Controla el medicamento abierto en el modal

  const pedigrees = ['Todos', 'Cardiología', 'Dermatología', 'Pediatría', 'Neurología', 'Ginecología', 'Medicina General'];

  useEffect(() => {
    setMedicamentos(initialMedicationData);
  }, []);

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
        {pedigrees.map((esp) => (
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

                {/* Botón para abrir la ventana emergente */}
                <button 
                  className="ver-ficha-btn" 
                  onClick={() => setSelectedMed(med)}
                >
                  Ver Ficha Técnica →
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="sin-resultados">No hay medicamentos registrados en esta especialidad.</p>
        )}
      </div>

      {/* --- CÓDIGO DEL MODAL (VENTANA EMERGENTE) --- */}
      {selectedMed && (
        <div className="modal-overlay" onClick={() => setSelectedMed(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMed(null)}>&times;</button>
            
            <div className="modal-body">
              <div className="modal-header-info">
                <span className="modal-badge">{selectedMed.especialidad}</span>
                <h2>{selectedMed.nombre}</h2>
                <p className="modal-lab">Fabricado por: {selectedMed.laboratorio}</p>
              </div>

              <div className="modal-grid-info">
                <div className="info-block">
                  <h4>Principio Activo</h4>
                  <p>{selectedMed.principioActivo}</p>
                </div>
                <div className="info-block">
                  <h4>Presentación Comercial</h4>
                  <p>{selectedMed.presentacion}</p>
                </div>
              </div>

              <div className="modal-technical-section">
                <div className="tech-item">
                  <span className="tech-icon">📋</span>
                  <div>
                    <h5>Indicación y Modo de Uso</h5>
                    <p>{selectedMed.uso}</p>
                  </div>
                </div>
                <div className="tech-item warning">
                  <span className="tech-icon">⚠️</span>
                  <div>
                    <h5>Advertencias Especiales</h5>
                    <p>{selectedMed.advertencias}</p>
                  </div>
                </div>
                <div className="tech-item danger">
                  <span className="tech-icon">🚫</span>
                  <div>
                    <h5>Contraindicaciones Generales</h5>
                    <p>{selectedMed.contraindicaciones}</p>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <p>La información contenida aquí es de carácter estrictamente instructivo. Nunca se automedique.</p>
                <button className="modal-agendar-btn" onClick={() => window.location.href='/agendar'}>
                  Solicitar Cita Médica Relacionada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Catalogo;