import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'fdoncall-practice': path.resolve(__dirname, '../../packages/domain/src'),
    },
  },
  server: {
    port: 3000,
  },
});
