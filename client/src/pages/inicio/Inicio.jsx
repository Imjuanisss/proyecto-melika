import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Boton from '../../components/ui/Boton';

import './Inicio.css';

const sugerencias = [
  'Cardiología', 'Dermatología', 'Pediatría', 'Neurología',
  'Ginecología', 'Medicina General', 'Ortopedia', 'Oftalmología',
];

const pasos = [
  { num: '01', titulo: 'Elige tu especialidad',   desc: 'Encuentra el especialista que necesitas entre nuestra red médica certificada.' },
  { num: '02', titulo: 'Selecciona fecha y hora', desc: 'Disponibilidad en tiempo real. Sin llamadas ni esperas en línea.' },
  { num: '03', titulo: 'Confirma tu cita',        desc: 'Resumen completo antes de confirmar. Recordatorio automático incluido.' },
];

const razones = [
  { num: '01', titulo: 'Sin filas ni esperas',      desc: 'Agenda en 3 pasos desde cualquier dispositivo en menos de 3 minutos.' },
  { num: '02', titulo: 'Red médica certificada',    desc: 'Profesionales verificados con experiencia clínica comprobada en Colombia.' },
  { num: '03', titulo: 'Historia clínica digital',  desc: 'Diagnósticos CIE-10 vinculados. Tu historial siempre disponible.' },
  { num: '04', titulo: 'Privacidad garantizada',    desc: 'Protección bajo Ley 1581/2012 Habeas Data. RLS en base de datos.' },
  { num: '05', titulo: 'Medicamentos certificados', desc: 'Catálogo INVIMA de medicamentos OTC y Rx con información completa.' },
  { num: '06', titulo: 'Presencial o virtual',      desc: 'Elige el formato de consulta que más te convenga cada vez.' },
];

export default function Inicio() {
  const [busqueda, setBusqueda]                = useState('');
  const [sugerenciasFiltradas, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrar]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.aos').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleBusqueda(e) {
    const val = e.target.value;
    setBusqueda(val);
    if (val.trim().length > 0) {
      setSugerencias(sugerencias.filter(s => s.toLowerCase().includes(val.toLowerCase())));
      setMostrar(true);
    } else {
      setSugerencias([]);
      setMostrar(false);
    }
  }

  function seleccionarSugerencia(s) {
    setBusqueda(s);
    setMostrar(false);
  }

  function handleBuscarSubmit(e) {
    e.preventDefault();
    navigate(`/agendar${busqueda.trim() ? `?especialidad=${encodeURIComponent(busqueda)}` : ''}`);
  }

  return (
    <main className="inicio">

      {/* ── HERO + PASOS (sección unificada) ── */}
      <section className="hero-pasos">

        <div className="hero">
          <div className="hero__contenido">
            <span className="hero__etiqueta">Plataforma de salud digital · Colombia</span>
            <h1 className="hero__titulo">
              Agenda tu cita<br />
              <em>médica hoy.</em>
            </h1>
            <p className="hero__subtitulo">
              Olvídate de las salas de espera. Accede a un ecosistema
              de salud diseñado para tu confort y rapidez.
            </p>

            <form className="hero__buscador" onSubmit={handleBuscarSubmit}>
              <div className="hero__buscador-wrap">
                <svg className="hero__buscador-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="hero__buscador-input"
                  placeholder="¿Qué especialista buscas hoy?"
                  value={busqueda}
                  onChange={handleBusqueda}
                  onBlur={() => setTimeout(() => setMostrar(false), 150)}
                  onFocus={() => busqueda && setMostrar(true)}
                  autoComplete="off"
                />
                <button type="submit" className="hero__buscador-btn">Buscar</button>
              </div>

              {mostrarSugerencias && sugerenciasFiltradas.length > 0 && (
                <ul className="hero__sugerencias">
                  {sugerenciasFiltradas.map(s => (
                    <li
                      key={s}
                      className="hero__sugerencia-item"
                      onMouseDown={() => seleccionarSugerencia(s)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </form>

            <div className="hero__cta-directo">
              <Link to="/agendar" className="hero__cta-btn">
                Agendar cita ahora
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <span className="hero__cta-sep">o explora por especialidad</span>
              <div className="hero__chips">
                {sugerencias.slice(0, 5).map(s => (
                  <button
                    key={s}
                    className="hero__chip"
                    onClick={() => navigate(`/agendar?especialidad=${encodeURIComponent(s)}`)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hero-pasos__divisor" />

        <div className="pasos-zona">
          <div className="contenedor">
            <div className="pasos-zona__encabezado aos">
              <span className="seccion-etiqueta">Simple y rápido</span>
              <h2 className="seccion-titulo">Agenda en 3 pasos</h2>
              <p className="seccion-desc">Tu cita médica confirmada en menos de 3 minutos.</p>
            </div>
            <div className="pasos-grid">
              {pasos.map((p, i) => (
                <div key={p.num} className="paso-card aos" style={{ transitionDelay: `${i * 0.1}s` }}>
                  <span className="paso-card__num">{p.num}</span>
                  <h3 className="paso-card__titulo">{p.titulo}</h3>
                  <p className="paso-card__desc">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* ── NUEVA SECCIÓN ÚNICA DE ESPECIALIDADES ───────────────────── */}
      <section className="especialidades-banner-unico" style={{
        padding: '5rem 0',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div className="contenedor" style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '0 1.5rem'
        }}>
          <div className="aos">
            <span className="seccion-etiqueta" style={{
              color: '#f97316',
              textTransform: 'uppercase',
              fontWeight: '700',
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: '0.75rem'
            }}>
              Nuestra Red Médica
            </span>
            
            <h2 className="seccion-titulo" style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '1.25rem',
              letterSpacing: '-0.025em'
            }}>
              Especialidades Médicas
            </h2>
            
            <p className="seccion-desc" style={{
              fontSize: '1.1rem',
              color: '#475569',
              lineHeight: '1.7',
              marginBottom: '2.5rem',
              maxWidth: '650px',
              margin: '0 auto 2.5rem auto'
            }}>
              En <strong>MELIKA</strong> contamos con una red de profesionales de la salud 
              altamente calificados y certificados en Colombia. Explora nuestro catálogo completo 
              de especialidades, conoce los perfiles de nuestros médicos, consulta tarifas transparentes 
              y agenda tu cita presencial o virtual en cuestión de minutos.
            </p>
            
            <button 
              onClick={() => navigate('/especialidades')}
              style={{
                background: '#f97316',
                color: 'white',
                border: 'none',
                padding: '0.85rem 2rem',
                borderRadius: '0.75rem',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.15), 0 2px 4px -1px rgba(249, 115, 22, 0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.target.style.background = '#ea580c';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 15px -3px rgba(249, 115, 22, 0.3)';
              }}
              onMouseOut={e => {
                e.target.style.background = '#f97316';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(249, 115, 22, 0.15)';
              }}
            >
              Ver especialidades
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── POR QUÉ MELIKA ───────────────────── */}
      <section className="razones">
        <div className="contenedor">
          <div className="razones__inner">
            <div className="razones__encabezado aos">
              <span className="seccion-etiqueta">Nuestra diferencia</span>
              <h2 className="seccion-titulo">Por qué elegir MELIKA</h2>
              <p className="seccion-desc">
                La única plataforma en Colombia que cierra el ciclo completo de salud digital.
              </p>
              <div className="razones__acciones">
                <Link to="/registro">
                  <Boton variante="primary" size="lg">Comenzar gratis</Boton>
                </Link>
              </div>
            </div>
            <div className="razones__grid">
              {razones.map((r, i) => (
                <div key={r.num} className="razon-item aos" style={{ transitionDelay: `${i * 0.06}s` }}>
                  <span className="razon-item__num">{r.num}</span>
                  <div>
                    <h3 className="razon-item__titulo">{r.titulo}</h3>
                    <p className="razon-item__desc">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BANNER CATÁLOGO ──────────────────── */}
      <section className="catalogo-banner">
        <div className="contenedor">
          <div className="catalogo-banner__inner aos">
            <div className="catalogo-banner__texto">
              <span className="seccion-etiqueta">Información certificada INVIMA</span>
              <h2 className="catalogo-banner__titulo">Catálogo de medicamentos</h2>
              <p className="catalogo-banner__desc">
                Consulta información verificada de medicamentos OTC y Rx.
                Indicaciones, contraindicaciones y presentaciones disponibles.
              </p>
              <Link to="/catalogo">
                <Boton variante="primary" size="lg">Explorar catálogo</Boton>
              </Link>
            </div>
            <div className="catalogo-banner__visual">
              <img
                src="/imagenes/medicamentos-banner.jpg"
                alt="Catálogo de medicamentos MELIKA"
                className="catalogo-banner__img"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────── */}
      <section className="cta-final">
        <div className="contenedor">
          <div className="cta-final__caja aos">
            <div className="cta-final__texto">
              <h2 className="cta-final__titulo">Comienza hoy.</h2>
              <p className="cta-final__desc">Crea tu cuenta gratis en 2 minutos.</p>
            </div>
            <div className="cta-final__acciones">
              <Link to="/registro">
                <Boton variante="primary" size="lg">Crear cuenta gratis</Boton>
              </Link>
              <Link to="/agendar">
                <Boton variante="outline" size="lg">Ver especialistas</Boton>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}