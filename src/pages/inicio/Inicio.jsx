import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Boton from '../../components/ui/Boton';
import { api } from '../../lib/apiClient';
import './Inicio.css';

const especialidadesDefault = [
  { nombre: 'Cardiología',      precio: '80.000', imagen: '/imagenes/especialidades/cardiologia.jpg',      descripcion: 'Salud cardiovascular y prevención' },
  { nombre: 'Dermatología',     precio: '70.000', imagen: '/imagenes/especialidades/dermatologia.jpg',     descripcion: 'Cuidado integral de la piel' },
  { nombre: 'Pediatría',        precio: '65.000', imagen: '/imagenes/especialidades/pediatria.jpg',        descripcion: 'Atención especializada en niños' },
  { nombre: 'Neurología',       precio: '90.000', imagen: '/imagenes/especialidades/neurologia.jpg',       descripcion: 'Sistema nervioso y cerebro' },
  { nombre: 'Ginecología',      precio: '75.000', imagen: '/imagenes/especialidades/ginecologia.jpg',      descripcion: 'Salud femenina integral' },
  { nombre: 'Medicina General', precio: '45.000', imagen: '/imagenes/especialidades/medicina-general.jpg', descripcion: 'Tu primer punto de atención' },
];

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
  const [especialidades, setEspecialidades]    = useState(especialidadesDefault);
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

  useEffect(() => {
    api.get('/specialties')
      .then(data => { if (data?.length) setEspecialidades(data); })
      .catch(() => {});
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

      {/* ── ESPECIALIDADES ───────────────────── */}
      <section className="especialidades">
        <div className="contenedor">
          <div className="seccion-encabezado aos">
            <span className="seccion-etiqueta">Red médica</span>
            <h2 className="seccion-titulo">Especialidades disponibles</h2>
            <p className="seccion-desc">Profesionales certificados listos para atenderte.</p>
          </div>
          <div className="esp-grid">
            {especialidades.slice(0, 6).map((esp, i) => (
              <Link
                key={esp.nombre}
                to="/agendar"
                className="esp-card aos"
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="esp-card__img-wrap">
                  <img
                    src={esp.imagen}
                    alt={esp.nombre}
                    loading="lazy"
                    onError={e => {
                      e.target.closest('.esp-card__img-wrap').classList.add('esp-card__img-wrap--error');
                    }}
                  />
                </div>
                <div className="esp-card__body">
                  <h3 className="esp-card__nombre">{esp.nombre}</h3>
                  <p className="esp-card__desc">{esp.descripcion}</p>
                  <div className="esp-card__footer">
                    <span className="esp-card__precio">Desde ${esp.precio} COP</span>
                    <span className="esp-card__cta">Agendar →</span>
                  </div>
                </div>
              </Link>
            ))}
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
              {/*
                Imagen en: public/imagenes/medicamentos-banner.jpg
                Foto de medicamentos organizados, farmacia moderna
                Tamaño: 800x600px · Fuente: unsplash.com
              */}
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