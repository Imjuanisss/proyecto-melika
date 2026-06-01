import { useState, useEffect } from 'react';
// 1. UBICACIÓN 1: Importar useNavigate al inicio junto a las demás librerías
import { useNavigate } from 'react-router-dom'; 
import { especialidadesService } from '../services/especialidadesService';

export default function Especialidades() {
  // 2. UBICACIÓN 2: Inicializar el hook justo al principio del componente, antes de los useEffect
  const navigate = useNavigate(); 

  const [especialidades, setEspecialidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

 useEffect(() => {
    const cargarEspecialidades = async () => {
      try {
        setCargando(true);
        const datos = await especialidadesService.getAll();
        setEspecialidades(datos);
      } catch {
        setError('No se pudieron cargar las especialidades. Inténtalo de nuevo más tarde.');
      } finally {
        setCargando(false);
      }
    };

    cargarEspecialidades();
  }, []);



  if (cargando) {
    return <div className="text-center py-10 font-medium">Cargando catálogo de especialidades...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500 font-medium">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Nuestras Especialidades Médicas</h1>
      <p className="text-gray-600 text-center mb-8">Selecciona la especialidad que necesitas para conocer a nuestros profesionales disponibles.</p>

      {especialidades.length === 0 ? (
        <p className="text-center text-gray-500">No hay especialidades disponibles en este momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {especialidades.map((esp) => (
            <div key={esp.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col">
              
              {/* Imagen de la Especialidad */}
              <div className="h-48 bg-gray-200 overflow-hidden relative">
                <img 
                  src={esp.imagen_url || 'https://via.placeholder.com/400x300?text=Melika+Medicina'} 
                  alt={esp.nombre}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Contenido de la Tarjeta */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{esp.nombre}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">{esp.descripcion}</p>
                
                <div className="border-t pt-4 mt-auto flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">Precio Base</span>
                    <span className="text-lg font-bold text-emerald-600">
                      ${Number(esp.precio_base).toLocaleString('es-CO')}
                    </span>
                  </div>
                  
                  {/* 3. UBICACIÓN 3: El botón modificado dentro del ciclo .map */}
                  <button 
                    onClick={() => navigate(`/especialidades/${esp.id}/medicos`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Ver Médicos
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}