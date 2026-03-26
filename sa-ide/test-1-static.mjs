// ============================================================
// TEST SUITE 1: STATIC ANALYSIS
// Verifies HTML/CSS/JS structural consistency without execution:
//   a) Every $('id') call in the bundle has a matching HTML element
//   b) Every CSS class used in JS exists in styles.css
//   c) Expected HTML landmark elements are present
//   d) All expected module imports/exports are wired in main.ts
// ============================================================

import { readFileSync } from 'fs';

const HTML     = readFileSync('index.html',       'utf8');
const STYLES   = readFileSync('styles.css',       'utf8');
const BUNDLE   = readFileSync('dist/sa-ide.js',   'utf8');
const MAIN_TS  = readFileSync('src/main.ts',      'utf8');

let pass = 0, fail = 0;
const failures = [];

function ok(label, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else       { fail++; failures.push(`${label}${detail ? ': ' + detail : ''}`); console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
}

// ── Helper: extract all HTML element IDs ─────────────────
const htmlIds = new Set();
for (const m of HTML.matchAll(/\bid="([^"]+)"/g)) htmlIds.add(m[1]);

// ── Helper: extract all $('id') calls from bundle ────────
const bundleIds = new Set();
for (const m of BUNDLE.matchAll(/\$\('([^']+)'\)/g)) bundleIds.add(m[1]);

// ── Helper: extract class names from styles.css ───────────
const cssClasses = new Set();
for (const m of STYLES.matchAll(/\.([a-zA-Z][\w-]*)\b/g)) cssClasses.add(m[1]);

// ── Helper: extract classList operations from bundle ─────
const bundleClasses = new Set();
for (const m of BUNDLE.matchAll(/classList\.\w+\('([^']+)'\)/g)) {
  m[1].split(/\s+/).forEach(c => bundleClasses.add(c));
}
for (const m of BUNDLE.matchAll(/className\s*[+=]+\s*['"][^'"]*\b([a-zA-Z][\w-]+)\b/g)) bundleClasses.add(m[1]);

// ══════════════════════════════════════════════════════════
console.log('\n── 1a. DOM ID coverage: all $() calls resolve ──────────\n');
// ══════════════════════════════════════════════════════════

const EXPECTED_IDS = [
  // Toolbar
  'btn-open', 'btn-new', 'btn-save', 'btn-import', 'btn-global-find',
  'btn-problems', 'btn-graph', 'btn-settings',
  'tb-problems-label',
  // Sidebar
  'sidebar', 'sidebar-resize', 'file-list', 'sidebar-empty',
  'sb-btn-open', 'sb-btn-new',
  // Variable tracker
  'var-tracker', 'var-tracker-list', 'btn-toggle-vt', 'vt-diag-summary',
  // Editor area
  'main', 'tab-bar', 'editor-container', 'monaco-mount', 'welcome',
  'w-btn-open', 'w-btn-new', 'w-btn-demo',
  // Find bar
  'find-bar', 'find-input', 'find-count', 'find-prev', 'find-next', 'find-close',
  // Problems panel
  'problems-panel', 'problems-header', 'problems-title', 'problems-list', 'problems-close',
  // Settings panel
  'settings-panel', 'settings-close-btn',
  's-fontsize', 's-tabsize', 's-wordwrap', 's-linenums', 's-minimap',
  // Status bar
  'statusbar', 'sb-filename', 'sb-type', 'sb-cursor', 'sb-diag', 'sb-diag-text',
  'sb-encoding', 'sb-saved',
  // Graph overlay
  'graph-overlay', 'graph-shell', 'graph-toolbar', 'graph-canvas-wrap',
  'graph-canvas', 'graph-svg-layer', 'graph-grid', 'graph-status',
  'g-refresh', 'g-fit', 'g-layout', 'g-close', 'g-zin', 'g-zout', 'g-zoom-display',
  'g-stat-nodes', 'g-stat-edges', 'g-stat-unreachable',
  // Global find/replace
  'gfr-overlay', 'gfr-box', 'gfr-find', 'gfr-replace', 'gfr-close',
  'gfr-btn-find', 'gfr-btn-replace-next', 'gfr-btn-replace-all', 'gfr-btn-clear',
  'gfr-results', 'gfr-empty', 'gfr-summary', 'gfr-case', 'gfr-regex', 'gfr-whole', 'gfr-scope',
  // Context menu
  'context-menu',
  // File input
  'folder-input',
];

for (const id of EXPECTED_IDS) {
  ok(`ID #${id} in HTML`, htmlIds.has(id), 'missing from index.html');
}

console.log('\n── 1b. Bundle $() calls have matching HTML IDs ─────────\n');

const KNOWN_DYNAMIC_IDS = new Set([
  // sidebar renders file-item elements dynamically
  // problems panel items rendered dynamically
]);
for (const id of bundleIds) {
  if (KNOWN_DYNAMIC_IDS.has(id)) continue;
  ok(`$('${id}') has matching HTML element`, htmlIds.has(id), 'referenced in JS but not in HTML');
}

// ══════════════════════════════════════════════════════════
console.log('\n── 1c. CSS class coverage ──────────────────────────────\n');
// ══════════════════════════════════════════════════════════

// Classes used in JS that must exist in CSS
const REQUIRED_CLASSES = [
  // Node/tab states
  'active', 'visible', 'modified', 'dragging',
  // Graph nodes
  'g-node', 'g-selected', 'g-unreachable', 'g-node-header', 'g-node-title', 'g-node-badge',
  'g-edge',
  // UI panels
  'file-item', 'tab',         // tabs use class 'tab', not 'tab-item'
  'problem-item', 'problem-sev', 'problem-msg', 'problem-loc',
  'vt-row', 'vt-name', 'vt-value', 'vt-section-label',
  // Find results (gfr-result-file is not used; rows group results differently)
  'gfr-result-row', 'gfr-result-ln', 'gfr-result-text',
];

for (const cls of REQUIRED_CLASSES) {
  ok(`CSS class .${cls} defined`, cssClasses.has(cls), 'used in JS but not in CSS');
}

// ══════════════════════════════════════════════════════════
console.log('\n── 1d. main.ts imports all graph exports ────────────────\n');
// ══════════════════════════════════════════════════════════

const GRAPH_IMPORTS = [
  'openSceneGraph', 'closeSceneGraph', 'refreshSceneGraph', 'fitView', 'zoomBy',
];
for (const fn of GRAPH_IMPORTS) {
  ok(`graph export '${fn}' imported in main.ts`, MAIN_TS.includes(fn));
}

// ══════════════════════════════════════════════════════════
console.log('\n── 1e. SVG marker IDs in HTML ──────────────────────────\n');
// ══════════════════════════════════════════════════════════

ok('SVG marker #arr-goto defined in HTML',  HTML.includes('id="arr-goto"'));
ok('SVG marker #arr-gosub defined in HTML', HTML.includes('id="arr-gosub"'));
// Edge markers are set via template literal: `url(#arr-${edge.kind})`
ok('marker-end template literal in bundle', BUNDLE.includes('url(#arr-${edge.kind})'));
ok('arr-goto marker referenced in HTML',    HTML.includes('arr-goto'));
ok('arr-gosub marker referenced in HTML',   HTML.includes('arr-gosub'));

// ══════════════════════════════════════════════════════════
console.log('\n── 1f. Graph z-index fix applied ───────────────────────\n');
// ══════════════════════════════════════════════════════════

ok('#graph-canvas has z-index: 3', STYLES.includes('z-index: 3'));
ok('#graph-svg-layer has z-index: 2', /graph-svg-layer[\s\S]{0,200}z-index:\s*2/.test(STYLES));
ok('z-index(canvas 3) > z-index(svg 2)', (() => {
  const canvasZ = STYLES.match(/#graph-canvas\s*\{[^}]*z-index:\s*(\d+)/);
  const svgZ    = STYLES.match(/#graph-svg-layer\s*\{[^}]*z-index:\s*(\d+)/);
  return canvasZ && svgZ && parseInt(canvasZ[1]) > parseInt(svgZ[1]);
})());

// ══════════════════════════════════════════════════════════
console.log('\n── 1g. Panning fix: no renderEdges during pan ──────────\n');
// ══════════════════════════════════════════════════════════

// In the compiled bundle, the panning block should NOT contain renderEdges()
// We extract the panning handler by finding the pattern
const panBlock = BUNDLE.match(/if \(panning\) \{[\s\S]*?drawGrid\(\);?\s*\}/)?.[0] || '';
ok('panning block does not call renderEdges()', panBlock.length > 0 && !panBlock.includes('renderEdges()'));
ok('panning block calls updXform()', panBlock.includes('updXform()'));
ok('panning block calls drawGrid()', panBlock.includes('drawGrid()'));

// ══════════════════════════════════════════════════════════
console.log('\n── 1h. Node data-id attribute set ──────────────────────\n');
// ══════════════════════════════════════════════════════════

ok('renderNodes sets el.dataset.id', BUNDLE.includes('el.dataset.id = String(n.id)'));
ok('selection uses dataset.id comparison', BUNDLE.includes('dataset.id === String(n.id)'));

// ══════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════');
console.log(`Suite 1 Result: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
}
console.log('══════════════════════════════════════════════════════════\n');

process.exitCode = fail > 0 ? 1 : 0;
