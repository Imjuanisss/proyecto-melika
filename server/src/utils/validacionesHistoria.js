// server/src/utils/validacionesHistoria.js
// MELIKA — Validador profesional de Historia Clínica
// Centraliza las reglas de obligatoriedad / consistencia clínica para que
// crearHistoria y actualizarHistoria (notas de aclaración/evolución) usen
// exactamente las mismas reglas y no diverjan entre sí.

'use strict';

const RANGOS = {
  tension_arterial_sistolica:  { min: 50,  max: 250, label: 'Tensión arterial sistólica' },
  tension_arterial_diastolica: { min: 30,  max: 150, label: 'Tensión arterial diastólica' },
  frecuencia_cardiaca:         { min: 20,  max: 250, label: 'Frecuencia cardíaca' },
  frecuencia_respiratoria:     { min: 5,   max: 60,  label: 'Frecuencia respiratoria' },
  temperatura_corporal:        { min: 30,  max: 43,  label: 'Temperatura corporal' },
  peso_kg:                     { min: 1,   max: 300, label: 'Peso' },
  talla_cm:                    { min: 30,  max: 250, label: 'Talla' },
  incapacidad_dias:            { min: 0,   max: 180, label: 'Días de incapacidad' },
};

const REGEX_CIE10 = /^[A-Z][0-9]{2}(\.[0-9X]{1,2})?$/;

function esVacio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

function validarRango(payload, campo, errores) {
  const valor = payload[campo];
  if (esVacio(valor)) return;
  const num = parseFloat(valor);
  const r = RANGOS[campo];
  if (Number.isNaN(num)) {
    errores.push(`${r.label} debe ser un valor numérico.`);
    return;
  }
  if (num < r.min || num > r.max) {
    errores.push(`${r.label} debe estar entre ${r.min} y ${r.max}.`);
  }
}

function validarSignosVitalesBase(payload, errores) {
  Object.keys(RANGOS).forEach(campo => {
    if (campo !== 'incapacidad_dias') validarRango(payload, campo, errores);
  });

  const tieneSistolica  = !esVacio(payload.tension_arterial_sistolica);
  const tieneDiastolica = !esVacio(payload.tension_arterial_diastolica);
  if (tieneSistolica !== tieneDiastolica) {
    errores.push('La tensión arterial debe registrarse completa (sistólica y diastólica), no parcial.');
  }

  validarRango(payload, 'incapacidad_dias', errores);
}

/**
 * Valida el bloque de signos vitales para la HISTORIA PRINCIPAL.
 * En consultas presenciales exige el set mínimo (TA, FC, temperatura,
 * peso, talla); en teleconsulta se flexibiliza porque el médico no
 * siempre puede medirlos físicamente.
 */
function validarSignosVitalesPrincipal(payload, errores) {
  validarSignosVitalesBase(payload, errores);

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
  if (esVacio(payload.descripcion_diagnostico)) {
    errores.push('La descripción del diagnóstico es obligatoria.');
  }
}

function validarCierreLegal(payload, errores) {
  if (esVacio(payload.medico_nombre_firma)) {
    errores.push('El nombre del médico firmante es obligatorio para el cierre legal.');
  }
  if (esVacio(payload.medico_rethus_firma)) {
    errores.push('El número de registro profesional (ReTHUS) es obligatorio para el cierre legal.');
  }
}

/**
 * Valida cada fila de la fórmula médica estructurada.
 * Una receta sin dosis/frecuencia/duración es legalmente inválida y
 * representa un riesgo para el paciente.
 */
function validarRecetas(recetas, errores) {
  if (!Array.isArray(recetas)) return;
  recetas.forEach((r, i) => {
    const n = i + 1;
    if (esVacio(r.medicamento)) errores.push(`Receta #${n}: el medicamento es obligatorio.`);
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
    if (esVacio(ex.nombre_examen)) {
      errores.push(`Examen #${n}: el nombre del examen es obligatorio.`);
    }
  });
}

/**
 * Validación COMPLETA para la historia principal (POST /historias).
 * Todos los bloques clínicos de la Res. 1995/1999 son obligatorios,
 * salvo antecedentes familiares/ginecoobstétricos/hábitos y datos
 * administrativos de un acompañante (contacto_responsable_*), que son
 * opcionales por naturaleza.
 */
function validarHistoriaPrincipal(payload) {
  const errores = [];

  if (esVacio(payload.motivo_consulta))          errores.push('El motivo de consulta es obligatorio.');
  if (esVacio(payload.anamnesis))                errores.push('La descripción de la enfermedad actual (anamnesis) es obligatoria.');
  if (esVacio(payload.antecedentes_patologicos)) errores.push('Los antecedentes patológicos son obligatorios (registre "Niega" si no aplica).');
  if (esVacio(payload.antecedentes_alergicos))   errores.push('Los antecedentes alérgicos son obligatorios (registre "Niega" si no aplica).');
  if (esVacio(payload.examen_fisico))            errores.push('Los hallazgos del examen físico son obligatorios.');
  if (esVacio(payload.plan_tratamiento))         errores.push('El plan de tratamiento es obligatorio.');

  validarSignosVitalesPrincipal(payload, errores);
  validarDiagnostico(payload, errores);
  validarCierreLegal(payload, errores);
  validarRecetas(payload.recetas, errores);
  validarExamenes(payload.examenes, errores);

  // Consistencia: si se ordena incapacidad, debe haber un diagnóstico que la sustente
  const dias = parseInt(payload.incapacidad_dias, 10);
  if (!Number.isNaN(dias) && dias > 0 && esVacio(payload.diagnostico_cie10)) {
    errores.push('No se puede otorgar incapacidad sin un diagnóstico CIE-10 registrado.');
  }

  return errores;
}

/**
 * Validación para Notas de Aclaración / Evolución (PUT /historias/:id).
 * Son más flexibles (no siempre se repiten signos vitales o diagnóstico),
 * pero deben mantener consistencia interna: si se diligencia un bloque,
 * debe quedar completo, y el cierre legal SIEMPRE es obligatorio.
 */
function validarNotaAclaracion(payload) {
  const errores = [];

  if (esVacio(payload.motivo_consulta)) {
    errores.push('El motivo de la nota de aclaración/evolución es obligatorio.');
  }

  validarSignosVitalesBase(payload, errores);

  // Si se diligencia CUALQUIER campo de diagnóstico, ambos son obligatorios
  const tieneCie10  = !esVacio(payload.diagnostico_cie10);
  const tieneDescDx = !esVacio(payload.descripcion_diagnostico);
  if (tieneCie10 || tieneDescDx) {
    validarDiagnostico(payload, errores);
  }

  validarCierreLegal(payload, errores);
  validarRecetas(payload.recetas, errores);
  validarExamenes(payload.examenes, errores);

  const dias = parseInt(payload.incapacidad_dias, 10);
  if (!Number.isNaN(dias) && dias > 0 && esVacio(payload.diagnostico_cie10)) {
    errores.push('No se puede otorgar incapacidad sin un diagnóstico CIE-10 registrado.');
  }

  return errores;
}

module.exports = {
  validarHistoriaPrincipal,
  validarNotaAclaracion,
  esVacio,
  REGEX_CIE10,
};