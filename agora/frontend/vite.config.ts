import { defineConfig } from 'vite'; 
import react from '@vitejs/plugin-react'; 
import path from 'path';
export default defineConfig({
 plugins: [react()],
 resolve: {
 alias: {
 '@': path.resolve(__dirname, 'src'),
 }, 
},

 server: {
 host: '0.0.0.0',
 port: 5173,
 strictPort: true,
 allowedHosts: ['agorast.zaldio.qzz.io'],
 proxy: {
 '/api': {
 target: 'http://apist.zaldio.qzz.io',
 changeOrigin: true,
 secure: true,
 },
 },
 },
 base: '/', 
});
