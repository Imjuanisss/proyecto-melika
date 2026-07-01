// client/src/utils/validacionClinica.js
// MELIKA — Validación clínica compartida (Frontend)
// ESPEJO EXACTO de server/src/utils/validacionesHistoria.js.
// Objetivo: que el médico reciba EN TIEMPO REAL el mismo criterio que
// aplicará el backend, para que nunca llegue al final del formulario con
// datos ilógicos (números, símbolos o texto repetido en campos clínicos).
//
// ⚠️ REGLA DE ORO: si cambias una regla en el backend, cámbiala también aquí.
// Ambos archivos deben permanecer sincronizados manualmente.

const TERMINOS_NEGACION_VALIDOS = [
  'niega', 'ninguna', 'ninguno', 'ningun antecedente', 'ningunos',
  'no aplica', 'no refiere', 'no presenta', 'no reporta',
  'sin antecedentes', 'sin antecedente', 'negativo', 'negativos',
  'no tiene', 'ninguna conocida', 'ninguno conocido',
];

export const REGEX_CIE10        = /^[A-Z][0-9]{2}(\.[0-9X]{1,2})?$/;
export const REGEX_SOLO_DIGITOS = /^[0-9]{5,15}$/;

function quitarTildes(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function esVacio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

export function esNegacionValida(valor) {
  const normalizado = quitarTildes(valor.trim().toLowerCase());
  return TERMINOS_NEGACION_VALIDOS.some(t => quitarTildes(t) === normalizado);
}

// Detecta texto "de relleno": solo dígitos, solo símbolos, o un carácter
// repetido (ej. "aaaa" o "111" caen aquí; "asdasd" no).
export function esTextoTrivial(valor) {
  const v = String(valor ?? '').trim();
  if (v.length === 0) return true;
  if (/^\d+$/.test(v)) return true;
  if (/^[.,;:\-_*#/\\\s]+$/.test(v)) return true;
  if (/^(.)\1{2,}$/i.test(v)) return true;
  return false;
}

/**
 * Valida un texto clínico contra las mismas reglas que aplica el backend.
 * @param {string} valor
 * @param {string} label - Nombre legible del campo, usado en el mensaje.
 * @param {object} opciones - { minCaracteres, permitirNegacion, obligatorio }
 * @returns {string|null} mensaje de error, o null si el valor es válido.
 */
export function validarTextoClinico(valor, label, opciones = {}) {
  const { minCaracteres = 10, permitirNegacion = false, obligatorio = true } = opciones;

  if (esVacio(valor)) {
    return obligatorio ? `${label} es obligatorio.` : null;
  }

  const v = String(valor).trim();

  if (permitirNegacion && esNegacionValida(v)) return null;

  if (esTextoTrivial(v)) {
    return `${label} no es válido: no puede contener solo números, símbolos o caracteres repetidos.`
      + (permitirNegacion
        ? ' Escriba una descripción real o un término como "Niega"/"Ninguna".'
        : ' Escriba una descripción clínica real.');
  }

  if (v.length < minCaracteres) {
    return `${label} es demasiado corto (mínimo ${minCaracteres} caracteres). Escriba una descripción clínica completa.`;
  }

  return null;
}

export function validarSoloDigitos(valor, label, obligatorio = false) {
  if (esVacio(valor)) {
    return obligatorio ? `${label} es obligatorio.` : null;
  }
  const v = String(valor).trim();
  if (!REGEX_SOLO_DIGITOS.test(v)) {
    return `${label} debe contener solo números (5 a 15 dígitos), sin letras ni símbolos.`;
  }
  return null;
}

export function validarCie10(valor, { obligatorio = true } = {}) {
  const v = String(valor ?? '').trim();
  if (!v) return obligatorio ? 'El código CIE-10 es obligatorio.' : null;
  if (!REGEX_CIE10.test(v.toUpperCase())) return 'Formato de CIE-10 inválido (ej. J06.9).';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE SIGNOS VITALES POR RANGO CLÍNICO
//
// Estos rangos son una capa de UX que se SUMA a los constraints de la base
// de datos (server/src/database/melika_db.sql, migración v5): la base de
// datos acepta rangos amplios pensados para cubrir toda edad (ej. peso
// 1–300 kg), lo cual permite que un adulto quede registrado con "1 kg" o
// "10 kg" sin que nada lo impida en tiempo real dentro del formulario.
//
// Aquí se acota el rango según la edad del paciente cuando se conoce. Si no
// se conoce (caso común al crear una historia nueva, donde el frontend no
// siempre tiene la fecha de nacimiento a la mano), se asume un paciente
// adulto — el perfil predominante en MELIKA — para atrapar de inmediato
// errores de digitación evidentes, sin bloquear al backend (que sigue
// aceptando el rango completo si por algún motivo excepcional aplica).
// ─────────────────────────────────────────────────────────────────────────────

const RANGOS_COMUNES = {
  tension_arterial_sistolica:  { min: 50, max: 250 },
  tension_arterial_diastolica: { min: 30, max: 150 },
  frecuencia_cardiaca:         { min: 20, max: 250 },
  frecuencia_respiratoria:     { min: 5,  max: 60  },
  temperatura_corporal:        { min: 30, max: 43  },
  incapacidad_dias:            { min: 0,  max: 180 },
};

const RANGOS_PESO_TALLA_POR_EDAD = {
  lactante:   { peso_kg: { min: 2,  max: 20  }, talla_cm: { min: 30,  max: 100 } },
  pediatrico: { peso_kg: { min: 3,  max: 150 }, talla_cm: { min: 40,  max: 200 } },
  adulto:     { peso_kg: { min: 25, max: 300 }, talla_cm: { min: 100, max: 250 } },
};

/**
 * Calcula la edad en años a partir de una fecha de nacimiento.
 * Espejo de calcularEdadAnios() en server/src/utils/validacionesHistoria.js.
 * @param {string|Date|null|undefined} fechaNacimiento
 * @returns {number|null}
 */
export function calcularEdadAnios(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const diferenciaMes = hoy.getMonth() - nacimiento.getMonth();
  if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

function obtenerRangoClinico(campo, edadAnios) {
  if (RANGOS_COMUNES[campo]) return RANGOS_COMUNES[campo];

  if (campo === 'peso_kg' || campo === 'talla_cm') {
    let grupo = 'adulto';
    if (typeof edadAnios === 'number') {
      if (edadAnios < 2) grupo = 'lactante';
      else if (edadAnios < 18) grupo = 'pediatrico';
    }
    return RANGOS_PESO_TALLA_POR_EDAD[grupo][campo];
  }

  return null;
}

/**
 * Valida un signo vital o medida numérica contra un rango clínicamente
 * razonable. A diferencia de <input type="number" min max>, esta función
 * corre en JavaScript en cada cambio del campo — bloquea valores ilógicos
 * de inmediato en vez de esperar al envío del formulario.
 *
 * @param {string} campo    - nombre técnico del campo (ej: 'peso_kg')
 * @param {string|number} valor
 * @param {string} etiqueta - nombre legible para el mensaje de error
 * @param {object} opciones - { obligatorio, edadAnios }
 * @returns {string|null}
 */
export function validarRangoSignoVital(campo, valor, etiqueta, opciones = {}) {
  const { obligatorio = false, edadAnios = null } = opciones;
  const v = (valor ?? '').toString().trim();

  if (esVacio(v)) {
    return obligatorio ? `${etiqueta} es obligatorio.` : null;
  }

  const numero = Number(v);
  if (Number.isNaN(numero)) {
    return `${etiqueta} debe ser un valor numérico.`;
  }

  const rango = obtenerRangoClinico(campo, edadAnios);
  if (rango && (numero < rango.min || numero > rango.max)) {
    return `${etiqueta} está fuera de un rango clínico razonable (${rango.min}–${rango.max}).`;
  }

  return null;
}