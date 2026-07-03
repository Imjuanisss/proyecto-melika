// client/src/components/ui/TimePicker.jsx
// MELIKA — Selector de horas interactivo (grilla de pills)

import './TimePicker.css';

/**
 * Genera slots de tiempo en incrementos de `step` minutos
 */
function buildSlots(from = '06:00', to = '22:00', step = 30) {
  const slots = [];
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  let cur = fh * 60 + fm;
  const end = th * 60 + tm;
  while (cur <= end) {
    slots.push(
      `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
    );
    cur += step;
  }
  return slots;
}

/**
 * TimePicker — Grilla scrollable de slots de hora MELIKA
 *
 * @param {string}   value          Hora seleccionada 'HH:MM'
 * @param {Function} onChange       fn('HH:MM')
 * @param {string}   from           Slot inicial (default '06:00')
 * @param {string}   to             Slot final (default '22:00')
 * @param {number}   step           Minutos entre slots (default 30)
 * @param {string}   afterTime      Deshabilita slots ≤ este valor (para hora fin)
 * @param {string}   beforeTime     Deshabilita slots ≥ este valor (para hora inicio con límite)
 */
export default function TimePicker({
  value,
  onChange,
  from = '06:00',
  to = '22:00',
  step = 30,
  afterTime,
  beforeTime,
}) {
  const slots = buildSlots(from, to, step);

  const isDisabled = t => {
    if (afterTime  && t <= afterTime)  return true;
    if (beforeTime && t >= beforeTime) return true;
    return false;
  };

  return (
    <div className="mktm">
      <div className="mktm__grid" role="group" aria-label="Seleccionar hora">
        {slots.map(t => (
          <button
            key={t}
            type="button"
            disabled={isDisabled(t)}
            onClick={() => onChange(t)}
            aria-pressed={value === t}
            className={[
              'mktm__slot',
              value === t    ? 'mktm__slot--sel' : '',
              isDisabled(t)  ? 'mktm__slot--off' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}