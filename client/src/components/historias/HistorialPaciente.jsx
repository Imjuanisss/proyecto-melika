// client/src/components/historias/HistorialPaciente.jsx
// MELIKA — Historial clínico del paciente
// Visible desde el Dashboard del paciente y desde el panel del médico (con acceso verificado)
// Incluye visor PDF embebido con pdfslick v4 y descarga directa con @react-pdf/renderer

import { useState, useEffect, useCallback } from 'react';
import { pdf, PDFDownloadLink }  from '@react-pdf/renderer';
import { usePDFSlick }           from '@pdfslick/react';
import { useAuth }               from '../../context/AuthContext';
import { api }                   from '../../lib/apiClient';
import { PlantillaHistoriaPDF, PlantillaFormulaPDF } from './PlantillaHistoriaPDF';
import './HistorialPaciente.css';

// ─────────────────────────────────────────────────────────────────────────────
// VISOR PDF — Modal embebido con pdfslick v4
// Recibe una URL de blob generada en el cliente
// ─────────────────────────────────────────────────────────────────────────────
function VisorPDF({ url, onCerrar }) {
  const { viewerRef, usePDFSlickStore } = usePDFSlick(url, {
    singlePageViewer: false,
    scaleValue:       'page-width',
  });

  const numPages   = usePDFSlickStore(s => s.numPages);
  const pageNumber = usePDFSlickStore(s => s.pageNumber);
  const pdfSlick   = usePDFSlickStore(s => s.pdfSlick);

  function anteriorPagina()  { if (pdfSlick && pageNumber > 1)        pdfSlick.gotoPage(pageNumber - 1); }
  function siguientePagina() { if (pdfSlick && pageNumber < numPages)  pdfSlick.gotoPage(pageNumber + 1); }
  function acercar()         { if (pdfSlick) pdfSlick.incrementScale(); }
  function alejar()          { if (pdfSlick) pdfSlick.decrementScale(); }

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCerrar(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  return (
    <div
      className="visor-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de documento PDF"
      onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div className="visor-modal">

        {/* ── Barra de controles glassmorphism ── */}
        <div className="visor-toolbar glass-toolbar">

          <div className="visor-toolbar__izq">
            <div className="visor-logo-mini">
              <span className="visor-logo-mini__m">M</span>ELIKA
            </div>
          </div>

          <div className="visor-toolbar__centro">
            <button
              className="visor-btn"
              onClick={anteriorPagina}
              disabled={pageNumber <= 1}
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span className="visor-paginas">
              {pageNumber} / {numPages || '—'}
            </span>
            <button
              className="visor-btn"
              onClick={siguientePagina}
              disabled={pageNumber >= numPages}
              aria-label="Página siguiente"
            >
              ›
            </button>
            <div className="visor-separador-v" />
            <button className="visor-btn" onClick={alejar}  aria-label="Alejar zoom">−</button>
            <button className="visor-btn" onClick={acercar} aria-label="Acercar zoom">+</button>
          </div>

          <div className="visor-toolbar__der">
            <a
              href={url}
              download
              className="visor-btn visor-btn--descarga"
              aria-label="Descargar PDF"
            >
              ⬇
            </a>
            <button
              className="visor-btn visor-btn--cerrar"
              onClick={onCerrar}
              aria-label="Cerrar visor"
            >
              ✕
            </button>
          </div>

        </div>

        {/* ── Área de renderizado del documento ── */}
        <div className="visor-documento" ref={viewerRef} />

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPO — Etiqueta + valor. Declarado a nivel de módulo para que React
// no lo recree en cada render (regla react-hooks/no-static-components).
// ─────────────────────────────────────────────────────────────────────────────
function Campo({ etiqueta, valor }) {
  if (!valor && valor !== 0) return null;
  return (
    <div className="hp-detalle-campo">
      <span className="hp-detalle-campo__etiqueta">{etiqueta}</span>
      <span className="hp-detalle-campo__valor">{String(valor)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TARJETA DE HISTORIA — Fila en el listado del historial
// ─────────────────────────────────────────────────────────────────────────────
function TarjetaHistoria({ entrada, onVerDetalle, onGenerarPDF, generandoId }) {
  function formatFecha(fechaStr) {
    if (!fechaStr) return '—';
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  const estaCargando = generandoId === entrada.id;

  return (
    <div className="hp-tarjeta">
      <div className="hp-tarjeta__izq">

        <div className="hp-tarjeta__fecha">{formatFecha(entrada.fecha)}</div>

        <div className="hp-tarjeta__especialidad">{entrada.especialidad}</div>

        <div className="hp-tarjeta__medico">
          Dr(a). {entrada.medico_nombre} {entrada.medico_apellido}
        </div>

        <p className="hp-tarjeta__motivo">{entrada.motivo_consulta}</p>

        {entrada.diagnostico_cie10 && (
          <div className="hp-tarjeta__cie10">
            <span className="hp-tarjeta__cie10-codigo">{entrada.diagnostico_cie10}</span>
            {entrada.descripcion_diagnostico && (
              <span className="hp-tarjeta__cie10-desc">
                {entrada.descripcion_diagnostico.length > 60
                  ? entrada.descripcion_diagnostico.substring(0, 60) + '…'
                  : entrada.descripcion_diagnostico}
              </span>
            )}
          </div>
        )}

      </div>

      <div className="hp-tarjeta__der">
        {entrada.total_aclaraciones > 0 && (
          <span className="hp-tarjeta__badge-acl">
            {entrada.total_aclaraciones} aclaración(es)
          </span>
        )}

        <div className="hp-tarjeta__acciones">
          <button
            className="hp-btn hp-btn--ver"
            onClick={() => onVerDetalle(entrada)}
          >
            Ver historia
          </button>
          <button
            className="hp-btn hp-btn--pdf"
            onClick={() => onGenerarPDF(entrada)}
            disabled={estaCargando}
          >
            {estaCargando ? 'Generando…' : '⬇ PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETALLE DE HISTORIA — Modal con todos los bloques clínicos
// Permite ver en pantalla, descargar HC completa y descargar fórmula
// ─────────────────────────────────────────────────────────────────────────────
function DetalleHistoria({ historiaId, onCerrar, usuario }) {
  const [datos,        setDatos]        = useState(null);
  const [aclaraciones, setAclaraciones] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // Estado del visor PDF embebido
  const [visorUrl,     setVisorUrl]     = useState(null);
  const [visorCargando, setVisorCargando] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !visorUrl) onCerrar(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar, visorUrl]);

  useEffect(() => {
    setLoading(true);
    api.get(`/historias/${historiaId}/completa`)
      .then(data => {
        setDatos(data.historia);
        setAclaraciones(data.aclaraciones || []);
      })
      .catch(() => setError('No se pudo cargar el detalle de la historia clínica.'))
      .finally(() => setLoading(false));
  }, [historiaId]);

  // Genera blob URL y abre el visor pdfslick embebido
  async function handleVerPDFEmbebido(tipo) {
    if (!datos) return;
    setVisorCargando(true);
    try {
      const documento = tipo === 'formula'
        ? <PlantillaFormulaPDF historia={datos} />
        : <PlantillaHistoriaPDF historia={datos} aclaraciones={aclaraciones} />;

      const blob    = await pdf(documento).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      setVisorUrl(blobUrl);
    } catch (err) {
      console.error('Error generando PDF para visor:', err);
      alert('No se pudo generar la previsualización del PDF.');
    } finally {
      setVisorCargando(false);
    }
  }

  function cerrarVisor() {
    if (visorUrl) {
      URL.revokeObjectURL(visorUrl); // liberar memoria
      setVisorUrl(null);
    }
  }

  // Extrae texto de medicamentos desde el campo JSONB
  function extraerMedTexto(campo) {
    if (!campo) return '';
    if (typeof campo === 'string') return campo;
    if (typeof campo === 'object') return campo.texto || JSON.stringify(campo);
    return '';
  }

  const medTexto  = datos ? extraerMedTexto(datos.medicamentos_recetados) : '';
  const hayFormula = medTexto || datos?.ordenes_medicas;

  return (
    <>
      {/* Visor PDF embebido */}
      {visorUrl && <VisorPDF url={visorUrl} onCerrar={cerrarVisor} />}

      {/* Modal overlay */}
      <div
        className="hp-overlay"
        role="dialog"
        aria-modal="true"
        onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
      >
        <div className="hp-detalle-modal">

          {/* ── Cabecera del modal ── */}
          <div className="hp-detalle-cabecera">
            <div>
              <h2 className="hp-detalle-titulo">Historia Clínica #{historiaId}</h2>
              {datos && (
                <p className="hp-detalle-sub">
                  {datos.especialidad} · Dr(a). {datos.medico_nombre} {datos.medico_apellido}
                </p>
              )}
            </div>

            <div className="hp-detalle-cabecera__acciones">

              {/* Botón: previsualizar en visor embebido */}
              {datos && (
                <button
                  className="hp-btn hp-btn--visor"
                  onClick={() => handleVerPDFEmbebido('historia')}
                  disabled={visorCargando}
                >
                  {visorCargando ? 'Preparando…' : '👁 Ver PDF'}
                </button>
              )}

              {/* Botón: descargar Historia Clínica */}
              {datos && (
                <PDFDownloadLink
                  document={
                    <PlantillaHistoriaPDF
                      historia={datos}
                      aclaraciones={aclaraciones}
                    />
                  }
                  fileName={`HC-${datos.id}-${datos.paciente_apellido}.pdf`}
                  className="hp-btn hp-btn--pdf"
                >
                  {({ loading: l }) => l ? 'Generando…' : '⬇ Historia PDF'}
                </PDFDownloadLink>
              )}

              {/* Botón: descargar Fórmula Médica — solo si tiene contenido */}
              {datos && hayFormula && (
                <PDFDownloadLink
                  document={<PlantillaFormulaPDF historia={datos} />}
                  fileName={`Formula-${datos.id}-${datos.paciente_apellido}.pdf`}
                  className="hp-btn hp-btn--formula"
                >
                  {({ loading: l }) => l ? 'Generando…' : '💊 Fórmula'}
                </PDFDownloadLink>
              )}

              {/* Solo el médico autor puede agregar aclaraciones */}
              {datos && usuario?.rol === 'medico' && (
                <button
                  className="hp-btn hp-btn--aclaracion"
                  onClick={() => {
                    // El botón expone la ruta de aclaración — la lógica de formulario
                    // se implementa en FormularioAclaracion (FASE 5).
                    // Aquí usamos un evento personalizado para comunicarlo al padre.
                    window.dispatchEvent(
                      new CustomEvent('melika:abrir-aclaracion', {
                        detail: { historiaId: datos.id, pacienteId: datos.id_paciente },
                      })
                    );
                  }}
                >
                  📝 Agregar aclaración
                </button>
              )}

              <button className="hp-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
            </div>
          </div>

          {/* ── Cuerpo del modal ── */}
          <div className="hp-detalle-cuerpo">

            {loading && (
              <div className="hp-loading">
                <div className="hp-spinner" />
                <p>Cargando historia clínica…</p>
              </div>
            )}

            {error && <div className="hp-error">{error}</div>}

            {!loading && datos && (
              <>
                {/* BLOQUE 1 — Identificación administrativa */}
                <div className="hp-bloque">
                  <h3 className="hp-bloque__titulo">
                    <span>1</span> Identificación del Paciente
                  </h3>
                  <div className="hp-grid-2">
                    <Campo etiqueta="Paciente"      valor={`${datos.paciente_nombre} ${datos.paciente_apellido}`} />
                    <Campo etiqueta="Documento"     valor={`${datos.paciente_tipo_doc || 'CC'} ${datos.paciente_num_doc}`} />
                    <Campo etiqueta="EPS"           valor={datos.eps_aseguradora} />
                    <Campo etiqueta="Tipo consulta" valor={datos.tipo_cita === 'teleconsulta' ? '💻 Teleconsulta' : '🏥 Presencial'} />
                    <Campo etiqueta="Fecha"         valor={datos.fecha_cita ? new Date(datos.fecha_cita + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                    <Campo etiqueta="Hora"          valor={datos.hora_inicio?.substring(0, 5)} />
                  </div>
                </div>

                {/* BLOQUE 2 — Anamnesis */}
                <div className="hp-bloque">
                  <h3 className="hp-bloque__titulo">
                    <span>2</span> Anamnesis
                  </h3>
                  <Campo etiqueta="Motivo de consulta"    valor={datos.motivo_consulta} />
                  <Campo etiqueta="Enfermedad actual"     valor={datos.anamnesis} />
                  <Campo etiqueta="Ant. patológicos"      valor={datos.antecedentes_patologicos} />
                  <Campo etiqueta="Ant. quirúrgicos"      valor={datos.antecedentes_quirurgicos} />
                  <Campo etiqueta="Ant. alérgicos"        valor={datos.antecedentes_alergicos} />
                  <Campo etiqueta="Ant. familiares"       valor={datos.antecedentes_familiares} />
                  <Campo etiqueta="Ginecoobstétricos"     valor={datos.antecedentes_ginecoobstetricos} />
                  <Campo etiqueta="Hábitos"               valor={datos.habitos} />
                </div>

                {/* BLOQUE 3 — Examen físico */}
                {(datos.tension_arterial_sistolica || datos.frecuencia_cardiaca || datos.peso_kg || datos.temperatura_corporal) && (
                  <div className="hp-bloque">
                    <h3 className="hp-bloque__titulo">
                      <span>3</span> Examen Físico
                    </h3>
                    <div className="hp-signos-grid">
                      {datos.tension_arterial_sistolica && (
                        <div className="hp-signo-card">
                          <div className="hp-signo-card__valor">
                            {datos.tension_arterial_sistolica}/{datos.tension_arterial_diastolica}
                          </div>
                          <div className="hp-signo-card__unidad">mmHg</div>
                          <div className="hp-signo-card__etiqueta">Tensión Arterial</div>
                        </div>
                      )}
                      {datos.frecuencia_cardiaca && (
                        <div className="hp-signo-card">
                          <div className="hp-signo-card__valor">{datos.frecuencia_cardiaca}</div>
                          <div className="hp-signo-card__unidad">lpm</div>
                          <div className="hp-signo-card__etiqueta">Frec. Cardíaca</div>
                        </div>
                      )}
                      {datos.frecuencia_respiratoria && (
                        <div className="hp-signo-card">
                          <div className="hp-signo-card__valor">{datos.frecuencia_respiratoria}</div>
                          <div className="hp-signo-card__unidad">rpm</div>
                          <div className="hp-signo-card__etiqueta">Frec. Respiratoria</div>
                        </div>
                      )}
                      {datos.temperatura_corporal && (
                        <div className="hp-signo-card">
                          <div className="hp-signo-card__valor">{datos.temperatura_corporal}</div>
                          <div className="hp-signo-card__unidad">°C</div>
                          <div className="hp-signo-card__etiqueta">Temperatura</div>
                        </div>
                      )}
                      {datos.peso_kg && (
                        <div className="hp-signo-card">
                          <div className="hp-signo-card__valor">{datos.peso_kg}</div>
                          <div className="hp-signo-card__unidad">kg</div>
                          <div className="hp-signo-card__etiqueta">Peso</div>
                        </div>
                      )}
                      {datos.talla_cm && (
                        <div className="hp-signo-card">
                          <div className="hp-signo-card__valor">{datos.talla_cm}</div>
                          <div className="hp-signo-card__unidad">cm</div>
                          <div className="hp-signo-card__etiqueta">Talla</div>
                        </div>
                      )}
                      {datos.imc && (
                        <div className="hp-signo-card hp-signo-card--imc">
                          <div className="hp-signo-card__valor">{Number(datos.imc).toFixed(1)}</div>
                          <div className="hp-signo-card__unidad">kg/m²</div>
                          <div className="hp-signo-card__etiqueta">IMC</div>
                        </div>
                      )}
                    </div>
                    <Campo etiqueta="Exploración por sistemas" valor={datos.exploracion_por_sistemas} />
                    <Campo etiqueta="Examen físico"            valor={datos.examen_fisico} />
                  </div>
                )}

                {/* BLOQUE 4 — Diagnóstico CIE-10 */}
                {datos.diagnostico_cie10 && (
                  <div className="hp-bloque">
                    <h3 className="hp-bloque__titulo">
                      <span>4</span> Diagnóstico CIE-10
                    </h3>
                    <div className="hp-cie10">
                      <span className="hp-cie10__codigo">{datos.diagnostico_cie10}</span>
                      {datos.descripcion_diagnostico && (
                        <p className="hp-cie10__desc">{datos.descripcion_diagnostico}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* BLOQUE 5 — Plan de manejo */}
                {(datos.plan_tratamiento || medTexto || datos.ordenes_medicas || datos.recomendaciones) && (
                  <div className="hp-bloque">
                    <h3 className="hp-bloque__titulo">
                      <span>5</span> Plan de Manejo
                    </h3>
                    <Campo etiqueta="Plan de tratamiento" valor={datos.plan_tratamiento} />
                    {medTexto && (
                      <div className="hp-detalle-campo hp-detalle-campo--bloque">
                        <span className="hp-detalle-campo__etiqueta">💊 Medicamentos recetados</span>
                        <span className="hp-detalle-campo__valor">{medTexto}</span>
                      </div>
                    )}
                    <Campo etiqueta="Órdenes médicas"  valor={datos.ordenes_medicas} />
                    <Campo etiqueta="Recomendaciones"  valor={datos.recomendaciones} />
                    {datos.incapacidad_dias > 0 && (
                      <div className="hp-incapacidad">
                        ⚕ Incapacidad médica: {datos.incapacidad_dias} día(s)
                      </div>
                    )}
                  </div>
                )}

                {/* BLOQUE 6 — Cierre legal */}
                <div className="hp-bloque hp-bloque--cierre">
                  <h3 className="hp-bloque__titulo">
                    <span>6</span> Cierre Legal
                  </h3>
                  <div className="hp-firma">
                    <div className="hp-firma__linea" />
                    <p className="hp-firma__nombre">
                      {datos.medico_nombre_firma || `Dr(a). ${datos.medico_nombre} ${datos.medico_apellido}`}
                    </p>
                    {datos.medico_cedula_firma && (
                      <p className="hp-firma__dato">C.C. {datos.medico_cedula_firma}</p>
                    )}
                    {datos.medico_rethus_firma && (
                      <p className="hp-firma__dato">ReTHUS: {datos.medico_rethus_firma}</p>
                    )}
                    <p className="hp-firma__dato">{datos.especialidad}</p>
                  </div>
                </div>

                {/* Aclaraciones / notas de evolución */}
                {aclaraciones.length > 0 && (
                  <div className="hp-bloque hp-bloque--aclaraciones">
                    <h3 className="hp-bloque__titulo">
                      📝 Notas de aclaración y evolución ({aclaraciones.length})
                    </h3>
                    {aclaraciones.map((ac, i) => (
                      <div key={ac.id} className="hp-aclaracion">
                        <div className="hp-aclaracion__encabezado">
                          <span className="hp-aclaracion__tipo">
                            {ac.tipo_registro === 'nota_evolucion'
                              ? `📈 Nota de evolución #${i + 1}`
                              : `📋 Aclaración #${i + 1}`}
                          </span>
                          <span className="hp-aclaracion__fecha">
                            {new Date(ac.created_at).toLocaleDateString('es-CO', {
                              day: '2-digit', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {ac.motivo_consulta && (
                          <p className="hp-aclaracion__texto">{ac.motivo_consulta}</p>
                        )}
                        {ac.descripcion_diagnostico && (
                          <p className="hp-aclaracion__texto">{ac.descripcion_diagnostico}</p>
                        )}
                        {ac.plan_tratamiento && (
                          <p className="hp-aclaracion__texto">Plan: {ac.plan_tratamiento}</p>
                        )}
                        {ac.medico_nombre_firma && (
                          <p className="hp-aclaracion__firma">— {ac.medico_nombre_firma}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL — HistorialPaciente
// Prop idPaciente: si viene del dashboard del médico, trae el ID del paciente.
// Si no viene (dashboard del paciente), usa el ID del usuario autenticado.
// ─────────────────────────────────────────────────────────────────────────────
export default function HistorialPaciente({ idPaciente }) {
  const { usuario } = useAuth();

  const [entradas,      setEntradas]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [detalleId,     setDetalleId]     = useState(null);
  const [generandoPdf,  setGenerandoPdf]  = useState(null); // ID de la historia que está generando PDF

  // Si viene idPaciente externo (médico viendo a un paciente), usa ese.
  // Si no, usa el ID del propio usuario autenticado (paciente viendo su historial).
  const idTarget = idPaciente || usuario?.id;

  // ── Carga del historial ────────────────────────────────────────────────────
  useEffect(() => {
    if (!idTarget) return;
    setLoading(true);
    setError(null);

    api.get(`/historias/paciente/${idTarget}`)
      .then(data => setEntradas(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudo cargar el historial clínico. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, [idTarget]);


  

  // ── Generar y descargar PDF directo desde tarjeta (sin abrir detalle) ──────
  // Estrategia: fetch de datos completos → generar blob → descargar
  const handleGenerarPDF = useCallback(async (entrada) => {
    setGenerandoPdf(entrada.id);
    try {
      const data = await api.get(`/historias/${entrada.id}/completa`);
      const historia     = data.historia;
      const aclaraciones = data.aclaraciones || [];

      const blob     = await pdf(
        <PlantillaHistoriaPDF historia={historia} aclaraciones={aclaraciones} />
      ).toBlob();

      const blobUrl  = URL.createObjectURL(blob);
      const enlace   = document.createElement('a');
      enlace.href    = blobUrl;
      enlace.download = `HC-${historia.id}-${historia.paciente_apellido}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(blobUrl);

    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setGenerandoPdf(null);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="hp-loading hp-loading--page">
        <div className="hp-spinner" />
        <p>Cargando historial clínico…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hp-error hp-error--page">
        <span>⚠️</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Modal de detalle expandido */}
      {detalleId && (
        <DetalleHistoria
          historiaId={detalleId}
          onCerrar={() => setDetalleId(null)}
          usuario={usuario}
        />
      )}

      <div className="hp-contenedor">

        {/* Cabecera */}
        <div className="hp-cabecera">
          <div>
            <h2 className="hp-cabecera__titulo">📋 Historial Clínico</h2>
            <p className="hp-cabecera__sub">
              {entradas.length === 0
                ? 'Sin registros clínicos aún.'
                : `${entradas.length} consulta(s) registrada(s)`}
            </p>
          </div>
        </div>

        {/* Lista o estado vacío */}
        {entradas.length === 0 ? (
          <div className="hp-vacio">
            <span className="hp-vacio__icono">🏥</span>
            <p className="hp-vacio__titulo">Sin historial clínico</p>
            <small className="hp-vacio__sub">
              Las historias aparecerán aquí después de cada consulta médica completada.
            </small>
          </div>
        ) : (
          <div className="hp-lista">
            {entradas.map(entrada => (
              <TarjetaHistoria
                key={entrada.id}
                entrada={entrada}
                generandoId={generandoPdf}
                onVerDetalle={e => setDetalleId(e.id)}
                onGenerarPDF={handleGenerarPDF}
              />
            ))}
          </div>
        )}

      </div>
    </>
  );
}