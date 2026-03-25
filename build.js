// build.js — Build the SA Script Editor.
//
// Tries esbuild first (fast, single step).
// Falls back to tsc + bundle.js (works without npm install).
//
// Usage: node build.js

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const useEsbuild = existsSync('node_modules/.package-lock.json') || existsSync('node_modules/esbuild');

if (useEsbuild) {
  console.log('→ Building with esbuild…');
  const { build } = await import('esbuild');
  await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outfile: 'dist/sa-ide.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: true,
    external: ['monaco-editor'],
    logLevel: 'info',
  });
} else {
  console.log('→ esbuild not found — using tsc + bundle.js…');
  console.log('  Step 1: tsc compile…');
  execSync('tsc -p tsconfig.emit.json', { stdio: 'inherit' });
  console.log('  Step 2: bundle…');
  // Dynamic import of the bundler (it's the same file structure)
  await import('./bundle.js');
}

console.log('✓ Build complete.');

