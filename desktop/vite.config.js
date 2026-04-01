import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: './renderer',
  plugins: [react()],
  server: { port: 5174 },
  base: './',           // relative paths — required for Electron file:// protocol in prod
  build: {
    outDir: 'dist',     // relative to root (renderer/dist)
    emptyOutDir: true,
  },
});
