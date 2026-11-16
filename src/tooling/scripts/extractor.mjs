import { readFile } from 'node:fs/promises';
import { build } from 'vite';

const license = await readFile('node_modules/fflate/LICENSE', 'utf8');
await build({
  configFile: false,
  build: {
    outDir: '../Extension',
    target: 'es2023',
    emptyOutDir: false,
    lib: {
      entry: 'ui/extractor.ts',
      name: 'ChatFlowExtractor',
      formats: ['iife'],
      fileName: () => 'chatflow-extractor.js',
    },
    rollupOptions: {
      output: {
        banner: `/* MOORKYZ ChatFlow experimental owner-run extractor.\nCopyright 2026 Moorkyz. Apache-2.0; see the accompanying LICENSE and NOTICE.\nBundled fflate license:\n${license}\n*/`,
      },
    },
  },
});
