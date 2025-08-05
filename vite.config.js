import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin'
    },
    host: '0.0.0.0', // permite acesso externo (ex: ngrok, mobile, emulador)
    port: 5173,
    strictPort: true,
    allowedHosts: ['c5e9dc25a659.ngrok-free.app', '10.0.2.2'], // ngrok e Android emulator
    proxy: {
      '/ephemeris': 'http://127.0.0.1:8080',
    },
  },
});
