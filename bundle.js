// bundle.js — Simple module bundler for the SA IDE.
// Reads compiled ES module files from dist-tmp/ and produces a single
// IIFE in dist/sa-ide.js with a minimal module registry.
//
// Usage: node bundle.js

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, relative, dirname, resolve } from 'path';

const ROOT = 'dist-tmp';
const OUT  = 'dist/sa-ide.js';

mkdirSync('dist', { recursive: true });

// Collect all .js files
function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...walk(full));
    else if (entry.endsWith('.js')) results.push(full);
  }
  return results;
}

const allFiles = walk(ROOT);
const modules = new Map(); // id → { code, deps[] }

for (const fp of allFiles) {
  const id = './' + relative(ROOT, fp);  // e.g. './state.js'
  const code = readFileSync(fp, 'utf8');
  
  // Parse static import deps
  const deps = new Set();
  for (const m of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    deps.add(m[1]);
  }
  
  modules.set(id, { code, deps: [...deps] });
}

// Topological sort
const visited = new Set();
const order = [];
function visit(id) {
  if (visited.has(id)) return;
  visited.add(id);
  const mod = modules.get(id);
  if (!mod) return;
  for (const dep of mod.deps) {
    // Resolve relative path
    const resolved = './' + join(dirname(id.slice(2)), dep.replace(/^\.\//, '')).replace(/\\/g, '/');
    visit(resolved);
  }
  order.push(id);
}
for (const id of modules.keys()) visit(id);

console.log('Module order:');
order.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));

// Build output
let out = '';
out += `// SA Script Editor v2.0 — bundled ${new Date().toISOString().split('T')[0]}\n`;
out += `'use strict';\n`;
out += `(function() {\n`;
out += `\n`;
out += `// ── Module registry ──────────────────────────\n`;
out += `const __modules = {};\n`;
out += `const __cache = {};\n`;
out += `function __define(id, factory) { __modules[id] = factory; }\n`;
out += `function __require(id, from) {\n`;
out += `  // Resolve relative path\n`;
out += `  if (id.startsWith('./') || id.startsWith('../')) {\n`;
out += `    const base = from ? from.replace(/\\/[^/]*$/, '') : '.';\n`;
out += `    const parts = (base + '/' + id).split('/');\n`;
out += `    const resolved = [];\n`;
out += `    for (const p of parts) {\n`;
out += `      if (p === '..') resolved.pop();\n`;
out += `      else if (p !== '.') resolved.push(p);\n`;
out += `    }\n`;
out += `    id = './' + resolved.join('/');\n`;
out += `  }\n`;
out += `  if (__cache[id]) return __cache[id];\n`;
out += `  const factory = __modules[id];\n`;
out += `  if (!factory) throw new Error('Module not found: ' + id);\n`;
out += `  const exports = {};\n`;
out += `  __cache[id] = exports;\n`;
out += `  factory(exports, function(depId) { return __require(depId, id); });\n`;
out += `  return exports;\n`;
out += `}\n\n`;

for (const id of order) {
  const mod = modules.get(id);
  let code = mod.code;
  
  // Transform imports: import { a, b } from './path.js'  →  const { a, b } = __req('./path.js')
  // Handle: import { X as Y } from '...'
  // Handle: import type { ... } (should have been stripped by tsc, but just in case)
  code = code.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"];?/g,
    (match, names, path) => {
      return `const {${names}} = __req('${path}');`;
    }
  );
  
  // Transform dynamic imports: import('./tabs.js') → Promise.resolve(__req('./tabs.js'))
  code = code.replace(
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    (match, path) => `Promise.resolve(__req('${path}'))`
  );
  
  // Transform exports: export function X → function X  (then register)
  // Also: export const X, export let X
  const exportedNames = [];
  
  code = code.replace(/^export\s+function\s+([$\w]+)/gm, (m, name) => {
    exportedNames.push(name);
    return `function ${name}`;
  });
  code = code.replace(/^export\s+const\s+([$\w]+)/gm, (m, name) => {
    exportedNames.push(name);
    return `const ${name}`;
  });
  code = code.replace(/^export\s+let\s+([$\w]+)/gm, (m, name) => {
    exportedNames.push(name);
    return `let ${name}`;
  });
  // export { X, Y } — already declared
  code = code.replace(/^export\s+\{([^}]+)\};?\s*$/gm, (m, names) => {
    for (const n of names.split(',').map(s => s.trim())) {
      if (n && !exportedNames.includes(n)) exportedNames.push(n);
    }
    return '';
  });
  
  out += `__define('${id}', function(__exports, __req) {\n`;
  out += code;
  out += `\n`;
  // Assign exports
  for (const name of exportedNames) {
    // For let variables, use a getter so the live binding works
    out += `Object.defineProperty(__exports, '${name}', { get: function() { return ${name}; }, enumerable: true });\n`;
  }
  out += `});\n\n`;
}

// Boot
out += `// ── Boot ──────────────────────────────────────\n`;
out += `__require('./main.js');\n`;
out += `\n})();\n`;

writeFileSync(OUT, out);

const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log(`\n✓ Bundled ${order.length} modules → ${OUT} (${kb} KB)`);
