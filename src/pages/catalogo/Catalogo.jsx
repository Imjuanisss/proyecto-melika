// src/pages/catalogo/Catalogo.jsx
import { useState, useEffect } from 'react';
import './Catalogo.css'; // Importa tus estilos actualizados

// Datos de prueba (Mock Data) simplificados y claros
const initialMedicationData = [
  {
    id: 1,
    image: null, // Ejemplo sin imagen
    nombre: 'Amoxicilina + Ácido Clavulánico 875/125mg',
    principioActivo: 'Amoxicilina / Ácido Clavulánico',
    laboratorio: 'Farmacéutica ABC',
    presentacion: 'Caja con 14 tabletas recubiertas.',
    descripcion: 'Antibiótico de amplio espectro para infecciones bacterianas agudas. Tratamiento de sinusitis, otitis y neumonía.'
  },
  {
    id: 2,
    image: null,
    nombre: 'Metformina 850mg',
    principioActivo: 'Metformina Clorhidrato',
    laboratorio: 'Laboratorios Genéricos S.A.',
    presentacion: 'Caja con 30 tabletas de liberación prolongada.',
    descripcion: 'Tratamiento de primera línea para pacientes con diabetes mellitus tipo 2, especialmente con sobrepeso.'
  },
  {
    id: 3,
    image: null,
    nombre: 'Paracetamol / Acetaminofén 500mg',
    principioActivo: 'Paracetamol',
    laboratorio: 'PharmaCore',
    presentacion: 'Caja con 20 tabletas.',
    descripcion: 'Analgésico y antipirético para alivio del dolor leve a moderado y fiebre. No tiene acción antiinflamatoria.'
  }
];

function Catalogo() {
  const [medicamentos, setMedicamentos] = useState([]);

  useEffect(() => {
    // Carga los datos de prueba
    setMedicamentos(initialMedicationData);
  }, []);

  return (
    <div className="catalogo-page">
      {/* Contenedor principal de encabezado */}
      <div className="catalogo-header-container">
        <h1 className="catalogo-main-title">Catálogo de Medicamentos</h1>
      </div>

      {/* Grid de medicamentos */}
      <div className="medicamentos-grid">
        {medicamentos.length > 0 ? (
          medicamentos.map(med => (
            <div key={med.id} className="medicamento-card">
              {/* Contenedor de imagen: ahora es limpio */}
              <div className="medicamento-imagen-container">
                {med.image ? (
                  <img src={med.image} alt={med.nombre} className="medicamento-imagen" />
                ) : (
                  // Imagen de marcador de posición por defecto
                  <img src="https://placehold.co/200x200/f5f5f5/cccccc?text=Sin+Imagen" />
                )}
              </div>
              
              {/* Contenedor de detalles en negro */}
              <div className="medicamento-detalles">
                <h3 className="medicamento-nombre">{med.nombre}</h3>
                
                <div className="medicamento-metadatos">
                  <div className="metadato-row">
                    <span className="etiqueta-pequena lab">Principio Activo:</span>
                    <span className="etiqueta-valor">{med.principioActivo}</span>
                  </div>
                  <div className="metadato-row">
                    <span className="etiqueta-pequena lab">Laboratorio:</span>
                    <span className="etiqueta-valor">{med.laboratorio}</span>
                  </div>
                </div>
                
                <p className="medicamento-presentacion">{med.presentacion}</p>
                <p className="medicamento-descripcion">{med.descripcion}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="sin-resultados">Cargando catálogo...</p>
        )}
      </div>
    </div>
  );
}

export default Catalogo;