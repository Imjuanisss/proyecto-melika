// client/src/shim-with-selector.js
// Archivo puente: Importa el módulo original optimizado y lo reexporta como 'default' 
// para satisfacer las dependencias conflictivas en Vite y React 18+.

import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector.js';

export default useSyncExternalStoreWithSelector;