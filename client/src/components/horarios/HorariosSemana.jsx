// client/src/components/horarios/HorariosSemana.jsx
// MELIKA — Configurador semanal de horarios (Admin + Médico)
// Rediseño: selector de semana tipo navegador de calendario interactivo,
// tabla responsiva sin overflow horizontal, ClockPicker para horas.

import { useState, useCallback } from 'react';
import ClockPicker from '../ui/ClockPicker';
import './HorariosSemana.css';

// ─── Constantes ────────────────────────────────────────────────────────────────
const DIAS_SEMANA = [
  { key: 'lunes',     label: 'Lunes',     short: 'L' },
  { key: 'martes',    label: 'Martes',    short: 'M' },
  { key: 'miercoles', label: 'Miércoles', short: 'X' },
  { key: 'jueves',    label: 'Jueves',    short: 'J' },
  { key: 'viernes',   label: 'Viernes',   short: 'V' },
  { key: 'sabado',    label: 'Sábado',    short: 'S' },
];

const DURACION_FRANJA = 40;

const MESES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

// ─── Helpers de fecha ──────────────────────────────────────────────────────────
function lunesDeSemana(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function fechasDeSemana(lunesISO) {
  if (!lunesISO) return {};
  const base = new Date(lunesISO + 'T00:00:00');
  return Object.fromEntries(
    DIAS_SEMANA.map((d, i) => {
      const f = new Date(base);
      f.setDate(base.getDate() + i);
      return [d.key, f.toISOString().split('T')[0]];
    })
  );
}

function labelFechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function semanaLabel(lunesISO) {
  if (!lunesISO) return null;
  const fechas = fechasDeSemana(lunesISO);
  const lunes = new Date(lunesISO + 'T00:00:00');
  const sabado = new Date(fechas.sabado + 'T00:00:00');
  const mismoMes = lunes.getMonth() === sabado.getMonth();
  if (mismoMes) {
    return `${lunes.getDate()} – ${sabado.getDate()} de ${MESES[lunes.getMonth()]} ${lunes.getFullYear()}`;
  }
  return `${lunes.getDate()} ${MESES[lunes.getMonth()]} – ${sabado.getDate()} ${MESES[sabado.getMonth()]} ${lunes.getFullYear()}`;
}

function hoy() {
  return new Date().toISOString().split('T')[0];
}

// Obtiene el lunes de la semana que contiene una fecha
function semanasDisponibles(desde, cantidad = 8) {
  const semanas = [];
  let base = new Date(lunesDeSemana(desde) + 'T00:00:00');
  for (let i = 0; i < cantidad; i++) {
    semanas.push(base.toISOString().split('T')[0]);
    base.setDate(base.getDate() + 7);
  }
  return semanas;
}

// ─── Lógica de previsualización ────────────────────────────────────────────────
function calcularFranjas(inicio, fin, iniDesc, finDesc) {
  if (!inicio || !fin) return null;
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const totalMin = toMin(fin) - toMin(inicio);
  if (totalMin <= 0) return null;
  let descMin = 0;
  if (iniDesc && finDesc) descMin = Math.max(0, toMin(finDesc) - toMin(iniDesc));
  return Math.floor((totalMin - descMin) / DURACION_FRANJA);
}

// ─── Estado inicial ────────────────────────────────────────────────────────────
const diaVacio = () => ({
  activo: false,
  hora_inicio: '',
  hora_fin: '',
  tiene_descanso: false,
  inicio_descanso: '',
  fin_descanso: '',
});

const semanaVacia = () =>
  Object.fromEntries(DIAS_SEMANA.map(d => [d.key, diaVacio()]));

// ─── Navegador de semanas ──────────────────────────────────────────────────────
function NavegadorSemana({ value, onChange }) {
  const hoyISO = hoy();
  const primerLunes = lunesDeSemana(hoyISO);
  const semanas = semanasDisponibles(hoyISO, 12);
  const selIdx = value ? semanas.indexOf(value) : -1;

  function navegar(delta) {
    if (!value) {
      onChange(semanas[0]);
      return;
    }
    const nuevoIdx = selIdx + delta;
    if (nuevoIdx >= 0 && nuevoIdx < semanas.length) {
      onChange(semanas[nuevoIdx]);
    }
  }

  const puedePrev = selIdx > 0;
  const puedeNext = selIdx < semanas.length - 1;

  const fechas = value ? fechasDeSemana(value) : null;

  return (
    <div className="sh-nav-semana">
      <div className="sh-nav-semana__ctrl">
        <button
          type="button"
          className="sh-nav-semana__btn"
          onClick={() => navegar(-1)}
          disabled={!puedePrev}
          aria-label="Semana anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="sh-nav-semana__info">
          {value ? (
            <>
              <span className="sh-nav-semana__rango">{semanaLabel(value)}</span>
              <span className="sh-nav-semana__hint">
                {DIAS_SEMANA.map(d => (
                  <span key={d.key} className="sh-nav-semana__dia-dot">
                    {d.short}
                    {fechas && <span className="sh-nav-semana__dia-fecha">
                      {new Date(fechas[d.key] + 'T00:00:00').getDate()}
                    </span>}
                  </span>
                ))}
              </span>
            </>
          ) : (
            <span className="sh-nav-semana__placeholder">Selecciona una semana</span>
          )}
        </div>

        <button
          type="button"
          className="sh-nav-semana__btn"
          onClick={() => navegar(1)}
          disabled={!puedeNext}
          aria-label="Semana siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Selector rápido de semanas (scroll horizontal interno, no el modal) */}
      <div className="sh-nav-semana__scroll">
        {semanas.map((s, i) => {
          const lunes = new Date(s + 'T00:00:00');
          const esActual = s === primerLunes;
          const esSel = s === value;
          return (
            <button
              key={s}
              type="button"
              className={`sh-nav-semana__pill ${esSel ? 'sh-nav-semana__pill--sel' : ''} ${esActual ? 'sh-nav-semana__pill--hoy' : ''}`}
              onClick={() => onChange(s)}
            >
              <span className="sh-nav-semana__pill-sem">Sem {i + 1}</span>
              <span className="sh-nav-semana__pill-fecha">
                {lunes.getDate()} {MESES[lunes.getMonth()].slice(0, 3)}
              </span>
              {esActual && <span className="sh-nav-semana__pill-tag">Esta semana</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fila de un día ────────────────────────────────────────────────────────────
function FilaDia({ dia, config, fechaLabel, onToggle, onChange, onCopiar }) {
  const c = config[dia.key];
  const nFranjas = calcularFranjas(
    c.hora_inicio, c.hora_fin,
    c.tiene_descanso ? c.inicio_descanso : null,
    c.tiene_descanso ? c.fin_descanso    : null,
  );

  return (
    <div className={`sh-fila ${c.activo ? 'sh-fila--activa' : 'sh-fila--inactiva'}`}>

      {/* ── Cabecera del día (siempre visible) ── */}
      <div className="sh-fila__cabecera">
        <label className="sh-fila__toggle">
          <input
            type="checkbox"
            checked={c.activo}
            onChange={() => onToggle(dia.key)}
          />
          <span className="sh-fila__dia-nombre">{dia.label}</span>
          {fechaLabel && <span className="sh-fila__dia-fecha">{fechaLabel}</span>}
        </label>

        <div className="sh-fila__cabecera-right">
          {c.activo && nFranjas !== null && (
            <span className="sh-fila__badge">{nFranjas} citas</span>
          )}
          {c.activo && c.hora_inicio && c.hora_fin && (
            <button
              type="button"
              className="sh-fila__btn-copiar"
              onClick={() => onCopiar(dia.key)}
              title="Copiar a otros días activos"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Controles de horas (solo cuando activo) ── */}
      {c.activo && (
        <div className="sh-fila__cuerpo">
          <div className="sh-fila__horas">
            <div className="sh-fila__clock-grupo">
              <span className="sh-fila__clock-label">Inicio</span>
              <ClockPicker
                value={c.hora_inicio}
                onChange={v => {
                  onChange(dia.key, 'hora_inicio', v);
                  onChange(dia.key, 'hora_fin', '');
                  onChange(dia.key, 'inicio_descanso', '');
                  onChange(dia.key, 'fin_descanso', '');
                }}
                placeholder="-- : --"
              />
            </div>

            <span className="sh-fila__separador" aria-hidden="true">→</span>

            <div className="sh-fila__clock-grupo">
              <span className="sh-fila__clock-label">Fin</span>
              <ClockPicker
                value={c.hora_fin}
                onChange={v => {
                  onChange(dia.key, 'hora_fin', v);
                  onChange(dia.key, 'inicio_descanso', '');
                  onChange(dia.key, 'fin_descanso', '');
                }}
                afterTime={c.hora_inicio || undefined}
                disabled={!c.hora_inicio}
                placeholder="-- : --"
              />
            </div>
          </div>

          {/* ── Descanso ── */}
          <div className="sh-fila__descanso-wrap">
            <label className={`sh-fila__descanso-toggle ${!c.hora_inicio || !c.hora_fin ? 'sh-fila__descanso-toggle--disabled' : ''}`}>
              <input
                type="checkbox"
                checked={c.tiene_descanso}
                disabled={!c.hora_inicio || !c.hora_fin}
                onChange={e => {
                  onChange(dia.key, 'tiene_descanso', e.target.checked);
                  if (!e.target.checked) {
                    onChange(dia.key, 'inicio_descanso', '');
                    onChange(dia.key, 'fin_descanso', '');
                  }
                }}
              />
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Descanso
            </label>

            {c.tiene_descanso && (
              <div className="sh-fila__descanso-horas">
                <div className="sh-fila__clock-grupo">
                  <span className="sh-fila__clock-label">Inicio desc.</span>
                  <ClockPicker
                    value={c.inicio_descanso}
                    onChange={v => {
                      onChange(dia.key, 'inicio_descanso', v);
                      onChange(dia.key, 'fin_descanso', '');
                    }}
                    afterTime={c.hora_inicio || undefined}
                    beforeTime={c.hora_fin   || undefined}
                  />
                </div>
                <span className="sh-fila__separador" aria-hidden="true">–</span>
                <div className="sh-fila__clock-grupo">
                  <span className="sh-fila__clock-label">Fin desc.</span>
                  <ClockPicker
                    value={c.fin_descanso}
                    onChange={v => onChange(dia.key, 'fin_descanso', v)}
                    afterTime={c.inicio_descanso || c.hora_inicio || undefined}
                    beforeTime={c.hora_fin        || undefined}
                    disabled={!c.inicio_descanso}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function HorariosSemana({
  medicos      = null,
  idMedicoFijo = null,
  onCrear,
  onExito,
}) {
  const [semanaInicio, setSemanaInicio] = useState('');
  const [medicoSel,    setMedicoSel]    = useState('');
  const [config,       setConfig]       = useState(semanaVacia());
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState(null);
  const [resultado,    setResultado]    = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleDia = useCallback(dia => {
    setConfig(prev => ({ ...prev, [dia]: { ...prev[dia], activo: !prev[dia].activo } }));
  }, []);

  const setCampo = useCallback((dia, campo, valor) => {
    setConfig(prev => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }));
  }, []);

  function aplicarPlantilla(inicio, fin) {
    setConfig(prev => {
      const nuevo = { ...prev };
      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(d => {
        nuevo[d] = { ...nuevo[d], activo: true, hora_inicio: inicio, hora_fin: fin };
      });
      return nuevo;
    });
  }

  function copiarHorario(origen) {
    const src = config[origen];
    if (!src.hora_inicio || !src.hora_fin) return;
    setConfig(prev => {
      const nuevo = { ...prev };
      DIAS_SEMANA.forEach(d => {
        if (d.key !== origen && nuevo[d.key].activo) {
          nuevo[d.key] = {
            ...nuevo[d.key],
            hora_inicio:     src.hora_inicio,
            hora_fin:        src.hora_fin,
            tiene_descanso:  src.tiene_descanso,
            inicio_descanso: src.inicio_descanso,
            fin_descanso:    src.fin_descanso,
          };
        }
      });
      return nuevo;
    });
  }

  // ── Validación ─────────────────────────────────────────────────────────────
  function validar() {
    const idMedico = idMedicoFijo || medicoSel;
    if (!idMedico && medicos !== null) return 'Selecciona un médico.';
    if (!semanaInicio) return 'Selecciona la semana.';
    const activos = DIAS_SEMANA.filter(d => config[d.key].activo);
    if (activos.length === 0) return 'Activa al menos un día.';
    for (const d of activos) {
      const c = config[d.key];
      if (!c.hora_inicio || !c.hora_fin) return `${d.label}: completa el horario de inicio y fin.`;
      if (c.hora_inicio >= c.hora_fin)   return `${d.label}: la hora de inicio debe ser anterior al fin.`;
      if (c.tiene_descanso) {
        if (!c.inicio_descanso || !c.fin_descanso) return `${d.label}: completa el horario de descanso.`;
        if (c.inicio_descanso >= c.fin_descanso)   return `${d.label}: el inicio del descanso debe ser anterior al fin.`;
        if (c.inicio_descanso <= c.hora_inicio || c.fin_descanso >= c.hora_fin)
          return `${d.label}: el descanso debe estar dentro del horario de la jornada.`;
      }
    }
    return null;
  }

  // ── Envío ──────────────────────────────────────────────────────────────────
  async function handleCrear() {
    const err = validar();
    if (err) { setError(err); return; }
    setError(null);
    setGuardando(true);

    const idMedico = idMedicoFijo || parseInt(medicoSel);
    const fechas   = fechasDeSemana(semanaInicio);
    const activos  = DIAS_SEMANA.filter(d => config[d.key].activo);

    let totalInsertadas = 0;
    let totalDias       = 0;

    try {
      for (const d of activos) {
        const c = config[d.key];
        const res = await onCrear({
          id_medico:       idMedico,
          fecha:           fechas[d.key],
          hora_inicio:     c.hora_inicio,
          hora_fin:        c.hora_fin,
          inicio_descanso: c.tiene_descanso ? c.inicio_descanso : null,
          fin_descanso:    c.tiene_descanso ? c.fin_descanso    : null,
        });
        totalInsertadas += res?.insertadas || 0;
        totalDias++;
      }
      setResultado({ dias: totalDias, franjas: totalInsertadas });
      onExito?.();
    } catch (e) {
      setError(e.message || 'Error al crear las franjas.');
    } finally {
      setGuardando(false);
    }
  }

  function resetear() {
    setConfig(semanaVacia());
    setSemanaInicio('');
    setMedicoSel('');
    setResultado(null);
    setError(null);
  }

  // ── Render resultado ───────────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="sh-resultado">
        <div className="sh-resultado__icono" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <h4 className="sh-resultado__titulo">Horario creado</h4>
        <p className="sh-resultado__detalle">
          {resultado.franjas} franjas de {DURACION_FRANJA} min generadas
          en {resultado.dias} día{resultado.dias !== 1 ? 's' : ''}.
        </p>
        <div className="sh-resultado__acciones">
          <button className="sh-btn sh-btn--secundario" onClick={resetear}>
            Crear otro horario
          </button>
        </div>
      </div>
    );
  }

  const fechas = fechasDeSemana(semanaInicio);
  const diasActivos = DIAS_SEMANA.filter(d => config[d.key].activo).length;

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <div className="sh-root">

      {/* ── Selector de médico (solo admin) ── */}
      {medicos !== null && (
        <div className="sh-campo">
          <label className="sh-label">Médico</label>
          <select
            className="sh-select"
            value={medicoSel}
            onChange={e => setMedicoSel(e.target.value)}
          >
            <option value="">Seleccionar médico…</option>
            {medicos.filter(m => m.activo).map(m => (
              <option key={m.id} value={m.id}>
                Dr(a). {m.nombre} {m.primer_apellido} — {m.especialidad}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Navegador de semana interactivo ── */}
      <div className="sh-seccion">
        <label className="sh-label">Semana</label>
        <NavegadorSemana value={semanaInicio} onChange={setSemanaInicio} />
      </div>

      {/* ── Plantillas rápidas ── */}
      {semanaInicio && (
        <div className="sh-plantillas">
          <span className="sh-plantillas__label">Plantilla:</span>
          <button type="button" className="sh-plantilla-btn" onClick={() => aplicarPlantilla('07:00', '13:00')}>Mañanas 7–13</button>
          <button type="button" className="sh-plantilla-btn" onClick={() => aplicarPlantilla('08:00', '17:00')}>Jornada 8–17</button>
          <button type="button" className="sh-plantilla-btn" onClick={() => aplicarPlantilla('14:00', '20:00')}>Tardes 14–20</button>
        </div>
      )}

      {/* ── Error ── */}
      {error && <div className="sh-error" role="alert">{error}</div>}

      {/* ── Filas de días ── */}
      {semanaInicio && (
        <div className="sh-dias">
          {DIAS_SEMANA.map(d => (
            <FilaDia
              key={d.key}
              dia={d}
              config={config}
              fechaLabel={fechas[d.key] ? labelFechaCorta(fechas[d.key]) : ''}
              onToggle={toggleDia}
              onChange={setCampo}
              onCopiar={copiarHorario}
            />
          ))}
        </div>
      )}

      {!semanaInicio && (
        <div className="sh-vacio">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>Selecciona una semana para configurar la disponibilidad</p>
        </div>
      )}

      {/* ── Acciones ── */}
      {semanaInicio && (
        <div className="sh-acciones">
          <span className="sh-acciones__resumen">
            {diasActivos === 0
              ? 'Ningún día seleccionado'
              : `${diasActivos} día${diasActivos !== 1 ? 's' : ''} configurado${diasActivos !== 1 ? 's' : ''}`}
          </span>
          <div className="sh-acciones__btns">
            <button
              type="button"
              className="sh-btn sh-btn--secundario"
              onClick={resetear}
              disabled={guardando}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="sh-btn sh-btn--primario"
              onClick={handleCrear}
              disabled={guardando || diasActivos === 0}
            >
              {guardando ? 'Creando franjas…' : `Crear horario semanal`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}