// client/src/components/historias/VisorPDFModal.jsx
// MELIKA — Visor PDF embebido con pdfslick v4.
// Componente COMPARTIDO: usado en MisCitas (paciente) y HistorialPaciente (médico/paciente).
// Recibe una blobUrl ya generada externamente y la renderiza con controles glassmorphism.
// Al cerrar, el componente padre es responsable de llamar URL.revokeObjectURL(url).

import { useEffect } from 'react';
import { usePDFSlick } from '@pdfslick/react';
import './VisorPDFModal.css';

export default function VisorPDFModal({ url, onCerrar, nombreArchivo = 'documento.pdf' }) {
  const { viewerRef, usePDFSlickStore } = usePDFSlick(url, {
    singlePageViewer: false,
    scaleValue:       'page-width',
  });

  const numPages   = usePDFSlickStore(s => s.numPages);
  const pageNumber = usePDFSlickStore(s => s.pageNumber);
  const pdfSlick   = usePDFSlickStore(s => s.pdfSlick);

  function anteriorPagina() {
    if (pdfSlick && pageNumber > 1) pdfSlick.gotoPage(pageNumber - 1);
  }

  function siguientePagina() {
    if (pdfSlick && pageNumber < numPages) pdfSlick.gotoPage(pageNumber + 1);
  }

  function acercar() {
    if (pdfSlick) pdfSlick.incrementScale();
  }

  function alejar() {
    if (pdfSlick) pdfSlick.decrementScale();
  }

  // Cerrar con tecla Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  // Bloquear scroll del body mientras el visor está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

          {/* Zona izquierda: logo */}
          <div className="visor-toolbar__izq">
            <div className="visor-logo-mini" aria-hidden="true">
              <span className="visor-logo-mini__m">M</span>ELIKA
            </div>
          </div>

          {/* Zona central: navegación de páginas y zoom */}
          <div className="visor-toolbar__centro">
            <button
              className="visor-btn"
              onClick={anteriorPagina}
              disabled={!numPages || pageNumber <= 1}
              aria-label="Página anterior"
            >
              ‹
            </button>

            <span className="visor-paginas" aria-live="polite">
              {numPages ? `${pageNumber} / ${numPages}` : '—'}
            </span>

            <button
              className="visor-btn"
              onClick={siguientePagina}
              disabled={!numPages || pageNumber >= numPages}
              aria-label="Página siguiente"
            >
              ›
            </button>

            <div className="visor-separador-v" aria-hidden="true" />

            <button
              className="visor-btn"
              onClick={alejar}
              aria-label="Reducir zoom"
            >
              −
            </button>

            <button
              className="visor-btn"
              onClick={acercar}
              aria-label="Aumentar zoom"
            >
              +
            </button>
          </div>

          {/* Zona derecha: descargar y cerrar */}
          <div className="visor-toolbar__der">
            <a
              href={url}
              download={nombreArchivo}
              className="visor-btn visor-btn--descarga"
              aria-label="Descargar PDF"
            >
              ⬇ Descargar
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