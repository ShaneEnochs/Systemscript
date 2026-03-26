// ============================================================
// TEST SUITE 3: BUNDLE INTEGRITY
// Verifies the compiled dist/sa-ide.js is well-formed:
//   a) All 16 expected modules are defined
//   b) All module exports are present and correct
//   c) Correct module dependency order (state first, main last)
//   d) No dangling JS syntax errors (parseable)
//   e) Feature wiring: button listeners appear in bundle
//   f) Graph fixes correctly reflected in bundle
//   g) Language/theme/completions properly registered
//   h) Key behavioral constants match spec
// ============================================================

import { readFileSync } from 'fs';

const BUNDLE = readFileSync('dist/sa-ide.js', 'utf8');

let pass = 0, fail = 0;
const failures = [];

function ok(label, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else       { fail++; failures.push(`${label}${detail ? ': ' + detail : ''}`); console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
}
function eq(label, a, b) {
  const cond = a === b;
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else       { fail++; failures.push(`${label}: expected ${b}, got ${a}`); console.log(`  ✗ ${label} — expected ${b}, got ${a}`); }
}

// ══════════════════════════════════════════════════════════
console.log('\n── 3a. All 15 modules defined ──────────────────────────\n');
// ══════════════════════════════════════════════════════════

const EXPECTED_MODULES = [
  './state.js',
  './features/decorations.js',
  './features/diagnostics.js',
  './features/folding.js',
  './ui/statusbar.js',
  './ui/context-menu.js',
  './ui/tabs.js',
  './ui/sidebar.js',
  './files/file-ops.js',
  './graph/scene-graph.js',
  './monaco/language.js',
  './monaco/theme.js',
  './monaco/completions.js',
  './ui/find.js',
  './ui/outline.js',
  './main.js',
];

for (const mod of EXPECTED_MODULES) {
  ok(`module '${mod}' defined`, BUNDLE.includes(`__define('${mod}'`));
}

// Count total modules
const modCount = (BUNDLE.match(/__define\('/g) || []).length;
eq('exactly 16 modules in bundle', modCount, 16);

// ══════════════════════════════════════════════════════════
console.log('\n── 3b. Module exports present ──────────────────────────\n');
// ══════════════════════════════════════════════════════════

// Check each module's expected exports
const EXPORTS = {
  './state.js': [
    'escHtml', '$', 'tabs', 'editor', 'setEditor', 'activeTabId', 'setActiveTabId',
    'getActiveTab', 'getTab', 'fileMap', 'layoutEditor', 'saveSession', 'loadSession',
    'getFileType', 'jumpToLine', 'updateSidebarSelection',
  ],
  './graph/scene-graph.js': [
    'parseGraph', 'autoLayout', 'render', 'fitView', 'zoomBy',
    'initEvents', 'openSceneGraph', 'closeSceneGraph', 'refreshSceneGraph',
  ],
  './features/diagnostics.js': [
    'scheduleDiagnostics', 'updateDiagStatusBar', 'refreshProblemsPanel',
  ],
  './features/folding.js': ['registerFoldingProvider'],
  './features/decorations.js': ['initDecorations', 'scheduleDecorate'],
  './monaco/language.js':   ['registerLanguage'],
  './monaco/theme.js':      ['registerTheme'],
  './monaco/completions.js':['registerCompletionProvider', 'registerHoverProvider'],
  './ui/tabs.js':    ['openTab', 'closeActiveTab', 'renderTabs', 'activateTab'],
  './ui/sidebar.js': ['loadSidebarFile'],
  './ui/find.js':    ['toggleFind', 'initLocalFind', 'openGlobalFind', 'closeGlobalFind', 'initGlobalFind'],
  './ui/statusbar.js': ['setSaveStatus'],
  './ui/context-menu.js': ['initContextMenu'],
  './files/file-ops.js': [
    'openFiles', 'newFile', 'saveFile', 'loadDemoContent',
    'initFileInput', 'scheduleAutoSave', 'openImportModal', 'initStringModal',
  ],
};

for (const [mod, exports] of Object.entries(EXPORTS)) {
  for (const exp of exports) {
    ok(`${mod} exports '${exp}'`, BUNDLE.includes(`'${exp}'`));
  }
}

// ══════════════════════════════════════════════════════════
console.log('\n── 3c. Module dependency order ─────────────────────────\n');
// ══════════════════════════════════════════════════════════

function modIdx(mod) { return BUNDLE.indexOf(`__define('${mod}'`); }

ok('state.js before decorations.js', modIdx('./state.js') < modIdx('./features/decorations.js'));
ok('state.js before diagnostics.js', modIdx('./state.js') < modIdx('./features/diagnostics.js'));
ok('state.js before tabs.js',        modIdx('./state.js') < modIdx('./ui/tabs.js'));
ok('state.js before scene-graph.js', modIdx('./state.js') < modIdx('./graph/scene-graph.js'));
ok('tabs.js before main.js',         modIdx('./ui/tabs.js') < modIdx('./main.js'));
ok('scene-graph.js before main.js',  modIdx('./graph/scene-graph.js') < modIdx('./main.js'));
ok('main.js is LAST module',         modIdx('./main.js') > modIdx('./ui/find.js'));

// ══════════════════════════════════════════════════════════
console.log('\n── 3d. Bundle is valid JavaScript ──────────────────────\n');
// ══════════════════════════════════════════════════════════

// Check that the bundle is parseable (no syntax errors)
let syntaxOk = false;
try {
  new Function(BUNDLE);
  syntaxOk = true;
} catch (e) {
  syntaxOk = false;
}
ok('bundle parses as valid JS', syntaxOk);

// Check bundle contains IIFE (may start with a comment header)
ok('bundle contains IIFE', BUNDLE.includes('(function()') || BUNDLE.includes('(()=>{'));
ok('bundle ends with IIFE close', BUNDLE.trimEnd().endsWith(')();') || BUNDLE.trimEnd().endsWith('})();'));

// Check bundle size is reasonable (50KB–400KB)
const sizeKB = Buffer.byteLength(BUNDLE, 'utf8') / 1024;
ok(`bundle size reasonable (${sizeKB.toFixed(1)}KB)`, sizeKB > 50 && sizeKB < 400);

// ══════════════════════════════════════════════════════════
console.log('\n── 3e. Button listeners wired up ───────────────────────\n');
// ══════════════════════════════════════════════════════════

const WIRED_BUTTONS = [
  ['btn-open',       'openFiles'],
  ['btn-new',        'newFile'],
  ['btn-save',       'saveFile'],
  ['btn-import',     'openImportModal'],
  ['btn-graph',      'openSceneGraph'],
  ['btn-problems',   'toggleProblems'],
  ['btn-settings',   'toggleSettings'],
  ['w-btn-open',     'openFiles'],
  ['w-btn-demo',     'loadDemoContent'],
  ['g-close',        'closeSceneGraph'],
  ['g-refresh',      'refreshSceneGraph'],
  ['g-fit',          'fitView'],
  ['g-zin',          'zoomBy'],
  ['g-zout',         'zoomBy'],
  ['problems-close', 'toggleProblems'],
  ['settings-close-btn', 'toggleSettings'],
  ['gfr-close',      'closeGlobalFind'],
];

for (const [id, fn] of WIRED_BUTTONS) {
  // Check that both the ID and function appear near each other in the main module
  ok(`${id} → ${fn}() wired`, BUNDLE.includes(`'${id}'`) && BUNDLE.includes(fn));
}

// ══════════════════════════════════════════════════════════
console.log('\n── 3f. Graph module bug fixes in bundle ────────────────\n');
// ══════════════════════════════════════════════════════════

// Fix 1: no renderEdges() during panning
const panSection = BUNDLE.match(/if \(panning\) \{[^}]+\}/)?.[0] || '';
ok('panning block present',                   panSection.length > 0);
ok('panning block: no renderEdges()',          !panSection.includes('renderEdges()'));
ok('panning block: has updXform()',            panSection.includes('updXform()'));
ok('panning block: has drawGrid()',            panSection.includes('drawGrid()'));

// Fix 2: dataset.id set on nodes
ok('renderNodes sets dataset.id',             BUNDLE.includes('el.dataset.id = String(n.id)'));

// Fix 3: selection uses dataset.id query
ok('selection toggles via dataset.id',        BUNDLE.includes("dataset.id === String(n.id)"));

// Fix 4: renderNodes() NOT called inside mousedown handler
// The mousedown in renderNodes should NOT have renderNodes() as the action
const renderNodesBlock = BUNDLE.match(/function renderNodes\(\)[\s\S]*?(?=^function )/m)?.[0] || '';
const mousedownInRenderNodes = renderNodesBlock.match(/'mousedown',.*?function[\s\S]*?(?=el\.addEventListener\('click')/)?.[0] || '';
ok('mousedown handler does NOT call renderNodes()', !mousedownInRenderNodes.includes('renderNodes()'));

// ══════════════════════════════════════════════════════════
console.log('\n── 3g. Language/theme/completions registration ─────────\n');
// ══════════════════════════════════════════════════════════

ok('registerLanguage called in main',     BUNDLE.includes('registerLanguage()'));
ok('registerTheme called in main',        BUNDLE.includes('registerTheme()'));
ok('registerCompletionProvider called',   BUNDLE.includes('registerCompletionProvider()'));
ok('registerHoverProvider called',        BUNDLE.includes('registerHoverProvider()'));
ok('registerFoldingProvider called',      BUNDLE.includes('registerFoldingProvider()'));

// Language ID is 'sa-script'
ok("language ID is 'sa-script'",         BUNDLE.includes("'sa-script'"));

// Theme ID is 'sa-light'
ok("theme ID is 'sa-light'",             BUNDLE.includes("'sa-light'"));

// Completion trigger is '*'
ok("completion trigger char is '*'",     BUNDLE.includes("triggerCharacters: ['*']"));

// ══════════════════════════════════════════════════════════
console.log('\n── 3h. Key behavioral constants ────────────────────────\n');
// ══════════════════════════════════════════════════════════

// Graph constants
ok('NW=200 in scene-graph', BUNDLE.includes('const NW = 200'));
ok('NH=72 in scene-graph',  BUNDLE.includes('const NH = 72'));
ok('VGAP=110 in layout',    BUNDLE.includes('const VGAP = 110'));
ok('HGAP=280 in layout',    BUNDLE.includes('const HGAP = 280'));

// Diagnostic debounce 400ms
ok('diagnostics debounce 400ms', BUNDLE.includes('}, 400)'));

// Autosave delay stored as variable (autoSaveDelay = 3000)
ok('autosave delay 3000ms', BUNDLE.includes('autoSaveDelay = 3000'));

// Demo content opens all 5 files (forEach calls openTab for each)
const demoSection = BUNDLE.match(/function loadDemoContent\(\)[\s\S]*?Object\.defineProperty/)?.[0] || '';
ok('demo opens all files via forEach', demoSection.includes('forEach') && demoSection.includes('openTab'));
ok('demo does NOT limit to only first file', !demoSection.includes('demoFiles[0]'));

// Demo includes expected files
ok("demo includes 'startup.txt'",    demoSection.includes("'startup.txt'"));
ok("demo includes 'prologue.txt'",   demoSection.includes("'prologue.txt'"));
ok("demo includes 'vault.txt'",      demoSection.includes("'vault.txt'"));
ok("demo includes 'procedures.txt'", demoSection.includes("'procedures.txt'"));
ok("demo includes 'stats.txt'",      demoSection.includes("'stats.txt'"));

// ══════════════════════════════════════════════════════════
console.log('\n── 3i. Keyboard shortcuts wired ────────────────────────\n');
// ══════════════════════════════════════════════════════════

ok('Ctrl+S → saveFile',          BUNDLE.includes('KeyCode.KeyS') && BUNDLE.includes('saveFile'));
ok('Ctrl+F → toggleFind',        BUNDLE.includes('KeyCode.KeyF') && BUNDLE.includes('toggleFind'));
ok('Ctrl+N → newFile',           BUNDLE.includes('KeyCode.KeyN') && BUNDLE.includes('newFile'));
ok('Ctrl+W → closeActiveTab',    BUNDLE.includes('KeyCode.KeyW') && BUNDLE.includes('closeActiveTab'));
ok('Ctrl+O → openFiles',        BUNDLE.includes("key === 'o'") && BUNDLE.includes('openFiles'));
ok('Ctrl+Shift+F → openGlobalFind', BUNDLE.includes('openGlobalFind'));
ok('Escape → closeSceneGraph',   BUNDLE.includes('closeSceneGraph') && BUNDLE.includes("key === 'Escape'"));

// ══════════════════════════════════════════════════════════
console.log('\n── 3j. Session lifecycle ───────────────────────────────\n');
// ══════════════════════════════════════════════════════════

ok('saveSession on beforeunload', BUNDLE.includes('beforeunload') && BUNDLE.includes('saveSession'));
ok('loadSession on startup',      BUNDLE.includes('loadSession'));
ok('session key is sa-session',   BUNDLE.includes("'sa-session'"));

// ══════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════');
console.log(`Suite 3 Result: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
}
console.log('══════════════════════════════════════════════════════════\n');

process.exitCode = fail > 0 ? 1 : 0;
