import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 网页仅使用项目内 public 中的发布素材，不需要访问仓库外原始素材。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } },
  },
  preview: { port: 4173, proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } } },
});
