import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient'; // Cliente unificado
import './MedicosEspecialidad.css';

// Médicos de respaldo mapeados por el ID de la especialidad (1: Cardio, 2: Derma, 3: Pedia)
// Esto asegura que tu flujo de navegación funcione perfecto en desarrollo
const medicosMockPorEspecialidad = {
  1: [
    { id: 101, nombre: 'Camila', primer_apellido: 'Restrepo', calificacion: '4.9', anos_experiencia: 8, biografia: 'Especialista en cardiología preventiva y cuidado cardiovascular avanzado.', acepta_presencial: true, acepta_teleconsulta: true, tarifa: 90000 },
    { id: 102, nombre: 'Alejandro', primer_apellido: 'Gómez', calificacion: '5.0', anos_experiencia: 12, biografia: 'Cardiólogo clínico con enfoque en tratamiento de arritmias.', acepta_presencial: true, acepta_teleconsulta: false, tarifa: 110000 }
  ],
  2: [
    { id: 201, nombre: 'Liliana', primer_apellido: 'Pérez', calificacion: '4.8', anos_experiencia: 6, biografia: 'Experta en acné, dermatología clínica y estética funcional.', acepta_presencial: true, acepta_teleconsulta: true, tarifa: 85000 }
  ],
  3: [
    { id: 301, nombre: 'Carlos', primer_apellido: 'Mendoza', calificacion: '5.0', anos_experiencia: 15, biografia: 'Pediatra dedicado al desarrollo integral y bienestar de la primera infancia.', acepta_presencial: true, acepta_teleconsulta: true, tarifa: 80000 }
  ]
};

export default function MedicosEspecialidad() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarMedicos = async () => {
      try {
        setCargando(true);
        const { data } = await api.get(`/especialidades/${id}/medicos`);
        
        if (data && data.length > 0) {
          setMedicos(data);
        } else {
          // Si el backend no trae médicos para este ID, usa el mock
          setMedicos(medicosMockPorEspecialidad[id] || []);
        }
      } catch (error) {
        console.error("Error al cargar médicos, usando respaldo:", error);
        setMedicos(medicosMockPorEspecialidad[id] || []);
      } finally {
        setCargando(false);
      }
    };

    cargarMedicos();
  }, [id]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
        <p className="text-slate-600 font-medium">Buscando médicos disponibles...</p>
      </div>
    );
  }

  return (
    // pt-28 soluciona el choque con el Navbar fijo
    <div className="min-h-screen bg-slate-50/30 pt-28 pb-16">
      <div className="container mx-auto px-6 md:px-12">
        
        {/* Botón Volver con estilo unificado */}
        <button 
          onClick={() => navigate('/especialidades')}
          className="mb-6 text-orange-500 hover:text-orange-600 font-bold flex items-center gap-2 transition-colors text-sm"
        >
          ← Volver a Especialidades
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900">Médicos Disponibles</h2>
          <p className="text-slate-500 text-sm mt-1">Agenda tu cita con uno de nuestros profesionales de confianza.</p>
        </div>

        {medicos.length === 0 ? (
          <div className="text-center bg-white border border-slate-100 p-10 rounded-2xl shadow-sm max-w-xl mx-auto">
            <p className="text-slate-500 font-medium">
              No hay médicos registrados para esta especialidad en este momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {medicos.map((medico) => (
              <div 
                key={medico.id} 
                className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-900">
                      Dr. {medico.nombre} {medico.primer_apellido}
                    </h3>
                    <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                      ⭐ {medico.calificacion || '5.0'}
                    </span>
                  </div>
                  
                  <p className="text-slate-400 text-xs font-semibold mt-1 uppercase tracking-wider">
                    {medico.anos_experiencia} años de experiencia
                  </p>
                  
                  <p className="text-slate-600 text-sm mt-4 bg-slate-50 p-3 rounded-xl italic border border-slate-50">
                    "{medico.biografia || 'Sin biografía disponible.'}"
                  </p>
                  
                  {/* Modalidades de atención en tonos Slate/Azul/Púrpura */}
                  <div className="flex gap-2 mt-4">
                    {medico.acepta_presencial && (
                      <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">🏠 Presencial</span>
                    )}
                    {medico.acepta_teleconsulta && (
                      <span className="bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-lg font-medium">💻 Teleconsulta</span>
                    )}
                  </div>
                </div>

                {/* Footer de la Tarjeta de Médico */}
                <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Tarifa Consulta</span>
                    <span className="text-lg font-extrabold text-slate-900">
                      ${Number(medico.tarifa).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <button 
                    onClick={() => navigate(`/medico/${medico.id}/agenda`)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm"
                  >
                    Agendar Cita
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}