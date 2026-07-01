// client/src/components/historias/FormularioAclaracion.jsx
// MELIKA — Modal para agregar Notas de Aclaración / Evolución a una Historia Clínica
//
// Escucha el CustomEvent 'melika:abrir-aclaracion' que dispara DetalleHistoria.
// Solo es accesible para el médico autor de la historia original.
// Lógica append-only: POST /historias/:id/aclaracion
// Al éxito dispara 'melika:aclaracion-creada' para que HistorialPaciente recargue.
//
// Validación EN TIEMPO REAL por campo individual (mismo criterio que aplica
// el backend en server/src/utils/validacionesHistoria.js).
//
// FIX v2:
//   - CAMPOS_POR_PASO_ACLARACION[2] (Examen Físico) estaba vacío — ningún
//     signo vital se validaba en tiempo real, ni siquiera examen_fisico
//     pese a tener el JSX de error ya conectado. Los rangos numéricos
//     (incluyendo peso/talla) solo se evaluaban al presionar "Siguiente",
//     dentro de validarRangosNumericos(). Ahora cada campo del paso 2 se
//     valida en cada cambio, usando validarRangoSignoVital (rango clínico
//     real, no solo el min/max decorativo del <input type="number">).
//   - Se agregó validación de texto a los antecedentes (patológicos,
//     quirúrgicos, alérgicos, familiares, ginecoobstétricos), hábitos y
//     exploración por sistemas — antes no tenían ninguna regla ni feedback
//     visual, permitiendo texto ilógico sin ningún control.
//   - Se eliminó RANGOS / validarRangosNumericos() (duplicado ahora
//     redundante): toda la validación numérica vive en un solo lugar,
//     client/src/utils/validacionClinica.js, para evitar que las reglas
//     del paso-a-paso y las del tiempo real diverjan entre sí.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  validarTextoClinico,
  validarSoloDigitos,
  validarCie10,
  validarRangoSignoVital,
  esVacio,
} from '../../utils/validacionClinica';
import './FormularioAclaracion.css';

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO INICIAL DEL FORMULARIO
// Refleja todos los bloques clínicos de la Resolución 1995/1999
// ─────────────────────────────────────────────────────────────────────────────
const ESTADO_INICIAL = {
  tipo_registro: 'nota_aclaracion',

  motivo_consulta:                '',
  anamnesis:                      '',
  antecedentes_patologicos:       '',
  antecedentes_quirurgicos:       '',
  antecedentes_alergicos:         '',
  antecedentes_familiares:        '',
  antecedentes_ginecoobstetricos: '',
  habitos:                        '',

  tension_arterial_sistolica:  '',
  tension_arterial_diastolica: '',
  frecuencia_cardiaca:         '',
  frecuencia_respiratoria:     '',
  temperatura_corporal:        '',
  peso_kg:                     '',
  talla_cm:                    '',
  exploracion_por_sistemas:    '',
  examen_fisico:               '',

  diagnostico_cie10:       '',
  descripcion_diagnostico: '',

  plan_tratamiento:      '',
  medicamentos_recetados: '',
  ordenes_medicas:       '',
  recomendaciones:       '',
  incapacidad_dias:      '',
  observaciones:         '',

  medico_nombre_firma: '',
  medico_cedula_firma: '',
  medico_rethus_firma: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN EN TIEMPO REAL — POR CAMPO INDIVIDUAL
// ESPEJO de validarNotaAclaracion() en server/src/utils/validacionesHistoria.js
// Las notas de aclaración/evolución son intencionalmente parciales (no
// aplica chk_historia_principal_completa), por eso casi todo es opcional —
// pero "opcional" nunca significa "sin control": si el médico escribe algo,
// debe ser una descripción real o una negación válida ("Niega"), nunca
// solo números, símbolos o texto repetido.
// ─────────────────────────────────────────────────────────────────────────────
const REGLAS_TEXTO_ACLARACION = {
  motivo_consulta:                { minCaracteres: 10, permitirNegacion: false, obligatorio: true  },
  medico_nombre_firma:            { minCaracteres: 5,  permitirNegacion: false, obligatorio: true  },
  anamnesis:                      { minCaracteres: 0,  permitirNegacion: false, obligatorio: false },
  antecedentes_patologicos:       { minCaracteres: 5,  permitirNegacion: true,  obligatorio: false },
  antecedentes_quirurgicos:       { minCaracteres: 5,  permitirNegacion: true,  obligatorio: false },
  antecedentes_alergicos:         { minCaracteres: 5,  permitirNegacion: true,  obligatorio: false },
  antecedentes_familiares:        { minCaracteres: 5,  permitirNegacion: true,  obligatorio: false },
  antecedentes_ginecoobstetricos: { minCaracteres: 5,  permitirNegacion: true,  obligatorio: false },
  habitos:                        { minCaracteres: 5,  permitirNegacion: true,  obligatorio: false },
  exploracion_por_sistemas:       { minCaracteres: 0,  permitirNegacion: false, obligatorio: false },
  examen_fisico:                  { minCaracteres: 0,  permitirNegacion: false, obligatorio: false },
  plan_tratamiento:               { minCaracteres: 0,  permitirNegacion: false, obligatorio: false },
  ordenes_medicas:                { minCaracteres: 0,  permitirNegacion: false, obligatorio: false },
  recomendaciones:                { minCaracteres: 0,  permitirNegacion: false, obligatorio: false },
  observaciones:                  { minCaracteres: 0,  permitirNegacion: false, obligatorio: false },
};

const ETIQUETAS_ACLARACION = {
  motivo_consulta:                'El motivo de la nota',
  medico_nombre_firma:            'El nombre del médico firmante',
  descripcion_diagnostico:        'La descripción del diagnóstico',
  anamnesis:                      'La evolución / enfermedad actual',
  antecedentes_patologicos:       'Los antecedentes patológicos',
  antecedentes_quirurgicos:       'Los antecedentes quirúrgicos',
  antecedentes_alergicos:         'Los antecedentes alérgicos',
  antecedentes_familiares:        'Los antecedentes familiares',
  antecedentes_ginecoobstetricos: 'Los antecedentes ginecoobstétricos',
  habitos:                        'Los hábitos',
  exploracion_por_sistemas:       'La exploración por sistemas',
  examen_fisico:                  'Los hallazgos del examen físico',
  plan_tratamiento:               'El plan de tratamiento',
  ordenes_medicas:                'Las órdenes médicas',
  recomendaciones:                'Las recomendaciones',
  observaciones:                  'Las observaciones',
  tension_arterial_sistolica:     'La tensión arterial sistólica',
  tension_arterial_diastolica:    'La tensión arterial diastólica',
  frecuencia_cardiaca:            'La frecuencia cardíaca',
  frecuencia_respiratoria:        'La frecuencia respiratoria',
  temperatura_corporal:           'La temperatura corporal',
  peso_kg:                        'El peso',
  talla_cm:                       'La talla',
  incapacidad_dias:               'Los días de incapacidad',
};

function validarCampoAclaracion(campo, valorCrudo, form) {
  const v = (valorCrudo ?? '').toString();

  if (REGLAS_TEXTO_ACLARACION[campo]) {
    return validarTextoClinico(v, ETIQUETAS_ACLARACION[campo], REGLAS_TEXTO_ACLARACION[campo]);
  }

  switch (campo) {
    // El diagnóstico es "todo o nada": si diligencia uno, el otro es obligatorio
    case 'diagnostico_cie10': {
      const tieneDescDx = !esVacio(form.descripcion_diagnostico);
      const resultado = validarCie10(v, { obligatorio: false });
      if (resultado) return resultado;
      if (esVacio(v) && tieneDescDx) return 'El código CIE-10 es obligatorio si registra una descripción del diagnóstico.';
      return null;
    }
    case 'descripcion_diagnostico': {
      const tieneCie10 = !esVacio(form.diagnostico_cie10);
      if (esVacio(v)) return tieneCie10 ? 'La descripción del diagnóstico es obligatoria si registra un CIE-10.' : null;
      return validarTextoClinico(v, ETIQUETAS_ACLARACION.descripcion_diagnostico, {
        minCaracteres: 8, permitirNegacion: false, obligatorio: true,
      });
    }
    case 'medico_cedula_firma':
      return validarSoloDigitos(v, 'La cédula del médico', false);
    case 'medico_rethus_firma':
      return validarSoloDigitos(v, 'El número ReTHUS', true);

    // Signos vitales — validados por rango clínico en tiempo real, no solo
    // al presionar "Siguiente". Sin fecha de nacimiento del paciente
    // disponible en este formulario, se aplica el rango de adulto.
    case 'tension_arterial_sistolica':
    case 'tension_arterial_diastolica': {
      const sis = (form.tension_arterial_sistolica ?? '').toString();
      const dia = (form.tension_arterial_diastolica ?? '').toString();
      if ((sis && !dia) || (!sis && dia)) {
        return 'La tensión arterial debe registrarse completa (sistólica y diastólica), no parcial.';
      }
      return validarRangoSignoVital(campo, v, ETIQUETAS_ACLARACION[campo], { obligatorio: false });
    }
    case 'frecuencia_cardiaca':
    case 'frecuencia_respiratoria':
    case 'temperatura_corporal':
      return validarRangoSignoVital(campo, v, ETIQUETAS_ACLARACION[campo], { obligatorio: false });
    case 'peso_kg':
    case 'talla_cm':
      return validarRangoSignoVital(campo, v, ETIQUETAS_ACLARACION[campo], { obligatorio: false });
    case 'incapacidad_dias':
      return validarRangoSignoVital(campo, v, ETIQUETAS_ACLARACION.incapacidad_dias, { obligatorio: false });

    default:
      return null;
  }
}

// Campos que se validan EN TIEMPO REAL en cada paso del wizard.
const CAMPOS_POR_PASO_ACLARACION = {
  1: [
    'motivo_consulta', 'anamnesis', 'antecedentes_patologicos', 'antecedentes_quirurgicos',
    'antecedentes_alergicos', 'antecedentes_familiares', 'antecedentes_ginecoobstetricos', 'habitos',
  ],
  2: [
    'tension_arterial_sistolica', 'tension_arterial_diastolica', 'frecuencia_cardiaca',
    'frecuencia_respiratoria', 'temperatura_corporal', 'peso_kg', 'talla_cm',
    'exploracion_por_sistemas', 'examen_fisico',
  ],
  3: [
    'diagnostico_cie10', 'descripcion_diagnostico', 'plan_tratamiento',
    'ordenes_medicas', 'recomendaciones', 'observaciones', 'incapacidad_dias',
  ],
  4: ['medico_nombre_firma', 'medico_cedula_firma', 'medico_rethus_firma'],
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE CAMPO — Etiqueta + input/textarea reutilizable, con error inline
// ─────────────────────────────────────────────────────────────────────────────
function CampoInput({ label, name, value, onChange, onBlur, tipo = 'text', requerido = false, placeholder = '', min, max, step, error }) {
  return (
    <div className="fa-campo">
      <label className="fa-campo__label" htmlFor={name}>
        {label}
        {requerido && <span className="fa-campo__req" aria-label="requerido">*</span>}
      </label>
      <input
        id={name}
        className={`fa-campo__input ${error ? 'fa-input-error' : ''}`}
        type={tipo}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={requerido}
        autoComplete="off"
        min={min}
        max={max}
        step={step}
      />
      {error && <small className="fa-campo-error">⚠ {error}</small>}
    </div>
  );
}

function CampoTextarea({ label, name, value, onChange, onBlur, requerido = false, placeholder = '', filas = 3, error }) {
  return (
    <div className="fa-campo">
      <label className="fa-campo__label" htmlFor={name}>
        {label}
        {requerido && <span className="fa-campo__req" aria-label="requerido">*</span>}
      </label>
      <textarea
        id={name}
        className={`fa-campo__textarea ${error ? 'fa-input-error' : ''}`}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={requerido}
        rows={filas}
      />
      {error && <small className="fa-campo-error">⚠ {error}</small>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function FormularioAclaracion() {
  const { usuario } = useAuth();

  const [visible,    setVisible]    = useState(false);
  const [historiaId, setHistoriaId] = useState(null);
  const [pacienteId, setPacienteId] = useState(null);

  const [form,       setForm]       = useState(ESTADO_INICIAL);
  const [pasoActual, setPasoActual] = useState(1);
  const [enviando,   setEnviando]   = useState(false);
  const [error,      setError]      = useState(null);
  const [exito,      setExito]      = useState(false);

  const [tocado, setTocado] = useState({});

  function marcarTocado(campo) {
    setTocado(prev => (prev[campo] ? prev : { ...prev, [campo]: true }));
  }

  const erroresCamposActuales = useMemo(() => {
    const campos = CAMPOS_POR_PASO_ACLARACION[pasoActual] || [];
    const mapa = {};
    campos.forEach(campo => {
      const msg = validarCampoAclaracion(campo, form[campo], form);
      if (msg) mapa[campo] = msg;
    });
    return mapa;
  }, [pasoActual, form]);

  function errorDe(campo) {
    return tocado[campo] ? erroresCamposActuales[campo] : undefined;
  }

  const cerrar = useCallback(() => {
    setEnviando(prevEnviando => {
      if (prevEnviando) return prevEnviando;
      setVisible(false);
      setHistoriaId(null);
      setPacienteId(null);
      return prevEnviando;
    });
  }, []);

  useEffect(() => {
    function abrirModal(e) {
      const { historiaId: hId, pacienteId: pId } = e.detail || {};
      if (!hId) return;

      setHistoriaId(hId);
      setPacienteId(pId);
      setForm(ESTADO_INICIAL);
      setPasoActual(1);
      setError(null);
      setExito(false);
      setTocado({});
      setVisible(true);
    }

    window.addEventListener('melika:abrir-aclaracion', abrirModal);
    return () => window.removeEventListener('melika:abrir-aclaracion', abrirModal);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && visible && !enviando) cerrar();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, enviando, cerrar]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setTocado(prev => (prev[name] ? prev : { ...prev, [name]: true }));
  }, []);

  // ── Validación por paso — usa el mismo criterio en tiempo real ─────────────
  function validarPasoActual() {
    const campos = CAMPOS_POR_PASO_ACLARACION[pasoActual] || [];
    setTocado(prev => {
      const nuevo = { ...prev };
      campos.forEach(c => { nuevo[c] = true; });
      return nuevo;
    });

    const erroresCampos = campos
      .map(c => validarCampoAclaracion(c, form[c], form))
      .filter(Boolean);

    if (erroresCampos.length > 0) {
      setError(erroresCampos.join(' '));
      return false;
    }

    if (pasoActual === 3) {
      const dias = parseInt(form.incapacidad_dias, 10);
      if (!Number.isNaN(dias) && dias > 0 && !form.diagnostico_cie10.trim()) {
        setError('No se puede otorgar incapacidad sin un diagnóstico CIE-10 registrado.');
        return false;
      }
    }

    setError(null);
    return true;
  }

  function siguientePaso() {
    if (!validarPasoActual()) return;
    setPasoActual(p => Math.min(p + 1, 4));
  }

  function anteriorPaso() {
    setError(null);
    setPasoActual(p => Math.max(p - 1, 1));
  }

  // ── Envío del formulario ───────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validarPasoActual()) return;
    if (!historiaId) return;

    setEnviando(true);
    setError(null);

    try {
      await api.post(`/historias/${historiaId}/aclaracion`, {
        ...form,
        tension_arterial_sistolica:  form.tension_arterial_sistolica  || null,
        tension_arterial_diastolica: form.tension_arterial_diastolica || null,
        frecuencia_cardiaca:         form.frecuencia_cardiaca         || null,
        frecuencia_respiratoria:     form.frecuencia_respiratoria     || null,
        temperatura_corporal:        form.temperatura_corporal        || null,
        peso_kg:                     form.peso_kg                     || null,
        talla_cm:                    form.talla_cm                    || null,
        incapacidad_dias:            form.incapacidad_dias            || null,
      });

      setExito(true);

      window.dispatchEvent(
        new CustomEvent('melika:aclaracion-creada', {
          detail: { historiaId, pacienteId },
        })
      );

      setTimeout(() => {
        cerrar();
      }, 2000);

    } catch (err) {
      console.error('Error al crear aclaración:', err);
      const detalle = Array.isArray(err?.errores) && err.errores.length > 0
        ? err.errores.join(' ')
        : null;
      setError(
        detalle ||
        err?.mensaje ||
        err?.message ||
        'No se pudo guardar la nota. Verifica tu conexión e intenta de nuevo.'
      );
    } finally {
      setEnviando(false);
    }
  }

  if (!visible || usuario?.rol !== 'medico') return null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fa-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Agregar nota de aclaración"
      onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <div className="fa-modal">

        <div className="fa-cabecera">
          <div className="fa-cabecera__info">
            <h2 className="fa-titulo">
              📝 {form.tipo_registro === 'nota_evolucion'
                ? 'Nueva Nota de Evolución'
                : 'Nueva Nota de Aclaración'}
            </h2>
            <p className="fa-subtitulo">
              Historia #{historiaId} — Los cambios se registran como anexo legal (Ley 2015/2020)
            </p>
          </div>
          <button
            className="fa-cerrar"
            onClick={cerrar}
            disabled={enviando}
            aria-label="Cerrar formulario"
          >
            ✕
          </button>
        </div>

        <div className="fa-pasos" role="navigation" aria-label="Pasos del formulario">
          {['Motivo y Anamnesis', 'Examen Físico', 'Diagnóstico y Plan', 'Cierre Legal'].map((nombre, i) => (
            <div
              key={i}
              className={`fa-paso ${pasoActual === i + 1 ? 'fa-paso--activo' : ''} ${pasoActual > i + 1 ? 'fa-paso--completado' : ''}`}
            >
              <div className="fa-paso__num">{pasoActual > i + 1 ? '✓' : i + 1}</div>
              <span className="fa-paso__nombre">{nombre}</span>
            </div>
          ))}
        </div>

        {exito && (
          <div className="fa-exito" role="status">
            <span>✅</span>
            <p>Nota registrada exitosamente. El historial ha sido actualizado.</p>
          </div>
        )}

        {error && (
          <div className="fa-error" role="alert">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!exito && (
          <form className="fa-form" onSubmit={handleSubmit} noValidate>

            {/* ══ PASO 1 — Motivo y Anamnesis ══ */}
            {pasoActual === 1 && (
              <div className="fa-seccion">

                <div className="fa-campo">
                  <label className="fa-campo__label">Tipo de nota</label>
                  <div className="fa-radio-grupo">
                    <label className={`fa-radio ${form.tipo_registro === 'nota_aclaracion' ? 'fa-radio--activo' : ''}`}>
                      <input
                        type="radio"
                        name="tipo_registro"
                        value="nota_aclaracion"
                        checked={form.tipo_registro === 'nota_aclaracion'}
                        onChange={handleChange}
                      />
                      📋 Nota de Aclaración
                    </label>
                    <label className={`fa-radio ${form.tipo_registro === 'nota_evolucion' ? 'fa-radio--activo' : ''}`}>
                      <input
                        type="radio"
                        name="tipo_registro"
                        value="nota_evolucion"
                        checked={form.tipo_registro === 'nota_evolucion'}
                        onChange={handleChange}
                      />
                      📈 Nota de Evolución
                    </label>
                  </div>
                </div>

                <div className="fa-seccion__titulo">
                  <span>1</span> Motivo y Anamnesis
                </div>

                <CampoTextarea
                  label="Motivo de la nota / Descripción de la aclaración"
                  name="motivo_consulta"
                  value={form.motivo_consulta}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('motivo_consulta')}
                  error={errorDe('motivo_consulta')}
                  requerido
                  filas={4}
                  placeholder="Describa el motivo de esta nota de aclaración o evolución..."
                />

                <CampoTextarea
                  label="Descripción de la enfermedad / evolución actual"
                  name="anamnesis"
                  value={form.anamnesis}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('anamnesis')}
                  error={errorDe('anamnesis')}
                  filas={3}
                  placeholder="Evolución cronológica de los síntomas..."
                />

                <div className="fa-grid-2">
                  <CampoTextarea
                    label="Ant. patológicos"
                    name="antecedentes_patologicos"
                    value={form.antecedentes_patologicos}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('antecedentes_patologicos')}
                    error={errorDe('antecedentes_patologicos')}
                    filas={2}
                    placeholder='Escriba "Niega" si no aplica'
                  />
                  <CampoTextarea
                    label="Ant. quirúrgicos"
                    name="antecedentes_quirurgicos"
                    value={form.antecedentes_quirurgicos}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('antecedentes_quirurgicos')}
                    error={errorDe('antecedentes_quirurgicos')}
                    filas={2}
                    placeholder='Escriba "Niega" si no aplica'
                  />
                  <CampoTextarea
                    label="Ant. alérgicos / farmacológicos"
                    name="antecedentes_alergicos"
                    value={form.antecedentes_alergicos}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('antecedentes_alergicos')}
                    error={errorDe('antecedentes_alergicos')}
                    filas={2}
                    placeholder='Escriba "Niega" si no aplica'
                  />
                  <CampoTextarea
                    label="Ant. familiares"
                    name="antecedentes_familiares"
                    value={form.antecedentes_familiares}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('antecedentes_familiares')}
                    error={errorDe('antecedentes_familiares')}
                    filas={2}
                    placeholder='Escriba "Niega" si no aplica'
                  />
                  <CampoTextarea
                    label="Ginecoobstétricos (si aplica)"
                    name="antecedentes_ginecoobstetricos"
                    value={form.antecedentes_ginecoobstetricos}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('antecedentes_ginecoobstetricos')}
                    error={errorDe('antecedentes_ginecoobstetricos')}
                    filas={2}
                    placeholder='Escriba "No aplica" si no corresponde'
                  />
                  <CampoTextarea
                    label="Hábitos"
                    name="habitos"
                    value={form.habitos}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('habitos')}
                    error={errorDe('habitos')}
                    filas={2}
                    placeholder='Escriba "Niega" si no aplica'
                  />
                </div>

              </div>
            )}

            {/* ══ PASO 2 — Examen Físico ══ */}
            {pasoActual === 2 && (
              <div className="fa-seccion">
                <div className="fa-seccion__titulo">
                  <span>2</span> Examen Físico — Signos Vitales
                </div>

                <div className="fa-signos-grid">
                  <div className="fa-signo">
                    <label className="fa-campo__label">TA Sistólica (mmHg)</label>
                    <input
                      className={`fa-campo__input ${errorDe('tension_arterial_sistolica') ? 'fa-input-error' : ''}`}
                      type="number"
                      name="tension_arterial_sistolica"
                      value={form.tension_arterial_sistolica}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('tension_arterial_sistolica')}
                      min="50" max="250"
                      placeholder="120"
                    />
                    {errorDe('tension_arterial_sistolica') && (
                      <small className="fa-campo-error">⚠ {errorDe('tension_arterial_sistolica')}</small>
                    )}
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">TA Diastólica (mmHg)</label>
                    <input
                      className={`fa-campo__input ${errorDe('tension_arterial_diastolica') ? 'fa-input-error' : ''}`}
                      type="number"
                      name="tension_arterial_diastolica"
                      value={form.tension_arterial_diastolica}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('tension_arterial_diastolica')}
                      min="30" max="150"
                      placeholder="80"
                    />
                    {errorDe('tension_arterial_diastolica') && (
                      <small className="fa-campo-error">⚠ {errorDe('tension_arterial_diastolica')}</small>
                    )}
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Frec. Cardíaca (lpm)</label>
                    <input
                      className={`fa-campo__input ${errorDe('frecuencia_cardiaca') ? 'fa-input-error' : ''}`}
                      type="number"
                      name="frecuencia_cardiaca"
                      value={form.frecuencia_cardiaca}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('frecuencia_cardiaca')}
                      min="20" max="250"
                      placeholder="72"
                    />
                    {errorDe('frecuencia_cardiaca') && (
                      <small className="fa-campo-error">⚠ {errorDe('frecuencia_cardiaca')}</small>
                    )}
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Frec. Respiratoria (rpm)</label>
                    <input
                      className={`fa-campo__input ${errorDe('frecuencia_respiratoria') ? 'fa-input-error' : ''}`}
                      type="number"
                      name="frecuencia_respiratoria"
                      value={form.frecuencia_respiratoria}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('frecuencia_respiratoria')}
                      min="5" max="60"
                      placeholder="16"
                    />
                    {errorDe('frecuencia_respiratoria') && (
                      <small className="fa-campo-error">⚠ {errorDe('frecuencia_respiratoria')}</small>
                    )}
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Temperatura (°C)</label>
                    <input
                      className={`fa-campo__input ${errorDe('temperatura_corporal') ? 'fa-input-error' : ''}`}
                      type="number"
                      name="temperatura_corporal"
                      value={form.temperatura_corporal}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('temperatura_corporal')}
                      min="30" max="43"
                      step="0.1"
                      placeholder="36.6"
                    />
                    {errorDe('temperatura_corporal') && (
                      <small className="fa-campo-error">⚠ {errorDe('temperatura_corporal')}</small>
                    )}
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Peso (kg)</label>
                    <input
                      className={`fa-campo__input ${errorDe('peso_kg') ? 'fa-input-error' : ''}`}
                      type="number"
                      name="peso_kg"
                      value={form.peso_kg}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('peso_kg')}
                      min="1" max="300"
                      step="0.1"
                      placeholder="70"
                    />
                    {errorDe('peso_kg') && (
                      <small className="fa-campo-error">⚠ {errorDe('peso_kg')}</small>
                    )}
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Talla (cm)</label>
                    <input
                      className={`fa-campo__input ${errorDe('talla_cm') ? 'fa-input-error' : ''}`}
                      type="number"
                      name="talla_cm"
                      value={form.talla_cm}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('talla_cm')}
                      min="30" max="250"
                      step="0.1"
                      placeholder="170"
                    />
                    {errorDe('talla_cm') && (
                      <small className="fa-campo-error">⚠ {errorDe('talla_cm')}</small>
                    )}
                  </div>

                  {form.peso_kg && form.talla_cm && (
                    <div className="fa-imc-preview">
                      <span className="fa-imc-preview__label">IMC calculado</span>
                      <span className="fa-imc-preview__valor">
                        {(parseFloat(form.peso_kg) / Math.pow(parseFloat(form.talla_cm) / 100, 2)).toFixed(1)}
                      </span>
                      <span className="fa-imc-preview__unidad">kg/m²</span>
                    </div>
                  )}
                </div>

                <CampoTextarea
                  label="Exploración por sistemas"
                  name="exploracion_por_sistemas"
                  value={form.exploracion_por_sistemas}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('exploracion_por_sistemas')}
                  error={errorDe('exploracion_por_sistemas')}
                  filas={3}
                  placeholder="Hallazgos por sistemas: cardiovascular, respiratorio, neurológico..."
                />

                <CampoTextarea
                  label="Hallazgos al examen físico"
                  name="examen_fisico"
                  value={form.examen_fisico}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('examen_fisico')}
                  error={errorDe('examen_fisico')}
                  filas={3}
                  placeholder="Descripción detallada del examen físico realizado..."
                />

              </div>
            )}

            {/* ══ PASO 3 — Diagnóstico y Plan de Manejo ══ */}
            {pasoActual === 3 && (
              <div className="fa-seccion">
                <div className="fa-seccion__titulo">
                  <span>3</span> Diagnóstico y Plan de Manejo
                </div>

                <div className="fa-grid-2">
                  <CampoInput
                    label="Código CIE-10"
                    name="diagnostico_cie10"
                    value={form.diagnostico_cie10}
                    onChange={e => handleChange({ target: { name: 'diagnostico_cie10', value: e.target.value.toUpperCase() } })}
                    onBlur={() => marcarTocado('diagnostico_cie10')}
                    error={errorDe('diagnostico_cie10')}
                    placeholder="Ej: J06.9"
                  />
                  <CampoInput
                    label="Descripción del diagnóstico"
                    name="descripcion_diagnostico"
                    value={form.descripcion_diagnostico}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('descripcion_diagnostico')}
                    error={errorDe('descripcion_diagnostico')}
                    placeholder="Infección aguda de las vías respiratorias superiores..."
                  />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--melika-text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
                  Si diligencia uno de estos dos campos, el otro pasa a ser obligatorio.
                </p>

                <CampoTextarea
                  label="Plan de tratamiento"
                  name="plan_tratamiento"
                  value={form.plan_tratamiento}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('plan_tratamiento')}
                  error={errorDe('plan_tratamiento')}
                  filas={3}
                  placeholder="Descripción del plan terapéutico..."
                />

                <CampoTextarea
                  label="💊 Fórmula médica — Medicamentos"
                  name="medicamentos_recetados"
                  value={form.medicamentos_recetados}
                  onChange={handleChange}
                  filas={4}
                  placeholder="Principio activo, presentación, dosis, vía y duración. Ej:&#10;Amoxicilina 500mg cápsulas — 1 cada 8h vía oral x 7 días"
                />

                <CampoTextarea
                  label="Órdenes médicas / Exámenes"
                  name="ordenes_medicas"
                  value={form.ordenes_medicas}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('ordenes_medicas')}
                  error={errorDe('ordenes_medicas')}
                  filas={3}
                  placeholder="Exámenes de laboratorio, imágenes, interconsultas..."
                />

                <CampoTextarea
                  label="Recomendaciones y signos de alarma"
                  name="recomendaciones"
                  value={form.recomendaciones}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('recomendaciones')}
                  error={errorDe('recomendaciones')}
                  filas={3}
                  placeholder="Cuidados en casa, dieta, actividad física, signos de alarma..."
                />

                <div className="fa-grid-2">
                  <div>
                    <CampoInput
                      label="Días de incapacidad"
                      name="incapacidad_dias"
                      value={form.incapacidad_dias}
                      onChange={handleChange}
                      onBlur={() => marcarTocado('incapacidad_dias')}
                      error={errorDe('incapacidad_dias')}
                      tipo="number"
                      min="0"
                      max="180"
                      placeholder="0"
                    />
                    {parseInt(form.incapacidad_dias, 10) > 0 && !form.diagnostico_cie10.trim() && (
                      <small style={{ color: '#DC2626', display: 'block', marginTop: '-12px' }}>
                        ⚠ Requiere diagnóstico CIE-10 para otorgar incapacidad.
                      </small>
                    )}
                  </div>
                  <CampoTextarea
                    label="Observaciones adicionales"
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('observaciones')}
                    error={errorDe('observaciones')}
                    filas={2}
                  />
                </div>

              </div>
            )}

            {/* ══ PASO 4 — Cierre Legal ══ */}
            {pasoActual === 4 && (
              <div className="fa-seccion">
                <div className="fa-seccion__titulo">
                  <span>4</span> Cierre Legal — Firma del Médico
                </div>

                <div className="fa-cierre-aviso">
                  <span>⚖️</span>
                  <p>
                    Este registro quedará vinculado de forma permanente e inalterable
                    a la historia clínica original. Resolución 1995/1999 y Ley 2015/2020.
                  </p>
                </div>

                <CampoInput
                  label="Nombre completo del médico firmante"
                  name="medico_nombre_firma"
                  value={form.medico_nombre_firma}
                  onChange={handleChange}
                  onBlur={() => marcarTocado('medico_nombre_firma')}
                  error={errorDe('medico_nombre_firma')}
                  requerido
                  placeholder="Dr(a). Nombre Apellido"
                />

                <div className="fa-grid-2">
                  <CampoInput
                    label="Cédula del médico"
                    name="medico_cedula_firma"
                    value={form.medico_cedula_firma}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('medico_cedula_firma')}
                    error={errorDe('medico_cedula_firma')}
                    placeholder="Número de cédula"
                  />
                  <CampoInput
                    label="N° Registro Profesional (ReTHUS)"
                    name="medico_rethus_firma"
                    value={form.medico_rethus_firma}
                    onChange={handleChange}
                    onBlur={() => marcarTocado('medico_rethus_firma')}
                    error={errorDe('medico_rethus_firma')}
                    requerido
                    placeholder="ReTHUS-XXXXXXXX"
                  />
                </div>

                <div className="fa-firma-preview">
                  <div className="fa-firma-preview__linea" />
                  <p className="fa-firma-preview__nombre">
                    {form.medico_nombre_firma || 'Dr(a). Nombre del médico'}
                  </p>
                  {form.medico_cedula_firma && (
                    <p className="fa-firma-preview__dato">
                      C.C. {form.medico_cedula_firma}
                    </p>
                  )}
                  {form.medico_rethus_firma && (
                    <p className="fa-firma-preview__dato">
                      ReTHUS: {form.medico_rethus_firma}
                    </p>
                  )}
                  <p className="fa-firma-preview__tipo">
                    {form.tipo_registro === 'nota_evolucion'
                      ? 'Nota de Evolución'
                      : 'Nota de Aclaración'}
                  </p>
                </div>

              </div>
            )}

            {/* ── Navegación entre pasos ── */}
            <div className="fa-navegacion">
              <div className="fa-navegacion__izq">
                {pasoActual > 1 && (
                  <button
                    type="button"
                    className="fa-btn fa-btn--secundario"
                    onClick={anteriorPaso}
                    disabled={enviando}
                  >
                    ← Anterior
                  </button>
                )}
              </div>

              <div className="fa-navegacion__der">
                <button
                  type="button"
                  className="fa-btn fa-btn--ghost"
                  onClick={cerrar}
                  disabled={enviando}
                >
                  Cancelar
                </button>

                {pasoActual < 4 ? (
                  <button
                    type="button"
                    className="fa-btn fa-btn--primario"
                    onClick={siguientePaso}
                    disabled={enviando}
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="fa-btn fa-btn--guardar"
                    disabled={enviando}
                  >
                    {enviando
                      ? <><span className="fa-spinner" /> Guardando…</>
                      : '✅ Registrar nota'}
                  </button>
                )}
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}