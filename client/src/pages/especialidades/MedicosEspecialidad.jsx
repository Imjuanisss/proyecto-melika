import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient'; // Cliente unificado
import './MedicosEspecialidad.css';

// 👑 Mapeo de nombres para renderizar títulos dinámicos en el encabezado
const nombresEspecialidades = {
  1: 'Cardiología', 2: 'Dermatología', 3: 'Pediatría', 4: 'Neurología',
  5: 'Ginecología', 6: 'Medicina General', 7: 'Ortopedia y Traumatología',
  8: 'Oftalmología', 9: 'Psiquiatría', 10: 'Otorrinolaringología',
  11: 'Urología', 12: 'Nutrición y Dietética'
};

// 🩺 Red de médicos de respaldo ampliada (Sin tarifas individuales)
const medicosMockPorEspecialidad = {
  1: [
    { id: 101, nombre: 'Camila', primer_apellido: 'Restrepo', calificacion: '4.9', anos_experiencia: 8, biografia: 'Especialista en cardiología preventiva y cuidado cardiovascular avanzado.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 102, nombre: 'Alejandro', primer_apellido: 'Gómez', calificacion: '5.0', anos_experiencia: 12, biografia: 'Cardiólogo clínico con enfoque en tratamiento de arritmias y falla cardíaca.', acepta_presencial: true, acepta_teleconsulta: false },
    { id: 103, nombre: 'Juan Fernando', primer_apellido: 'Medina', calificacion: '4.7', anos_experiencia: 15, biografia: 'Experto en cardiología intervencionista y pruebas de esfuerzo complejas.', acepta_presencial: true, acepta_teleconsulta: true }
  ],
  2: [
    { id: 201, nombre: 'Liliana', primer_apellido: 'Pérez', calificacion: '4.8', anos_experiencia: 6, biografia: 'Experta en acné, dermatología clínica, patologías inflamatorias y estética funcional.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 202, nombre: 'Mauricio', primer_apellido: 'Tobón', calificacion: '4.9', anos_experiencia: 10, biografia: 'Dermatólogo oncólogo enfocado en prevención y mapeo de lunares.', acepta_presencial: true, acepta_teleconsulta: false }
  ],
  3: [
    { id: 301, nombre: 'Carlos', primer_apellido: 'Mendoza', calificacion: '5.0', anos_experiencia: 15, biografia: 'Pediatra dedicado al desarrollo integral, nutrición y bienestar de la primera infancia.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 302, nombre: 'Andrea', primer_apellido: 'Zuluaga', calificacion: '4.8', anos_experiencia: 9, biografia: 'Especialista en neonatología y seguimiento del crecimiento infantil preventivo.', acepta_presencial: true, acepta_teleconsulta: true }
  ],
  4: [
    { id: 401, nombre: 'Andrés', primer_apellido: 'Jaramillo', calificacion: '4.9', anos_experiencia: 10, biografia: 'Especialista en trastornos del sueño, migrañas crónicas y patologías neurodegenerativas.', acepta_presencial: true, acepta_teleconsulta: false },
    { id: 402, nombre: 'Diana Marcela', primer_apellido: 'Ríos', calificacion: '4.7', anos_experiencia: 7, biografia: 'Neuróloga clínica con énfasis en el manejo integral de la epilepsia.', acepta_presencial: true, acepta_teleconsulta: true }
  ],
  5: [
    { id: 501, nombre: 'Diana', primer_apellido: 'Ospina', calificacion: '4.9', anos_experiencia: 11, biografia: 'Gineco-obstetra con amplia trayectoria en control prenatal de alto riesgo y salud reproductiva.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 502, nombre: 'Laura', primer_apellido: 'Castillo', calificacion: '5.0', anos_experiencia: 13, biografia: 'Especialista en ginecología endocrinológica y salud integral de la mujer.', acepta_presencial: true, acepta_teleconsulta: false }
  ],
  6: [
    { id: 601, nombre: 'Valeria Sofía', primer_apellido: 'Plata', calificacion: '4.7', anos_experiencia: 5, biografia: 'Atención médica primaria orientada a la prevención familiar, chequeos generales y promoción de la salud.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 602, nombre: 'Jorge Iván', primer_apellido: 'Cardona', calificacion: '4.8', anos_experiencia: 8, biografia: 'Médico general enfocado en el control crónico de hipertensión y diabetes.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 603, nombre: 'Mateo', primer_apellido: 'Echeverri', calificacion: '4.6', anos_experiencia: 4, biografia: 'Atención inmediata y prioritaria de patologías comunes del adulto joven.', acepta_presencial: true, acepta_teleconsulta: false }
  ],
  7: [
    { id: 701, nombre: 'Mauricio', primer_apellido: 'Bermúdez', calificacion: '5.0', anos_experiencia: 14, biografia: 'Ortopedista enfocado en lesiones deportivas, reemplazos articulares y traumatología compleja.', acepta_presencial: true, acepta_teleconsulta: false },
    { id: 702, nombre: 'Felipe', primer_apellido: 'Suárez', calificacion: '4.9', anos_experiencia: 11, biografia: 'Especialista en cirugía de mano, extremidades superiores y ortopedia infantil.', acepta_presencial: true, acepta_teleconsulta: true }
  ],
  8: [
    { id: 801, nombre: 'Natalia', primer_apellido: 'Castellanos', calificacion: '4.8', anos_experiencia: 9, biografia: 'Especialista en cirugía refractiva, diagnóstico de glaucoma y salud visual integral.', acepta_presencial: true, acepta_teleconsulta: false },
    { id: 802, nombre: 'Gabriel', primer_apellido: 'Muñoz', calificacion: '4.9', anos_experiencia: 12, biografia: 'Oftalmólogo clínico enfocado en el tratamiento de enfermedades de la retina.', acepta_presencial: true, acepta_teleconsulta: false }
  ],
  9: [
    { id: 901, nombre: 'Ricardo', primer_apellido: 'Tobón', calificacion: '4.9', anos_experiencia: 13, biografia: 'Psiquiatra clínico enfocado en el manejo de trastornos del ánimo, ansiedad generalizada y salud mental.', acepta_presencial: false, acepta_teleconsulta: true },
    { id: 902, nombre: 'Amalia', primer_apellido: 'Herrera', calificacion: '4.8', anos_experiencia: 8, biografia: 'Especialista en psiquiatría de enlace y terapia conductual para jóvenes.', acepta_presencial: true, acepta_teleconsulta: true }
  ],
  10: [
    { id: 1001, nombre: 'Santiago', primer_apellido: 'Vásquez', calificacion: '4.8', anos_experiencia: 7, biografia: 'Tratamiento avanzado de patologías de oído, nariz y garganta, rinitis crónica y alteraciones de la voz.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 1002, nombre: 'Clara Inés', primer_apellido: 'Beltrán', calificacion: '4.9', anos_experiencia: 10, biografia: 'Otorrinolaringóloga con subespecialidad en otología y problemas de audición o vértigo.', acepta_presencial: true, acepta_teleconsulta: false }
  ],
  11: [
    { id: 1101, nombre: 'Fernando', primer_apellido: 'Echeverry', calificacion: '5.0', anos_experiencia: 16, biografia: 'Urólogo certificado. Tratamiento de cálculos renales, patologías de próstata y salud urinaria general.', acepta_presencial: true, acepta_teleconsulta: false },
    { id: 1102, nombre: 'Juliana', primer_apellido: 'Patiño', calificacion: '4.8', anos_experiencia: 9, biografia: 'Especialista en urología femenina, incontinencia urinaria y disfunciones del suelo pélvico.', acepta_presencial: true, acepta_teleconsulta: true }
  ],
  12: [
    { id: 1201, nombre: 'Carolina', primer_apellido: 'Sanz', calificacion: '4.9', anos_experiencia: 6, biografia: 'Nutricionista clínica experta en planes metabólicos personalizados, nutrición deportiva y trastornos alimentarios.', acepta_presencial: true, acepta_teleconsulta: true },
    { id: 1202, nombre: 'Esteban', primer_apellido: 'Villarreal', calificacion: '4.7', anos_experiencia: 5, biografia: 'Asesoría nutricional orientada a enfermedades cardiovasculares y control metabólico crónico.', acepta_presencial: true, acepta_teleconsulta: true }
  ]
};

export default function MedicosEspecialidad() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const especialidadNombre = nombresEspecialidades[id] || 'Especialistas';

  useEffect(() => {
    const cargarMedicos = async () => {
      try {
        setCargando(true);
        const { data } = await api.get(`/especialidades/${id}/medicos`);
        
        if (data && data.length > 0) {
          setMedicos(data);
        } else {
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
    <div className="min-h-screen bg-slate-50/30 pt-28 pb-16">
      <div className="container mx-auto px-6 md:px-12">
        
        {/* Botón Volver con estilo unificado */}
        <button 
          onClick={() => navigate('/especialidades')}
          className="mb-6 text-orange-500 hover:text-orange-600 font-bold flex items-center gap-2 transition-colors text-sm"
        >
          ← Volver a Especialidades
        </button>

        {/* Encabezado dinámico según la rama elegida */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Especialistas en {especialidadNombre}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Agenda tu cita con uno de nuestros profesionales de confianza en Colombia.
          </p>
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
                  
                  {/* Modalidades de atención */}
                  <div className="flex gap-2 mt-4">
                    {medico.acepta_presencial && (
                      <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">🏠 Presencial</span>
                    )}
                    {medico.acepta_teleconsulta && (
                      <span className="bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-lg font-medium">💻 Teleconsulta</span>
                    )}
                  </div>
                </div>

                {/* 🎯 Footer Limpio: Se removió la tarifa y se alineó el botón a la derecha */}
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