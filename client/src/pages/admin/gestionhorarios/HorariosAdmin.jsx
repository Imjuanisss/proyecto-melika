// client/src/pages/admin/gestionhorarios/HorariosAdmin.jsx
// MELIKA — Gestión de horarios en masa para administradores
// Permite configurar la agenda de un médico por semana completa
// con plantillas reutilizables y franjas de 40 min automáticas.

import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar      from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale          from '@fullcalendar/core/locales/es';
import { api }           from '../../../lib/apiClient';
import DatePicker        from '../../../components/ui/DatePicker';
import ClockPicker       from '../../../components/ui/ClockPicker';
import './HorariosAdmin.css';
import '../admin-shared.css';

// Días de la semana para el configurador semanal
const DIAS_SEMANA = [
  { key: 'lunes',     label: 'Lunes',     short: 'L' },
  { key: 'martes',    label: 'Martes',    short: 'M' },
  { key: 'miercoles', label: 'Miércoles', short: 'X' },
  { key: 'jueves',    label: 'Jueves',    short: 'J' },
  { key: 'viernes',   label: 'Viernes',   short: 'V' },
  { key: 'sabado',    label: 'Sábado',    short: 'S' },
];

// Duración de franja fija en el sistema
const DURACION_FRANJA = 40;

// Modo del modal principal
const MODOS = {
  SEMANA:  'semana',  // Configurar horario semanal (uso principal)
  PUNTUAL: 'puntual', // Añadir franja puntual en una fecha exacta
};

const MODO_LABELS = {
  semana:  '📅 Semana completa',
  puntual: '🕐 Franja puntual',
};

// Estructura inicial de un día activo
const diaInicial = () => ({
  activo:           false,
  hora_inicio:      '',
  hora_fin:         '',
  tiene_descanso:   false,
  inicio_descanso:  '',
  fin_descanso:     '',
});

// Genera el estado inicial de la semana
const semanaInicial = () =>
  Object.fromEntries(DIAS_SEMANA.map(d => [d.key, diaInicial()]));

export default function HorariosAdmin() {
  const calendarRef = useRef(null);

  const [medicos,      setMedicos]      = useState([]);
  const [filtroMedico, setFiltroMedico] = useState('');

  // Modal principal
  const [modal,     setModal]     = useState(false);
  const [modo,      setModo]      = useState(MODOS.SEMANA);

  // Estado modo semana
  const [semanaMedico,  setSemanaMedico]  = useState('');
  const [semanaInicio,  setSemanaInicio]  = useState(''); // Lunes ISO
  const [configSemana,  setConfigSemana]  = useState(semanaInicial());

  // Estado modo puntual
  const [puntuMedico,   setPuntuMedico]   = useState('');
  const [puntuFecha,    setPuntuFecha]    = useState('');
  const [puntuInicio,   setPuntuInicio]   = useState('');
  const [puntuFin,      setPuntuFin]      = useState('');
  const [puntuDescanso, setPuntuDescanso] = useState(false);
  const [puntuIniDesc,  setPuntuIniDesc]  = useState('');
  const [puntuFinDesc,  setPuntuFinDesc]  = useState('');

  // Estado de envío
  const [guardando,    setGuardando]    = useState(false);
  const [errorForm,    setErrorForm]    = useState(null);
  const [resultado,    setResultado]    = useState(null); // Resumen post-creación

  // Detalle al clic en evento del calendario
  const [eventoSel,    setEventoSel]    = useState(null);

  // ── Carga inicial de médicos ──────────────────────────────────────────────
  useEffect(() => {
    api.get('/medicos').then(setMedicos).catch(() => {});
  }, []);

  // ── Función de eventos para FullCalendar ───────────────────────────────────
  const cargarEventos = useCallback(
    (fetchInfo, successCallback, failureCallback) => {
      const inicio = fetchInfo.startStr.split('T')[0];
      const fin    = fetchInfo.endStr.split('T')[0];
      const qs     = filtroMedico
        ? `?inicio=${inicio}&fin=${fin}&id_medico=${filtroMedico}`
        : `?inicio=${inicio}&fin=${fin}`;
      api.get(`/admin/horarios${qs}`)
        .then(successCallback)
        .catch(failureCallback);
    },
    [filtroMedico]
  );

  // ── Handlers del filtro ───────────────────────────────────────────────────
  function handleFiltroChange(e) {
    setFiltroMedico(e.target.value);
    calendarRef.current?.getApi().refetchEvents();
  }

  // ── Abrir / cerrar modal ──────────────────────────────────────────────────
  function abrirModal(modoInicial = MODOS.SEMANA) {
    setModo(modoInicial);
    resetModal();
    setModal(true);
  }

  function resetModal() {
    setSemanaMedico(''); setSemanaInicio(''); setConfigSemana(semanaInicial());
    setPuntuMedico(''); setPuntuFecha(''); setPuntuInicio(''); setPuntuFin('');
    setPuntuDescanso(false); setPuntuIniDesc(''); setPuntuFinDesc('');
    setErrorForm(null); setResultado(null);
  }

  function cerrarModal() {
    setModal(false);
    resetModal();
  }

  // ── Helpers semana ────────────────────────────────────────────────────────

  // Calcula las fechas ISO de cada día de la semana a partir del lunes
  function fechasDeSemana(lunesISO) {
    if (!lunesISO) return {};
    const base = new Date(lunesISO + 'T00:00:00');
    return Object.fromEntries(
      DIAS_SEMANA.map((d, i) => {
        const fecha = new Date(base);
        fecha.setDate(base.getDate() + i);
        return [d.key, fecha.toISOString().split('T')[0]];
      })
    );
  }

  // Toggle de día activo
  function toggleDia(dia) {
    setConfigSemana(prev => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo },
    }));
  }

  // Actualizar un campo de un día
  function setDiaCampo(dia, campo, valor) {
    setConfigSemana(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  }

  // Copiar el horario de un día origen a todos los activos (o a todos)
  function copiarHorario(diaOrigen) {
    const origen = configSemana[diaOrigen];
    if (!origen.hora_inicio || !origen.hora_fin) return;
    setConfigSemana(prev => {
      const nuevo = { ...prev };
      DIAS_SEMANA.forEach(d => {
        if (d.key !== diaOrigen && nuevo[d.key].activo) {
          nuevo[d.key] = {
            ...nuevo[d.key],
            hora_inicio:     origen.hora_inicio,
            hora_fin:        origen.hora_fin,
            tiene_descanso:  origen.tiene_descanso,
            inicio_descanso: origen.inicio_descanso,
            fin_descanso:    origen.fin_descanso,
          };
        }
      });
      return nuevo;
    });
  }

  // Activar todos los días laborales con un horario base
  function aplicarHorarioBase(inicio, fin) {
    setConfigSemana(prev => {
      const nuevo = { ...prev };
      ['lunes','martes','miercoles','jueves','viernes'].forEach(d => {
        nuevo[d] = { ...nuevo[d], activo: true, hora_inicio: inicio, hora_fin: fin };
      });
      return nuevo;
    });
  }

  // ── Validación semana ─────────────────────────────────────────────────────
  function validarSemana() {
    if (!semanaMedico) return 'Selecciona un médico.';
    if (!semanaInicio) return 'Selecciona la semana de inicio.';
    const diasActivos = DIAS_SEMANA.filter(d => configSemana[d.key].activo);
    if (diasActivos.length === 0) return 'Activa al menos un día de la semana.';
    for (const d of diasActivos) {
      const cfg = configSemana[d.key];
      if (!cfg.hora_inicio || !cfg.hora_fin)
        return `Completa las horas para ${d.label}.`;
      if (cfg.hora_inicio >= cfg.hora_fin)
        return `En ${d.label}: la hora de inicio debe ser anterior a la de fin.`;
      if (cfg.tiene_descanso) {
        if (!cfg.inicio_descanso || !cfg.fin_descanso)
          return `En ${d.label}: completa las horas del descanso.`;
        if (cfg.inicio_descanso >= cfg.fin_descanso)
          return `En ${d.label}: el inicio del descanso debe ser anterior a su fin.`;
        if (cfg.inicio_descanso <= cfg.hora_inicio || cfg.fin_descanso >= cfg.hora_fin)
          return `En ${d.label}: el descanso debe estar dentro del horario.`;
      }
    }
    return null;
  }

  // ── Validación puntual ────────────────────────────────────────────────────
  function validarPuntual() {
    if (!puntuMedico) return 'Selecciona un médico.';
    if (!puntuFecha)  return 'Selecciona la fecha.';
    if (!puntuInicio || !puntuFin) return 'Completa las horas de inicio y fin.';
    if (puntuInicio >= puntuFin) return 'La hora de inicio debe ser anterior a la de fin.';
    if (puntuDescanso) {
      if (!puntuIniDesc || !puntuFinDesc) return 'Completa las horas del descanso.';
      if (puntuIniDesc >= puntuFinDesc) return 'El inicio del descanso debe ser anterior a su fin.';
    }
    return null;
  }

  // ── Envío semana ──────────────────────────────────────────────────────────
  async function handleCrearSemana() {
    const err = validarSemana();
    if (err) { setErrorForm(err); return; }
    setErrorForm(null);
    setGuardando(true);

    const fechas = fechasDeSemana(semanaInicio);
    const diasActivos = DIAS_SEMANA.filter(d => configSemana[d.key].activo);
    let totalInsertadas = 0;
    let totalDias = 0;

    try {
      for (const d of diasActivos) {
        const cfg   = configSemana[d.key];
        const fecha = fechas[d.key];
        const body  = {
          fecha,
          id_medico:       parseInt(semanaMedico),
          hora_inicio:     cfg.hora_inicio,
          hora_fin:        cfg.hora_fin,
          inicio_descanso: cfg.tiene_descanso ? cfg.inicio_descanso : null,
          fin_descanso:    cfg.tiene_descanso ? cfg.fin_descanso    : null,
        };
        const res = await api.post('/admin/horarios/masivo', body);
        totalInsertadas += res.insertadas || 0;
        totalDias++;
      }
      setResultado({ dias: totalDias, franjas: totalInsertadas });
      calendarRef.current?.getApi().refetchEvents();
    } catch (e) {
      setErrorForm(e.message || 'Error al crear las franjas.');
    } finally {
      setGuardando(false);
    }
  }

  // ── Envío puntual ─────────────────────────────────────────────────────────
  async function handleCrearPuntual() {
    const err = validarPuntual();
    if (err) { setErrorForm(err); return; }
    setErrorForm(null);
    setGuardando(true);

    try {
      const res = await api.post('/admin/horarios/masivo', {
        fecha:           puntuFecha,
        id_medico:       parseInt(puntuMedico),
        hora_inicio:     puntuInicio,
        hora_fin:        puntuFin,
        inicio_descanso: puntuDescanso ? puntuIniDesc : null,
        fin_descanso:    puntuDescanso ? puntuFinDesc : null,
      });
      setResultado({ dias: 1, franjas: res.insertadas || 0 });
      calendarRef.current?.getApi().refetchEvents();
    } catch (e) {
      setErrorForm(e.message || 'Error al crear las franjas.');
    } finally {
      setGuardando(false);
    }
  }

  // ── Eliminar franja ───────────────────────────────────────────────────────
  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta franja de disponibilidad?')) return;
    try {
      await api.delete(`/admin/horarios/${id}`);
      setEventoSel(null);
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────────
  function labelFecha(iso) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  // Obtener el lunes de la semana que contiene `fecha`
  function lunesDeSemana(iso) {
    const d = new Date(iso + 'T00:00:00');
    const dow = d.getDay(); // 0 = dom
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }

  function previsualizarFranjas(inicio, fin, iniDesc, finDesc) {
    if (!inicio || !fin) return null;
    const [ih, im] = inicio.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    const totalMin = (fh * 60 + fm) - (ih * 60 + im);
    if (totalMin <= 0) return null;
    let descMin = 0;
    if (iniDesc && finDesc) {
      const [dih, dim] = iniDesc.split(':').map(Number);
      const [dfh, dfm] = finDesc.split(':').map(Number);
      descMin = (dfh * 60 + dfm) - (dih * 60 + dim);
    }
    return Math.floor((totalMin - Math.max(0, descMin)) / DURACION_FRANJA);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="horarios-admin">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Gestión de Horarios</h1>
          <p className="admin-modulo__subtitulo">
            Configura la disponibilidad de los médicos por semana o por franja individual
          </p>
        </div>
        <div className="horarios-cabecera-acciones">
          <select
            className="admin-filtros__select"
            value={filtroMedico}
            onChange={handleFiltroChange}
          >
            <option value="">Todos los médicos</option>
            {medicos.map(m => (
              <option key={m.id} value={m.id}>
                Dr(a). {m.nombre} {m.primer_apellido} — {m.especialidad}
              </option>
            ))}
          </select>
          <button
            className="btn-admin-secundario"
            onClick={() => abrirModal(MODOS.PUNTUAL)}
          >
            + Franja puntual
          </button>
          <button
            className="btn-admin-primario"
            onClick={() => abrirModal(MODOS.SEMANA)}
          >
            📅 Configurar semana
          </button>
        </div>
      </div>

      {/* ── Leyenda ───────────────────────────────────────────────────────── */}
      <div className="horarios-leyenda">
        <span className="leyenda-item leyenda-item--libre">🟢 Disponible</span>
        <span className="leyenda-item leyenda-item--ocupada">🟠 Reservada</span>
        <span className="leyenda-item" style={{ color: 'var(--melika-text-muted)', fontSize: '12px' }}>
          Cada evento representa una franja de {DURACION_FRANJA} min
        </span>
      </div>

      {/* ── Calendario ───────────────────────────────────────────────────── */}
      <div className="horarios-calendar-wrap">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          headerToolbar={{
            left:   'prev,next today',
            center: 'title',
            right:  'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={cargarEventos}
          eventClick={e => setEventoSel(e.event)}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:40:00"
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
          nowIndicator
          allDaySlot={false}
        />
      </div>

      {/* ── Modal detalle de evento ───────────────────────────────────────── */}
      {eventoSel && (
        <div className="admin-modal-overlay" onClick={() => setEventoSel(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: 400 }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Detalle de franja</h3>
            <div className="horarios-detalle">
              <p><strong>Médico:</strong> {eventoSel.extendedProps.medico_nombre}</p>
              <p><strong>Especialidad:</strong> {eventoSel.extendedProps.especialidad}</p>
              <p>
                <strong>Inicio:</strong>{' '}
                {new Date(eventoSel.start).toLocaleString('es-CO')}
              </p>
              <p>
                <strong>Fin:</strong>{' '}
                {new Date(eventoSel.end).toLocaleString('es-CO')}
              </p>
              <p>
                <strong>Estado:</strong>{' '}
                {eventoSel.extendedProps.disponible
                  ? <span className="badge badge--verde">Disponible</span>
                  : <span className="badge badge--naranja">Reservada</span>
                }
              </p>
              {eventoSel.extendedProps.paciente && (
                <p><strong>Paciente:</strong> {eventoSel.extendedProps.paciente}</p>
              )}
            </div>
            <div className="admin-modal__acciones">
              <button className="admin-modal__btn-cancelar" onClick={() => setEventoSel(null)}>
                Cerrar
              </button>
              {eventoSel.extendedProps.disponible && (
                <button
                  className="btn-tabla btn-tabla--danger"
                  onClick={() => handleEliminar(eventoSel.id)}
                >
                  🗑 Eliminar franja
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL PRINCIPAL — Crear horarios
      ═══════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div
            className="admin-modal horarios-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header con selector de modo ─────────────────────────── */}
            <div className="horarios-modal__header">
              <div>
                <h3 className="horarios-modal__titulo">Añadir disponibilidad</h3>
                <p className="horarios-modal__sub">
                  Franjas de {DURACION_FRANJA} min generadas automáticamente
                </p>
              </div>
              <button
                className="btn-cerrar-modal"
                onClick={cerrarModal}
                aria-label="Cerrar"
              >✕</button>
            </div>

            {/* Tabs de modo */}
            <div className="horarios-modo-tabs">
              {Object.entries(MODOS).map(([, m]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setModo(m); setErrorForm(null); setResultado(null); }}
                  className={['horarios-modo-tab', modo === m ? 'horarios-modo-tab--activo' : ''].join(' ')}
                >
                  {MODO_LABELS[m]}
                </button>
              ))}
            </div>

            {errorForm && (
              <div className="admin-error horarios-error">{errorForm}</div>
            )}

            {/* ── RESULTADO ────────────────────────────────────────────── */}
            {resultado ? (
              <div className="horarios-resultado">
                <div className="horarios-resultado__icono">✅</div>
                <h4 className="horarios-resultado__titulo">
                  ¡Horarios creados!
                </h4>
                <p className="horarios-resultado__detalle">
                  Se generaron <strong>{resultado.franjas} franjas</strong> de{' '}
                  {DURACION_FRANJA} minutos en{' '}
                  <strong>{resultado.dias} día{resultado.dias > 1 ? 's' : ''}</strong>.
                </p>
                <div className="horarios-resultado__acciones">
                  <button className="admin-modal__btn-cancelar" onClick={() => { setResultado(null); resetModal(); }}>
                    Crear más horarios
                  </button>
                  <button className="admin-modal__btn-guardar" onClick={cerrarModal}>
                    Listo
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ══ MODO SEMANA ══════════════════════════════════════════ */}
                {modo === MODOS.SEMANA && (
                  <div className="horarios-modal__body">

                    {/* Médico + semana */}
                    <div className="horarios-fila-2">
                      <div className="admin-campo">
                        <label>Médico</label>
                        <select
                          value={semanaMedico}
                          onChange={e => setSemanaMedico(e.target.value)}
                        >
                          <option value="">Seleccionar médico…</option>
                          {medicos.filter(m => m.activo).map(m => (
                            <option key={m.id} value={m.id}>
                              Dr(a). {m.nombre} {m.primer_apellido} — {m.especialidad}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="admin-campo">
                        <label>Semana que inicia el</label>
                        <DatePicker
                          value={semanaInicio}
                          onChange={iso => setSemanaInicio(lunesDeSemana(iso))}
                          minDate={new Date().toISOString().split('T')[0]}
                        />
                        {semanaInicio && (
                          <span className="horarios-campo-hint">
                            Lunes {labelFecha(semanaInicio)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Plantillas rápidas */}
                    <div className="horarios-plantillas">
                      <span className="horarios-plantillas__label">Plantilla rápida:</span>
                      <button type="button" className="horarios-plantilla-btn"
                        onClick={() => aplicarHorarioBase('07:00','13:00')}>
                        Mañanas 7–13
                      </button>
                      <button type="button" className="horarios-plantilla-btn"
                        onClick={() => aplicarHorarioBase('08:00','17:00')}>
                        Jornada 8–17
                      </button>
                      <button type="button" className="horarios-plantilla-btn"
                        onClick={() => aplicarHorarioBase('14:00','20:00')}>
                        Tardes 14–20
                      </button>
                    </div>

                    {/* Configurador por día */}
                    <div className="horarios-dias-lista">
                      {DIAS_SEMANA.map(d => {
                        const cfg = configSemana[d.key];
                        const previsualizacion = previsualizarFranjas(
                          cfg.hora_inicio, cfg.hora_fin,
                          cfg.tiene_descanso ? cfg.inicio_descanso : null,
                          cfg.tiene_descanso ? cfg.fin_descanso    : null
                        );
                        return (
                          <div
                            key={d.key}
                            className={[
                              'horarios-dia',
                              cfg.activo ? 'horarios-dia--activo' : '',
                            ].join(' ')}
                          >
                            {/* Toggle día */}
                            <label className="horarios-dia__toggle">
                              <input
                                type="checkbox"
                                checked={cfg.activo}
                                onChange={() => toggleDia(d.key)}
                              />
                              <span className="horarios-dia__nombre">{d.label}</span>
                              {cfg.activo && previsualizacion !== null && (
                                <span className="horarios-dia__preview">
                                  {previsualizacion} citas
                                </span>
                              )}
                            </label>

                            {/* Campos de horario (solo si activo) */}
                            {cfg.activo && (
                              <div className="horarios-dia__campos">
                                <div className="horarios-dia__horas">
                                  <ClockPicker
                                    label="Inicio jornada"
                                    value={cfg.hora_inicio}
                                    onChange={v => {
                                      setDiaCampo(d.key, 'hora_inicio', v);
                                      setDiaCampo(d.key, 'hora_fin', '');
                                    }}
                                  />
                                  <ClockPicker
                                    label="Fin jornada"
                                    value={cfg.hora_fin}
                                    onChange={v => setDiaCampo(d.key, 'hora_fin', v)}
                                    afterTime={cfg.hora_inicio || undefined}
                                  />
                                </div>

                                {/* Descanso */}
                                <label className="horarios-dia__check-descanso">
                                  <input
                                    type="checkbox"
                                    checked={cfg.tiene_descanso}
                                    onChange={e => {
                                      setDiaCampo(d.key, 'tiene_descanso', e.target.checked);
                                      if (!e.target.checked) {
                                        setDiaCampo(d.key, 'inicio_descanso', '');
                                        setDiaCampo(d.key, 'fin_descanso', '');
                                      }
                                    }}
                                  />
                                  Tiene descanso / almuerzo
                                </label>

                                {cfg.tiene_descanso && (
                                  <div className="horarios-dia__horas horarios-dia__horas--descanso">
                                    <ClockPicker
                                      label="Inicio descanso"
                                      value={cfg.inicio_descanso}
                                      onChange={v => {
                                        setDiaCampo(d.key, 'inicio_descanso', v);
                                        setDiaCampo(d.key, 'fin_descanso', '');
                                      }}
                                      afterTime={cfg.hora_inicio || undefined}
                                      beforeTime={cfg.hora_fin   || undefined}
                                    />
                                    <ClockPicker
                                      label="Fin descanso"
                                      value={cfg.fin_descanso}
                                      onChange={v => setDiaCampo(d.key, 'fin_descanso', v)}
                                      afterTime={cfg.inicio_descanso || undefined}
                                      beforeTime={cfg.hora_fin       || undefined}
                                    />
                                  </div>
                                )}

                                {/* Copiar a otros días */}
                                {cfg.hora_inicio && cfg.hora_fin && (
                                  <button
                                    type="button"
                                    className="horarios-dia__btn-copiar"
                                    onClick={() => copiarHorario(d.key)}
                                    title="Copia este horario a todos los días activos"
                                  >
                                    Copiar horario a los demás días activos
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ══ MODO PUNTUAL ════════════════════════════════════════ */}
                {modo === MODOS.PUNTUAL && (
                  <div className="horarios-modal__body">
                    <div className="horarios-fila-2">
                      <div className="admin-campo">
                        <label>Médico</label>
                        <select
                          value={puntuMedico}
                          onChange={e => setPuntuMedico(e.target.value)}
                        >
                          <option value="">Seleccionar médico…</option>
                          {medicos.filter(m => m.activo).map(m => (
                            <option key={m.id} value={m.id}>
                              Dr(a). {m.nombre} {m.primer_apellido}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="admin-campo">
                        <label>Fecha</label>
                        <DatePicker
                          value={puntuFecha}
                          onChange={setPuntuFecha}
                          minDate={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    <div className="horarios-fila-2">
                      <ClockPicker
                        label="Inicio jornada"
                        value={puntuInicio}
                        onChange={v => { setPuntuInicio(v); setPuntuFin(''); }}
                      />
                      <ClockPicker
                        label="Fin jornada"
                        value={puntuFin}
                        onChange={setPuntuFin}
                        afterTime={puntuInicio || undefined}
                      />
                    </div>

                    {/* Preview */}
                    {puntuInicio && puntuFin && (() => {
                      const n = previsualizarFranjas(
                        puntuInicio, puntuFin,
                        puntuDescanso ? puntuIniDesc : null,
                        puntuDescanso ? puntuFinDesc : null,
                      );
                      return n !== null ? (
                        <div className="horarios-preview-pill">
                          Se generarán <strong>{n} franjas</strong> de {DURACION_FRANJA} min
                        </div>
                      ) : null;
                    })()}

                    <label className="horarios-dia__check-descanso" style={{ marginTop: 'var(--space-2)' }}>
                      <input
                        type="checkbox"
                        checked={puntuDescanso}
                        onChange={e => {
                          setPuntuDescanso(e.target.checked);
                          if (!e.target.checked) { setPuntuIniDesc(''); setPuntuFinDesc(''); }
                        }}
                      />
                      Incluir descanso / almuerzo
                    </label>

                    {puntuDescanso && (
                      <div className="horarios-fila-2">
                        <ClockPicker
                          label="Inicio descanso"
                          value={puntuIniDesc}
                          onChange={v => { setPuntuIniDesc(v); setPuntuFinDesc(''); }}
                          afterTime={puntuInicio || undefined}
                          beforeTime={puntuFin   || undefined}
                        />
                        <ClockPicker
                          label="Fin descanso"
                          value={puntuFinDesc}
                          onChange={setPuntuFinDesc}
                          afterTime={puntuIniDesc || undefined}
                          beforeTime={puntuFin    || undefined}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Acciones del modal ─────────────────────────────── */}
                <div className="admin-modal__acciones horarios-modal__acciones">
                  <button
                    className="admin-modal__btn-cancelar"
                    onClick={cerrarModal}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button
                    className="admin-modal__btn-guardar"
                    disabled={guardando}
                    onClick={modo === MODOS.SEMANA ? handleCrearSemana : handleCrearPuntual}
                  >
                    {guardando
                      ? 'Creando franjas…'
                      : modo === MODOS.SEMANA
                        ? '✓ Crear horario semanal'
                        : '✓ Crear franja'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}