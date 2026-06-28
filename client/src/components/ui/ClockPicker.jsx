// client/src/components/ui/ClockPicker.jsx
// MELIKA — Selector de hora tipo reloj desplegable
// Uso: <ClockPicker value="08:00" onChange={h => setHora(h)} afterTime="07:30" />

import { useState, useRef, useEffect, useCallback } from 'react';
import './ClockPicker.css';

const HOURS   = Array.from({ length: 16 }, (_, i) => i + 6);  // 06 – 21
const MINUTES = [0, 10, 20, 30, 40, 50];

function pad(n) { return String(n).padStart(2, '0'); }
function toMinutes(hh, mm) { return hh * 60 + mm; }
function parseTime(str) {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  return { h, m };
}

export default function ClockPicker({
  value,
  onChange,
  afterTime   = null,   // deshabilita slots ≤ afterTime  (p.ej. hora_fin > hora_inicio)
  beforeTime  = null,   // deshabilita slots ≥ beforeTime
  placeholder = 'Seleccionar hora',
  disabled    = false,
  label       = null,
}) {
  const [open,    setOpen]    = useState(false);
  const [selH,    setSelH]    = useState(null);
  const [selM,    setSelM]    = useState(null);
  const [step,    setStep]    = useState('hour'); // 'hour' | 'minute'
  const rootRef  = useRef(null);
  const hoursRef = useRef(null);

  // Sincronizar con value externo
  useEffect(() => {
    const parsed = parseTime(value);
    if (parsed) { setSelH(parsed.h); setSelM(parsed.m); }
    else         { setSelH(null); setSelM(null); }
  }, [value]);

  // Cerrar al clic fuera
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Auto-scroll a la hora seleccionada
  useEffect(() => {
    if (open && step === 'hour' && selH !== null && hoursRef.current) {
      const btn = hoursRef.current.querySelector(`[data-h="${selH}"]`);
      btn?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [open, step, selH]);

  const isHourDisabled = useCallback(h => {
    const minMin = afterTime  ? toMinutes(...afterTime.split(':').map(Number))  : -Infinity;
    const maxMin = beforeTime ? toMinutes(...beforeTime.split(':').map(Number)) : Infinity;
    // La hora está deshabilitada si todos sus minutos quedan fuera del rango
    return MINUTES.every(m => {
      const t = toMinutes(h, m);
      return t <= minMin || t >= maxMin;
    });
  }, [afterTime, beforeTime]);

  const isMinuteDisabled = useCallback((h, m) => {
    const t = toMinutes(h, m);
    const minMin = afterTime  ? toMinutes(...afterTime.split(':').map(Number))  : -Infinity;
    const maxMin = beforeTime ? toMinutes(...beforeTime.split(':').map(Number)) : Infinity;
    return t <= minMin || t >= maxMin;
  }, [afterTime, beforeTime]);

  function handleToggle() {
    if (disabled) return;
    if (!open) {
      setStep(selH !== null ? 'minute' : 'hour');
    }
    setOpen(o => !o);
  }

  function handleSelectHour(h) {
    if (isHourDisabled(h)) return;
    setSelH(h);
    // Si el minuto actual sigue siendo válido no lo reseteamos
    if (selM !== null && !isMinuteDisabled(h, selM)) {
      onChange(`${pad(h)}:${pad(selM)}`);
      setOpen(false);
    } else {
      setSelM(null);
      setStep('minute');
    }
  }

  function handleSelectMinute(m) {
    if (isMinuteDisabled(selH, m)) return;
    setSelM(m);
    onChange(`${pad(selH)}:${pad(m)}`);
    setOpen(false);
    setStep('hour');
  }

  const displayValue = value
    ? value.substring(0, 5)
    : null;

  return (
    <div
      className={['mkcp', open ? 'mkcp--open' : '', disabled ? 'mkcp--disabled' : '']
        .filter(Boolean).join(' ')}
      ref={rootRef}
    >
      {label && <span className="mkcp__label">{label}</span>}

      {/* Trigger */}
      <button
        type="button"
        className="mkcp__trigger"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="mkcp__trigger-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </span>
        <span className={displayValue ? 'mkcp__trigger-value' : 'mkcp__trigger-placeholder'}>
          {displayValue ?? placeholder}
        </span>
        <span className="mkcp__trigger-arrow" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mkcp__dropdown" role="dialog" aria-label="Seleccionar hora">

          {/* Breadcrumb / título */}
          <div className="mkcp__header">
            {step === 'minute' && selH !== null ? (
              <>
                <button
                  type="button"
                  className="mkcp__back"
                  onClick={() => setStep('hour')}
                  aria-label="Volver a horas"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span className="mkcp__header-title">
                  <strong>{pad(selH)}</strong> : minutos
                </span>
              </>
            ) : (
              <span className="mkcp__header-title">Hora</span>
            )}
          </div>

          {/* Paso 1 — horas */}
          {step === 'hour' && (
            <div className="mkcp__grid mkcp__grid--hours" ref={hoursRef} role="listbox">
              {HOURS.map(h => {
                const off = isHourDisabled(h);
                const sel = selH === h;
                return (
                  <button
                    key={h}
                    type="button"
                    data-h={h}
                    role="option"
                    aria-selected={sel}
                    disabled={off}
                    onClick={() => handleSelectHour(h)}
                    className={[
                      'mkcp__cell',
                      sel ? 'mkcp__cell--sel'  : '',
                      off ? 'mkcp__cell--off'  : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {pad(h)}
                    <small>h</small>
                  </button>
                );
              })}
            </div>
          )}

          {/* Paso 2 — minutos */}
          {step === 'minute' && selH !== null && (
            <div className="mkcp__grid mkcp__grid--minutes" role="listbox">
              {MINUTES.map(m => {
                const off = isMinuteDisabled(selH, m);
                const sel = selM === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    disabled={off}
                    onClick={() => handleSelectMinute(m)}
                    className={[
                      'mkcp__cell',
                      sel ? 'mkcp__cell--sel' : '',
                      off ? 'mkcp__cell--off' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    :{pad(m)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Preview de la hora en construcción */}
          <div className="mkcp__preview" aria-live="polite">
            <span className={selH !== null ? 'mkcp__preview-h--set' : ''}>
              {selH !== null ? pad(selH) : '--'}
            </span>
            <span className="mkcp__preview-sep">:</span>
            <span className={selM !== null ? 'mkcp__preview-m--set' : ''}>
              {selM !== null ? pad(selM) : '--'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}