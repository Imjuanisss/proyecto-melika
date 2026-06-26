// client/src/components/historias/FormularioAclaracion.jsx
// MELIKA — Modal para agregar Notas de Aclaración / Evolución a una Historia Clínica
//
// Escucha el CustomEvent 'melika:abrir-aclaracion' que dispara DetalleHistoria.
// Solo es accesible para el médico autor de la historia original.
// Lógica append-only: POST /historias/:id/aclaracion
// Al éxito dispara 'melika:aclaracion-creada' para que HistorialPaciente recargue.

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import './FormularioAclaracion.css';

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO INICIAL DEL FORMULARIO
// Refleja todos los bloques clínicos de la Resolución 1995/1999
// ─────────────────────────────────────────────────────────────────────────────
const ESTADO_INICIAL = {
  // Tipo de nota
  tipo_registro: 'nota_aclaracion',

  // Bloque 2 — Motivo (obligatorio) y anamnesis
  motivo_consulta:                '',
  anamnesis:                      '',
  antecedentes_patologicos:       '',
  antecedentes_quirurgicos:       '',
  antecedentes_alergicos:         '',
  antecedentes_familiares:        '',
  antecedentes_ginecoobstetricos: '',
  habitos:                        '',

  // Bloque 3 — Signos vitales
  tension_arterial_sistolica:  '',
  tension_arterial_diastolica: '',
  frecuencia_cardiaca:         '',
  frecuencia_respiratoria:     '',
  temperatura_corporal:        '',
  peso_kg:                     '',
  talla_cm:                    '',
  exploracion_por_sistemas:    '',
  examen_fisico:               '',

  // Bloque 4 — Diagnóstico CIE-10
  diagnostico_cie10:       '',
  descripcion_diagnostico: '',

  // Bloque 5 — Plan de manejo
  plan_tratamiento:      '',
  medicamentos_recetados: '',
  ordenes_medicas:       '',
  recomendaciones:       '',
  incapacidad_dias:      '',
  observaciones:         '',

  // Bloque 6 — Cierre legal
  medico_nombre_firma: '',
  medico_cedula_firma: '',
  medico_rethus_firma: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE CAMPO — Etiqueta + input/textarea reutilizable
// ─────────────────────────────────────────────────────────────────────────────
function CampoInput({ label, name, value, onChange, tipo = 'text', requerido = false, placeholder = '' }) {
  return (
    <div className="fa-campo">
      <label className="fa-campo__label" htmlFor={name}>
        {label}
        {requerido && <span className="fa-campo__req" aria-label="requerido">*</span>}
      </label>
      <input
        id={name}
        className="fa-campo__input"
        type={tipo}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={requerido}
        autoComplete="off"
      />
    </div>
  );
}

function CampoTextarea({ label, name, value, onChange, requerido = false, placeholder = '', filas = 3 }) {
  return (
    <div className="fa-campo">
      <label className="fa-campo__label" htmlFor={name}>
        {label}
        {requerido && <span className="fa-campo__req" aria-label="requerido">*</span>}
      </label>
      <textarea
        id={name}
        className="fa-campo__textarea"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={requerido}
        rows={filas}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function FormularioAclaracion() {
  const { usuario } = useAuth();

  // Estado de visibilidad y contexto del modal
  const [visible,    setVisible]    = useState(false);
  const [historiaId, setHistoriaId] = useState(null);
  const [pacienteId, setPacienteId] = useState(null);

  // Estado del formulario
  const [form,       setForm]       = useState(ESTADO_INICIAL);
  const [pasoActual, setPasoActual] = useState(1); // 1-4: pasos del formulario
  const [enviando,   setEnviando]   = useState(false);
  const [error,      setError]      = useState(null);
  const [exito,      setExito]      = useState(false);

  // ── Escuchar el evento que abre este modal ─────────────────────────────────
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
      setVisible(true);
    }

    window.addEventListener('melika:abrir-aclaracion', abrirModal);
    return () => window.removeEventListener('melika:abrir-aclaracion', abrirModal);
  }, []);

  // ── Cerrar con Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && visible && !enviando) cerrar();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, enviando]);

  // ── Handlers de formulario ─────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  function cerrar() {
    if (enviando) return;
    setVisible(false);
    setHistoriaId(null);
    setPacienteId(null);
  }

  // ── Validación por paso ────────────────────────────────────────────────────
  function validarPasoActual() {
    if (pasoActual === 1 && !form.motivo_consulta.trim()) {
      setError('El motivo de la consulta/aclaración es obligatorio.');
      return false;
    }
    if (pasoActual === 4) {
      if (!form.medico_nombre_firma.trim()) {
        setError('El nombre del médico firmante es obligatorio.');
        return false;
      }
      if (!form.medico_rethus_firma.trim()) {
        setError('El número ReTHUS es obligatorio para el cierre legal.');
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
        // Enviar nulls explícitos para campos vacíos (el backend los acepta)
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

      // Notificar a HistorialPaciente y DetalleHistoria que hubo cambio
      window.dispatchEvent(
        new CustomEvent('melika:aclaracion-creada', {
          detail: { historiaId, pacienteId },
        })
      );

      // Cerrar automáticamente a los 2 segundos
      setTimeout(() => {
        cerrar();
      }, 2000);

    } catch (err) {
      console.error('Error al crear aclaración:', err);
      setError(
        err?.mensaje ||
        err?.message ||
        'No se pudo guardar la nota. Verifica tu conexión e intenta de nuevo.'
      );
    } finally {
      setEnviando(false);
    }
  }

  // ── No renderizar si no está visible o el usuario no es médico ────────────
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

        {/* ── Cabecera ── */}
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

        {/* ── Indicador de pasos ── */}
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

        {/* ── Mensaje de éxito ── */}
        {exito && (
          <div className="fa-exito" role="status">
            <span>✅</span>
            <p>Nota registrada exitosamente. El historial ha sido actualizado.</p>
          </div>
        )}

        {/* ── Mensaje de error ── */}
        {error && (
          <div className="fa-error" role="alert">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* ── Cuerpo del formulario ── */}
        {!exito && (
          <form className="fa-form" onSubmit={handleSubmit} noValidate>

            {/* ══ PASO 1 — Motivo y Anamnesis ══ */}
            {pasoActual === 1 && (
              <div className="fa-seccion">

                {/* Tipo de nota */}
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
                  requerido
                  filas={4}
                  placeholder="Describa el motivo de esta nota de aclaración o evolución..."
                />

                <CampoTextarea
                  label="Descripción de la enfermedad / evolución actual"
                  name="anamnesis"
                  value={form.anamnesis}
                  onChange={handleChange}
                  filas={3}
                  placeholder="Evolución cronológica de los síntomas..."
                />

                <div className="fa-grid-2">
                  <CampoTextarea
                    label="Ant. patológicos"
                    name="antecedentes_patologicos"
                    value={form.antecedentes_patologicos}
                    onChange={handleChange}
                    filas={2}
                  />
                  <CampoTextarea
                    label="Ant. quirúrgicos"
                    name="antecedentes_quirurgicos"
                    value={form.antecedentes_quirurgicos}
                    onChange={handleChange}
                    filas={2}
                  />
                  <CampoTextarea
                    label="Ant. alérgicos / farmacológicos"
                    name="antecedentes_alergicos"
                    value={form.antecedentes_alergicos}
                    onChange={handleChange}
                    filas={2}
                  />
                  <CampoTextarea
                    label="Ant. familiares"
                    name="antecedentes_familiares"
                    value={form.antecedentes_familiares}
                    onChange={handleChange}
                    filas={2}
                  />
                  <CampoTextarea
                    label="Ginecoobstétricos (si aplica)"
                    name="antecedentes_ginecoobstetricos"
                    value={form.antecedentes_ginecoobstetricos}
                    onChange={handleChange}
                    filas={2}
                  />
                  <CampoTextarea
                    label="Hábitos"
                    name="habitos"
                    value={form.habitos}
                    onChange={handleChange}
                    filas={2}
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
                      className="fa-campo__input"
                      type="number"
                      name="tension_arterial_sistolica"
                      value={form.tension_arterial_sistolica}
                      onChange={handleChange}
                      min="50" max="250"
                      placeholder="120"
                    />
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">TA Diastólica (mmHg)</label>
                    <input
                      className="fa-campo__input"
                      type="number"
                      name="tension_arterial_diastolica"
                      value={form.tension_arterial_diastolica}
                      onChange={handleChange}
                      min="30" max="150"
                      placeholder="80"
                    />
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Frec. Cardíaca (lpm)</label>
                    <input
                      className="fa-campo__input"
                      type="number"
                      name="frecuencia_cardiaca"
                      value={form.frecuencia_cardiaca}
                      onChange={handleChange}
                      min="20" max="250"
                      placeholder="72"
                    />
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Frec. Respiratoria (rpm)</label>
                    <input
                      className="fa-campo__input"
                      type="number"
                      name="frecuencia_respiratoria"
                      value={form.frecuencia_respiratoria}
                      onChange={handleChange}
                      min="5" max="60"
                      placeholder="16"
                    />
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Temperatura (°C)</label>
                    <input
                      className="fa-campo__input"
                      type="number"
                      name="temperatura_corporal"
                      value={form.temperatura_corporal}
                      onChange={handleChange}
                      min="30" max="43"
                      step="0.1"
                      placeholder="36.6"
                    />
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Peso (kg)</label>
                    <input
                      className="fa-campo__input"
                      type="number"
                      name="peso_kg"
                      value={form.peso_kg}
                      onChange={handleChange}
                      min="1" max="300"
                      step="0.1"
                      placeholder="70"
                    />
                  </div>
                  <div className="fa-signo">
                    <label className="fa-campo__label">Talla (cm)</label>
                    <input
                      className="fa-campo__input"
                      type="number"
                      name="talla_cm"
                      value={form.talla_cm}
                      onChange={handleChange}
                      min="50" max="250"
                      step="0.1"
                      placeholder="170"
                    />
                  </div>

                  {/* IMC calculado en tiempo real */}
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
                  filas={3}
                  placeholder="Hallazgos por sistemas: cardiovascular, respiratorio, neurológico..."
                />

                <CampoTextarea
                  label="Hallazgos al examen físico"
                  name="examen_fisico"
                  value={form.examen_fisico}
                  onChange={handleChange}
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
                    onChange={handleChange}
                    placeholder="Ej: J06.9"
                  />
                  <CampoInput
                    label="Descripción del diagnóstico"
                    name="descripcion_diagnostico"
                    value={form.descripcion_diagnostico}
                    onChange={handleChange}
                    placeholder="Infección aguda de las vías respiratorias superiores..."
                  />
                </div>

                <CampoTextarea
                  label="Plan de tratamiento"
                  name="plan_tratamiento"
                  value={form.plan_tratamiento}
                  onChange={handleChange}
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
                  filas={3}
                  placeholder="Exámenes de laboratorio, imágenes, interconsultas..."
                />

                <CampoTextarea
                  label="Recomendaciones y signos de alarma"
                  name="recomendaciones"
                  value={form.recomendaciones}
                  onChange={handleChange}
                  filas={3}
                  placeholder="Cuidados en casa, dieta, actividad física, signos de alarma..."
                />

                <div className="fa-grid-2">
                  <CampoInput
                    label="Días de incapacidad"
                    name="incapacidad_dias"
                    value={form.incapacidad_dias}
                    onChange={handleChange}
                    tipo="number"
                    placeholder="0"
                  />
                  <CampoTextarea
                    label="Observaciones adicionales"
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleChange}
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
                  requerido
                  placeholder="Dr(a). Nombre Apellido"
                />

                <div className="fa-grid-2">
                  <CampoInput
                    label="Cédula del médico"
                    name="medico_cedula_firma"
                    value={form.medico_cedula_firma}
                    onChange={handleChange}
                    placeholder="Número de cédula"
                  />
                  <CampoInput
                    label="N° Registro Profesional (ReTHUS)"
                    name="medico_rethus_firma"
                    value={form.medico_rethus_firma}
                    onChange={handleChange}
                    requerido
                    placeholder="ReTHUS-XXXXXXXX"
                  />
                </div>

                {/* Vista previa del cierre */}
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