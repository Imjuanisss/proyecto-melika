// client/src/components/historias/VisorPDFModal.jsx
// MELIKA — Visor PDF nativo
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

        {/* ── Área de renderizado — Forzamos el tipo application/pdf ── */}
        <div className="visor-documento" style={{ height: 'calc(100% - 60px)', width: '100%' }}>
          <object
            data={url}
            type="application/pdf"
            className="visor-iframe"
            style={{ width: '100%', height: '100%', border: 'none' }}
          >
            {/* Mensaje de respaldo por si el navegador o el celular bloquea el visor */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
              <p style={{ color: '#475569', marginBottom: '1rem' }}>
                Tu navegador actual no soporta la previsualización directa de PDFs.
              </p>
              <a 
                href={url} 
                download={nombreArchivo}
                style={{ backgroundColor: '#f97316', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
              >
                ⬇ Descargar el archivo para verlo
              </a>
            </div>
          </object>
        </div>

      </div>
    </div>
  );
}