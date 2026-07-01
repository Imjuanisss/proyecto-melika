// client/src/utils/validacionClinica.js
// MELIKA — Validación clínica compartida (Frontend)
// ESPEJO EXACTO de server/src/utils/validacionesHistoria.js.
// Objetivo: que el médico reciba EN TIEMPO REAL el mismo criterio que
// aplicará el backend, para que nunca llegue al servidor con datos
// ilógicos (números, símbolos, texto repetido, "ruido" de teclado, o
// nombres propios con dígitos/correos) en un campo clínico.
//
// ⚠️ REGLA DE ORO: si cambias una regla en el backend, cámbiala también aquí.
// Ambos archivos deben permanecer sincronizados manualmente.
//
// FIX v5 — CRÍTICO: nombres propios aceptaban dígitos y correos.
//   esRuidoSospechoso() (v4) solo detecta mezclas letra-número con 3+
//   transiciones dentro de un mismo token. Un valor como "juan76" o
//   "juan21" tiene UNA sola transición (letra→dígito), así que pasaba
//   sin ser detectado — igual que "juan@gmail.com" (sin ninguna
//   transición numérica en absoluto). Estos campos NO son texto clínico
//   libre: son NOMBRES PROPIOS, y un nombre propio real nunca contiene
//   dígitos ni el símbolo "@". Se agrega validarNombrePropio(), una
//   regla mucho más estricta que solo permite letras, espacios y
//   guiones, y se conecta específicamente a "medico_nombre_firma" y
//   "contacto_responsable_nombre" en los formularios.
//
// FIX v4 — Detección de "ruido" alfanumérico en texto clínico libre:
//   esTextoTrivial() solo atrapaba texto PURAMENTE numérico, simbólico o
//   repetido ("111", "###", "aaaa"). Se agregó esRuidoSospechoso() para
//   detectar mezclas tipo teclado ("dolor2dias3", "asd123fgh"), palabras
//   sin vocales, y patrones repetitivos — pero esta regla es para texto
//   clínico DESCRIPTIVO (anamnesis, antecedentes, etc.), no para nombres
//   propios, que tienen su propia regla desde v5.

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
// repetido (ej. "aaaa" o "111" caen aquí; "asdasd" no — para eso está
// esRuidoSospechoso() más abajo).
export function esTextoTrivial(valor) {
  const v = String(valor ?? '').trim();
  if (v.length === 0) return true;
  if (/^\d+$/.test(v)) return true;
  if (/^[.,;:\-_*#/\\\s]+$/.test(v)) return true;
  if (/^(.)\1{2,}$/i.test(v)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE "RUIDO" ALFANUMÉRICO EN TEXTO CLÍNICO LIBRE — texto que NO
// es trivial (tiene letras y no está vacío) pero tampoco es una descripción
// clínica real: mezclas de letras/números tipo teclado ("dolor2dias3",
// "asd123fgh"), palabras sin ninguna vocal ("xzvbnkjhg" — imposible en
// español), o una proporción de caracteres no-alfabéticos demasiado alta
// para ser prosa clínica.
//
// Diseñada para NO castigar patrones clínicos legítimos que sí mezclan
// letras y números: "39.5°C", "500mg", "COVID-19", "T4", "SARS-CoV-2" — en
// estos casos solo hay UNA transición letra↔dígito dentro del token. El
// "ruido" de relleno casi siempre tiene 3 o más transiciones.
//
// ⚠️ ESTA FUNCIÓN ES PARA TEXTO DESCRIPTIVO (anamnesis, antecedentes,
// exploración física, medicamentos, exámenes). NO se usa para nombres
// propios — para eso está validarNombrePropio() más abajo, que es
// deliberadamente más estricta (cero dígitos permitidos).
// ─────────────────────────────────────────────────────────────────────────────
const VOCALES_REGEX = /[aeiouáéíóúü]/i;

function contarTransicionesAlfaNumericas(token) {
  const limpio = token.replace(/[^a-zA-Z0-9À-ÿñÑ]/g, '');
  let transiciones = 0;
  let claseAnterior = null;
  for (const ch of limpio) {
    const clase = /[0-9]/.test(ch) ? 'digito' : 'letra';
    if (claseAnterior && clase !== claseAnterior) transiciones++;
    claseAnterior = clase;
  }
  return transiciones;
}

function tieneTokenAlfanumericoSospechoso(texto) {
  return texto.split(/\s+/).some(token => contarTransicionesAlfaNumericas(token) >= 3);
}

function tieneTokenSinVocales(texto) {
  return texto.split(/\s+/).some(token => {
    const soloLetras = quitarTildes(token.replace(/[^a-zA-ZÀ-ÿñÑ]/g, '').toLowerCase());
    if (soloLetras.length < 4) return false;
    return !VOCALES_REGEX.test(soloLetras);
  });
}

function tienePatronRepetitivoCorto(texto) {
  const sinEspacios = texto.replace(/\s/g, '');
  return /^(.{1,4})\1{3,}$/i.test(sinEspacios);
}

/**
 * Detecta texto DESCRIPTIVO (no nombres propios) que combina letras,
 * números y/o símbolos de forma que no corresponde a una descripción
 * clínica real (relleno de teclado, texto pegado por error).
 * @param {string} valor
 * @returns {boolean}
 */
export function esRuidoSospechoso(valor) {
  const v = String(valor ?? '').trim();
  if (v.length === 0) return false;

  if (tieneTokenAlfanumericoSospechoso(v)) return true;
  if (tieneTokenSinVocales(v)) return true;
  if (tienePatronRepetitivoCorto(v)) return true;

  const totalSinEspacios = v.replace(/\s/g, '').length;
  const letras = (v.match(/[a-zA-ZÀ-ÿñÑ]/g) || []).length;
  if (totalSinEspacios > 0 && (letras / totalSinEspacios) < 0.45) return true;

  return false;
}

/**
 * Valida un texto clínico DESCRIPTIVO contra las mismas reglas que aplica
 * el backend. Usar para anamnesis, antecedentes, exploración física,
 * hallazgos, plan de tratamiento, medicamentos, exámenes, observaciones,
 * etc. — NUNCA para nombres propios (usar validarNombrePropio en su
 * lugar).
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

  if (esRuidoSospechoso(v)) {
    return `${label} no es válido: combina letras, números o símbolos de una forma que no corresponde a una descripción clínica real (parece texto de relleno).`
      + (permitirNegacion
        ? ' Escriba una descripción real o un término como "Niega"/"Ninguna".'
        : ' Escriba una descripción clínica real.');
  }

  if (v.length < minCaracteres) {
    return `${label} es demasiado corto (mínimo ${minCaracteres} caracteres). Escriba una descripción clínica completa.`;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE NOMBRES PROPIOS — para "medico_nombre_firma" y
// "contacto_responsable_nombre". Un nombre propio real:
//   1. NUNCA contiene dígitos (rechaza "juan76", "juan21", "maria2").
//   2. NUNCA es un correo electrónico ni una URL (rechaza
//      "juan@gmail.com", "www.juan.com").
//   3. Solo contiene letras, espacios, apóstrofes y guiones (permite
//      "María José", "O'Higgins", "Pérez-Gómez").
//   4. No puede ser texto trivial ni "ruido" (mismas reglas base).
//   5. Opcionalmente exige nombre + apellido (2+ palabras) para la firma
//      del médico, que es un dato de cierre legal.
//
// Esta es DELIBERADAMENTE más estricta que validarTextoClinico(): un
// nombre no admite ninguna de las excepciones que sí tiene el texto
// clínico libre (como códigos "T4" o dosis "500mg").
//
// ⚠️ ESPEJO de validarNombrePropio() en
// server/src/utils/validacionesHistoria.js.
// ─────────────────────────────────────────────────────────────────────────────
const REGEX_NOMBRE_PROPIO = /^[a-zA-ZÀ-ÿñÑ\s'.-]+$/;

/**
 * @param {string} valor
 * @param {string} label
 * @param {object} opciones - { obligatorio, exigirNombreCompleto }
 * @returns {string|null}
 */
export function validarNombrePropio(valor, label, opciones = {}) {
  const { obligatorio = true, exigirNombreCompleto = false } = opciones;

  if (esVacio(valor)) {
    return obligatorio ? `${label} es obligatorio.` : null;
  }

  const v = String(valor).trim();

  if (esTextoTrivial(v)) {
    return `${label} no es válido: no puede contener solo números, símbolos o caracteres repetidos.`;
  }

  if (/[0-9]/.test(v)) {
    return `${label} no puede contener números — escriba el nombre completo real, sin cifras.`;
  }

  if (v.includes('@') || /https?:\/\//i.test(v) || /www\./i.test(v)) {
    return `${label} no puede ser un correo electrónico ni una URL — escriba el nombre completo real.`;
  }

  if (!REGEX_NOMBRE_PROPIO.test(v)) {
    return `${label} solo puede contener letras, espacios y guiones (sin símbolos ni números).`;
  }

  if (esRuidoSospechoso(v)) {
    return `${label} no corresponde a un nombre real.`;
  }

  const palabras = v.split(/\s+/).filter(Boolean);

  if (exigirNombreCompleto && palabras.length < 2) {
    return `${label} debe incluir nombre y apellido completos.`;
  }

  if (palabras.some(p => p.replace(/[.'-]/g, '').length < 2)) {
    return `${label} contiene palabras demasiado cortas para ser un nombre real.`;
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