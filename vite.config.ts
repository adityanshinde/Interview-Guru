import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'build',
      emptyOutDir: true,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@frontend': path.resolve(__dirname, 'frontend'),
        '@backend': path.resolve(__dirname, 'backend'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@desktop': path.resolve(__dirname, 'desktop'),
      },
    },
    server: {
      // Disable HMR websocket noise in this workspace; full reload still works.
      hmr: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
