import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient'; // Cliente unificado
import './MedicosEspecialidad.css';

export default function MedicosEspecialidad() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [especialidadNombre, setEspecialidadNombre] = useState('Especialistas'); 
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        setError(null);
        
        // 1. Petición para obtener los médicos de esta especialidad
        const responseMedicos = await api.get(`/especialidades/${id}/medicos`);
        const dataArray = responseMedicos?.data ? responseMedicos.data : responseMedicos;
        setMedicos(Array.isArray(dataArray) ? dataArray : []);
        
        // 2. Petición para traer el catálogo completo y extraer el nombre real de la especialidad
        const responseEsp = await api.get('/especialidades');
        const dataEspecialidades = responseEsp?.data ? responseEsp.data : responseEsp;
        
        if (Array.isArray(dataEspecialidades)) {
          const especialidadActual = dataEspecialidades.find((esp) => String(esp.id) === String(id));
          if (especialidadActual) {
            setEspecialidadNombre(especialidadActual.nombre);
          }
        }
        
      } catch (error) {
        console.error("Error al cargar datos desde la base de datos:", error);
        setError("Ocurrió un error al conectar con el servidor. Inténtalo de nuevo más tarde.");
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [id]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
        <p className="text-slate-600 font-medium">Consultando médicos disponibles en tiempo real...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 pt-28 pb-16">
      <div className="container mx-auto px-6 md:px-12">
        
        {/* Botón Volver con estilo unificado */}
        <button 
          onClick={() => navigate('/especialidades')}
          className="mb-6 text-orange-500 hover:text-orange-600 font-bold flex items-center gap-2 transition-colors text-sm"
        >
          ← Volver a Especialidades
        </button>

        {/* Encabezado dinámico */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900" style={{ textTransform: 'capitalize' }}>
            Especialistas en {especialidadNombre}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Agenda tu cita con uno de nuestros profesionales activos en la plataforma.
          </p>
        </div>

        {/* Manejo de errores de conexión */}
        {error && (
          <div className="text-center bg-red-50 border border-red-100 p-6 rounded-2xl max-w-xl mx-auto mb-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Estado vacío si no hay filas devueltas por la consulta */}
        {!error && medicos.length === 0 ? (
          <div className="text-center bg-white border border-slate-100 p-10 rounded-2xl shadow-sm max-w-xl mx-auto">
            <p className="text-slate-500 font-medium">
              No hay médicos registrados o activos para esta especialidad en este momento.
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
                  {/* ─── NUEVO ENCABEZADO CON FOTO ─── */}
                  <div className="flex gap-4 items-center mb-4">
                    {/* Contenedor de la foto */}
                    <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center shadow-sm">
                      <img 
                        src={medico.foto_url || '/imagenes/medicos/perfil-defecto.png'} 
                        alt={`Dr(a). ${medico.nombre} ${medico.primer_apellido}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si falla la imagen, genera iniciales automáticamente
                          const iniciales = `${medico.nombre.charAt(0)}${medico.primer_apellido.charAt(0)}`.toUpperCase();
                          e.target.src = `https://placehold.co/150x150/f8fafc/64748b?text=${iniciales}`;
                        }}
                      />
                    </div>
                    
                    {/* Información del nombre y experiencia */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">
                          Dr(a). {medico.nombre} {medico.primer_apellido}
                        </h3>
                        <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0 ml-2">
                          ⭐ {medico.calificacion || '5.0'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs font-semibold mt-1 uppercase tracking-wider">
                        {medico.anos_experiencia || 0} años de experiencia
                      </p>
                    </div>
                  </div>
                  {/* ─── FIN NUEVO ENCABEZADO ─── */}
                  
                  <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-xl italic border border-slate-50">
                    "{medico.biografia || 'Sin biografía disponible.'}"
                  </p>
                  
                  {/* Modalidades de atención basadas en booleanos de la BD */}
                  <div className="flex gap-2 mt-4">
                    {medico.acepta_presencial && (
                      <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">🏠 Presencial</span>
                    )}
                    {medico.acepta_teleconsulta && (
                      <span className="bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-lg font-medium">💻 Teleconsulta</span>
                    )}
                  </div>
                </div>

                {/* Footer limpio alineado a la derecha */}
                <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-end">
                  <button 
                    onClick={() => navigate(`/medico/${medico.id}/agenda`)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm"
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