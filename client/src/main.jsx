//client/src/main.jsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import '@pdfslick/react/dist/pdf_viewer.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);