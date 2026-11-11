import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "preview" mode builds one self-contained HTML file that runs on demo data.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'preview' ? [react(), viteSingleFile()] : [react()],
  define: { __PREVIEW__: JSON.stringify(mode === 'preview') },
  build: mode === 'preview' ? { outDir: 'dist-preview', copyPublicDir: false } : { outDir: 'dist' },
}));
