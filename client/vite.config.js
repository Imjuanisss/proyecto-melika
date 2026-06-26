// client/vite.config.js
// Configuración completa para MELIKA con soporte para:
//   - @react-pdf/renderer (genera PDFs vectoriales en el cliente)
//   - @pdfslick/react     (visor embebido PDF.js)

import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: 'dist',
    // Permite mezclar CJS y ESM — necesario para @react-pdf/renderer
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  // Worker en formato ESM — requerido por @pdfslick/react (PDF.js corre en worker)
  worker: {
    format: 'es',
  },

  optimizeDeps: {
    // @react-pdf/renderer necesita pre-bundling explícito (CJS interno)
    include: ['@react-pdf/renderer'],
    // @pdfslick/react usa workers ESM nativos — excluirlo del pre-bundling
    // evita que Vite rompa las referencias internas al worker de PDF.js
    exclude: ['@pdfslick/react'],
  },

  // Variables de entorno del cliente (opcional, prefijo VITE_)
  // Accesibles como import.meta.env.VITE_API_URL en el código React
});