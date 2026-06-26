// client/vite.config.js
// Configuración completa para MELIKA con soporte nativo de resolución ESM/CJS

import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import path             from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // 1. Interceptamos la ruta defectuosa y la redirigimos a nuestro puente ESM
      'use-sync-external-store/shim/with-selector.js': path.resolve('./src/shim-with-selector.js'),
      
      // 2. Por seguridad, redirigimos el shim base directamente a React (soportado nativo en React 18)
      'use-sync-external-store/shim': 'react'
    }
  },

  build: {
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  // Worker en formato ESM — requerido por @pdfslick/react (PDF.js corre en un hilo secundario)
  worker: {
    format: 'es',
  },

  optimizeDeps: {
    // Aseguramos que esbuild optimice el archivo de origen antes de pasarlo a nuestro puente
    include: [
      '@react-pdf/renderer',
      'use-sync-external-store/with-selector.js'
    ],
    // Protegemos el worker nativo de @pdfslick
    exclude: ['@pdfslick/react'],
  },
});