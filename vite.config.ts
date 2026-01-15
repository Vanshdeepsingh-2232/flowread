import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pc from 'picocolors';

const loggerBridge = (): Plugin => ({
  name: 'vite-plugin-logger-bridge',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/_log' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const { level, service, message, data, timestamp } = JSON.parse(body);

            const timeStr = pc.dim(`[${timestamp}]`);
            const serviceStr = pc.cyan(`[${service}]`);

            let levelStr = level;
            const emoji = {
              DEBUG: '🔍',
              INFO: '🔵',
              SUCCESS: '🟢',
              WARN: '🟡',
              ERROR: '🔴'
            }[level as string] || '⚪';

            switch (level) {
              case 'DEBUG': levelStr = pc.gray(pc.bold('DEBUG')); break;
              case 'INFO': levelStr = pc.blue(pc.bold('INFO')); break;
              case 'SUCCESS': levelStr = pc.green(pc.bold('SUCCESS')); break;
              case 'WARN': levelStr = pc.yellow(pc.bold('WARN')); break;
              case 'ERROR': levelStr = pc.red(pc.bold('ERROR')); break;
            }

            // Print beautifully to terminal
            process.stdout.write(`${timeStr} ${emoji} ${levelStr} ${serviceStr} ${message}\n`);

            if (data && Object.keys(data).length > 0) {
              console.dir(data, { depth: 3, colors: true });
            }

            res.statusCode = 200;
            res.end('ok');
          } catch (e) {
            res.statusCode = 400;
            res.end('Invalid JSON');
          }
        });
        return;
      }
      next();
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 8000,
      host: '0.0.0.0',
    },
    optimizeDeps: {
      include: [
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'pdfjs-dist',
        'react',
        'react-dom',
        'lucide-react',
        'dexie',
        'dexie-react-hooks'
      ]
    },
    plugins: [
      react(),
      tailwindcss(),
      loggerBridge()
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            'vendor-react': ['react', 'react-dom'],
            'vendor-utils': ['lucide-react', 'dexie', 'dexie-react-hooks', 'uuid'],
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_FIREBASE_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_FIREBASE_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
