// server/src/utils/validacionesRegistro.js
// MELIKA — Validador profesional de Registro de Usuarios
// Centraliza las reglas de obligatoriedad / formato / coherencia clínica
// y administrativa al momento de crear una cuenta (paciente o médico).
//
// Por qué existe: el registro es la ÚNICA puerta de entrada del dato
// "fecha_nacimiento" que luego usa todo el módulo de historias clínicas
// para validar rangos de peso/talla por edad. Si aquí se permite basura
// (fechas imposibles, documentos con letras, nombres triviales), ese
// problema se arrastra silenciosamente a cada historia clínica futura.

'use strict';

const REGEX_SOLO_DIGITOS_DOC = /^[0-9]{5,15}$/;
const REGEX_EMAIL            = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENEROS_VALIDOS        = ['M', 'F', 'O'];
const TIPOS_DOCUMENTO_VALIDOS = ['CC', 'CE', 'PASAPORTE'];

const EDAD_MINIMA_ANIOS = 0;   // permite registrar recién nacidos (tutor crea la cuenta)
const EDAD_MAXIMA_ANIOS = 120; // límite biológico razonable, evita digitación absurda

function esVacio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

// Detecta texto que no aporta información real como nombre/apellido:
// solo dígitos, solo símbolos, o un carácter repetido 3+ veces.
function esTextoTrivial(valor) {
  const v = String(valor).trim();
  if (v.length === 0) return true;
  if (/^\d+$/.test(v)) return true;
  if (/^[.,;:\-_*#/\\\s]+$/.test(v)) return true;
  if (/^(.)\1{2,}$/i.test(v)) return true;
  return false;
}

// Un nombre/apellido real: solo letras (incl. tildes/ñ) y espacios,
// mínimo 2 caracteres, sin ser trivial.
function validarNombrePropio(valor, label, errores, opciones = {}) {
  const { obligatorio = true } = opciones;
  if (esVacio(valor)) {
    if (obligatorio) errores.push(`${label} es obligatorio.`);
    return;
  }
  const v = String(valor).trim();
  if (v.length < 2) {
    errores.push(`${label} es demasiado corto.`);
    return;
  }
  if (esTextoTrivial(v)) {
    errores.push(`${label} no es válido: no puede contener solo números o caracteres repetidos.`);
    return;
  }
  if (!/^[a-zA-ZÀ-ÿñÑ\s'-]+$/.test(v)) {
    errores.push(`${label} solo puede contener letras y espacios.`);
  }
}

function calcularEdadAnios(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function validarFechaNacimiento(valor, errores) {
  if (esVacio(valor)) {
    errores.push('La fecha de nacimiento es obligatoria.');
    return;
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    errores.push('La fecha de nacimiento no es una fecha válida.');
    return;
  }
  const hoy = new Date();
  if (fecha > hoy) {
    errores.push('La fecha de nacimiento no puede ser en el futuro.');
    return;
  }
  const edad = calcularEdadAnios(valor);
  if (edad === null || edad < EDAD_MINIMA_ANIOS || edad > EDAD_MAXIMA_ANIOS) {
    errores.push(`La fecha de nacimiento no es coherente (edad calculada fuera de rango: 0-${EDAD_MAXIMA_ANIOS} años).`);
  }
}

function validarGenero(valor, errores) {
  if (esVacio(valor)) {
    errores.push('El género es obligatorio.');
    return;
  }
  if (!GENEROS_VALIDOS.includes(valor)) {
    errores.push('El género debe ser M, F u O.');
  }
}

function validarTipoDocumento(valor, errores) {
  if (esVacio(valor)) {
    errores.push('El tipo de documento es obligatorio.');
    return;
  }
  if (!TIPOS_DOCUMENTO_VALIDOS.includes(valor)) {
    errores.push('Tipo de documento inválido. Use CC, CE o PASAPORTE.');
  }
}

// El número de documento debe ser solo dígitos. PASAPORTE en Colombia
// puede incluir letras en la práctica, pero MELIKA estandariza el campo
// como numérico para evitar inconsistencias con cédula/extranjería —
// si en el futuro se requiere aceptar pasaportes alfanuméricos, se debe
// abrir esa excepción explícitamente aquí, no dejar el campo sin validar.
function validarNumeroDocumento(valor, errores) {
  if (esVacio(valor)) {
    errores.push('El número de documento es obligatorio.');
    return;
  }
  const v = String(valor).trim();
  if (!REGEX_SOLO_DIGITOS_DOC.test(v)) {
    errores.push('El número de documento debe contener solo números (5 a 15 dígitos), sin letras ni símbolos.');
  }
}

function validarEmail(valor, errores) {
  if (esVacio(valor)) {
    errores.push('El correo electrónico es obligatorio.');
    return;
  }
  if (!REGEX_EMAIL.test(String(valor).trim())) {
    errores.push('El correo electrónico no tiene un formato válido.');
  }
}

function validarPassword(valor, errores) {
  if (esVacio(valor)) {
    errores.push('La contraseña es obligatoria.');
    return;
  }
  const v = String(valor);
  if (v.length < 6) {
    errores.push('La contraseña debe tener mínimo 6 caracteres.');
  }
  if (esTextoTrivial(v) && v.length < 8) {
    // Una contraseña corta y trivial (ej. "111111", "aaaaaa") es débil
    // aunque cumpla el mínimo de longitud.
    errores.push('La contraseña es demasiado débil (evita repetir el mismo carácter).');
  }
}

/**
 * Validación COMPLETA del registro de un nuevo usuario (paciente).
 * @param {object} payload  req.body del endpoint POST /auth/register
 */
function validarRegistroUsuario(payload) {
  const errores = [];

  validarNombrePropio(payload.nombre, 'El nombre', errores);
  validarNombrePropio(payload.primer_apellido, 'El apellido', errores);
  validarEmail(payload.email, errores);
  validarPassword(payload.password, errores);
  validarTipoDocumento(payload.tipo_documento, errores);
  validarNumeroDocumento(payload.numero_documento, errores);
  validarFechaNacimiento(payload.fecha_nacimiento, errores);
  validarGenero(payload.genero, errores);

  return errores;
}

module.exports = {
  validarRegistroUsuario,
  calcularEdadAnios,
  esTextoTrivial,
  REGEX_SOLO_DIGITOS_DOC,
  REGEX_EMAIL,
  GENEROS_VALIDOS,
  TIPOS_DOCUMENTO_VALIDOS,
  EDAD_MINIMA_ANIOS,
  EDAD_MAXIMA_ANIOS,
};