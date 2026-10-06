import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

// The calculator is one section of Valheim Companion, served under
// /damage-calculator/ by the root site's build and nginx config.
export default defineConfig({
  base: '/damage-calculator/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist-static', emptyOutDir: true },
});
