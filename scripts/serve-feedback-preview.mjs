import { preview } from 'vite';
// Isolated browser origin; forwards only to the existing local project API.
const server = await preview({ configFile: 'vite.config.js', preview: { host: '127.0.0.1', port: 4520, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true, headers: { Origin: 'http://localhost:5173' } } } } });
console.log('访谈反馈本地验收预览：http://127.0.0.1:4520（独立浏览器来源）');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.httpServer.close(() => process.exit(0)));
