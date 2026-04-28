import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import './Agendarcita.css';

const especialidadesEjemplo = [
  { id: '1', nombre: 'Cardiología',      precio_base: 80000, descripcion: 'Salud cardiovascular y prevención', imagen: '/imagenes/especialidades/cardiologia.jpg' },
  { id: '2', nombre: 'Dermatología',     precio_base: 70000, descripcion: 'Cuidado integral de la piel', imagen: '/imagenes/especialidades/dermatologia.jpg' },
  { id: '3', nombre: 'Pediatría',        precio_base: 65000, descripcion: 'Atención especializada en niños', imagen: '/imagenes/especialidades/pediatria.jpg' },
  { id: '4', nombre: 'Neurología',       precio_base: 90000, descripcion: 'Sistema nervioso y cerebro', imagen: '/imagenes/especialidades/neurologia.jpg' },
  { id: '5', nombre: 'Ginecología',      precio_base: 75000, descripcion: 'Salud femenina integral', imagen: '/imagenes/especialidades/ginecologia.jpg' },
  { id: '6', nombre: 'Medicina General', precio_base: 45000, descripcion: 'Tu primer punto de atención', imagen: '/imagenes/especialidades/medicina-general.jpg' },
];

const medicosEjemplo = {
  '1': [
    { id: 'm1', nombre: 'Dr. Carlos Hernández', registro: 'RM-12345', calificacion: 4.9, tarifa: 85000, acepta_teleconsulta: true },
    { id: 'm2', nombre: 'Dra. Ana Rodríguez',   registro: 'RM-67890', calificacion: 4.8, tarifa: 80000, acepta_teleconsulta: false },
  ],
  '2': [{ id: 'm3', nombre: 'Dra. Laura Gómez', registro: 'RM-11111', calificacion: 4.7, tarifa: 72000, acepta_teleconsulta: true }],
};

const franjasEjemplo = [
  { id: 'f1', hora_inicio: '08:00', hora_fin: '08:30' },
  { id: 'f2', hora_inicio: '09:00', hora_fin: '09:30' },
  { id: 'f3', hora_inicio: '10:30', hora_fin: '11:00' },
  { id: 'f4', hora_inicio: '11:30', hora_fin: '12:00' },
  { id: 'f5', hora_inicio: '14:00', hora_fin: '14:30' },
  { id: 'f6', hora_inicio: '15:00', hora_fin: '15:30' },
  { id: 'f7', hora_inicio: '16:00', hora_fin: '16:30' },
];

const PASOS = ['Especialidad', 'Médico y fecha', 'Confirmación'];

export default function Agendarcita() {
  const [paso, setPaso]                     = useState(0);
  const [especialidades, setEspecialidades] = useState(especialidadesEjemplo);
  const [medicos, setMedicos]               = useState([]);
  const [franjas, setFranjas]               = useState([]);
  const [loadingEsp, setLoadingEsp]         = useState(false);
  const [loadingMed, setLoadingMed]         = useState(false);
  const [loadingFranjas, setLoadingFranjas] = useState(false);
  const [loadingConfirmar, setLoadingConfirmar] = useState(false);
  const [error, setError]                   = useState(null);
  const [citaCreada, setCitaCreada]         = useState(null);

  const [seleccion, setSeleccion] = useState({
    especialidad:  null,
    medico:        null,
    fecha:         '',
    franja:        null,
    tipo_consulta: 'presencial',
    motivo:        '',
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    function cargarEspecialidades() {
      setLoadingEsp(true);
      api.get('/specialties')
        .then(data => { if (data?.length) setEspecialidades(data); })
        .catch(() => {})
        .finally(() => setLoadingEsp(false));
    }
    cargarEspecialidades();
  }, []);

  useEffect(() => {
    const esp = searchParams.get('especialidad');
    if (!esp) return;
    const encontrada = especialidades.find(e => e.nombre.toLowerCase() === esp.toLowerCase());
    if (encontrada) elegirEspecialidad(encontrada);
  }, [searchParams, especialidades]);

  function elegirEspecialidad(esp) {
    setSeleccion(s => ({ ...s, especialidad: esp, medico: null, franja: null, fecha: '' }));
    setLoadingMed(true);
    setMedicos([]);

    api.get(`/specialties/${esp.id}/medicos`)
      .then(data => setMedicos(data?.length ? data : (medicosEjemplo[esp.id] || [])))
      .catch(() => setMedicos(medicosEjemplo[esp.id] || []))
      .finally(() => {
        setLoadingMed(false);
        setPaso(1);
      });
  }

  function elegirMedico(med) {
    setSeleccion(s => ({ ...s, medico: med, franja: null }));
  }

  useEffect(() => {
    if (!seleccion.medico || !seleccion.fecha) return;

    function cargarFranjas() {
      setLoadingFranjas(true);
      setFranjas([]);
      api.get(`/appointments/availability?medico_id=${seleccion.medico.id}&fecha=${seleccion.fecha}`)
        .then(data => setFranjas(data?.length ? data : franjasEjemplo))
        .catch(() => setFranjas(franjasEjemplo))
        .finally(() => setLoadingFranjas(false));
    }
    cargarFranjas();
  }, [seleccion.medico, seleccion.fecha]);

  async function confirmarCita() {
    setLoadingConfirmar(true);
    setError(null);
    try {
      const nueva = await api.post('/appointments', {
        id_especialidad:  seleccion.especialidad.id,
        id_medico:        seleccion.medico.id,
        id_franja:        seleccion.franja.id,
        id_tipo_consulta: seleccion.tipo_consulta === 'presencial' ? 1 : 2,
        motivo_consulta:  seleccion.motivo,
        precio_cobrado:   seleccion.medico.tarifa || seleccion.especialidad.precio_base,
      });
      setCitaCreada(nueva || { id: 'DEMO-001', ...seleccion });
      setPaso(3);
    } catch (err) {
      setError(err.message || 'No se pudo confirmar la cita. Intenta de nuevo.');
    } finally {
      setLoadingConfirmar(false);
    }
  }

  async function cancelarCita(citaId) {
    try {
      await api.patch(`/appointments/${citaId}/estado`, {
        nuevo_estado:      'cancelada',
        razon_cancelacion: 'Cancelado por el paciente',
      });
      navigate('/');
    } catch {
      navigate('/');
    }
  }

  if (paso === 3 && citaCreada) {
    return <PantallaExito cita={citaCreada} seleccion={seleccion} onCancelar={cancelarCita} />;
  }

  return (
    <div className="agendar">
      <div className="agendar__encabezado">
        <div className="contenedor">
          <h1 className="agendar__titulo">Agendar cita médica</h1>
          <div className="stepper">
            {PASOS.map((nombre, i) => (
              <div
                key={nombre}
                className={`stepper__paso ${i < paso ? 'stepper__paso--completo' : ''} ${i === paso ? 'stepper__paso--activo' : ''}`}
              >
                <div className="stepper__circulo">
                  {i < paso ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className="stepper__nombre">{nombre}</span>
                {i < PASOS.length - 1 && <div className="stepper__linea" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="contenedor agendar__body">
        {error && <div className="agendar__error">{error}</div>}

        {paso === 0 && (
          <PasoEspecialidad
            especialidades={especialidades}
            loading={loadingEsp}
            onSeleccionar={elegirEspecialidad}
          />
        )}

        {paso === 1 && (
          <PasoMedicoFecha
            seleccion={seleccion}
            medicos={medicos}
            franjas={franjas}
            loadingMed={loadingMed}
            loadingFranjas={loadingFranjas}
            onChange={cambios => setSeleccion(s => ({ ...s, ...cambios }))}
            onMedico={elegirMedico}
            onSiguiente={() => setPaso(2)}
            onAtras={() => setPaso(0)}
          />
        )}

        {paso === 2 && (
          <PasoConfirmacion
            seleccion={seleccion}
            loading={loadingConfirmar}
            onChange={cambios => setSeleccion(s => ({ ...s, ...cambios }))}
            onConfirmar={confirmarCita}
            onAtras={() => setPaso(1)}
          />
        )}
      </div>
    </div>
  );
}

function PasoEspecialidad({ especialidades, loading, onSeleccionar }) {
  return (
    <div className="paso">
      <div className="paso__encabezado">
        <span className="seccion-etiqueta">Paso 01</span>
        <h2 className="paso__titulo">¿Qué especialidad necesitas?</h2>
      </div>
      {loading ? (
        <div className="esp-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="esp-opcion esp-opcion--skeleton" />)}
        </div>
      ) : (
        <div className="esp-grid">
          {especialidades.map(esp => (
            <button key={esp.id} className="esp-opcion" onClick={() => onSeleccionar(esp)}>
              <div className="esp-opcion__img">
                <img
                  src={esp.imagen}
                  alt={esp.nombre}
                  onError={e => {
                    e.target.closest('.esp-opcion__img').classList.add('esp-opcion__img--error');
                  }}
                />
              </div>
              <div className="esp-opcion__info">
                <h3 className="esp-opcion__nombre">{esp.nombre}</h3>
                <p className="esp-opcion__desc">{esp.descripcion}</p>
                <span className="esp-opcion__precio">
                  Desde ${esp.precio_base?.toLocaleString('es-CO')} COP
                </span>
              </div>
              <svg className="esp-opcion__flecha" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PasoMedicoFecha({ seleccion, medicos, franjas, loadingMed, loadingFranjas, onChange, onMedico, onSiguiente, onAtras }) {
  const hoy = new Date().toISOString().split('T')[0];
  const puedeAvanzar = seleccion.medico && seleccion.fecha && seleccion.franja;

  return (
    <div className="paso paso--dos-col">
      <div className="paso__izq">
        <div className="paso__encabezado">
          <span className="seccion-etiqueta">Paso 02</span>
          <h2 className="paso__titulo">Elige médico, fecha y hora</h2>
        </div>

        <h3 className="paso__subtitulo">Especialistas disponibles</h3>
        {loadingMed ? (
          <div className="medicos-lista">
            {[1,2].map(i => <div key={i} className="medico-card medico-card--skeleton" />)}
          </div>
        ) : (
          <div className="medicos-lista">
            {medicos.map(med => (
              <button
                key={med.id}
                className={`medico-card ${seleccion.medico?.id === med.id ? 'medico-card--activo' : ''}`}
                onClick={() => onMedico(med)}
              >
                <div className="medico-card__avatar">{med.nombre.charAt(4)}</div>
                <div className="medico-card__info">
                  <strong className="medico-card__nombre">{med.nombre}</strong>
                  <span className="medico-card__reg">Reg. {med.registro}</span>
                  <div className="medico-card__meta">
                    <span className="medico-card__cal">★ {med.calificacion}</span>
                    {med.acepta_teleconsulta && (
                      <span className="medico-card__virtual">Teleconsulta</span>
                    )}
                  </div>
                </div>
                <span className="medico-card__tarifa">
                  ${med.tarifa?.toLocaleString('es-CO')}
                </span>
              </button>
            ))}
          </div>
        )}

        <h3 className="paso__subtitulo">Fecha</h3>
        <input
          type="date"
          className="agendar__fecha"
          min={hoy}
          value={seleccion.fecha}
          onChange={e => onChange({ fecha: e.target.value, franja: null })}
        />

        {seleccion.medico && seleccion.fecha && (
          <>
            <h3 className="paso__subtitulo">Horarios disponibles</h3>
            {loadingFranjas ? (
              <p className="agendar__cargando">Consultando disponibilidad...</p>
            ) : (
              <div className="franjas-grid">
                {franjas.map(f => (
                  <button
                    key={f.id}
                    className={`franja ${seleccion.franja?.id === f.id ? 'franja--activa' : ''}`}
                    onClick={() => onChange({ franja: f })}
                  >
                    {f.hora_inicio}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="paso__der">
        <ResumenLateral seleccion={seleccion} />
      </div>

      <div className="paso__acciones">
        <button className="btn-atras" onClick={onAtras}>← Volver</button>
        <button className="btn-siguiente" onClick={onSiguiente} disabled={!puedeAvanzar}>
          Continuar →
        </button>
      </div>
    </div>
  );
}

function PasoConfirmacion({ seleccion, loading, onChange, onConfirmar, onAtras }) {
  return (
    <div className="paso paso--dos-col">
      <div className="paso__izq">
        <div className="paso__encabezado">
          <span className="seccion-etiqueta">Paso 03</span>
          <h2 className="paso__titulo">Confirma tu cita</h2>
        </div>

        <div className="confirmacion__campo">
          <label className="confirmacion__label">Tipo de consulta</label>
          <div className="tipo-consulta">
            {['presencial', 'virtual'].map(tipo => (
              <button
                key={tipo}
                className={`tipo-consulta__btn ${seleccion.tipo_consulta === tipo ? 'tipo-consulta__btn--activo' : ''}`}
                onClick={() => onChange({ tipo_consulta: tipo })}
              >
                {tipo === 'presencial' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                )}
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="confirmacion__campo">
          <label className="confirmacion__label">
            Motivo de la consulta <span>(opcional)</span>
          </label>
          <textarea
            className="confirmacion__textarea"
            placeholder="Describe brevemente el motivo de tu visita..."
            value={seleccion.motivo}
            onChange={e => onChange({ motivo: e.target.value })}
            rows={4}
          />
        </div>
      </div>

      <div className="paso__der">
        <ResumenLateral seleccion={seleccion} mostrarPrecio />
      </div>

      <div className="paso__acciones">
        <button className="btn-atras" onClick={onAtras} disabled={loading}>← Volver</button>
        <button className="btn-confirmar" onClick={onConfirmar} disabled={loading}>
          {loading && <span className="spinner" />}
          <span className={loading ? 'oculto' : ''}>Confirmar cita</span>
        </button>
      </div>
    </div>
  );
}

function ResumenLateral({ seleccion, mostrarPrecio = false }) {
  if (!seleccion.especialidad) return null;
  return (
    <div className="resumen">
      <h3 className="resumen__titulo">Resumen de tu cita</h3>
      {[
        ['Especialidad', seleccion.especialidad?.nombre],
        ['Médico',       seleccion.medico?.nombre],
        ['Fecha',        seleccion.fecha],
        ['Hora',         seleccion.franja?.hora_inicio],
      ].filter(([, v]) => v).map(([label, valor]) => (
        <div key={label} className="resumen__item">
          <span className="resumen__label">{label}</span>
          <span className="resumen__valor">{valor}</span>
        </div>
      ))}
      {mostrarPrecio && seleccion.medico && (
        <div className="resumen__precio">
          <span>Total a pagar</span>
          <strong>
            ${(seleccion.medico.tarifa || seleccion.especialidad.precio_base)?.toLocaleString('es-CO')} COP
          </strong>
        </div>
      )}
    </div>
  );
}

function PantallaExito({ cita, seleccion, onCancelar }) {
  return (
    <div className="exito">
      <div className="exito__caja">
        <div className="exito__icono">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="exito__titulo">¡Cita confirmada!</h1>
        <p className="exito__subtitulo">Tu cita ha sido agendada exitosamente.</p>

        <div className="exito__resumen">
          {[
            ['Especialidad', seleccion.especialidad?.nombre],
            ['Médico',       seleccion.medico?.nombre],
            ['Fecha',        seleccion.fecha],
            ['Hora',         seleccion.franja?.hora_inicio],
            ['Tipo',         seleccion.tipo_consulta],
          ].filter(([, v]) => v).map(([label, valor]) => (
            <div key={label} className="exito__fila">
              <span>{label}</span>
              <strong>{valor}</strong>
            </div>
          ))}
        </div>

        <div className="exito__acciones">
          <a href="/" className="btn-inicio">Ir al inicio</a>
          {cita?.id && cita.id !== 'DEMO-001' && (
            <button className="btn-cancelar" onClick={() => onCancelar(cita.id)}>
              Cancelar esta cita
            </button>
          )}
        </div>
      </div>
    </div>
  );
}