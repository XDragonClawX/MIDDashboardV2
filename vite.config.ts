import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  // Offline-Variante: alles in EINE Datei (file:// kann keine Nachlade-Chunks öffnen)
  const offline = mode === 'offline';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: offline
          ? { inlineDynamicImports: true }
          : {
              manualChunks(id: string) {
                if (!id.includes('node_modules')) return undefined;
                if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
                if (/node_modules\/(recharts|d3-[^/]+|victory-vendor|internmap)\//.test(id)) return 'vendor-charts';
                if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'vendor-motion';
                return undefined;
              },
            },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
