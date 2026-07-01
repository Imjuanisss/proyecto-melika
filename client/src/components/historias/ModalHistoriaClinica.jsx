// client/src/components/historias/ModalHistoriaClinica.jsx
// MELIKA — Modal de creación/visualización/aclaración de Historia Clínica
// Incluye validación profesional end-to-end por paso, al guardar, Y AHORA
// TAMBIÉN validación EN TIEMPO REAL por campo individual: cada campo se
// valida apenas el médico escribe/cambia su valor, mostrando el error de
// inmediato debajo del campo y bloqueando "Siguiente"/"Guardar todo" hasta
// que el paso actual esté correctamente diligenciado. Ya no es posible
// llegar al final del formulario y enterarse ahí de que algo falta.

import { useState, useEffect, useMemo } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useAuth } from '../../context/AuthContext';
import { api }    from '../../lib/apiClient';
import { PlantillaHistoriaPDF, PlantillaFormulaPDF, PlantillaExamenesPDF } from './PlantillaHistoriaPDF';
import './ModalHistoriaClinica.css';

const FORM_INICIAL = {
  eps_aseguradora:              '',
  contacto_responsable_nombre:  '',
  contacto_responsable_telefono:'',
  motivo_consulta:              '',
  anamnesis:                    '',
  antecedentes_patologicos:     '',
  antecedentes_quirurgicos:     '',
  antecedentes_alergicos:       '',
  antecedentes_familiares:      '',
  antecedentes_ginecoobstetricos: '',
  habitos:                      '',
  tension_arterial_sistolica:   '',
  tension_arterial_diastolica:  '',
  frecuencia_cardiaca:          '',
  frecuencia_respiratoria:      '',
  temperatura_corporal:         '',
  peso_kg:                      '',
  talla_cm:                     '',
  exploracion_por_sistemas:     '',
  examen_fisico:                '',
  diagnostico_cie10:            '',
  descripcion_diagnostico:      '',
  plan_tratamiento:             '',
  medicamentos_recetados:       '',
  ordenes_medicas:              '',
  recomendaciones:              '',
  incapacidad_dias:             '',
  medico_nombre_firma:          '',
  medico_cedula_firma:          '',
  medico_rethus_firma:          '',
  observaciones:                '',
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN PROFESIONAL — debe reflejar exactamente las reglas del backend
// (server/src/utils/validacionesHistoria.js) para que el médico nunca llegue
// al servidor con una historia incompleta o clínicamente inconsistente.
// ─────────────────────────────────────────────────────────────────────────────
const REGEX_CIE10 = /^[A-Z][0-9]{2}(\.[0-9X]{1,2})?$/;

// Campos que se validan EN TIEMPO REAL (por campo) para cada paso.
// Se usa para: (1) decidir qué mostrar como error inline debajo del input
// apenas el usuario lo toca, y (2) decidir si el paso actual está "limpio"
// sin necesidad de esperar al clic en "Siguiente".
const CAMPOS_VALIDABLES_POR_PASO = {
  1: ['motivo_consulta'],
  2: ['anamnesis', 'antecedentes_patologicos', 'antecedentes_alergicos'],
  3: [
    'tension_arterial_sistolica', 'tension_arterial_diastolica',
    'frecuencia_cardiaca', 'temperatura_corporal', 'peso_kg', 'talla_cm',
    'examen_fisico',
  ],
  4: ['diagnostico_cie10', 'descripcion_diagnostico'],
  5: ['plan_tratamiento'],
  6: ['medico_nombre_firma', 'medico_rethus_firma'],
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN EN TIEMPO REAL — POR CAMPO INDIVIDUAL
// Se ejecuta en cada cambio del campo para dar feedback inmediato al médico,
// ANTES de que intente avanzar de paso o guardar. Complementa (no reemplaza)
// validarPaso/validarFormularioCompleto, que siguen siendo la última barrera
// antes de avanzar de paso o persistir en el backend.
// ─────────────────────────────────────────────────────────────────────────────
function validarCampoUnico(campo, valorCrudo, form, esTeleconsulta) {
  const v = (valorCrudo ?? '').toString();
  const vTrim = v.trim();

  switch (campo) {
    case 'motivo_consulta':
      if (!vTrim) return 'El motivo de consulta es obligatorio.';
      return null;

    case 'anamnesis':
      if (!vTrim) return 'La enfermedad actual (anamnesis) es obligatoria.';
      return null;

    case 'antecedentes_patologicos':
      if (!vTrim) return 'Obligatorio. Escriba "Niega" si no aplica.';
      return null;

    case 'antecedentes_alergicos':
      if (!vTrim) return 'Obligatorio. Escriba "Niega" si no aplica.';
      return null;

    case 'tension_arterial_sistolica':
    case 'tension_arterial_diastolica': {
      const sis = (form.tension_arterial_sistolica ?? '').toString();
      const dia = (form.tension_arterial_diastolica ?? '').toString();
      if ((sis && !dia) || (!sis && dia)) {
        return 'Debe registrar sistólica y diastólica juntas.';
      }
      if (!esTeleconsulta && !v) return 'Obligatoria en consulta presencial.';
      return null;
    }

    case 'frecuencia_cardiaca':
      if (!esTeleconsulta && !v) return 'Obligatoria en consulta presencial.';
      return null;

    case 'temperatura_corporal':
      if (!esTeleconsulta && !v) return 'Obligatoria en consulta presencial.';
      return null;

    case 'peso_kg':
      if (!esTeleconsulta && !v) return 'Obligatorio en consulta presencial.';
      return null;

    case 'talla_cm':
      if (!esTeleconsulta && !v) return 'Obligatoria en consulta presencial.';
      return null;

    case 'examen_fisico':
      if (!vTrim) return 'Los hallazgos del examen físico son obligatorios.';
      return null;

    case 'diagnostico_cie10':
      if (!vTrim) return 'El código CIE-10 es obligatorio.';
      if (!REGEX_CIE10.test(vTrim.toUpperCase())) return 'Formato inválido (ej. J06.9).';
      return null;

    case 'descripcion_diagnostico':
      if (!vTrim) return 'La descripción del diagnóstico es obligatoria.';
      return null;

    case 'plan_tratamiento':
      if (!vTrim) return 'El plan de tratamiento es obligatorio.';
      return null;

    case 'medico_nombre_firma':
      if (!vTrim) return 'El nombre del médico firmante es obligatorio.';
      return null;

    case 'medico_rethus_firma':
      if (!vTrim) return 'El registro ReTHUS es obligatorio.';
      return null;

    default:
      return null;
  }
}

function validarPaso(numeroPaso, form, recetas, examenes, esTeleconsulta) {
  const errores = [];

  if (numeroPaso === 1) {
    if (!form.motivo_consulta.trim()) errores.push('El motivo de consulta es obligatorio.');
  }

  if (numeroPaso === 2) {
    if (!form.anamnesis.trim())
      errores.push('La enfermedad actual (anamnesis) es obligatoria.');
    if (!form.antecedentes_patologicos.trim())
      errores.push('Los antecedentes patológicos son obligatorios (use "Niega" si no aplica).');
    if (!form.antecedentes_alergicos.trim())
      errores.push('Los antecedentes alérgicos son obligatorios (use "Niega" si no aplica).');
  }

  if (numeroPaso === 3) {
    const tSis = form.tension_arterial_sistolica;
    const tDia = form.tension_arterial_diastolica;
    if ((tSis && !tDia) || (!tSis && tDia)) {
      errores.push('La tensión arterial debe registrarse completa (sistólica y diastólica).');
    }
    if (!esTeleconsulta) {
      if (!tSis || !tDia) errores.push('La tensión arterial es obligatoria en consultas presenciales.');
      if (!form.frecuencia_cardiaca)  errores.push('La frecuencia cardíaca es obligatoria en consultas presenciales.');
      if (!form.temperatura_corporal) errores.push('La temperatura corporal es obligatoria en consultas presenciales.');
      if (!form.peso_kg)              errores.push('El peso es obligatorio en consultas presenciales.');
      if (!form.talla_cm)             errores.push('La talla es obligatoria en consultas presenciales.');
    }
    if (!form.examen_fisico.trim())
      errores.push('Los hallazgos del examen físico son obligatorios.');
  }

  if (numeroPaso === 4) {
    if (!form.diagnostico_cie10.trim()) {
      errores.push('El código CIE-10 es obligatorio.');
    } else if (!REGEX_CIE10.test(form.diagnostico_cie10.trim().toUpperCase())) {
      errores.push('El código CIE-10 no tiene un formato válido (ej. J06.9).');
    }
    if (!form.descripcion_diagnostico.trim())
      errores.push('La descripción del diagnóstico es obligatoria.');
  }

  if (numeroPaso === 5) {
    if (!form.plan_tratamiento.trim())
      errores.push('El plan de tratamiento general es obligatorio.');
    recetas.forEach((r, i) => {
      if (!r.medicamento?.trim() || !r.dosis?.trim() || !r.frecuencia?.trim() || !r.duracion?.trim()) {
        errores.push(`Fórmula #${i + 1}: complete medicamento, dosis, frecuencia y duración, o elimínela.`);
      }
    });
    examenes.forEach((ex, i) => {
      if (!ex.nombre_examen?.trim()) {
        errores.push(`Examen #${i + 1}: el nombre del examen es obligatorio, o elimínelo.`);
      }
    });
    const dias = parseInt(form.incapacidad_dias, 10);
    if (dias > 0 && !form.diagnostico_cie10.trim()) {
      errores.push('No se puede otorgar incapacidad sin un diagnóstico CIE-10 registrado.');
    }
  }

  if (numeroPaso === 6) {
    if (!form.medico_nombre_firma.trim())
      errores.push('El nombre del médico firmante es obligatorio.');
    if (!form.medico_rethus_firma.trim())
      errores.push('El número de registro ReTHUS es obligatorio para el cierre legal.');
  }

  return errores;
}

function validarFormularioCompleto(form, recetas, examenes, esTeleconsulta) {
  let todos = [];
  for (let p = 1; p <= 6; p++) {
    todos = todos.concat(validarPaso(p, form, recetas, examenes, esTeleconsulta));
  }
  return [...new Set(todos)];
}

export default function ModalHistoriaClinica({ cita, onCerrar, onGuardada }) {
  const { usuario } = useAuth();
  const esMedico    = usuario?.rol === 'medico';
  const esTeleconsulta = cita?.tipo_consulta === 'teleconsulta';

  const [historia,      setHistoria]      = useState(null);
  const [aclaraciones,  setAclaraciones]  = useState([]);
  const [historiaFull,  setHistoriaFull]  = useState(null);

  const [recetas, setRecetas] = useState([]);
  const [examenes, setExamenes] = useState([]);

  const [form,          setForm]          = useState(FORM_INICIAL);
  const [modoEdicion,   setModoEdicion]   = useState(false);
  const [modoAclaracion,setModoAclaracion]= useState(false);
  const [tipoRegistro,  setTipoRegistro]  = useState('nota_aclaracion');

  const [paso, setPaso] = useState(1);
  const TOTAL_PASOS = 6;

  const [loading,       setLoading]       = useState(true);
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState(null);
  const [erroresDetalle, setErroresDetalle] = useState([]);

  // ── Validación en tiempo real: qué campos ha "tocado" el médico ──────────
  // Un campo solo muestra su error inline DESPUÉS de que el usuario lo tocó
  // (cambió su valor) — así no se bombardea con errores rojos al abrir el
  // formulario vacío, pero sí apenas empieza a escribir algo incompleto.
  const [tocado, setTocado] = useState({});

  useEffect(() => {
    if (!cita?.id) return;
    setLoading(true);
    setError(null);

    api.get(`/historias/cita/${cita.id}`)
      .then(data => {
        const h = data.historia;
        setHistoria(h || null);
        setAclaraciones(data.aclaraciones || []);
        setRecetas(data.recetas || []);
        setExamenes(data.examenes || []);

        if (h) {
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
          setHistoriaFull(h);
        } else {
          setModoEdicion(true);
          setPaso(1);
        }
      })
      .catch(() => setError('No se pudo cargar la historia clínica.'))
      .finally(() => setLoading(false));
  }, [cita?.id]);

  // ── handleChange: actualiza el valor Y marca el campo como "tocado" ──────
  // Esto es lo que dispara la validación en tiempo real: apenas el campo
  // se marca como tocado, el mensaje de error (si existe) aparece de
  // inmediato debajo del input, sin esperar a que el médico haga clic en
  // "Siguiente" o "Guardar".
  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setTocado(prev => (prev[campo] ? prev : { ...prev, [campo]: true }));
  }

  // Marca un campo como tocado sin cambiar su valor — útil para onBlur en
  // selects, radios o campos que no pasan por handleChange directamente.
  function marcarTocado(campo) {
    setTocado(prev => (prev[campo] ? prev : { ...prev, [campo]: true }));
  }

  const agregarMedicamento = () => {
    setRecetas([...recetas, { medicamento: '', dosis: '', frecuencia: '', duracion: '', via_administracion: '', indicaciones: '' }]);
  };

  const eliminarMedicamento = (index) => {
    setRecetas(recetas.filter((_, i) => i !== index));
  };

  const handleRecetaChange = (index, campo, valor) => {
    const nuevas = [...recetas];
    nuevas[index][campo] = valor;
    setRecetas(nuevas);
  };

  const agregarExamen = () => {
    setExamenes([...examenes, { tipo_examen: 'Laboratorio', nombre_examen: '', justificacion_clinica: '' }]);
  };

  const eliminarExamen = (index) => {
    setExamenes(examenes.filter((_, i) => i !== index));
  };

  const handleExamenChange = (index, campo, valor) => {
    const nuevos = [...examenes];
    nuevos[index][campo] = valor;
    setExamenes(nuevos);
  };

  function imcCalculado() {
    const peso   = parseFloat(form.peso_kg);
    const talla  = parseFloat(form.talla_cm);
    if (!peso || !talla || talla === 0) return null;
    return (peso / ((talla / 100) ** 2)).toFixed(1);
  }

  function mostrarErrores(listaErrores, fallback) {
    setErroresDetalle(listaErrores);
    setError(listaErrores.length > 0 ? listaErrores.join(' ') : fallback);
  }

  // ── Errores en tiempo real del PASO ACTUAL (recalculados en cada render) ──
  // Se usan para: (a) pintar el mensaje inline bajo cada campo tocado, y
  // (b) desactivar "Siguiente"/"Guardar todo" mientras el paso no esté OK.
  const erroresCamposActuales = useMemo(() => {
    const campos = CAMPOS_VALIDABLES_POR_PASO[paso] || [];
    const mapa = {};
    campos.forEach(campo => {
      const msg = validarCampoUnico(campo, form[campo], form, esTeleconsulta);
      if (msg) mapa[campo] = msg;
    });
    return mapa;
  }, [paso, form, esTeleconsulta]);

  // Errores "oficiales" del paso (misma regla que usa el backend) — es la
  // fuente de verdad para bloquear la navegación, aunque el usuario aún no
  // haya tocado todos los campos (evita que combine campos sin tocar con
  // botón habilitado).
  const erroresPasoActualLive = useMemo(
    () => validarPaso(paso, form, recetas, examenes, esTeleconsulta),
    [paso, form, recetas, examenes, esTeleconsulta]
  );

  const erroresFormularioCompletoLive = useMemo(
    () => validarFormularioCompleto(form, recetas, examenes, esTeleconsulta),
    [form, recetas, examenes, esTeleconsulta]
  );

  // Pequeño helper de render: muestra el mensaje de error de un campo SOLO
  // si el médico ya lo tocó — feedback inmediato sin ensuciar el formulario
  // vacío al abrirlo.
  function renderErrorCampo(campo) {
    if (!tocado[campo] || !erroresCamposActuales[campo]) return null;
    return <small className="mhc-campo-error">⚠ {erroresCamposActuales[campo]}</small>;
  }

  function claseError(campo) {
    return tocado[campo] && erroresCamposActuales[campo] ? 'mhc-input-error' : '';
  }

  async function handleGuardar() {
    const errores = validarFormularioCompleto(form, recetas, examenes, esTeleconsulta);
    if (errores.length > 0) {
      mostrarErrores(errores);
      setPaso(1); // regresa al inicio para que el médico revise todo el flujo
      return;
    }

    setGuardando(true);
    setError(null);
    setErroresDetalle([]);

    try {
      if (modoAclaracion && historia) {
        const res = await api.post(`/historias/${historia.id}/aclaracion`, {
          ...form,
          tipo_registro: tipoRegistro,
          medicamentos_recetados: form.medicamentos_recetados || null,
          recetas,
          examenes,
        });
        setAclaraciones(prev => [...prev, res.aclaracion]);
        setModoAclaracion(false);
        if (onGuardada) onGuardada();
      } else if (!historia) {
        const res = await api.post('/historias', {
          ...form,
          id_cita: cita.id,
          medicamentos_recetados: form.medicamentos_recetados || null,
          recetas,
          examenes
        });
        setHistoria(res.historia);
        setModoEdicion(false);

        const full = await api.get(`/historias/cita/${cita.id}`);
        setHistoriaFull(full.historia);
        if (onGuardada) onGuardada(res.historia);
      }
    } catch (err) {
      const detalle = Array.isArray(err?.errores) ? err.errores : [];
      mostrarErrores(detalle, err.message || 'Error al guardar la historia clínica.');
      if (detalle.length > 0) setPaso(1);
    } finally {
      setGuardando(false);
    }
  }

  function pasoSiguiente() {
    // Marcar todos los campos validables del paso como "tocados" para que,
    // si por algún motivo el usuario llegó aquí con el botón habilitado por
    // error, vea inmediatamente cuáles campos fallan.
    const campos = CAMPOS_VALIDABLES_POR_PASO[paso] || [];
    setTocado(prev => {
      const nuevo = { ...prev };
      campos.forEach(c => { nuevo[c] = true; });
      return nuevo;
    });

    const errores = validarPaso(paso, form, recetas, examenes, esTeleconsulta);
    if (errores.length > 0) {
      mostrarErrores(errores);
      return;
    }
    setError(null);
    setErroresDetalle([]);
    setPaso(p => Math.min(p + 1, TOTAL_PASOS));
  }

  function pasoAnterior() {
    setError(null);
    setErroresDetalle([]);
    setPaso(p => Math.max(p - 1, 1));
  }

  function iniciarAclaracion() {
    setModoAclaracion(true);
    setForm(FORM_INICIAL);
    setRecetas([]);
    setExamenes([]);
    setPaso(1);
    setError(null);
    setErroresDetalle([]);
    setTocado({});
  }

  function cancelarAclaracion() {
    setModoAclaracion(false);
    setError(null);
    setErroresDetalle([]);
  }

  const puedeEditarOAclarar = esMedico && historia;

  // El paso actual tiene errores según la MISMA regla del backend →
  // esto es lo que realmente bloquea "Siguiente"/"Guardar todo".
  const pasoActualInvalido = erroresPasoActualLive.length > 0;
  const formularioCompletoInvalido = erroresFormularioCompletoLive.length > 0;

  return (
    <div className="mhc-overlay" role="dialog" aria-modal="true" aria-label="Historia Clínica">
      <div className="mhc-modal">
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
            {/* 1. Botón Historia */}
            {historiaFull && !modoEdicion && !modoAclaracion && (
              <PDFDownloadLink
                document={<PlantillaHistoriaPDF historia={historiaFull} aclaraciones={aclaraciones} />}
                fileName={`HC-${historiaFull.id}-${historiaFull.paciente_apellido}.pdf`}
                className="mhc-btn mhc-btn--pdf"
              >
                {({ loading: pdfLoading }) => pdfLoading ? 'Generando…' : '⬇ Historia PDF'}
              </PDFDownloadLink>
            )}

            {/* 2. Botón Fórmula */}
            {historiaFull && recetas.length > 0 && !modoEdicion && !modoAclaracion && (
              <PDFDownloadLink
                document={<PlantillaFormulaPDF historia={historiaFull} recetas={recetas} />}
                fileName={`Formula-${historiaFull.id}-${historiaFull.paciente_apellido}.pdf`}
                className="mhc-btn mhc-btn--formula"
              >
                {({ loading: pdfLoading }) => pdfLoading ? 'Generando…' : '💊 Fórmula PDF'}
              </PDFDownloadLink>
            )}

            {/* 3. Botón Exámenes */}
            {historiaFull && examenes.length > 0 && !modoEdicion && !modoAclaracion && (
              <PDFDownloadLink
                document={<PlantillaExamenesPDF historia={historiaFull} examenes={examenes} />}
                fileName={`Examenes-${historiaFull.id}-${historiaFull.paciente_apellido}.pdf`}
                className="mhc-btn mhc-btn--formula"
                style={{ backgroundColor: '#059669', color: 'white' }}
              >
                {({ loading: pdfLoading }) => pdfLoading ? 'Generando…' : '🔬 Órdenes PDF'}
              </PDFDownloadLink>
            )}

            <button className="mhc-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div className="mhc-cuerpo">
          {loading ? (
            <div className="mhc-loading">
              <div className="mhc-spinner" />
              <p>Cargando historia clínica…</p>
            </div>
          ) : (
            <>
              {aclaraciones.length > 0 && !modoEdicion && !modoAclaracion && (
                <div className="mhc-alerta-aclaraciones">
                  <span>ℹ</span> Esta historia tiene {aclaraciones.length} nota(s) de aclaración registradas.
                </div>
              )}

              {modoAclaracion && (
                <div className="mhc-tipo-aclaracion">
                  <label className="mhc-tipo-aclaracion__label">Tipo de nota:</label>
                  <div className="mhc-tipo-aclaracion__opciones">
                    <button className={`mhc-tipo-btn ${tipoRegistro === 'nota_aclaracion' ? 'mhc-tipo-btn--activo' : ''}`} onClick={() => setTipoRegistro('nota_aclaracion')}>Aclaración / Corrección</button>
                    <button className={`mhc-tipo-btn ${tipoRegistro === 'nota_evolucion' ? 'mhc-tipo-btn--activo' : ''}`} onClick={() => setTipoRegistro('nota_evolucion')}>Nota de Evolución</button>
                  </div>
                </div>
              )}

              {(modoEdicion || modoAclaracion) && (
                <>
                  <div className="mhc-pasos">
                    {Array.from({ length: TOTAL_PASOS }, (_, i) => i + 1).map(n => (
                      <div key={n} className={`mhc-paso-dot ${n === paso ? 'mhc-paso-dot--activo' : ''} ${n < paso ? 'mhc-paso-dot--completado' : ''}`}>
                        <span>{n}</span>
                        <small>{n === 1 && 'Admin'}{n === 2 && 'Anamnesis'}{n === 3 && 'Físico'}{n === 4 && 'Diagnóstico'}{n === 5 && 'Plan'}{n === 6 && 'Cierre'}</small>
                      </div>
                    ))}
                  </div>

                  <div className="mhc-form">
                    {paso === 1 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo"><span className="mhc-seccion__num">1</span>Identificación Administrativa</h3>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo"><label>EPS / Aseguradora</label><input type="text" value={form.eps_aseguradora} onChange={e => handleChange('eps_aseguradora', e.target.value)} placeholder="Ej: Sura…" /></div>
                          <div className="mhc-campo"><label>Nombre del responsable</label><input type="text" value={form.contacto_responsable_nombre} onChange={e => handleChange('contacto_responsable_nombre', e.target.value)} placeholder="Acompañante" /></div>
                          <div className="mhc-campo"><label>Teléfono del responsable</label><input type="tel" value={form.contacto_responsable_telefono} onChange={e => handleChange('contacto_responsable_telefono', e.target.value)} /></div>
                        </div>
                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Motivo de consulta <span>*</span></label>
                          <textarea
                            className={claseError('motivo_consulta')}
                            rows={3}
                            value={form.motivo_consulta}
                            onChange={e => handleChange('motivo_consulta', e.target.value)}
                            onBlur={() => marcarTocado('motivo_consulta')}
                            placeholder="Palabras del paciente…"
                          />
                          {renderErrorCampo('motivo_consulta')}
                        </div>
                      </div>
                    )}

                    {paso === 2 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo"><span className="mhc-seccion__num">2</span>Anamnesis</h3>
                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Enfermedad actual <span>*</span></label>
                          <textarea
                            className={claseError('anamnesis')}
                            rows={4}
                            value={form.anamnesis}
                            onChange={e => handleChange('anamnesis', e.target.value)}
                            onBlur={() => marcarTocado('anamnesis')}
                          />
                          {renderErrorCampo('anamnesis')}
                        </div>
                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Antecedentes patológicos <span>*</span></label>
                          <textarea
                            className={claseError('antecedentes_patologicos')}
                            rows={2}
                            value={form.antecedentes_patologicos}
                            onChange={e => handleChange('antecedentes_patologicos', e.target.value)}
                            onBlur={() => marcarTocado('antecedentes_patologicos')}
                            placeholder='Escriba "Niega" si no aplica'
                          />
                          {renderErrorCampo('antecedentes_patologicos')}
                        </div>
                        <div className="mhc-campo"><label>Antecedentes quirúrgicos</label><textarea rows={2} value={form.antecedentes_quirurgicos} onChange={e => handleChange('antecedentes_quirurgicos', e.target.value)} /></div>
                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Antecedentes alérgicos <span>*</span></label>
                          <textarea
                            className={claseError('antecedentes_alergicos')}
                            rows={2}
                            value={form.antecedentes_alergicos}
                            onChange={e => handleChange('antecedentes_alergicos', e.target.value)}
                            onBlur={() => marcarTocado('antecedentes_alergicos')}
                            placeholder='Escriba "Niega" si no aplica'
                          />
                          {renderErrorCampo('antecedentes_alergicos')}
                        </div>
                        <div className="mhc-campo"><label>Antecedentes familiares</label><textarea rows={2} value={form.antecedentes_familiares} onChange={e => handleChange('antecedentes_familiares', e.target.value)} /></div>
                        <div className="mhc-campo"><label>Antecedentes ginecoobstétricos</label><textarea rows={2} value={form.antecedentes_ginecoobstetricos} onChange={e => handleChange('antecedentes_ginecoobstetricos', e.target.value)} /></div>
                        <div className="mhc-campo"><label>Hábitos</label><textarea rows={2} value={form.habitos} onChange={e => handleChange('habitos', e.target.value)} /></div>
                      </div>
                    )}

                    {paso === 3 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo"><span className="mhc-seccion__num">3</span>Examen Físico {esTeleconsulta && <small style={{ fontWeight: 400, fontSize: '0.7rem', color: '#94a3b8' }}>(teleconsulta — signos vitales opcionales)</small>}</h3>
                        <div className="mhc-grid-signos">
                          <div className="mhc-campo">
                            <label>TA Sistólica {!esTeleconsulta && <span style={{color:'#E8856A'}}>*</span>}</label>
                            <input
                              className={claseError('tension_arterial_sistolica')}
                              type="number" min="50" max="250"
                              value={form.tension_arterial_sistolica}
                              onChange={e => handleChange('tension_arterial_sistolica', e.target.value)}
                              onBlur={() => marcarTocado('tension_arterial_sistolica')}
                            />
                            {renderErrorCampo('tension_arterial_sistolica')}
                          </div>
                          <div className="mhc-campo">
                            <label>TA Diastólica {!esTeleconsulta && <span style={{color:'#E8856A'}}>*</span>}</label>
                            <input
                              className={claseError('tension_arterial_diastolica')}
                              type="number" min="30" max="150"
                              value={form.tension_arterial_diastolica}
                              onChange={e => handleChange('tension_arterial_diastolica', e.target.value)}
                              onBlur={() => marcarTocado('tension_arterial_diastolica')}
                            />
                            {renderErrorCampo('tension_arterial_diastolica')}
                          </div>
                          <div className="mhc-campo">
                            <label>FC (lpm) {!esTeleconsulta && <span style={{color:'#E8856A'}}>*</span>}</label>
                            <input
                              className={claseError('frecuencia_cardiaca')}
                              type="number" min="20" max="250"
                              value={form.frecuencia_cardiaca}
                              onChange={e => handleChange('frecuencia_cardiaca', e.target.value)}
                              onBlur={() => marcarTocado('frecuencia_cardiaca')}
                            />
                            {renderErrorCampo('frecuencia_cardiaca')}
                          </div>
                          <div className="mhc-campo"><label>FR (rpm)</label><input type="number" min="5" max="60" value={form.frecuencia_respiratoria} onChange={e => handleChange('frecuencia_respiratoria', e.target.value)} /></div>
                          <div className="mhc-campo">
                            <label>Temp (°C) {!esTeleconsulta && <span style={{color:'#E8856A'}}>*</span>}</label>
                            <input
                              className={claseError('temperatura_corporal')}
                              type="number" min="30" max="43" step="0.1"
                              value={form.temperatura_corporal}
                              onChange={e => handleChange('temperatura_corporal', e.target.value)}
                              onBlur={() => marcarTocado('temperatura_corporal')}
                            />
                            {renderErrorCampo('temperatura_corporal')}
                          </div>
                          <div className="mhc-campo">
                            <label>Peso (kg) {!esTeleconsulta && <span style={{color:'#E8856A'}}>*</span>}</label>
                            <input
                              className={claseError('peso_kg')}
                              type="number" min="1" max="300" step="0.1"
                              value={form.peso_kg}
                              onChange={e => handleChange('peso_kg', e.target.value)}
                              onBlur={() => marcarTocado('peso_kg')}
                            />
                            {renderErrorCampo('peso_kg')}
                          </div>
                          <div className="mhc-campo">
                            <label>Talla (cm) {!esTeleconsulta && <span style={{color:'#E8856A'}}>*</span>}</label>
                            <input
                              className={claseError('talla_cm')}
                              type="number" min="30" max="250"
                              value={form.talla_cm}
                              onChange={e => handleChange('talla_cm', e.target.value)}
                              onBlur={() => marcarTocado('talla_cm')}
                            />
                            {renderErrorCampo('talla_cm')}
                          </div>
                          <div className="mhc-campo mhc-campo--imc"><label>IMC</label><div className="mhc-imc-display">{imcCalculado() ? <span className="mhc-imc-valor">{imcCalculado()} kg/m²</span> : <span className="mhc-imc-vacio">Calculando…</span>}</div></div>
                        </div>
                        <div className="mhc-campo"><label>Exploración por sistemas</label><textarea rows={3} value={form.exploracion_por_sistemas} onChange={e => handleChange('exploracion_por_sistemas', e.target.value)} /></div>
                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Hallazgos adicionales <span>*</span></label>
                          <textarea
                            className={claseError('examen_fisico')}
                            rows={2}
                            value={form.examen_fisico}
                            onChange={e => handleChange('examen_fisico', e.target.value)}
                            onBlur={() => marcarTocado('examen_fisico')}
                          />
                          {renderErrorCampo('examen_fisico')}
                        </div>
                      </div>
                    )}

                    {paso === 4 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo"><span className="mhc-seccion__num">4</span>Juicio Clínico — Diagnóstico</h3>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo mhc-campo--requerido">
                            <label>Código CIE-10 <span>*</span></label>
                            <input
                              className={claseError('diagnostico_cie10')}
                              type="text"
                              value={form.diagnostico_cie10}
                              onChange={e => handleChange('diagnostico_cie10', e.target.value.toUpperCase())}
                              onBlur={() => marcarTocado('diagnostico_cie10')}
                              maxLength={10}
                              placeholder="Ej: J06.9"
                            />
                            {renderErrorCampo('diagnostico_cie10')}
                          </div>
                        </div>
                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Descripción del diagnóstico <span>*</span></label>
                          <textarea
                            className={claseError('descripcion_diagnostico')}
                            rows={4}
                            value={form.descripcion_diagnostico}
                            onChange={e => handleChange('descripcion_diagnostico', e.target.value)}
                            onBlur={() => marcarTocado('descripcion_diagnostico')}
                          />
                          {renderErrorCampo('descripcion_diagnostico')}
                        </div>
                      </div>
                    )}

                    {paso === 5 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo"><span className="mhc-seccion__num">5</span>Plan de Manejo / Conducta</h3>

                        <div className="mhc-campo mhc-campo--requerido">
                          <label>Plan de tratamiento general <span>*</span></label>
                          <textarea
                            className={claseError('plan_tratamiento')}
                            rows={2}
                            value={form.plan_tratamiento}
                            onChange={e => handleChange('plan_tratamiento', e.target.value)}
                            onBlur={() => marcarTocado('plan_tratamiento')}
                            placeholder="Tratamiento o conducta general…"
                          />
                          {renderErrorCampo('plan_tratamiento')}
                        </div>

                        <div className="mhc-dinamico-container" style={{ marginTop: '1.5rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <strong style={{ fontSize: '1rem', color: '#1e293b' }}>💊 Fórmula Médica Estructurada</strong>
                            <button type="button" onClick={agregarMedicamento} style={{ background: '#2563eb', color: 'white', padding: '4px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>＋ Agregar Medicamento</button>
                          </div>

                          {recetas.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay medicamentos agregados a la fórmula.</p>
                          ) : (
                            recetas.map((r, index) => {
                              const recetaIncompleta = !r.medicamento?.trim() || !r.dosis?.trim() || !r.frecuencia?.trim() || !r.duracion?.trim();
                              return (
                              <div key={index} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: recetaIncompleta ? '1px solid #DC2626' : '1px solid #f1f5f9' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                  <input type="text" placeholder="Nombre del medicamento *" value={r.medicamento} onChange={e => handleRecetaChange(index, 'medicamento', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                  <input type="text" placeholder="Dosis (Ej: 500mg) *" value={r.dosis} onChange={e => handleRecetaChange(index, 'dosis', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                  <input type="text" placeholder="Frecuencia (Ej: Cada 8h) *" value={r.frecuencia} onChange={e => handleRecetaChange(index, 'frecuencia', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 20px', gap: '10px', alignItems: 'center' }}>
                                  <input type="text" placeholder="Duración (Ej: 5 días) *" value={r.duracion} onChange={e => handleRecetaChange(index, 'duracion', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                  <input type="text" placeholder="Vía (Ej: Oral)" value={r.via_administracion} onChange={e => handleRecetaChange(index, 'via_administracion', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                  <button type="button" onClick={() => eliminarMedicamento(index)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer' }} title="Eliminar row">🗑️</button>
                                </div>
                                <input type="text" placeholder="Indicaciones adicionales (Ej: Tomar con alimentos)" value={r.indicaciones} onChange={e => handleRecetaChange(index, 'indicaciones', e.target.value)} style={{ padding: '6px', width: '100%', marginTop: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                {recetaIncompleta && (
                                  <small className="mhc-campo-error" style={{ display: 'block', marginTop: '6px' }}>
                                    ⚠ Complete medicamento, dosis, frecuencia y duración, o elimine esta fórmula.
                                  </small>
                                )}
                              </div>
                            );})
                          )}
                        </div>

                        <div className="mhc-dinamico-container" style={{ marginTop: '1.5rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <strong style={{ fontSize: '1rem', color: '#1e293b' }}>🔬 Órdenes de Exámenes Clínicos</strong>
                            <button type="button" onClick={agregarExamen} style={{ background: '#2563eb', color: 'white', padding: '4px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>＋ Agregar Examen</button>
                          </div>

                          {examenes.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay órdenes médicas agregadas.</p>
                          ) : (
                            examenes.map((ex, index) => {
                              const examenIncompleto = !ex.nombre_examen?.trim();
                              return (
                              <div key={index} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: examenIncompleto ? '1px solid #DC2626' : '1px solid #f1f5f9' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 20px', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                  <select value={ex.tipo_examen} onChange={e => handleExamenChange(index, 'tipo_examen', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                    <option value="Laboratorio">Laboratorio</option>
                                    <option value="Imagenología">Imagenología</option>
                                    <option value="Especializado">Especializado</option>
                                  </select>
                                  <input type="text" placeholder="Nombre exacto del examen (Ej: Cuadro Hemático) *" value={ex.nombre_examen} onChange={e => handleExamenChange(index, 'nombre_examen', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                  <button type="button" onClick={() => eliminarExamen(index)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer' }}>🗑️</button>
                                </div>
                                <input type="text" placeholder="Justificación clínica / diagnóstico sospechado" value={ex.justificacion_clinica} onChange={e => handleExamenChange(index, 'justificacion_clinica', e.target.value)} style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                {examenIncompleto && (
                                  <small className="mhc-campo-error" style={{ display: 'block', marginTop: '6px' }}>
                                    ⚠ El nombre del examen es obligatorio, o elimínelo.
                                  </small>
                                )}
                              </div>
                            );})
                          )}
                        </div>

                        <div className="mhc-campo" style={{ marginTop: '1.5rem' }}>
                          <label>Recomendaciones generales y signos de alarma</label>
                          <textarea rows={2} value={form.recomendaciones} onChange={e => handleChange('recomendaciones', e.target.value)} />
                        </div>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo">
                            <label>Días de incapacidad</label>
                            <input type="number" min="0" max="180" value={form.incapacidad_dias} onChange={e => handleChange('incapacidad_dias', e.target.value)} />
                            {parseInt(form.incapacidad_dias, 10) > 0 && !form.diagnostico_cie10.trim() && (
                              <small style={{ color: '#DC2626' }}>⚠ Requiere diagnóstico CIE-10 (paso 4).</small>
                            )}
                          </div>
                        </div>
                        <div className="mhc-campo"><label>Observaciones de control</label><textarea rows={2} value={form.observaciones} onChange={e => handleChange('observaciones', e.target.value)} /></div>
                      </div>
                    )}

                    {paso === 6 && (
                      <div className="mhc-seccion">
                        <h3 className="mhc-seccion__titulo"><span className="mhc-seccion__num">6</span>Cierre Legal — Firma del Médico</h3>
                        <div className="mhc-grid-2">
                          <div className="mhc-campo mhc-campo--requerido">
                            <label>Nombre del médico firmante <span>*</span></label>
                            <input
                              className={claseError('medico_nombre_firma')}
                              type="text"
                              value={form.medico_nombre_firma}
                              onChange={e => handleChange('medico_nombre_firma', e.target.value)}
                              onBlur={() => marcarTocado('medico_nombre_firma')}
                            />
                            {renderErrorCampo('medico_nombre_firma')}
                          </div>
                          <div className="mhc-campo"><label>Cédula profesional</label><input type="text" value={form.medico_cedula_firma} onChange={e => handleChange('medico_cedula_firma', e.target.value)} /></div>
                          <div className="mhc-campo mhc-campo--requerido">
                            <label>Registro ReTHUS <span>*</span></label>
                            <input
                              className={claseError('medico_rethus_firma')}
                              type="text"
                              value={form.medico_rethus_firma}
                              onChange={e => handleChange('medico_rethus_firma', e.target.value)}
                              onBlur={() => marcarTocado('medico_rethus_firma')}
                            />
                            {renderErrorCampo('medico_rethus_firma')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mhc-error">
                      {erroresDetalle.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                          {erroresDetalle.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      ) : error}
                    </div>
                  )}

                  <div className="mhc-nav">
                    <button className="mhc-btn mhc-btn--ghost" onClick={modoAclaracion ? cancelarAclaracion : onCerrar}>{modoAclaracion ? 'Cancelar' : 'Cerrar'}</button>
                    <div className="mhc-nav__pasos">
                      {paso > 1 && <button className="mhc-btn mhc-btn--secundario" onClick={pasoAnterior}>← Anterior</button>}
                      {paso < TOTAL_PASOS ? (
                        <button
                          className="mhc-btn mhc-btn--primary"
                          onClick={pasoSiguiente}
                          disabled={pasoActualInvalido}
                          title={pasoActualInvalido ? 'Complete correctamente los campos obligatorios de este paso para continuar.' : undefined}
                        >
                          Siguiente →
                        </button>
                      ) : (
                        <button
                          className="mhc-btn mhc-btn--guardar"
                          onClick={handleGuardar}
                          disabled={guardando || formularioCompletoInvalido}
                          title={formularioCompletoInvalido ? 'Aún hay campos obligatorios sin diligenciar correctamente en el formulario.' : undefined}
                        >
                          {guardando ? 'Guardando…' : '✓ Guardar todo'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── VISTA DE SOLO LECTURA ── */}
              {!modoEdicion && !modoAclaracion && historia && (
                <div className="mhc-vista">
                  <VistaHistoria historia={historia} recetas={recetas} examenes={examenes} />

                  {aclaraciones.length > 0 && (
                    <div className="mhc-aclaraciones">
                      <h3 className="mhc-aclaraciones__titulo">Notas de aclaración ({aclaraciones.length})</h3>
                      {aclaraciones.map((ac, i) => (
                        <div key={ac.id} className="mhc-aclaracion-item">
                          <div className="mhc-aclaracion-item__header">
                            <span>{ac.tipo_registro === 'nota_evolucion' ? '📈 Evolución' : '📝 Aclaración'} #{i + 1}</span>
                            <span>{new Date(ac.created_at).toLocaleDateString('es-CO')}</span>
                          </div>
                          <p>{ac.motivo_consulta}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {puedeEditarOAclarar && (
                    <div className="mhc-acciones-vista">
                      <button className="mhc-btn mhc-btn--aclaracion" onClick={iniciarAclaracion}>+ Agregar nota de aclaración / evolución</button>
                    </div>
                  )}
                </div>
              )}

              {!modoEdicion && !historia && !esMedico && (
                <div className="mhc-vacio"><span>📭</span><p>No hay registro clínico aún.</p></div>
              )}

              {!modoEdicion && !modoAclaracion && error && (
                <div className="mhc-error">{error}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Interno: Vista de solo lectura de la historia ─────────────────
function VistaHistoria({ historia, recetas = [], examenes = [] }) {
  function campo(etiqueta, valor) {
    return valor ? (
      <div className="mhc-vista-campo">
        <span className="mhc-vista-campo__etiqueta">{etiqueta}</span>
        <span className="mhc-vista-campo__valor">{valor}</span>
      </div>
    ) : null;
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
          {campo('TA', historia.tension_arterial_sistolica ? `${historia.tension_arterial_sistolica}/${historia.tension_arterial_diastolica} mmHg` : null)}
          {campo('FC', historia.frecuencia_cardiaca ? `${historia.frecuencia_cardiaca} lpm` : null)}
          {campo('FR', historia.frecuencia_respiratoria ? `${historia.frecuencia_respiratoria} rpm` : null)}
          {campo('Temp.', historia.temperatura_corporal ? `${historia.temperatura_corporal} °C` : null)}
          {campo('Peso', historia.peso_kg ? `${historia.peso_kg} kg` : null)}
          {campo('Talla', historia.talla_cm ? `${historia.talla_cm} cm` : null)}
          {campo('IMC', historia.imc ? historia.imc.toFixed(1) : null)}
        </div>
        {historia.exploracion_por_sistemas && <p>{historia.exploracion_por_sistemas}</p>}
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

      <div className="mhc-vista-seccion">
        <h4>5. Plan de manejo y conducta</h4>
        {campo('Tratamiento General', historia.plan_tratamiento)}

        {/* RENDER TABULAR DE MEDICAMENTOS RECETADOS */}
        {recetas.length > 0 && (
          <div style={{ marginTop: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b', display: 'block', marginBottom: '6px' }}>💊 Fórmula Médica:</span>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '4px' }}>Medicamento</th>
                  <th>Dosis</th>
                  <th>Frecuencia</th>
                  <th>Duración</th>
                  <th>Vía</th>
                </tr>
              </thead>
              <tbody>
                {recetas.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 4px' }}>
                      <strong>{r.medicamento}</strong>
                      {r.indicaciones && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.indicaciones}</div>}
                    </td>
                    <td>{r.dosis}</td>
                    <td>{r.frecuencia}</td>
                    <td>{r.duracion}</td>
                    <td>{r.via_administracion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RENDER DE EXÁMENES ORDENADOS */}
        {examenes.length > 0 && (
          <div style={{ marginTop: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b', display: 'block', marginBottom: '6px' }}>🔬 Exámenes Ordenados:</span>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
              {examenes.map((ex, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>
                  <strong>[{ex.tipo_examen}]</strong> {ex.nombre_examen}
                  {ex.justificacion_clinica && <div style={{ color: '#475569', fontSize: '0.8rem', fontStyle: 'italic' }}>Justificación: {ex.justificacion_clinica}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {campo('Recomendaciones', historia.recomendaciones)}
        {historia.incapacidad_dias > 0 && <div className="mhc-incapacidad-badge">⚕ Incapacidad: {historia.incapacidad_dias} día(s)</div>}
      </div>
    </div>
  );
}