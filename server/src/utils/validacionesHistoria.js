// server/src/utils/validacionesHistoria.js
// MELIKA — Validador profesional de Historia Clínica (v2)
// Centraliza las reglas de obligatoriedad / consistencia / CALIDAD clínica.
//
// CAMBIOS CLAVE respecto a v1:
//  1. Los campos descriptivos (motivo, anamnesis, examen físico, plan, etc.)
//     ya no se aceptan con CUALQUIER texto no vacío. Se rechaza texto trivial:
//     solo números, solo símbolos, o un carácter repetido ("1111", "....", "x").
//  2. Los antecedentes (patológicos/alérgicos) aceptan una lista controlada
//     de términos de negación cortos ("Niega", "Ninguna", "No aplica", etc.)
//     — no se exige literalmente la palabra "Niega"; cualquier sinónimo
//     reconocido es válido. Si el médico no usa un término de negación,
//     debe escribir una descripción real (longitud mínima).
//  3. Cédula y ReTHUS deben ser solo dígitos (no letras ni símbolos).
//  4. Los rangos de peso y talla ahora se ajustan según la edad real del
//     paciente (lactante / niñez / adolescencia / adulto), en vez de un
//     único rango fijo de 1-300 kg que permitía registrar a un adulto
//     con 1 kg de peso.

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// TÉRMINOS DE NEGACIÓN ACEPTADOS PARA ANTECEDENTES
// (case-insensitive, sin tildes). Cualquiera de estos es una respuesta
// clínicamente válida y completa por sí sola.
// ─────────────────────────────────────────────────────────────────────────────
const TERMINOS_NEGACION_VALIDOS = [
  'niega', 'ninguna', 'ninguno', 'ningun antecedente', 'ningunos',
  'no aplica', 'no refiere', 'no presenta', 'no reporta',
  'sin antecedentes', 'sin antecedente', 'negativo', 'negativos',
  'no tiene', 'ninguna conocida', 'ninguno conocido',
];

const REGEX_CIE10    = /^[A-Z][0-9]{2}(\.[0-9X]{1,2})?$/;
const REGEX_SOLO_DIGITOS = /^[0-9]{5,15}$/;

function quitarTildes(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function esVacio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

function esNegacionValida(valor) {
  const normalizado = quitarTildes(valor.trim().toLowerCase());
  return TERMINOS_NEGACION_VALIDOS.some(t => quitarTildes(t) === normalizado);
}

// Detecta texto que NO aporta información clínica real:
//  - solo dígitos ("12345")
//  - solo símbolos/puntuación/espacios (".....", "---")
//  - un mismo carácter repetido 3+ veces ("xxxx", "aaaa")
function esTextoTrivial(valor) {
  const v = valor.trim();
  if (v.length === 0) return true;
  if (/^\d+$/.test(v)) return true;
  if (/^[.,;:\-_*#/\\\s]+$/.test(v)) return true;
  if (/^(.)\1{2,}$/i.test(v)) return true;
  return false;
}

/**
 * Valida un campo de texto clínico descriptivo.
 * @param {string}  valor
 * @param {string}  label             Nombre legible del campo para el mensaje de error
 * @param {array}   errores           Acumulador de errores
 * @param {object}  opciones
 * @param {number}  opciones.minCaracteres   Longitud mínima si no es una negación válida
 * @param {boolean} opciones.permitirNegacion Si true, acepta términos cortos de la lista
 * @param {boolean} opciones.obligatorio      Si false, un valor vacío no genera error
 */
function validarTextoClinico(valor, label, errores, opciones = {}) {
  const { minCaracteres = 10, permitirNegacion = false, obligatorio = true } = opciones;

  if (esVacio(valor)) {
    if (obligatorio) errores.push(`${label} es obligatorio.`);
    return;
  }

  const v = String(valor).trim();

  if (permitirNegacion && esNegacionValida(v)) return;

  if (esTextoTrivial(v)) {
    errores.push(`${label} no es válido: no puede contener solo números, símbolos o caracteres repetidos. Escriba una descripción clínica real${permitirNegacion ? ' o un término como "Niega"/"Ninguna"' : ''}.`);
    return;
  }

  if (v.length < minCaracteres) {
    errores.push(`${label} es demasiado corto (mínimo ${minCaracteres} caracteres). Escriba una descripción clínica completa.`);
  }
}

/**
 * Valida un número de identificación (cédula, ReTHUS): solo dígitos.
 */
function validarSoloDigitos(valor, label, errores, obligatorio = false) {
  if (esVacio(valor)) {
    if (obligatorio) errores.push(`${label} es obligatorio.`);
    return;
  }
  const v = String(valor).trim();
  if (!REGEX_SOLO_DIGITOS.test(v)) {
    errores.push(`${label} debe contener solo números (5 a 15 dígitos), sin letras ni símbolos.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EDAD Y RANGOS CLÍNICOS DEPENDIENTES DE LA EDAD
// ─────────────────────────────────────────────────────────────────────────────
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

// Rangos antropométricos orientativos por etapa de vida. No reemplazan
// el criterio médico; solo evitan errores de digitación evidentes
// (ej. un adulto registrado con 1 kg de peso).
function rangoPesoPorEdad(edadAnios) {
  if (edadAnios === null)  return { min: 1,   max: 300, etapa: 'sin dato de edad' };
  if (edadAnios < 1)       return { min: 2,   max: 15,  etapa: 'lactante (<1 año)' };
  if (edadAnios < 5)       return { min: 7,   max: 25,  etapa: 'primera infancia (1-4 años)' };
  if (edadAnios < 12)      return { min: 12,  max: 70,  etapa: 'niñez (5-11 años)' };
  if (edadAnios < 18)      return { min: 25,  max: 150, etapa: 'adolescencia (12-17 años)' };
  return                          { min: 30,  max: 300, etapa: 'adulto (18+ años)' };
}

function rangoTallaPorEdad(edadAnios) {
  if (edadAnios === null)  return { min: 30,  max: 250, etapa: 'sin dato de edad' };
  if (edadAnios < 1)       return { min: 40,  max: 80,  etapa: 'lactante (<1 año)' };
  if (edadAnios < 5)       return { min: 60,  max: 120, etapa: 'primera infancia (1-4 años)' };
  if (edadAnios < 12)      return { min: 90,  max: 165, etapa: 'niñez (5-11 años)' };
  if (edadAnios < 18)      return { min: 120, max: 200, etapa: 'adolescencia (12-17 años)' };
  return                          { min: 130, max: 250, etapa: 'adulto (18+ años)' };
}

const RANGOS_FIJOS = {
  tension_arterial_sistolica:  { min: 50,  max: 250, label: 'Tensión arterial sistólica' },
  tension_arterial_diastolica: { min: 30,  max: 150, label: 'Tensión arterial diastólica' },
  frecuencia_cardiaca:         { min: 20,  max: 250, label: 'Frecuencia cardíaca' },
  frecuencia_respiratoria:     { min: 5,   max: 60,  label: 'Frecuencia respiratoria' },
  temperatura_corporal:        { min: 30,  max: 43,  label: 'Temperatura corporal' },
  incapacidad_dias:            { min: 0,   max: 180, label: 'Días de incapacidad' },
};

function validarRangoFijo(payload, campo, errores) {
  const valor = payload[campo];
  if (esVacio(valor)) return;
  const num = parseFloat(valor);
  const r = RANGOS_FIJOS[campo];
  if (Number.isNaN(num)) {
    errores.push(`${r.label} debe ser un valor numérico.`);
    return;
  }
  if (num < r.min || num > r.max) {
    errores.push(`${r.label} debe estar entre ${r.min} y ${r.max}.`);
  }
}

function validarPesoTallaPorEdad(payload, edadAnios, errores) {
  if (!esVacio(payload.peso_kg)) {
    const num = parseFloat(payload.peso_kg);
    const r = rangoPesoPorEdad(edadAnios);
    if (Number.isNaN(num)) {
      errores.push('El peso debe ser un valor numérico.');
    } else if (num < r.min || num > r.max) {
      errores.push(`El peso (${num} kg) no es coherente con la edad del paciente (${r.etapa}). Rango esperado: ${r.min}-${r.max} kg.`);
    }
  }

  if (!esVacio(payload.talla_cm)) {
    const num = parseFloat(payload.talla_cm);
    const r = rangoTallaPorEdad(edadAnios);
    if (Number.isNaN(num)) {
      errores.push('La talla debe ser un valor numérico.');
    } else if (num < r.min || num > r.max) {
      errores.push(`La talla (${num} cm) no es coherente con la edad del paciente (${r.etapa}). Rango esperado: ${r.min}-${r.max} cm.`);
    }
  }
}

function validarSignosVitalesBase(payload, edadAnios, errores) {
  Object.keys(RANGOS_FIJOS).forEach(campo => validarRangoFijo(payload, campo, errores));
  validarPesoTallaPorEdad(payload, edadAnios, errores);

  const tieneSistolica  = !esVacio(payload.tension_arterial_sistolica);
  const tieneDiastolica = !esVacio(payload.tension_arterial_diastolica);
  if (tieneSistolica !== tieneDiastolica) {
    errores.push('La tensión arterial debe registrarse completa (sistólica y diastólica), no parcial.');
  }
}

/**
 * Para la HISTORIA PRINCIPAL: en consultas presenciales, los signos
 * vitales clave son obligatorios (no solo deben estar en rango si se
 * diligencian, deben diligenciarse).
 */
function validarSignosVitalesPrincipal(payload, edadAnios, errores) {
  validarSignosVitalesBase(payload, edadAnios, errores);

  const esPresencial = (payload.tipo_consulta || 'presencial') === 'presencial';
  if (esPresencial) {
    const obligatorios = [
      ['tension_arterial_sistolica',  'Tensión arterial'],
      ['frecuencia_cardiaca',         'Frecuencia cardíaca'],
      ['temperatura_corporal',        'Temperatura corporal'],
      ['peso_kg',                     'Peso'],
      ['talla_cm',                    'Talla'],
    ];
    obligatorios.forEach(([campo, label]) => {
      if (esVacio(payload[campo])) {
        errores.push(`${label} es obligatoria en consultas presenciales.`);
      }
    });
  }
}

function validarDiagnostico(payload, errores) {
  if (esVacio(payload.diagnostico_cie10)) {
    errores.push('El diagnóstico CIE-10 es obligatorio.');
  } else if (!REGEX_CIE10.test(payload.diagnostico_cie10.trim().toUpperCase())) {
    errores.push('El código CIE-10 no tiene un formato válido (ej. J06.9).');
  }
  validarTextoClinico(payload.descripcion_diagnostico, 'La descripción del diagnóstico', errores, {
    minCaracteres: 8, permitirNegacion: false, obligatorio: true,
  });
}

function validarCierreLegal(payload, errores) {
  validarTextoClinico(payload.medico_nombre_firma, 'El nombre del médico firmante', errores, {
    minCaracteres: 5, permitirNegacion: false, obligatorio: true,
  });
  validarSoloDigitos(payload.medico_cedula_firma, 'La cédula del médico', errores, false);
  if (esVacio(payload.medico_rethus_firma)) {
    errores.push('El número de registro profesional (ReTHUS) es obligatorio para el cierre legal.');
  } else if (esTextoTrivial(String(payload.medico_rethus_firma))) {
    errores.push('El número ReTHUS no es válido (no puede ser texto repetido o vacío de sentido).');
  }
}

function validarRecetas(recetas, errores) {
  if (!Array.isArray(recetas)) return;
  recetas.forEach((r, i) => {
    const n = i + 1;
    validarTextoClinico(r.medicamento, `Receta #${n}: el medicamento`, errores, { minCaracteres: 3, obligatorio: true });
    if (esVacio(r.dosis))       errores.push(`Receta #${n}: la dosis es obligatoria.`);
    if (esVacio(r.frecuencia))  errores.push(`Receta #${n}: la frecuencia es obligatoria.`);
    if (esVacio(r.duracion))    errores.push(`Receta #${n}: la duración es obligatoria.`);
  });
}

function validarExamenes(examenes, errores) {
  if (!Array.isArray(examenes)) return;
  const tiposValidos = ['Laboratorio', 'Imagenología', 'Especializado'];
  examenes.forEach((ex, i) => {
    const n = i + 1;
    if (esVacio(ex.tipo_examen) || !tiposValidos.includes(ex.tipo_examen)) {
      errores.push(`Examen #${n}: el tipo de examen es inválido u obligatorio.`);
    }
    validarTextoClinico(ex.nombre_examen, `Examen #${n}: el nombre del examen`, errores, { minCaracteres: 3, obligatorio: true });
  });
}

/**
 * Validación COMPLETA para la historia principal (POST /historias).
 * @param {object} payload    req.body
 * @param {number|null} edadAnios  Edad del paciente calculada por el controlador
 *                                 (null si no hay fecha de nacimiento registrada).
 */
function validarHistoriaPrincipal(payload, edadAnios = null) {
  const errores = [];

  validarTextoClinico(payload.motivo_consulta, 'El motivo de consulta', errores, {
    minCaracteres: 8, permitirNegacion: false, obligatorio: true,
  });
  validarTextoClinico(payload.anamnesis, 'La descripción de la enfermedad actual (anamnesis)', errores, {
    minCaracteres: 15, permitirNegacion: false, obligatorio: true,
  });
  validarTextoClinico(payload.antecedentes_patologicos, 'Los antecedentes patológicos', errores, {
    minCaracteres: 8, permitirNegacion: true, obligatorio: true,
  });
  validarTextoClinico(payload.antecedentes_alergicos, 'Los antecedentes alérgicos', errores, {
    minCaracteres: 8, permitirNegacion: true, obligatorio: true,
  });
  validarTextoClinico(payload.examen_fisico, 'Los hallazgos del examen físico', errores, {
    minCaracteres: 10, permitirNegacion: false, obligatorio: true,
  });
  validarTextoClinico(payload.plan_tratamiento, 'El plan de tratamiento', errores, {
    minCaracteres: 10, permitirNegacion: false, obligatorio: true,
  });

  // Antecedentes opcionales: si se diligencian, también deben tener sentido
  validarTextoClinico(payload.antecedentes_quirurgicos, 'Los antecedentes quirúrgicos', errores, {
    minCaracteres: 5, permitirNegacion: true, obligatorio: false,
  });
  validarTextoClinico(payload.antecedentes_familiares, 'Los antecedentes familiares', errores, {
    minCaracteres: 5, permitirNegacion: true, obligatorio: false,
  });
  validarTextoClinico(payload.habitos, 'Los hábitos', errores, {
    minCaracteres: 5, permitirNegacion: true, obligatorio: false,
  });

  validarSignosVitalesPrincipal(payload, edadAnios, errores);
  validarDiagnostico(payload, errores);
  validarCierreLegal(payload, errores);
  validarRecetas(payload.recetas, errores);
  validarExamenes(payload.examenes, errores);

  // Campos de texto libre opcionales del plan: si vienen diligenciados,
  // no pueden ser solo números o símbolos.
  ['ordenes_medicas', 'recomendaciones', 'observaciones'].forEach(campo => {
    if (!esVacio(payload[campo]) && esTextoTrivial(String(payload[campo]))) {
      errores.push(`El campo "${campo.replace(/_/g, ' ')}" no puede contener solo números o símbolos.`);
    }
  });

  const dias = parseInt(payload.incapacidad_dias, 10);
  if (!Number.isNaN(dias) && dias > 0 && esVacio(payload.diagnostico_cie10)) {
    errores.push('No se puede otorgar incapacidad sin un diagnóstico CIE-10 registrado.');
  }

  return errores;
}

/**
 * Validación para Notas de Aclaración / Evolución (PUT /historias/:id).
 */
function validarNotaAclaracion(payload, edadAnios = null) {
  const errores = [];

  validarTextoClinico(payload.motivo_consulta, 'El motivo de la nota de aclaración/evolución', errores, {
    minCaracteres: 10, permitirNegacion: false, obligatorio: true,
  });

  validarSignosVitalesBase(payload, edadAnios, errores);

  const tieneCie10  = !esVacio(payload.diagnostico_cie10);
  const tieneDescDx = !esVacio(payload.descripcion_diagnostico);
  if (tieneCie10 || tieneDescDx) {
    validarDiagnostico(payload, errores);
  }

  validarCierreLegal(payload, errores);
  validarRecetas(payload.recetas, errores);
  validarExamenes(payload.examenes, errores);

  ['ordenes_medicas', 'recomendaciones', 'observaciones', 'anamnesis', 'examen_fisico', 'plan_tratamiento'].forEach(campo => {
    if (!esVacio(payload[campo]) && esTextoTrivial(String(payload[campo]))) {
      errores.push(`El campo "${campo.replace(/_/g, ' ')}" no puede contener solo números o símbolos.`);
    }
  });

  const dias = parseInt(payload.incapacidad_dias, 10);
  if (!Number.isNaN(dias) && dias > 0 && esVacio(payload.diagnostico_cie10)) {
    errores.push('No se puede otorgar incapacidad sin un diagnóstico CIE-10 registrado.');
  }

  return errores;
}

module.exports = {
  validarHistoriaPrincipal,
  validarNotaAclaracion,
  calcularEdadAnios,
  rangoPesoPorEdad,
  rangoTallaPorEdad,
  esVacio,
  esTextoTrivial,
  esNegacionValida,
  REGEX_CIE10,
  REGEX_SOLO_DIGITOS,
  TERMINOS_NEGACION_VALIDOS,
};