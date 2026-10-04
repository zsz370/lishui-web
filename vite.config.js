import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 网页使用 public 中的发布素材；额外允许开发时查看归类后的原始数字人素材。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } },
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../03_原始资料/数字人素材'),
      ],
    },
    // 通过 /_fs/ 或自定义中间件访问外部素材；这里用简单静态挂载
  },
  preview: { port: 4173, proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } } },
});
