import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'vokal',
      fileName: (format) => `vokal.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['node:fs', 'node:path', 'node:url'],
    },
    sourcemap: true,
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
