import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { api } from '../../lib/apiClient';
import './Especialidades.css'; // <- Vinculamos tus estilos nativos personalizados

const especialidadesMock = [
  {
    id: 1,
    nombre: 'Cardiología',
    descripcion: 'Salud cardiovascular y prevención.',
    precio_base: 80000,
    imagen_url: '' 
  },
  {
    id: 2,
    nombre: 'Dermatología',
    descripcion: 'Cuidado integral de la piel.',
    precio_base: 70000,
    imagen_url: ''
  },
  {
    id: 3,
    nombre: 'Pediatría',
    descripcion: 'Atención especializada en niños.',
    precio_base: 65000,
    imagen_url: ''
  }
];

export default function Especialidades() {
  const navigate = useNavigate(); 
  const [especialidades, setEspecialidades] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarEspecialidades = async () => {
      try {
        setCargando(true);
        const { data } = await api.get('/especialidades');
        
        if (data && data.length > 0) {
          setEspecialidades(data);
        } else {
          setEspecialidades(especialidadesMock);
        }
      } catch (err) {
        console.error("Error al cargar especialidades, usando respaldo:", err);
        setEspecialidades(especialidadesMock);
      } finally {
        setCargando(false);
      }
    };

    cargarEspecialidades();
  }, []);

  if (cargando) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p style={{ color: '#666', fontWeight: '500' }}>Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="especialidades-container">
      
      {/* Encabezado */}
      <div className="especialidades-header">
        <span className="esp-tag">Red Médica</span>
        <h1 className="esp-title">Especialidades disponibles</h1>
        <p className="esp-subtitle">Profesionales certificados listos para atenderte.</p>
      </div>

      {/* Grid de Tarjetas */}
      <div className="especialidades-grid">
        {especialidades.map((esp) => (
          <div key={esp.id} className="especialidad-card">
            
            <div>
              {/* Contenedor de Imagen */}
              <div className="esp-image-container">
                <img 
                  src={esp.imagen_url || 'https://via.placeholder.com/400x300?text=Melika+Medicina'} 
                  alt={esp.nombre}
                  className="esp-card-img"
                />
              </div>

              {/* Título y Descripción */}
              <h3 className="esp-card-title">{esp.nombre}</h3>
              <p className="esp-card-desc">{esp.descripcion}</p>
            </div>
            
            {/* Footer de la tarjeta */}
            <div className="esp-card-footer">
              <div className="esp-price">
                Desde <span>${Number(esp.precio_base).toLocaleString('es-CO')} COP</span>
              </div>
              
              <button 
                onClick={() => navigate(`/especialidades/${esp.id}/medicos`)}
                className="esp-agendar-btn"
              >
                Agendar →
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}