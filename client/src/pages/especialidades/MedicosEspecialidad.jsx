import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { especialidadesService } from '../../services/especialidadesService'; // Subimos dos niveles (../../) para llegar a services

export default function MedicosEspecialidad() {
  const { id } = useParams(); // Captura el ID de la URL
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarMedicos = async () => {
      try {
        setCargando(true);
        const datos = await especialidadesService.getMedicos(id);
        setMedicos(datos);
      } catch (error) {
        console.error(error);
        setError('Error al cargar los médicos de esta especialidad.');
      } finally {
        setCargando(false);
      }
    };

    cargarMedicos();
  }, [id]);

  if (cargando) return <div className="text-center py-10 font-medium">Buscando médicos disponibles...</div>;
  if (error) return <div className="text-center py-10 text-red-500 font-medium">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/especialidades')}
        className="mb-6 text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-2 transition-colors"
      >
        ← Volver a Especialidades
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Médicos Disponibles</h2>

      {medicos.length === 0 ? (
        <p className="text-gray-500 bg-gray-50 p-6 rounded-lg border text-center">
          No hay médicos registrados o activos para esta especialidad en este momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {medicos.map((medico) => (
            <div key={medico.id} className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900">
                    Dr. {medico.nombre} {medico.primer_apellido}
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full font-semibold">
                    ⭐ {medico.calificacion || '5.0'}
                  </span>
                </div>
                
                <p className="text-gray-500 text-xs mt-1">{medico.anos_experiencia} años de experiencia</p>
                <p className="text-gray-600 text-sm mt-3 italic">"{medico.biografia || 'Sin biografía disponible.'}"</p>
                
                {/* Modalidades de atención */}
                <div className="flex gap-2 mt-4">
                  {medico.acepta_presencial && (
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">🏠 Presencial</span>
                  )}
                  {medico.acepta_teleconsulta && (
                    <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded">💻 Teleconsulta</span>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 mt-5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Tarifa Consulta</span>
                  <span className="text-lg font-bold text-gray-800">${Number(medico.tarifa).toLocaleString('es-CO')}</span>
                </div>
                <button 
                  onClick={() => navigate(`/medico/${medico.id}/agenda`)} // Te lleva a su agenda (ajústala si tu ruta cambia)
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Agendar Cita
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}