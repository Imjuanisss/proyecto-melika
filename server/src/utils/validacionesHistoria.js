// server/src/utils/validacionesHistoria.js
// MELIKA — Validador profesional de Historia Clínica (v5)
//
// CAMBIOS v5 — CRÍTICO: nombres propios aceptaban dígitos y correos.
//   "medico_nombre_firma" y "contacto_responsable_nombre" pasaban por
//   validarTextoClinico() (texto descriptivo genérico), cuya defensa
//   contra mezclas alfanuméricas (esRuidoSospechoso) exige 3+ transiciones
//   letra↔dígito en un mismo token para disparar. Un valor como "juan76"
//   tiene UNA sola transición → pasaba. "juan@gmail.com" no tiene ninguna
//   transición numérica → también pasaba. Se agrega validarNombrePropio(),
//   una regla estricta que NO permite ningún dígito, ningún "@" y solo
//   acepta letras/espacios/guiones — y se conecta a ambos campos. Además,
//   se cierra un hueco de seguridad real: el servidor NUNCA validaba
//   eps_aseguradora / contacto_responsable_nombre / contacto_responsable_
//   telefono / exploracion_por_sistemas — solo el frontend lo hacía, así
//   que cualquiera podía saltarse la UI y mandar basura directo a la API.
//
// CAMBIOS v4:
//  1. esRuidoSospechoso() — segunda capa de detección de texto inválido
//     PARA TEXTO DESCRIPTIVO (anamnesis, antecedentes, hallazgos, etc.):
//     mezclas letra-número tipo teclado, palabras sin vocales, patrones
//     repetitivos, proporción de letras demasiado baja.
//
// CAMBIOS v3:
//  1. validarCierreLegal exige que el ReTHUS sea también solo dígitos.
//  2. Rangos de peso/talla usan "adulto" cuando no hay fecha de nacimiento.

'use strict';

const TERMINOS_NEGACION_VALIDOS = [
  'niega', 'ninguna', 'ninguno', 'ningun antecedente', 'ningunos',
  'no aplica', 'no refiere', 'no presenta', 'no reporta',
  'sin antecedentes', 'sin antecedente', 'negativo', 'negativos',
  'no tiene', 'ninguna conocida', 'ninguno conocido',
];

const REGEX_CIE10          = /^[A-Z][0-9]{2}(\.[0-9X]{1,2})?$/;
const REGEX_SOLO_DIGITOS   = /^[0-9]{5,15}$/;
const REGEX_NOMBRE_PROPIO  = /^[a-zA-ZÀ-ÿñÑ\s'.-]+$/;

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

// ─── DETECCIÓN DE "RUIDO" ALFANUMÉRICO EN TEXTO DESCRIPTIVO ────────────────
// ESPEJO EXACTO de client/src/utils/validacionClinica.js. Ver comentarios
// allá para el razonamiento completo de cada heurística. NO se usa para
// nombres propios (ver validarNombrePropio más abajo).
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

function esRuidoSospechoso(valor) {
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

  if (esRuidoSospechoso(v)) {
    errores.push(`${label} no es válido: combina letras, números o símbolos de una forma que no corresponde a una descripción clínica real (parece texto de relleno). Escriba una descripción clínica real${permitirNegacion ? ' o un término como "Niega"/"Ninguna"' : ''}.`);
    return;
  }

  if (v.length < minCaracteres) {
    errores.push(`${label} es demasiado corto (mínimo ${minCaracteres} caracteres). Escriba una descripción clínica completa.`);
  }
}

// ─── VALIDACIÓN DE NOMBRES PROPIOS ──────────────────────────────────────────
// Para "medico_nombre_firma" y "contacto_responsable_nombre". Es
// DELIBERADAMENTE más estricta que validarTextoClinico(): un nombre real
// nunca lleva dígitos ni "@", y no admite las excepciones que sí tiene el
// texto clínico libre (dosis, códigos como "T4", etc.).
// ESPEJO de validarNombrePropio() en client/src/utils/validacionClinica.js.
function validarNombrePropio(valor, label, errores, opciones = {}) {
  const { obligatorio = true, exigirNombreCompleto = false } = opciones;

  if (esVacio(valor)) {
    if (obligatorio) errores.push(`${label} es obligatorio.`);
    return;
  }

  const v = String(valor).trim();

  if (esTextoTrivial(v)) {
    errores.push(`${label} no es válido: no puede contener solo números, símbolos o caracteres repetidos.`);
    return;
  }

  if (/[0-9]/.test(v)) {
    errores.push(`${label} no puede contener números — escriba el nombre completo real, sin cifras.`);
    return;
  }

  if (v.includes('@') || /https?:\/\//i.test(v) || /www\./i.test(v)) {
    errores.push(`${label} no puede ser un correo electrónico ni una URL — escriba el nombre completo real.`);
    return;
  }

  if (!REGEX_NOMBRE_PROPIO.test(v)) {
    errores.push(`${label} solo puede contener letras, espacios y guiones (sin símbolos ni números).`);
    return;
  }

  if (esRuidoSospechoso(v)) {
    errores.push(`${label} no corresponde a un nombre real.`);
    return;
  }

  const palabras = v.split(/\s+/).filter(Boolean);

  if (exigirNombreCompleto && palabras.length < 2) {
    errores.push(`${label} debe incluir nombre y apellido completos.`);
    return;
  }

  if (palabras.some(p => p.replace(/[.'-]/g, '').length < 2)) {
    errores.push(`${label} contiene palabras demasiado cortas para ser un nombre real.`);
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

// ── CIERRE LEGAL — el nombre del médico firmante es un NOMBRE PROPIO ────────
// (antes usaba validarTextoClinico, que dejaba pasar "juan76" o
// "juan@gmail.com"). Se exige nombre + apellido porque es un dato de
// cierre legal vinculante.
function validarCierreLegal(payload, errores) {
  validarNombrePropio(payload.medico_nombre_firma, 'El nombre del médico firmante', errores, {
    obligatorio: true,
    exigirNombreCompleto: true,
  });

  validarSoloDigitos(payload.medico_cedula_firma, 'La cédula del médico', errores, false);

  if (esVacio(payload.medico_rethus_firma)) {
    errores.push('El número de registro profesional (ReTHUS) es obligatorio para el cierre legal.');
  } else {
    validarSoloDigitos(payload.medico_rethus_firma, 'El número ReTHUS', errores, true);
  }
}

// ── IDENTIFICACIÓN ADMINISTRATIVA (Paso 1) ──────────────────────────────────
// FIX v5: antes NUNCA se validaba en el servidor — solo en el cliente. Se
// centraliza aquí para que ambas rutas (historia principal y aclaración)
// la reutilicen y quede cerrado el hueco de "saltarse el frontend".
function validarIdentificacionAdministrativa(payload, errores) {
  validarTextoClinico(payload.eps_aseguradora, 'La EPS / aseguradora', errores, {
    minCaracteres: 3, permitirNegacion: false, obligatorio: false,
  });

  // El nombre del responsable/acompañante también es un NOMBRE PROPIO —
  // este es exactamente el campo reportado con "juan76", "juan21", etc.
  validarNombrePropio(payload.contacto_responsable_nombre, 'El nombre del responsable', errores, {
    obligatorio: false,
    exigirNombreCompleto: false,
  });

  validarSoloDigitos(payload.contacto_responsable_telefono, 'El teléfono del responsable', errores, false);
}

// ── RECETAS Y EXÁMENES ──────────────────────────────────────────────────────
// validarTextoClinico() ya incluye esTextoTrivial() + esRuidoSospechoso(),
// por lo que "medicamento" y "nombre_examen" quedan protegidos contra
// mezclas tipo "paracetamol2x1" o "amoxi123" de forma automática.
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

  validarIdentificacionAdministrativa(payload, errores);

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
  validarTextoClinico(payload.antecedentes_quirurgicos, 'Los antecedentes quirúrgicos', errores, {
    minCaracteres: 5, permitirNegacion: true, obligatorio: false,
  });
  validarTextoClinico(payload.antecedentes_familiares, 'Los antecedentes familiares', errores, {
    minCaracteres: 5, permitirNegacion: true, obligatorio: false,
  });
  validarTextoClinico(payload.antecedentes_ginecoobstetricos, 'Los antecedentes ginecoobstétricos', errores, {
    minCaracteres: 5, permitirNegacion: true, obligatorio: false,
  });
  validarTextoClinico(payload.habitos, 'Los hábitos', errores, {
    minCaracteres: 5, permitirNegacion: true, obligatorio: false,
  });
  validarTextoClinico(payload.exploracion_por_sistemas, 'La exploración por sistemas', errores, {
    minCaracteres: 5, permitirNegacion: false, obligatorio: false,
  });
  validarTextoClinico(payload.examen_fisico, 'Los hallazgos del examen físico', errores, {
    minCaracteres: 10, permitirNegacion: false, obligatorio: true,
  });
  validarTextoClinico(payload.plan_tratamiento, 'El plan de tratamiento', errores, {
    minCaracteres: 10, permitirNegacion: false, obligatorio: true,
  });

  validarSignosVitalesPrincipal(payload, edadAnios, errores);
  validarDiagnostico(payload, errores);
  validarCierreLegal(payload, errores);
  validarRecetas(payload.recetas, errores);
  validarExamenes(payload.examenes, errores);

  ['ordenes_medicas', 'recomendaciones', 'observaciones'].forEach(campo => {
    if (!esVacio(payload[campo])) {
      const valor = String(payload[campo]);
      if (esTextoTrivial(valor) || esRuidoSospechoso(valor)) {
        errores.push(`El campo "${campo.replace(/_/g, ' ')}" no puede contener solo números, símbolos, o una mezcla de letras y números que no corresponda a una descripción real.`);
      }
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
    if (!esVacio(payload[campo])) {
      const valor = String(payload[campo]);
      if (esTextoTrivial(valor) || esRuidoSospechoso(valor)) {
        errores.push(`El campo "${campo.replace(/_/g, ' ')}" no puede contener solo números, símbolos, o una mezcla de letras y números que no corresponda a una descripción real.`);
      }
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
  esRuidoSospechoso,
  esNegacionValida,
  validarNombrePropio,
  REGEX_CIE10,
  REGEX_SOLO_DIGITOS,
  TERMINOS_NEGACION_VALIDOS,
};