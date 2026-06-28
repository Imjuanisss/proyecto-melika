// client/src/components/horarios/HorariosSemana.jsx
// MELIKA — Configurador semanal de horarios (Admin + Médico)
// Diseño compacto en grid para que todo sea visible sin scroll
// Los ClockPicker usan portal para evitar overflow-hidden del modal

import { useState, useCallback } from 'react';
import './HorariosSemana.css';

// ─── Constantes ───────────────────────────────────────────────────────────────
const DIAS_SEMANA = [
  { key: 'lunes',     label: 'Lunes',     short: 'L' },
  { key: 'martes',    label: 'Martes',    short: 'M' },
  { key: 'miercoles', label: 'Miércoles', short: 'X' },
  { key: 'jueves',    label: 'Jueves',    short: 'J' },
  { key: 'viernes',   label: 'Viernes',   short: 'V' },
  { key: 'sabado',    label: 'Sábado',    short: 'S' },
];

const DURACION_FRANJA = 40;

// Horas disponibles en el sistema (06:00 – 21:00, cada 10 min)
function generarOpciones() {
  const opts = [];
  for (let h = 6; h <= 21; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 21 && m > 0) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}
const HORAS_OPCIONES = generarOpciones();

// ─── Sub-componente: Select de hora inline (sin portal, sin dropdown flotante)
function SelectHora({ label, value, onChange, afterTime, beforeTime, disabled }) {
  const opcionesFiltradas = HORAS_OPCIONES.filter(h => {
    if (afterTime  && h <= afterTime)  return false;
    if (beforeTime && h >= beforeTime) return false;
    return true;
  });

  return (
    <div className="sh-select-hora">
      {label && <label className="sh-select-hora__label">{label}</label>}
      <select
        className={`sh-select-hora__select ${!value ? 'sh-select-hora__select--placeholder' : ''}`}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Seleccionar hora</option>
        {opcionesFiltradas.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Lógica de previsualización ───────────────────────────────────────────────
function calcularFranjas(inicio, fin, iniDesc, finDesc) {
  if (!inicio || !fin) return null;
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const totalMin = toMin(fin) - toMin(inicio);
  if (totalMin <= 0) return null;
  let descMin = 0;
  if (iniDesc && finDesc) descMin = Math.max(0, toMin(finDesc) - toMin(iniDesc));
  return Math.floor((totalMin - descMin) / DURACION_FRANJA);
}

// ─── Estado inicial de un día ─────────────────────────────────────────────────
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

// ─── Helpers de fecha ─────────────────────────────────────────────────────────
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
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function HorariosSemana({
  medicos = null,          // null = modo médico (sin selector de médico)
  idMedicoFijo = null,     // id del médico cuando es el propio médico
  onCrear,                 // async fn({ id_medico, fecha, hora_inicio, hora_fin, inicio_descanso, fin_descanso }) => { insertadas }
  onExito,                 // callback cuando termina exitosamente
}) {
  const [semanaInicio, setSemanaInicio]   = useState('');
  const [medicoSel,    setMedicoSel]      = useState('');
  const [config,       setConfig]         = useState(semanaVacia());
  const [guardando,    setGuardando]      = useState(false);
  const [error,        setError]          = useState(null);
  const [resultado,    setResultado]      = useState(null);

  // ── Handlers config ────────────────────────────────────────────────────────
  const toggleDia = useCallback(dia => {
    setConfig(prev => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo },
    }));
  }, []);

  const setCampo = useCallback((dia, campo, valor) => {
    setConfig(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  }, []);

  function aplicarPlantilla(inicio, fin) {
    setConfig(prev => {
      const nuevo = { ...prev };
      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(d => {
        nuevo[d] = {
          ...nuevo[d],
          activo: true,
          hora_inicio: inicio,
          hora_fin: fin,
          hora_fin_limpio: true,
        };
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
    if (!semanaInicio) return 'Selecciona la semana de inicio.';
    const activos = DIAS_SEMANA.filter(d => config[d.key].activo);
    if (activos.length === 0) return 'Activa al menos un día de la semana.';
    for (const d of activos) {
      const c = config[d.key];
      if (!c.hora_inicio || !c.hora_fin) return `Completa las horas para ${d.label}.`;
      if (c.hora_inicio >= c.hora_fin) return `${d.label}: inicio debe ser anterior al fin.`;
      if (c.tiene_descanso) {
        if (!c.inicio_descanso || !c.fin_descanso) return `${d.label}: completa el descanso.`;
        if (c.inicio_descanso >= c.fin_descanso) return `${d.label}: inicio descanso debe ser anterior al fin.`;
        if (c.inicio_descanso <= c.hora_inicio || c.fin_descanso >= c.hora_fin)
          return `${d.label}: el descanso debe estar dentro del horario.`;
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
    const fechas = fechasDeSemana(semanaInicio);
    const activos = DIAS_SEMANA.filter(d => config[d.key].activo);

    let totalInsertadas = 0;
    let totalDias = 0;

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
        <div className="sh-resultado__icono">✅</div>
        <h4 className="sh-resultado__titulo">¡Horario creado!</h4>
        <p className="sh-resultado__detalle">
          Se generaron <strong>{resultado.franjas} franjas</strong> de {DURACION_FRANJA} min
          en <strong>{resultado.dias} día{resultado.dias !== 1 ? 's' : ''}</strong>.
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

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <div className="sh-root">
      {/* ── Fila superior: médico + semana + plantillas ── */}
      <div className="sh-cabecera-form">
        {/* Selector de médico (solo admin) */}
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

        {/* Semana */}
        <div className="sh-campo">
          <label className="sh-label">Semana que inicia el</label>
          <input
            type="date"
            className="sh-input-fecha"
            value={semanaInicio}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setSemanaInicio(lunesDeSemana(e.target.value))}
          />
          {semanaInicio && (
            <span className="sh-hint">
              Lunes {labelFechaCorta(semanaInicio)} →{' '}
              Sábado {labelFechaCorta(fechas.sabado)}
            </span>
          )}
        </div>

        {/* Plantillas */}
        <div className="sh-plantillas">
          <span className="sh-plantillas__label">Plantilla rápida:</span>
          <button type="button" className="sh-plantilla-btn" onClick={() => aplicarPlantilla('07:00', '13:00')}>Mañanas 7–13</button>
          <button type="button" className="sh-plantilla-btn" onClick={() => aplicarPlantilla('08:00', '17:00')}>Jornada 8–17</button>
          <button type="button" className="sh-plantilla-btn" onClick={() => aplicarPlantilla('14:00', '20:00')}>Tardes 14–20</button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && <div className="sh-error">{error}</div>}

      {/* ── Tabla de días (diseño compacto tipo tabla) ── */}
      <div className="sh-tabla">
        {/* Cabecera de la tabla */}
        <div className="sh-tabla__header">
          <div className="sh-tabla__col-dia">Día</div>
          <div className="sh-tabla__col-hora">Inicio jornada</div>
          <div className="sh-tabla__col-hora">Fin jornada</div>
          <div className="sh-tabla__col-descanso">Descanso</div>
          <div className="sh-tabla__col-hora">Inicio desc.</div>
          <div className="sh-tabla__col-hora">Fin desc.</div>
          <div className="sh-tabla__col-preview">Citas</div>
          <div className="sh-tabla__col-accion"></div>
        </div>

        {/* Filas por día */}
        {DIAS_SEMANA.map(d => {
          const c = config[d.key];
          const nFranjas = calcularFranjas(
            c.hora_inicio, c.hora_fin,
            c.tiene_descanso ? c.inicio_descanso : null,
            c.tiene_descanso ? c.fin_descanso    : null,
          );
          const fechaLabel = semanaInicio ? labelFechaCorta(fechas[d.key]) : '';

          return (
            <div
              key={d.key}
              className={`sh-tabla__fila ${c.activo ? 'sh-tabla__fila--activa' : 'sh-tabla__fila--inactiva'}`}
            >
              {/* Día toggle */}
              <div className="sh-tabla__col-dia">
                <label className="sh-toggle-dia">
                  <input
                    type="checkbox"
                    checked={c.activo}
                    onChange={() => toggleDia(d.key)}
                  />
                  <span className="sh-toggle-dia__nombre">{d.label}</span>
                  {fechaLabel && <span className="sh-toggle-dia__fecha">{fechaLabel}</span>}
                </label>
              </div>

              {/* Inicio jornada */}
              <div className="sh-tabla__col-hora">
                <SelectHora
                  value={c.hora_inicio}
                  onChange={v => {
                    setCampo(d.key, 'hora_inicio', v);
                    setCampo(d.key, 'hora_fin', '');
                    setCampo(d.key, 'inicio_descanso', '');
                    setCampo(d.key, 'fin_descanso', '');
                  }}
                  disabled={!c.activo}
                />
              </div>

              {/* Fin jornada */}
              <div className="sh-tabla__col-hora">
                <SelectHora
                  value={c.hora_fin}
                  onChange={v => {
                    setCampo(d.key, 'hora_fin', v);
                    setCampo(d.key, 'inicio_descanso', '');
                    setCampo(d.key, 'fin_descanso', '');
                  }}
                  afterTime={c.hora_inicio || undefined}
                  disabled={!c.activo || !c.hora_inicio}
                />
              </div>

              {/* Toggle descanso */}
              <div className="sh-tabla__col-descanso">
                <label className={`sh-toggle-descanso ${!c.activo || !c.hora_inicio || !c.hora_fin ? 'sh-toggle-descanso--disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={c.tiene_descanso}
                    disabled={!c.activo || !c.hora_inicio || !c.hora_fin}
                    onChange={e => {
                      setCampo(d.key, 'tiene_descanso', e.target.checked);
                      if (!e.target.checked) {
                        setCampo(d.key, 'inicio_descanso', '');
                        setCampo(d.key, 'fin_descanso', '');
                      }
                    }}
                  />
                  <span>Descanso</span>
                </label>
              </div>

              {/* Inicio descanso */}
              <div className="sh-tabla__col-hora">
                {c.tiene_descanso ? (
                  <SelectHora
                    value={c.inicio_descanso}
                    onChange={v => {
                      setCampo(d.key, 'inicio_descanso', v);
                      setCampo(d.key, 'fin_descanso', '');
                    }}
                    afterTime={c.hora_inicio || undefined}
                    beforeTime={c.hora_fin   || undefined}
                    disabled={!c.activo}
                  />
                ) : (
                  <span className="sh-tabla__vacio">—</span>
                )}
              </div>

              {/* Fin descanso */}
              <div className="sh-tabla__col-hora">
                {c.tiene_descanso ? (
                  <SelectHora
                    value={c.fin_descanso}
                    onChange={v => setCampo(d.key, 'fin_descanso', v)}
                    afterTime={c.inicio_descanso || c.hora_inicio || undefined}
                    beforeTime={c.hora_fin        || undefined}
                    disabled={!c.activo || !c.inicio_descanso}
                  />
                ) : (
                  <span className="sh-tabla__vacio">—</span>
                )}
              </div>

              {/* Preview franjas */}
              <div className="sh-tabla__col-preview">
                {c.activo && nFranjas !== null ? (
                  <span className="sh-preview-badge">{nFranjas} citas</span>
                ) : (
                  <span className="sh-tabla__vacio">—</span>
                )}
              </div>

              {/* Acción: copiar */}
              <div className="sh-tabla__col-accion">
                {c.activo && c.hora_inicio && c.hora_fin && (
                  <button
                    type="button"
                    className="sh-btn-copiar"
                    onClick={() => copiarHorario(d.key)}
                    title="Copiar este horario a los demás días activos"
                  >
                    ⧉
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Acciones ── */}
      <div className="sh-acciones">
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
          disabled={guardando}
        >
          {guardando ? 'Creando franjas…' : '✓ Crear horario semanal'}
        </button>
      </div>
    </div>
  );
}