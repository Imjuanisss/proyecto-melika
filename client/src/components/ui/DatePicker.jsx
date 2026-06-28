// client/src/components/ui/DatePicker.jsx
// MELIKA — Calendario interactivo reutilizable
// Soporta selección única (admin) y múltiple (médico)
import { useState } from 'react';
import './DatePicker.css';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * DatePicker — Calendario interactivo MELIKA
 *
 * Modo único  : value + onChange(iso)
 * Modo múltiple: selected[] + onToggle(iso) + multi={true}
 *
 * @param {string}   value     ISO 'YYYY-MM-DD' (modo único)
 * @param {Function} onChange  fn(iso) modo único
 * @param {string[]} selected  ISO[] (modo múltiple)
 * @param {Function} onToggle  fn(iso) modo múltiple
 * @param {boolean}  multi     Activa selección múltiple
 * @param {string}   minDate   ISO mínimo seleccionable (default: hoy)
 */
export default function DatePicker({
  value,
  onChange,
  selected = [],
  onToggle,
  multi = false,
  minDate,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Inicializa la vista en el mes de la fecha actual o seleccionada
  const seed = value
    ? new Date(value + 'T00:00:00')
    : selected.length > 0
    ? new Date(selected[selected.length - 1] + 'T00:00:00')
    : new Date();

  const [view, setView] = useState({ year: seed.getFullYear(), month: seed.getMonth() });

  const min = minDate ? new Date(minDate + 'T00:00:00') : new Date(today);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toISO = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const prevMonth = () =>
    setView(v =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }
    );

  const nextMonth = () =>
    setView(v =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }
    );

  const handleDay = day => {
    if (new Date(view.year, view.month, day) < min) return;
    const iso = toISO(view.year, view.month, day);
    if (multi) onToggle?.(iso);
    else onChange?.(iso);
  };

  // ── Celdas del calendario ─────────────────────────────────────────────
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDay    = new Date(view.year, view.month, 1).getDay();

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // ── Predicados de estado ──────────────────────────────────────────────
  const isSel  = day => {
    const iso = toISO(view.year, view.month, day);
    return multi ? selected.includes(iso) : value === iso;
  };
  const isOff  = day => new Date(view.year, view.month, day) < min;
  const isNow  = day =>
    new Date(view.year, view.month, day).toDateString() === today.toDateString();

  return (
    <div className="mkdp">
      {/* Navegación mes */}
      <div className="mkdp__nav">
        <button type="button" className="mkdp__arrow" onClick={prevMonth} aria-label="Mes anterior">
          ‹
        </button>
        <span className="mkdp__title">
          {MONTHS[view.month]} {view.year}
        </span>
        <button type="button" className="mkdp__arrow" onClick={nextMonth} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      {/* Grilla calendario */}
      <div className="mkdp__grid">
        {/* Encabezados días */}
        {WEEKDAYS.map(w => (
          <span key={w} className="mkdp__wd">{w}</span>
        ))}

        {/* Celdas */}
        {cells.map((day, idx) =>
          day === null ? (
            <span key={`_${idx}`} aria-hidden />
          ) : (
            <button
              key={day}
              type="button"
              disabled={isOff(day)}
              onClick={() => handleDay(day)}
              aria-label={toISO(view.year, view.month, day)}
              aria-pressed={isSel(day)}
              className={[
                'mkdp__day',
                isSel(day) ? 'mkdp__day--sel'   : '',
                isNow(day) ? 'mkdp__day--today' : '',
                isOff(day) ? 'mkdp__day--off'   : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day}
            </button>
          )
        )}
      </div>

      {/* Contador para modo múltiple */}
      {multi && selected.length > 0 && (
        <p className="mkdp__count">
          {selected.length} {selected.length === 1 ? 'fecha seleccionada' : 'fechas seleccionadas'}
        </p>
      )}
    </div>
  );
}