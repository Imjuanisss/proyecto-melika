// src/pages/especialidades/Especialidades.jsx
import { useState, useEffect } from 'react';
import './Especialidades.css';

const mockEspecialidades = [
  {
    id: 1,
    nombre: 'Cardiología',
    descripcion: 'Salud cardiovascular y prevención.',
    precio_base: 80000,
    image: '/especialidades/cardiologia.jpg' // Recuerda que puedes meter fotos en public/especialidades/
  },
  {
    id: 2,
    nombre: 'Dermatología',
    descripcion: 'Cuidado integral de la piel.',
    precio_base: 70000,
    image: '/especialidades/dermatologia.jpg'
  },
  {
    id: 3,
    nombre: 'Pediatría',
    descripcion: 'Atención especializada en niños.',
    precio_base: 65000,
    image: '/especialidades/pediatria.jpg'
  },
  {
    id: 4,
    nombre: 'Neurología',
    descripcion: 'Sistema nervioso y cerebro.',
    precio_base: 90000,
    image: '/especialidades/neurologia.jpg'
  },
  {
    id: 5,
    nombre: 'Ginecología',
    descripcion: 'Salud femenina integral.',
    precio_base: 75000,
    image: '/especialidades/ginecologia.jpg'
  },
  {
    id: 6,
    nombre: 'Medicina General',
    descripcion: 'Tu primer punto de atención.',
    precio_base: 45000,
    image: '/especialidades/medicina-general.jpg'
  }
];

function Especialidades() {
  const [especialidades, setEspecialidades] = useState([]);

  useEffect(() => {
    // Simulamos la carga de datos locales inmediatamente
    setEspecialidades(mockEspecialidades);
  }, []);

  return (
    <div className="especialidades-page">
      <div className="especialidades-header">
        <h1 className="esp-main-title">Nuestras Especialidades Médicas</h1>
        <p className="esp-subtitle">Encuentra la atención profesional y especializada que necesitas hoy</p>
      </div>

      <div className="especialidades-grid">
        {especialidades.map((esp) => (
          <div key={esp.id} className="especialidad-card">
            <div className="esp-image-container">
              {esp.image ? (
                <img 
                  src={esp.image} 
                  alt={esp.nombre} 
                  className="esp-card-img"
                  onError={(e) => {
                    // Si no encuentra la imagen real en la carpeta public, pone un color gris de respaldo
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div class="esp-placeholder-icon">🩺</div>';
                  }}
                />
              ) : (
                <div className="esp-placeholder-icon">🩺</div>
              )}
            </div>
            
            <div className="esp-card-body">
              <h3 className="esp-card-title">{esp.nombre}</h3>
              <p className="esp-card-desc">{esp.descripcion}</p>
              
              <div className="esp-card-footer">
                <span className="esp-price">
                  Desde ${esp.precio_base.toLocaleString('es-CO')} COP
                </span>
                
                <button 
                  className="esp-agendar-btn"
                  onClick={() => window.location.href = `/agendar?esp=${esp.nombre.toLowerCase()}`}
                >
                  Agendar →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Especialidades;