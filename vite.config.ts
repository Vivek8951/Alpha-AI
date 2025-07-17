import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      port: 3000,
      proxy: {
        '/rest/v1': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          secure: true,
          headers: {
            'apikey': env.VITE_SUPABASE_ANON_KEY
          }
        },
        '/api/v0': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Set required headers for IPFS API
              proxyReq.setHeader('Accept', '*/*');
              
              // Handle file uploads
              if (req.method === 'POST' && req.url?.includes('/add')) {
                proxyReq.removeHeader('content-type');
              } else {
                proxyReq.setHeader('Content-Type', 'application/json');
              }
            });
          }
        }
      },
      cors: true
    }
  };
});