import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015'
  },
  server: {
    port: 3000,
    open: true
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});