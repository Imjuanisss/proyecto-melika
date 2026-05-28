// src/pages/especialidades/Especialidades.jsx
import { useState, useEffect } from 'react';
import './Especialidades.css';

function Especialidades() {
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Petición directa al endpoint real de tu compañero
    fetch('http://localhost:3000/especialidades')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al responder desde el servidor de Melika');
        }
        return response.json();
      })
      .then((data) => {
        setEspecialidades(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando especialidades reales:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="especialidades-loading">
        <div className="spinner"></div>
        <p>Cargando especialidades médicas en vivo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="especialidades-error">
        <p>⚠️ Hubo un fallo al conectar con las especialidades.</p>
        <small>Asegúrate de que el backend en el puerto 3000 siga encendido.</small>
      </div>
    );
  }

  return (
    <div className="especialidades-page">
      <div className="especialidades-header">
        <h1 className="esp-main-title">Nuestras Especialidades Médicas</h1>
        <p className="esp-subtitle">Atención profesional respaldada por la plataforma MELIKA</p>
      </div>

      <div className="especialidades-grid">
        {especialidades.map((esp) => (
          <div key={esp.id} className="especialidad-card">
            <div className="esp-image-container">
              {/* Usamos 'imagen_url' que es la propiedad exacta que manda tu backend */}
              {esp.imagen_url ? (
                <img 
                  src={esp.imagen_url} 
                  alt={esp.nombre} 
                  className="esp-card-img"
                  onError={(e) => {
                    // Si tu compañero aún no guarda las fotos en la carpeta correspondente, muestra el estetoscopio
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div class="esp-placeholder-icon">医🩺</div>';
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
                  {/* Convertimos el string "80000.00" a número entero para formatearlo bonito con puntos */}
                  Desde ${Math.floor(Number(esp.precio_base)).toLocaleString('es-CO')} COP
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