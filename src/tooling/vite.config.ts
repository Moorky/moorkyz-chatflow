import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  publicDir: 'extension',
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { target: 'es2023', sourcemap: false, outDir: '../Extension', emptyOutDir: true },
  server: { host: '127.0.0.1' },
});
