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