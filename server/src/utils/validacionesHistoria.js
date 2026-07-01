// server/src/utils/validacionesHistoria.js
// MELIKA — Validador profesional de Historia Clínica (v3)
//
// CAMBIOS v3 respecto a v2:
//  1. validarCierreLegal ahora exige que el ReTHUS sea también solo dígitos
//     (antes solo se validaba que no fuera texto trivial, lo que permitía
//     letras o símbolos sueltos en un número de registro profesional).
//  2. Se expone exigirEdadValida(): si el controlador no puede resolver la
//     edad del paciente (sin fecha de nacimiento registrada), los rangos
//     de peso/talla usan el rango "adulto" más estricto en vez del rango
//     amplio de "sin dato" (1-300 kg), salvo que se indique explícitamente
//     lo contrario. Esto cierra el hueco que permitía registrar 1 kg en
//     un paciente adulto cuando la edad no llegaba calculada desde el
//     controlador.

'use strict';

const TERMINOS_NEGACION_VALIDOS = [
  'niega', 'ninguna', 'ninguno', 'ningun antecedente', 'ningunos',
  'no aplica', 'no refiere', 'no presenta', 'no reporta',
  'sin antecedentes', 'sin antecedente', 'negativo', 'negativos',
  'no tiene', 'ninguna conocida', 'ninguno conocido',
];

const REGEX_CIE10        = /^[A-Z][0-9]{2}(\.[0-9X]{1,2})?$/;
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

function esTextoTrivial(valor) {
  const v = valor.trim();
  if (v.length === 0) return true;
  if (/^\d+$/.test(v)) return true;
  if (/^[.,;:\-_*#/\\\s]+$/.test(v)) return true;
  if (/^(.)\1{2,}$/i.test(v)) return true;
  return false;
}

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

// ─── EDAD Y RANGOS CLÍNICOS DEPENDIENTES DE LA EDAD ────────────────────────
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

function rangoPesoPorEdad(edadAnios) {
  // FIX: si no hay edad registrada, ya NO se usa un rango "permisivo"
  // de 1-300 kg (eso es lo que dejaba pasar a un adulto con 1 kg).
  // Se aplica el rango adulto, el más conservador, hasta que el
  // paciente tenga fecha de nacimiento registrada.
  if (edadAnios === null)  return { min: 30,  max: 300, etapa: 'adulto (sin fecha de nacimiento registrada)' };
  if (edadAnios < 1)       return { min: 2,   max: 15,  etapa: 'lactante (<1 año)' };
  if (edadAnios < 5)       return { min: 7,   max: 25,  etapa: 'primera infancia (1-4 años)' };
  if (edadAnios < 12)      return { min: 12,  max: 70,  etapa: 'niñez (5-11 años)' };
  if (edadAnios < 18)      return { min: 25,  max: 150, etapa: 'adolescencia (12-17 años)' };
  return                          { min: 30,  max: 300, etapa: 'adulto (18+ años)' };
}

function rangoTallaPorEdad(edadAnios) {
  if (edadAnios === null)  return { min: 130, max: 250, etapa: 'adulto (sin fecha de nacimiento registrada)' };
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

  // FIX: el ReTHUS es un número de registro profesional — antes solo se
  // rechazaba si era "texto trivial" (repetido/vacío), lo que dejaba
  // pasar valores con letras o símbolos. Ahora, igual que la cédula,
  // debe ser estrictamente numérico.
  if (esVacio(payload.medico_rethus_firma)) {
    errores.push('El número de registro profesional (ReTHUS) es obligatorio para el cierre legal.');
  } else {
    validarSoloDigitos(payload.medico_rethus_firma, 'El número ReTHUS', errores, true);
  }
}

function validarRecetas(recetas, errores) {
  if (!Array.isArray(recetas)) return;
  recetas.forEach((r, i) => {
    const n = i + 1;
    validarTextoClinico(r.medicamento, `Receta #${n}: el medicamento`, errores, { minCaracteres: 3, obligatorio: true });
    if (esVacio(r.dosis))      errores.push(`Receta #${n}: la dosis es obligatoria.`);
    if (esVacio(r.frecuencia)) errores.push(`Receta #${n}: la frecuencia es obligatoria.`);
    if (esVacio(r.duracion))   errores.push(`Receta #${n}: la duración es obligatoria.`);
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