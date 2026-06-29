// client/src/pages/dashboard/Dashboard.jsx
// MELIKA — Dashboard del paciente
// Integra el módulo de historial clínico con HistorialPaciente

import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../../context/AuthContext';
import { api }                 from '../../lib/apiClient';
import HistorialPaciente       from '../../components/historias/HistorialPaciente';
import './Dashboard.css';

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate    = useNavigate();

  // Vista activa del dashboard
  const [vistaActiva, setVistaActiva] = useState('inicio');

  const [citas, setCitas]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/citas/mis-citas')
      .then(data => setCitas(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const proximaCita = citas.find(c => c.estado === 'pendiente');

  const accesos = [
    { icono: '📅', titulo: 'Agendar cita',    desc: 'Reserva tu próxima consulta médica',   ruta: '/agendar'   },
    { icono: '📋', titulo: 'Mis citas',        desc: 'Consulta y gestiona tus citas',          ruta: '/mis-citas' },
    { icono: '🏥', titulo: 'Mi historial',     desc: 'Tus historias clínicas y documentos',   vista: 'historial' },
    { icono: '🏠', titulo: 'Volver al inicio', desc: 'Explora especialidades y servicios',     ruta: '/'          },
  ];

  function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  function formatHora(horaStr) {
    if (!horaStr) return '';
    return horaStr.substring(0, 5);
  }

  // Si la vista activa es "historial", renderizar el módulo clínico
  if (vistaActiva === 'historial') {
    return (
      <main className="dashboard">
        <div className="contenedor">
          <div className="dashboard__vista-nav">
            <button
              className="dashboard__volver"
              onClick={() => setVistaActiva('inicio')}
            >
              ← Volver al panel
            </button>
          </div>
          <HistorialPaciente />
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <div className="contenedor">

        {/* Saludo */}
        <div className="dashboard__cabecera">
          <h1 className="dashboard__titulo">
            Hola, <span>{usuario?.nombre}</span> 👋
          </h1>
          <p className="dashboard__sub">¿Qué necesitas hoy?</p>
        </div>

        {/* Próxima cita */}
        <section className="dashboard__seccion">
          <h2 className="dashboard__seccion-titulo">Tu próxima cita</h2>

          {loading ? (
            <div className="dashboard__skeleton" />
          ) : proximaCita ? (
            <div className="proxima-cita">
              <div className="proxima-cita__info">
                <span className="proxima-cita__especialidad">
                  {proximaCita.especialidad}
                </span>
                <p className="proxima-cita__medico">
                  Dr(a). {proximaCita.medico_nombre} {proximaCita.medico_apellido}
                </p>
                <p className="proxima-cita__fecha">
                  📅 {formatFecha(proximaCita.fecha)} · {formatHora(proximaCita.hora_inicio)}
                </p>
                <span className={`proxima-cita__badge badge-${proximaCita.estado}`}>
                  {proximaCita.estado}
                </span>
              </div>
              <button className="proxima-cita__ver" onClick={() => navigate('/mis-citas')}>
                Ver todas mis citas →
              </button>
            </div>
          ) : (
            <div className="dashboard__sin-citas">
              <p>No tienes citas agendadas.</p>
              <button className="dashboard__cta" onClick={() => navigate('/agendar')}>
                Agendar mi primera cita
              </button>
            </div>
          )}
        </section>

        {/* Accesos rápidos */}
        <section className="dashboard__seccion">
          <h2 className="dashboard__seccion-titulo">Accesos rápidos</h2>
          <div className="dashboard__accesos">
            {accesos.map(a => (
              <button
                key={a.ruta || a.vista}
                className="acceso-card"
                onClick={() => {
                  if (a.vista) {
                    setVistaActiva(a.vista);
                  } else {
                    navigate(a.ruta);
                  }
                }}
              >
                <span className="acceso-card__icono">{a.icono}</span>
                <h3 className="acceso-card__titulo">{a.titulo}</h3>
                <p className="acceso-card__desc">{a.desc}</p>
              </button>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}