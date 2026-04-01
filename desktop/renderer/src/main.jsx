import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initTheme } from './theme.js';
import './styles/global.css';
import App from './App.jsx';

initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
