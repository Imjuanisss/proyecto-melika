import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { api } from '../../lib/apiClient';
import './Especialidades.css'; // Vinculamos tus estilos nativos personalizados

const especialidadesMock = [
  {
    id: 1,
    nombre: 'Cardiología',
    descripcion: 'Evaluación, prevención y tratamiento de enfermedades del corazón y del sistema cardiovascular.',
    precio_base: 80000,
    imagen_url: '/imagenes/especialidades/cardiologia.jpg' 
  },
  {
    id: 2,
    nombre: 'Dermatología',
    descripcion: 'Diagnóstico y cuidado integral de patologías de la piel, pelo, uñas y tratamientos estéticos médicos.',
    precio_base: 70000,
    imagen_url: '/imagenes/especialidades/dermatologia.jpg'
  },
  {
    id: 3,
    nombre: 'Pediatría',
    descripcion: 'Atención médica integral, control de crecimiento y desarrollo para bebés, niños y adolescentes.',
    precio_base: 65000,
    imagen_url: '/imagenes/especialidades/pediatria.jpg'
  },
  {
    id: 4,
    nombre: 'Neurología',
    descripcion: 'Especialistas en trastornos complejos del cerebro, la médula espinal, los nervios y el sistema muscular.',
    precio_base: 90000,
    imagen_url: '/imagenes/especialidades/neurologia.jpg'
  },
  {
    id: 5,
    nombre: 'Ginecología',
    descripcion: 'Cuidado integral de la salud del sistema reproductor femenino, control prenatal y maternidad.',
    precio_base: 75000,
    imagen_url: '/imagenes/especialidades/ginecologia.jpg'
  },
  {
    id: 6,
    nombre: 'Medicina General',
    descripcion: 'Tu primer punto de contacto médico. Diagnóstico primario, remisiones y chequeos preventivos.',
    precio_base: 45000,
    imagen_url: '/imagenes/especialidades/medicina-general.jpg'
  },
  {
    id: 7,
    nombre: 'Ortopedia y Traumatología',
    descripcion: 'Tratamiento de lesiones óseas, fracturas, problemas articulares, musculares y correcciones de postura.',
    precio_base: 80000,
    imagen_url: '/imagenes/especialidades/ortopedia.jpg'
  },
  {
    id: 8,
    nombre: 'Oftalmología',
    descripcion: 'Cuidado avanzado de la visión, diagnóstico de enfermedades oculares y prescripción médica de lentes.',
    precio_base: 70000,
    imagen_url: '/imagenes/especialidades/oftalmologia.jpg'
  },
  {
    id: 9,
    nombre: 'Psiquiatría',
    descripcion: 'Evaluación médica y terapéutica de la salud mental, trastornos del ánimo, ansiedad y bienestar emocional.',
    precio_base: 85000,
    imagen_url: '/imagenes/especialidades/psiquiatria.jpg'
  },
  {
    id: 10,
    nombre: 'Otorrinolaringología',
    descripcion: 'Especialistas en el diagnóstico y tratamiento de oído, nariz, garganta y estructuras del cuello.',
    precio_base: 75000,
    imagen_url: '/imagenes/especialidades/otorrino.jpg'
  },
  {
    id: 11,
    nombre: 'Urología',
    descripcion: 'Atención del sistema urinario en ambos sexos y patologías del sistema reproductor masculino.',
    precio_base: 75000,
    imagen_url: '/imagenes/especialidades/urologia.jpg'
  },
  {
    id: 12,
    nombre: 'Nutrición y Dietética',
    descripcion: 'Planes alimenticios personalizados para control de peso, rendimiento deportivo o manejo de patologías.',
    precio_base: 55000,
    imagen_url: '/imagenes/especialidades/nutricion.jpg'
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
        const response = await api.get('/especialidades');
        
        // Manejo seguro de la respuesta de axios/fetch
        const dataArray = response?.data || response;
        
        if (dataArray && dataArray.length > 0) {
          setEspecialidades(dataArray);
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
        <h1 className="esp-title">Especialistas disponibles</h1>
        <p className="esp-subtitle">Profesionales certificados listos para atenderte hoy mismo.</p>
      </div>

      {/* Grid de Tarjetas */}
      <div className="especialidades-grid">
        {especialidades.map((esp) => (
          <div key={esp.id} className="especialidad-card">
            
            <div>
              {/* Contenedor de Imagen */}
              <div className="esp-image-container">
                <img 
                  src={esp.imagen_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80'} 
                  alt={esp.nombre}
                  className="esp-card-img"
                  loading="lazy"
                  onError={(e) => {
                    // Respaldo visual elegante si la imagen local aún no se encuentra en public/
                    e.target.src = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>

              {/* Título y Descripción */}
              <h3 className="esp-card-title">{esp.nombre}</h3>
              <p className="esp-card-desc">{esp.descripcion}</p>
            </div>
            
            {/* Footer de la tarjeta */}
            <div className="esp-card-footer">
              <div className="esp-price">
                Desde <span>${Number(esp.precio_base || 0).toLocaleString('es-CO')} COP</span>
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