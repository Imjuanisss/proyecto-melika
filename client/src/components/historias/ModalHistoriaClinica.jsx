// MELIKA — Modal de creación/visualización/aclaración de Historia Clínica
// Integra generación de PDF con @react-pdf/renderer

import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useAuth } from '../../context/AuthContext';
import { api }    from '../../lib/apiClient';
import { PlantillaHistoriaPDF, PlantillaFormulaPDF } from './PlantillaHistoriaPDF';
import './ModalHistoriaClinica.css';

// ─── Estado inicial del formulario completo ───────────────────────────────────
const FORM_INICIAL = {
  // Bloque 1 - Admin
  eps_aseguradora:              '',
  contacto_responsable_nombre:  '',
  contacto_responsable_telefono:'',
  // Bloque 2 - Anamnesis
  motivo_consulta:              '',
  anamnesis:                    '',
  antecedentes_patologicos:     '',
  antecedentes_quirurgicos:     '',
  antecedentes_alergicos:       '',
  antecedentes_familiares:      '',
  antecedentes_ginecoobstetricos: '',
  habitos:                      '',
  // Bloque 3 - Examen físico
  tension_arterial_sistolica:   '',
  tension_arterial_diastolica:  '',
  frecuencia_cardiaca:          '',
  frecuencia_respiratoria:      '',
  temperatura_corporal:         '',
  peso_kg:                      '',
  talla_cm:                     '',
  exploracion_por_sistemas:     '',
  examen_fisico:                '',
  // Bloque 4 - Diagnóstico
  diagnostico_cie10:            '',
  descripcion_diagnostico:      '',
  // Bloque 5 - Plan de manejo
  plan_tratamiento:             '',
  medicamentos_recetados:       '',
  ordenes_medicas:              '',
  recomendaciones:              '',
  incapacidad_dias:             '',
  // Bloque 6 - Cierre legal
  medico_nombre_firma:          '',
  medico_cedula_firma:          '',
  medico_rethus_firma:          '',
  // Extra
  observaciones:                '',
};

export default function ModalHistoriaClinica({ cita, onCerrar, onGuardada }) {
  const { usuario } = useAuth();
  const esMedico    = usuario?.rol === 'medico';

  // Datos cargados del backend
  const [historia,      setHistoria]      = useState(null);
  const [aclaraciones,  setAclaraciones]  = useState([]);
  const [historiaFull,  setHistoriaFull]  = useState(null); // datos completos para PDF

  // Estado del formulario
  const [form,          setForm]          = useState(FORM_INICIAL);
  const [modoEdicion,   setModoEdicion]   = useState(false);
  const [modoAclaracion,setModoAclaracion]= useState(false);
  const [tipoRegistro,  setTipoRegistro]  = useState('nota_aclaracion');

  // Paso activo del formulario (para el wizard de secciones)
  const [paso, setPaso] = useState(1);
  const TOTAL_PASOS = 6;

  // Estados de UI
  const [loading,       setLoading]       = useState(true);
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState(null);

  // Cargar historia al abrir
  useEffect(() => {
    if (!cita?.id) return;
    setLoading(true);
    setError(null);

    api.get(`/historias/cita/${cita.id}`)
      .then(data => {
        const h = data.historia;
        setHistoria(h || null);
        setAclaraciones(data.aclaraciones || []);

        if (h) {
          // Pre-cargar formulario con datos existentes
          setForm({
            eps_aseguradora:               h.eps_aseguradora               || '',
            contacto_responsable_nombre:   h.contacto_responsable_nombre   || '',
            contacto_responsable_telefono: h.contacto_responsable_telefono || '',
            motivo_consulta:               h.motivo_consulta               || '',
            anamnesis:                     h.anamnesis                     || '',
            antecedentes_patologicos:      h.antecedentes_patologicos      || '',
            antecedentes_quirurgicos:      h.antecedentes_quirurgicos      || '',
            antecedentes_alergicos:        h.antecedentes_alergicos        || '',
            antecedentes_familiares:       h.antecedentes_familiares       || '',
            antecedentes_ginecoobstetricos:h.antecedentes_ginecoobstetricos|| '',
            habitos:                       h.habitos                       || '',
            tension_arterial_sistolica:    h.tension_arterial_sistolica    ?? '',
            tension_arterial_diastolica:   h.tension_arterial_diastolica   ?? '',
            frecuencia_cardiaca:           h.frecuencia_cardiaca           ?? '',
            frecuencia_respiratoria:       h.frecuencia_respiratoria       ?? '',
            temperatura_corporal:          h.temperatura_corporal          ?? '',
            peso_kg:                       h.peso_kg                       ?? '',
            talla_cm:                      h.talla_cm                      ?? '',
            exploracion_por_sistemas:      h.exploracion_por_sistemas      || '',
            examen_fisico:                 h.examen_fisico                 || '',
            diagnostico_cie10:             h.diagnostico_cie10             || '',
            descripcion_diagnostico:       h.descripcion_diagnostico       || '',
            plan_tratamiento:              h.plan_tratamiento              || '',
            medicamentos_recetados:        typeof h.medicamentos_recetados === 'object'
                                             ? (h.medicamentos_recetados?.texto || '')
                                             : (h.medicamentos_recetados || ''),
            ordenes_medicas:               h.ordenes_medicas               || '',
            recomendaciones:               h.recomendaciones               || '',
            incapacidad_dias:              h.incapacidad_dias              ?? '',
            medico_nombre_firma:           h.medico_nombre_firma           || '',
            medico_cedula_firma:           h.medico_cedula_firma           || '',
            medico_rethus_firma:           h.medico_rethus_firma           || '',
            observaciones:                 h.observaciones                 || '',
          });
          setModoEdicion(false);
        } else {
          // No existe historia → modo edición automático
          setModoEdicion(true);
          setPaso(1);
        }

        // Cargar datos completos para PDF (incluye datos del paciente)
        if (h?.id) {
          return api.get(`/historias/${h.id}/completa`);
        }
        return null;
      })
      .then(data => {
        if (data) setHistoriaFull(data.historia);
      })
      .catch(() => setError('No se pudo cargar la historia clínica.'))
      .finally(() => setLoading(false));
  }, [cita?.id]);

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  // IMC calculado en tiempo real
  function imcCalculado() {
    const peso   = parseFloat(form.peso_kg);
    const talla  = parseFloat(form.talla_cm);
    if (!peso || !talla || talla === 0) return null;
    return (peso / ((talla / 100) ** 2)).toFixed(1);
  }

  async function handleGuardar() {
    if (!form.motivo_consulta.trim()) {
      setError('El motivo de consulta es obligatorio.');
      return;
    }
    setGuardando(true);
    setError(null);

    try {
      if (modoAclaracion && historia) {
        // Crear nota de aclaración (append-only)
        const res = await api.post(`/historias/${historia.id}/aclaracion`, {
          ...form,
          tipo_registro: tipoRegistro,
          medicamentos_recetados: form.medicamentos_recetados || null,
        });
        setAclaraciones(prev => [...prev, res.aclaracion]);
        setModoAclaracion(false);
        if (onGuardada) onGuardada();
      } else if (!historia) {
        // Crear historia nueva
        const res = await api.post('/historias', {
          ...form,
          id_cita: cita.id,
          medicamentos_recetados: form.medicamentos_recetados || null,
        });
        setHistoria(res.historia);
        setModoEdicion(false);
        // Cargar datos completos para PDF
        const full = await api.get(`/historias/${res.historia.id}/completa`);
        setHistoriaFull(full.historia);
        if (onGuardada) onGuardada(res.historia);
      }
    } catch (err) {
      setError(err.message || 'Error al guardar la historia clínica.');
    } finally {
      setGuardando(false);
    }
  }

  function pasoSiguiente() {
    if (paso === 1 && !form.motivo_consulta.trim()) {
      setError('El motivo de consulta es obligatorio.');
      return;
    }
    setError(null);
    setPaso(p => Math.min(p + 1, TOTAL_PASOS));
  }

  function pasoAnterior() {
    setError(null);
    setPaso(p => Math.max(p - 1, 1));
  }

  function iniciarAclaracion() {
    setModoAclaracion(true);
    setForm(FORM_INICIAL);
    setPaso(1);
    setError(null);
  }

  function cancelarAclaracion() {
    setModoAclaracion(false);
    setError(null);
  }

  const puedeEditarOAclarar = esMedico && historia;

  return (
    <div className="mhc-overlay" role="dialog" aria-modal="true" aria-label="Historia Clínica">
      <div className="mhc-modal">

        {/* ── Cabecera ─────────────────────────────────────────── */}
        <div className="mhc-cabecera">
          <div className="mhc-cabecera__info">
            <h2 className="mhc-cabecera__titulo">
              {modoAclaracion ? '📋 Nota de Aclaración' : '📋 Historia Clínica'}
            </h2>
            <p className="mhc-cabecera__sub">
              {cita.paciente_nombre} {cita.paciente_apellido} ·{' '}
              {cita.especialidad} · {cita.tipo_consulta === 'teleconsulta' ? '💻' : '🏥'}
            </p>
          </div>
          <div className="mhc-cabecera__acciones">
            {/* Botón PDF completo */}
            {historiaFull && !modoEdicion && !modoAclaracion && (
              <PDFDownloadLink
                document={<PlantillaHistoriaPDF historia={historiaFull} aclaraciones={aclaraciones} />}
                fileName={`HC-${historiaFull.id}-${historiaFull.paciente_apellido}.pdf`}
                className="mhc-btn mhc-btn--pdf"
              >
                {({ loading: pdfLoading }) => pdfLoading ? 'Generando…' : '⬇ Historia PDF'}
              </PDFDownloadLink>
            )}
            {/* Botón Fórmula PDF */}
            {historiaFull && historiaFull.medicamentos_recetados && !modoEdicion && !modoAclaracion && (
              <PDFDownloadLink
                document={<PlantillaFormulaPDF historia={historiaFull} />}
                fileName={`Formula-${historiaFull.id}-${historiaFull.paciente_apellido}.pdf`}
                className="mhc-btn mhc-btn--formula"
              >
                {({ loading: pdfLoading }) => pdfLoading ? 'Generando…' : '💊 Fórmula PDF'}
              </PDFDownloadLink>
            )}
            <button className="mhc-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
          </div>
        </div>

        {/* ── Cuerpo ───────────────────────────────────────────── */}
        <div className="mhc-cuerpo">

          {loading ? (
            <div className="mhc-loading">
              <div className="mhc-spinner" />
              <p>Cargando historia clínica…</p>
            </div>
          ) : (

            <>
              {/* Alerta de aclaraciones existentes */}
              {aclaraciones.length > 0 && !modoEdicion && !modoAclaracion && (
                <div className="mhc-alerta-aclaraciones">
                  <span>ℹ</span>
                  Esta historia tiene {aclaraciones.length} nota(s) de aclaración registradas.
                  El historial original permanece intacto conforme a la Ley 2015/2020.
                </div>
              )}

              {/* Selector de tipo de aclaración */}
              {modoAclaracion && (
                <div className="mhc-tipo-aclaracion">
                  <label className="mhc-tipo-aclaracion__label">Tipo de nota:</label>
                  <div className="mhc-tipo-aclaracion__opciones">
                    <button
                      className={`mhc-tipo-btn ${tipoRegistro === 'nota_aclaracion' ? 'mhc-tipo-btn--activo' : ''}`}
                      onClick={() => setTipoRegistro('nota_aclaracion')}
                    >
                      Aclaración / Corrección
                    </button>
                    <button
                      className={`mhc-tipo-btn ${tipoRegistro === 'nota_evolucion' ? 'mhc-tipo-btn--activo' : ''}`}
                      onClick={() => setTipoRegistro('nota_evolucion')}
                    >
                      Nota de Evolución
                    </button>
                  </div>
                </div>
              )}

              {/* ── VISTA: formulario en pasos ────────────────────── */}
              {(modoEdicion || modoAclaracion) && (
                <>
                  {/* Indicador de pasos */}
                  <div className="mhc-pasos">
                    {Array.from({ length: TOTAL_PASOS }, (_, i) => i + 1).map(n => (
                      <div
                        key={n}
                        className={`mhc-paso-dot ${n === paso ? 'mhc-paso-dot--activo' : ''} ${n < paso ? 'mhc-paso-dot--completado' : ''}`}
                      >
                        <span>{n}</span>
                        <small>
                          {n === 1 && 'Admin'}
                          {n === 2 && 'Anamnesis'}
                          {n === 3 && 'Físico'}
                          {n === 4 && 'Diagnóstico'}
                          {n === 5 && 'Plan'}
                          {n === 6 && 'Cierre'}
                        </small>
                      </div>
                    ))}
                  </div>

                  <div className="mhc-form">

                    {/* PASO 1 — Datos administrativos */}
                    {paso === 1 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo">
                          <span className="mhc-seccion__num">1</span>
                          Identificación Administrativa
                        </h3>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo">
                            <label>EPS / Aseguradora</label>
                            <input
                              type="text"
                              value={form.eps_aseguradora}
                              onChange={e => handleChange('eps_aseguradora', e.target.value)}
                              placeholder="Ej: Sura, Coomeva, Compensar…"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Nombre del responsable</label>
                            <input
                              type="text"
                              value={form.contacto_responsable_nombre}
                              onChange={e => handleChange('contacto_responsable_nombre', e.target.value)}
                              placeholder="Nombre del acompañante o acudiente"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Teléfono del responsable</label>
                            <input
                              type="tel"
                              value={form.contacto_responsable_telefono}
                              onChange={e => handleChange('contacto_responsable_telefono', e.target.value)}
                              placeholder="(Opcional)"
                            />
                          </div>
                        </div>
                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Motivo de consulta <span>*</span></label>
                          <textarea
                            rows={3}
                            value={form.motivo_consulta}
                            onChange={e => handleChange('motivo_consulta', e.target.value)}
                            placeholder="Describir en las propias palabras del paciente el motivo de la consulta…"
                          />
                        </div>
                      </div>
                    )}

                    {/* PASO 2 — Anamnesis */}
                    {paso === 2 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo">
                          <span className="mhc-seccion__num">2</span>
                          Anamnesis
                        </h3>
                        <div className="mhc-campo">
                          <label>Enfermedad actual</label>
                          <textarea
                            rows={4}
                            value={form.anamnesis}
                            onChange={e => handleChange('anamnesis', e.target.value)}
                            placeholder="Redacción cronológica y técnica de la evolución de los síntomas…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Antecedentes patológicos</label>
                          <textarea
                            rows={2}
                            value={form.antecedentes_patologicos}
                            onChange={e => handleChange('antecedentes_patologicos', e.target.value)}
                            placeholder="HTA, DM, EPOC, asma, enfermedades crónicas previas…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Antecedentes quirúrgicos</label>
                          <textarea
                            rows={2}
                            value={form.antecedentes_quirurgicos}
                            onChange={e => handleChange('antecedentes_quirurgicos', e.target.value)}
                            placeholder="Cirugías previas, procedimientos invasivos…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Antecedentes alérgicos / farmacológicos</label>
                          <textarea
                            rows={2}
                            value={form.antecedentes_alergicos}
                            onChange={e => handleChange('antecedentes_alergicos', e.target.value)}
                            placeholder="Alergias a medicamentos, alimentos, materiales…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Antecedentes familiares</label>
                          <textarea
                            rows={2}
                            value={form.antecedentes_familiares}
                            onChange={e => handleChange('antecedentes_familiares', e.target.value)}
                            placeholder="Enfermedades hereditarias, cardiopatías, cáncer familiar…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Antecedentes ginecoobstétricos (si aplica)</label>
                          <textarea
                            rows={2}
                            value={form.antecedentes_ginecoobstetricos}
                            onChange={e => handleChange('antecedentes_ginecoobstetricos', e.target.value)}
                            placeholder="G: P: A: C:  / Fecha de última menstruación / Anticonceptivos…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Hábitos</label>
                          <textarea
                            rows={2}
                            value={form.habitos}
                            onChange={e => handleChange('habitos', e.target.value)}
                            placeholder="Tabaquismo, alcohol, sustancias, actividad física, alimentación…"
                          />
                        </div>
                      </div>
                    )}

                    {/* PASO 3 — Examen físico */}
                    {paso === 3 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo">
                          <span className="mhc-seccion__num">3</span>
                          Examen Físico
                        </h3>
                        <p className="mhc-seccion__sub">Signos vitales</p>
                        <div className="mhc-grid-signos">
                          <div className="mhc-campo">
                            <label>TA Sistólica (mmHg)</label>
                            <input type="number" min="0" max="300"
                              value={form.tension_arterial_sistolica}
                              onChange={e => handleChange('tension_arterial_sistolica', e.target.value)}
                              placeholder="Ej: 120"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>TA Diastólica (mmHg)</label>
                            <input type="number" min="0" max="200"
                              value={form.tension_arterial_diastolica}
                              onChange={e => handleChange('tension_arterial_diastolica', e.target.value)}
                              placeholder="Ej: 80"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Frec. Cardíaca (lpm)</label>
                            <input type="number" min="0" max="300"
                              value={form.frecuencia_cardiaca}
                              onChange={e => handleChange('frecuencia_cardiaca', e.target.value)}
                              placeholder="Ej: 72"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Frec. Respiratoria (rpm)</label>
                            <input type="number" min="0" max="60"
                              value={form.frecuencia_respiratoria}
                              onChange={e => handleChange('frecuencia_respiratoria', e.target.value)}
                              placeholder="Ej: 18"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Temperatura (°C)</label>
                            <input type="number" step="0.1" min="30" max="45"
                              value={form.temperatura_corporal}
                              onChange={e => handleChange('temperatura_corporal', e.target.value)}
                              placeholder="Ej: 36.5"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Peso (kg)</label>
                            <input type="number" step="0.1" min="0"
                              value={form.peso_kg}
                              onChange={e => handleChange('peso_kg', e.target.value)}
                              placeholder="Ej: 70"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Talla (cm)</label>
                            <input type="number" min="0"
                              value={form.talla_cm}
                              onChange={e => handleChange('talla_cm', e.target.value)}
                              placeholder="Ej: 170"
                            />
                          </div>
                          <div className="mhc-campo mhc-campo--imc">
                            <label>IMC (calculado)</label>
                            <div className="mhc-imc-display">
                              {imcCalculado() ? (
                                <span className="mhc-imc-valor">{imcCalculado()} kg/m²</span>
                              ) : (
                                <span className="mhc-imc-vacio">Ingresa peso y talla</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mhc-campo">
                          <label>Exploración por sistemas</label>
                          <textarea
                            rows={4}
                            value={form.exploracion_por_sistemas}
                            onChange={e => handleChange('exploracion_por_sistemas', e.target.value)}
                            placeholder="Cardiovascular: / Respiratorio: / Neurológico: / Abdomen: / Extremidades: …"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Hallazgos adicionales</label>
                          <textarea
                            rows={2}
                            value={form.examen_fisico}
                            onChange={e => handleChange('examen_fisico', e.target.value)}
                            placeholder="Otros hallazgos relevantes al examen físico…"
                          />
                        </div>
                      </div>
                    )}

                    {/* PASO 4 — Diagnóstico CIE-10 */}
                    {paso === 4 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo">
                          <span className="mhc-seccion__num">4</span>
                          Juicio Clínico — Diagnóstico CIE-10
                        </h3>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo">
                            <label>Código CIE-10</label>
                            <input
                              type="text"
                              value={form.diagnostico_cie10}
                              onChange={e => handleChange('diagnostico_cie10', e.target.value.toUpperCase())}
                              placeholder="Ej: J06.9, I10, E11.9…"
                              maxLength={10}
                            />
                          </div>
                        </div>
                        <div className="mhc-campo">
                          <label>Descripción del diagnóstico</label>
                          <textarea
                            rows={4}
                            value={form.descripcion_diagnostico}
                            onChange={e => handleChange('descripcion_diagnostico', e.target.value)}
                            placeholder="Descripción clínica completa del diagnóstico, si es impresión diagnóstica o confirmado…"
                          />
                        </div>
                      </div>
                    )}

                    {/* PASO 5 — Plan de manejo */}
                    {paso === 5 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo">
                          <span className="mhc-seccion__num">5</span>
                          Plan de Manejo / Conducta
                        </h3>
                        <div className="mhc-campo">
                          <label>Plan de tratamiento general</label>
                          <textarea
                            rows={3}
                            value={form.plan_tratamiento}
                            onChange={e => handleChange('plan_tratamiento', e.target.value)}
                            placeholder="Conducta terapéutica general, remisiones, seguimiento…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>💊 Fórmula médica (medicamentos)</label>
                          <textarea
                            rows={4}
                            value={form.medicamentos_recetados}
                            onChange={e => handleChange('medicamentos_recetados', e.target.value)}
                            placeholder="Principio activo – Presentación – Dosis – Vía – Frecuencia – Duración&#10;Ej: Ibuprofeno 400mg VO cada 8 horas por 5 días&#10;Metformina 500mg VO con las comidas por 30 días"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>🔬 Órdenes médicas (laboratorios / imágenes)</label>
                          <textarea
                            rows={3}
                            value={form.ordenes_medicas}
                            onChange={e => handleChange('ordenes_medicas', e.target.value)}
                            placeholder="Hemograma completo, glicemia en ayunas, radiografía de tórax PA y lateral…"
                          />
                        </div>
                        <div className="mhc-campo">
                          <label>Recomendaciones y signos de alarma</label>
                          <textarea
                            rows={3}
                            value={form.recomendaciones}
                            onChange={e => handleChange('recomendaciones', e.target.value)}
                            placeholder="Indicaciones al paciente, signos de alarma para consultar urgencias, control médico en…"
                          />
                        </div>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo">
                            <label>Días de incapacidad</label>
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={form.incapacidad_dias}
                              onChange={e => handleChange('incapacidad_dias', e.target.value)}
                              placeholder="0 (sin incapacidad)"
                            />
                          </div>
                        </div>
                        <div className="mhc-campo">
                          <label>Observaciones adicionales</label>
                          <textarea
                            rows={2}
                            value={form.observaciones}
                            onChange={e => handleChange('observaciones', e.target.value)}
                            placeholder="Anotaciones adicionales relevantes para el expediente…"
                          />
                        </div>
                      </div>
                    )}

                    {/* PASO 6 — Cierre legal */}
                    {paso === 6 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo">
                          <span className="mhc-seccion__num">6</span>
                          Cierre Legal — Firma del Médico
                        </h3>
                        <p className="mhc-seccion__sub">
                          Estos datos se plasmarán en el pie de firma del documento PDF.
                          Si los dejas vacíos, se usarán los datos del perfil del médico autenticado.
                        </p>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo">
                            <label>Nombre completo del médico firmante</label>
                            <input
                              type="text"
                              value={form.medico_nombre_firma}
                              onChange={e => handleChange('medico_nombre_firma', e.target.value)}
                              placeholder="Dr(a). Nombre Apellido"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Cédula profesional</label>
                            <input
                              type="text"
                              value={form.medico_cedula_firma}
                              onChange={e => handleChange('medico_cedula_firma', e.target.value)}
                              placeholder="Número de cédula"
                            />
                          </div>
                          <div className="mhc-campo">
                            <label>Número de registro ReTHUS</label>
                            <input
                              type="text"
                              value={form.medico_rethus_firma}
                              onChange={e => handleChange('medico_rethus_firma', e.target.value)}
                              placeholder="Ej: RETHUS-xxxxxxxx"
                            />
                          </div>
                        </div>

                        {/* Resumen de lo que se va a guardar */}
                        <div className="mhc-resumen-legal">
                          <p className="mhc-resumen-legal__titulo">📋 Resumen del registro</p>
                          <div className="mhc-resumen-legal__items">
                            <span className={form.motivo_consulta ? 'ok' : 'faltante'}>
                              {form.motivo_consulta ? '✓' : '✗'} Motivo de consulta
                            </span>
                            <span className={form.anamnesis ? 'ok' : 'opcional'}>
                              {form.anamnesis ? '✓' : '○'} Anamnesis
                            </span>
                            <span className={form.diagnostico_cie10 ? 'ok' : 'opcional'}>
                              {form.diagnostico_cie10 ? '✓' : '○'} Diagnóstico CIE-10
                            </span>
                            <span className={form.plan_tratamiento || form.medicamentos_recetados ? 'ok' : 'opcional'}>
                              {form.plan_tratamiento || form.medicamentos_recetados ? '✓' : '○'} Plan de manejo
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Navegación del wizard */}
                  <div className="mhc-nav">
                    <button
                      className="mhc-btn mhc-btn--ghost"
                      onClick={modoAclaracion ? cancelarAclaracion : onCerrar}
                    >
                      {modoAclaracion ? 'Cancelar aclaración' : 'Cancelar'}
                    </button>
                    <div className="mhc-nav__pasos">
                      {paso > 1 && (
                        <button className="mhc-btn mhc-btn--secundario" onClick={pasoAnterior}>
                          ← Anterior
                        </button>
                      )}
                      {paso < TOTAL_PASOS ? (
                        <button className="mhc-btn mhc-btn--primary" onClick={pasoSiguiente}>
                          Siguiente →
                        </button>
                      ) : (
                        <button
                          className="mhc-btn mhc-btn--guardar"
                          onClick={handleGuardar}
                          disabled={guardando}
                        >
                          {guardando ? 'Guardando…' : modoAclaracion ? '✓ Guardar aclaración' : '✓ Guardar historia'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── VISTA: solo lectura ────────────────────────── */}
              {!modoEdicion && !modoAclaracion && historia && (
                <div className="mhc-vista">
                  <VistaHistoria historia={historia} />

                  {/* Aclaraciones */}
                  {aclaraciones.length > 0 && (
                    <div className="mhc-aclaraciones">
                      <h3 className="mhc-aclaraciones__titulo">
                        Notas de aclaración y evolución ({aclaraciones.length})
                      </h3>
                      {aclaraciones.map((ac, i) => (
                        <div key={ac.id} className="mhc-aclaracion-item">
                          <div className="mhc-aclaracion-item__header">
                            <span className="mhc-aclaracion-item__num">
                              {ac.tipo_registro === 'nota_evolucion' ? '📈 Nota de evolución' : '📝 Aclaración'} #{i + 1}
                            </span>
                            <span className="mhc-aclaracion-item__fecha">
                              {new Date(ac.created_at).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'long', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {ac.motivo_consulta && (
                            <p className="mhc-aclaracion-item__texto">{ac.motivo_consulta}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botón de aclaración (solo médico autor) */}
                  {puedeEditarOAclarar && (
                    <div className="mhc-acciones-vista">
                      <button className="mhc-btn mhc-btn--aclaracion" onClick={iniciarAclaracion}>
                        + Agregar nota de aclaración / evolución
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── VISTA: sin historia (paciente) ────────────── */}
              {!modoEdicion && !historia && !esMedico && (
                <div className="mhc-vacio">
                  <span>📭</span>
                  <p>Aún no hay historia clínica registrada para esta consulta.</p>
                </div>
              )}

              {/* Mensaje de error */}
              {error && <div className="mhc-error">{error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vista de solo lectura de la historia ─────────────────────────────────────
function VistaHistoria({ historia }) {
  function campo(etiqueta, valor) {
    return valor ? (
      <div className="mhc-vista-campo">
        <span className="mhc-vista-campo__etiqueta">{etiqueta}</span>
        <span className="mhc-vista-campo__valor">{valor}</span>
      </div>
    ) : null;
  }

  let medicamentosTexto = '';
  if (historia.medicamentos_recetados) {
    if (typeof historia.medicamentos_recetados === 'string') {
      medicamentosTexto = historia.medicamentos_recetados;
    } else if (historia.medicamentos_recetados?.texto) {
      medicamentosTexto = historia.medicamentos_recetados.texto;
    }
  }

  return (
    <div className="mhc-vista-historia">
      <div className="mhc-vista-seccion">
        <h4>1. Motivo de consulta</h4>
        <p>{historia.motivo_consulta}</p>
      </div>
      {historia.anamnesis && (
        <div className="mhc-vista-seccion">
          <h4>Enfermedad actual</h4>
          <p>{historia.anamnesis}</p>
        </div>
      )}
      <div className="mhc-vista-seccion">
        <h4>3. Signos vitales</h4>
        <div className="mhc-signos-row">
          {campo('TA', historia.tension_arterial_sistolica
            ? `${historia.tension_arterial_sistolica}/${historia.tension_arterial_diastolica} mmHg`
            : null)}
          {campo('FC', historia.frecuencia_cardiaca ? `${historia.frecuencia_cardiaca} lpm` : null)}
          {campo('FR', historia.frecuencia_respiratoria ? `${historia.frecuencia_respiratoria} rpm` : null)}
          {campo('Temp.', historia.temperatura_corporal ? `${historia.temperatura_corporal} °C` : null)}
          {campo('Peso', historia.peso_kg ? `${historia.peso_kg} kg` : null)}
          {campo('Talla', historia.talla_cm ? `${historia.talla_cm} cm` : null)}
          {campo('IMC', historia.imc ? historia.imc.toFixed(1) : null)}
        </div>
        {historia.exploracion_por_sistemas && (
          <p className="mhc-vista-seccion__texto">{historia.exploracion_por_sistemas}</p>
        )}
      </div>
      {historia.diagnostico_cie10 && (
        <div className="mhc-vista-seccion mhc-vista-seccion--diagnostico">
          <h4>4. Diagnóstico CIE-10</h4>
          <div className="mhc-cie10-badge">
            <strong>{historia.diagnostico_cie10}</strong>
            {historia.descripcion_diagnostico && <p>{historia.descripcion_diagnostico}</p>}
          </div>
        </div>
      )}
      {(historia.plan_tratamiento || medicamentosTexto || historia.ordenes_medicas || historia.recomendaciones) && (
        <div className="mhc-vista-seccion">
          <h4>5. Plan de manejo</h4>
          {campo('Plan de tratamiento', historia.plan_tratamiento)}
          {campo('Medicamentos', medicamentosTexto)}
          {campo('Órdenes médicas', historia.ordenes_medicas)}
          {campo('Recomendaciones', historia.recomendaciones)}
          {historia.incapacidad_dias > 0 && (
            <div className="mhc-incapacidad-badge">
              ⚕ Incapacidad: {historia.incapacidad_dias} día(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}