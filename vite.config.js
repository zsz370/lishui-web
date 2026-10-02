import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite 配置：允许 dev server 直接读 E:\数媒\数字人素材 里的立绘/GIF，
// 免拷贝、免仓库膨胀。前端引用路径写 /素材/xxx.png 即可。
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
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../数字人素材'),
      ],
    },
    // 通过 /_fs/ 或自定义中间件访问外部素材；这里用简单静态挂载
  },
  preview: { port: 4173 },
});
