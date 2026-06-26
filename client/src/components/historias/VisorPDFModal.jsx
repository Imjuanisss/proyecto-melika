// client/src/components/historias/VisorPDFModal.jsx
// MELIKA — Visor PDF nativo con <iframe>
// Reemplaza pdfslick que es incompatible con React 19.
// El navegador renderiza el PDF directamente desde la blobUrl.
// Al cerrar, el componente padre llama URL.revokeObjectURL(url).

import { useEffect } from 'react';
import './VisorPDFModal.css';

export default function VisorPDFModal({ url, onCerrar, nombreArchivo = 'documento.pdf' }) {

  // Cerrar con Escape
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
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div className="visor-modal">

        {/* ── Barra de controles glassmorphism ── */}
        <div className="visor-toolbar glass-toolbar">

          {/* Zona izquierda: Logo */}
          <div className="visor-toolbar__izq">
            <span className="visor-logo-mini" aria-hidden="true">
              <span className="visor-logo-mini__m">M</span>ELIKA
            </span>
          </div>

          {/* Zona central: Nombre del archivo */}
          <div className="visor-toolbar__centro">
            <span className="visor-nombre-archivo">{nombreArchivo}</span>
          </div>

          {/* Zona derecha: Descargar y Cerrar */}
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

        {/* ── Área de renderizado — iframe nativo del navegador ── */}
        <div className="visor-documento">
          <iframe
            src={url}
            title={nombreArchivo}
            className="visor-iframe"
          />
        </div>

      </div>
    </div>
  );
}