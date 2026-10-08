import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';

function discoveryDirectoryEntry() {
  let outputDirectory;
  return {
    name: 'discovery-directory-entry',
    apply: 'build',
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      // public/nodes 与 /nodes 路由同名；为静态目录提供 SPA 入口，兼容现有 Nginx。
      await mkdir(path.join(outputDirectory, 'nodes'), { recursive: true });
      await copyFile(path.join(outputDirectory, 'index.html'), path.join(outputDirectory, 'nodes/index.html'));
    },
  };
}

// 网页仅使用项目内 public 中的发布素材，不需要访问仓库外原始素材。
export default defineConfig({
  plugins: [react(), discoveryDirectoryEntry()],
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
