import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue()],
    base: '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/js/[name].[hash].js',
          chunkFileNames: 'assets/js/[name].[hash].js',
          assetFileNames: (assetInfo) => {
            const filename = assetInfo.name ?? assetInfo.names?.[0] ?? '';
            const ext = path.extname(filename);
            if (ext === '.css') {
              return 'assets/css/[name].[hash][extname]';
            }
            if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
              return 'assets/images/[name].[hash][extname]';
            }
            if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
              return 'assets/fonts/[name].[hash][extname]';
            }
            return 'assets/[name].[hash][extname]';
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      port: parseInt(env.VITE_PORT),
      open: true
    }
  };
});