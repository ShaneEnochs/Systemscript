// ---------------------------------------------------------------------------
// main.ts — Entry point for the SA Script Editor.
//
// Runs inside the Monaco AMD `require()` callback. Registers the language,
// creates the editor, and wires all modules together.
// ---------------------------------------------------------------------------

import { editor, setEditor, tabs, getActiveTab, layoutEditor, saveSession, loadSession, activeTabId, setActiveTabId, $ } from './state.js';
import { registerLanguage } from './monaco/language.js';
import { registerTheme } from './monaco/theme.js';
import { registerCompletionProvider, registerHoverProvider, registerCompletionProvider2 } from './monaco/completions.js';
import { initDecorations, scheduleDecorate } from './features/decorations.js';
import { scheduleDiagnostics } from './features/diagnostics.js';
import { registerFoldingProvider } from './features/folding.js';
import { openTab, closeActiveTab, renderTabs, activateTab } from './ui/tabs.js';
import { initContextMenu } from './ui/context-menu.js';
import { initSidebarMenu } from './ui/sidebar.js';
import { toggleFind, initLocalFind, openGlobalFind, closeGlobalFind, initGlobalFind } from './ui/find.js';
import { setSaveStatus } from './ui/statusbar.js';
import { refreshOutline } from './ui/outline.js';
import { openFolder, newFile, saveFile, loadDemoContent, initFolderInput, scheduleAutoSave, exportProject } from './files/file-ops.js';
import { openSceneGraph, closeSceneGraph, refreshSceneGraph, fitView, zoomBy } from './graph/scene-graph.js';

declare const require: any;

// ── Monaco AMD loader config ──────────────────────────────────────────────
require.config({
  paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' },
});

require(['vs/editor/editor.main'], function () {

  // ── Register language, theme, providers ──────────────────────────────────
  registerLanguage();
  registerTheme();
  registerCompletionProvider();
  registerHoverProvider();
  registerCompletionProvider2();
  registerFoldingProvider();

  // ── Create editor ───────────────────────────────────────────────────────
  const ed = (window as any).monaco.editor.create($('monaco-mount'), {
    value: '',
    language: 'sa-script',
    theme: 'sa-light',
    fontFamily: '"DM Mono", "Fira Code", monospace',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
    wordWrap: 'on',
    lineNumbers: 'on',
    renderLineHighlight: 'line',
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    guides: { indentation: true, bracketPairs: true },
    bracketPairColorization: { enabled: true },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    padding: { top: 12, bottom: 24 },
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: false,
    folding: true,
    suggest: { showWords: false },
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    overviewRulerLanes: 0,
    automaticLayout: true,
  });
  setEditor(ed);

  // ── Init decoration collection ──────────────────────────────────────────
  initDecorations();

  // ── Editor event hooks ──────────────────────────────────────────────────
  ed.onDidChangeCursorPosition((e: any) => {
    $('sb-cursor').textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
  });

  ed.onDidChangeModelContent(() => {
    const tab = getActiveTab();
    if (tab && !tab.modified) {
      tab.modified = true;
      renderTabs();
      setSaveStatus('Unsaved changes');
    }
    scheduleAutoSave();
    scheduleDecorate();
    scheduleDiagnostics();
    refreshOutline();
  });

  ed.onDidChangeModel(() => {
    scheduleDecorate();
    scheduleDiagnostics();
    refreshOutline();
  });

  // ── Restore session or load demo ────────────────────────────────────────
  const saved = loadSession();
  if (saved) {
    saved.tabs.forEach(st => {
      openTab(st.name, st.content);
    });
    if (saved.activeIndex >= 0 && saved.activeIndex < tabs.length) {
      activateTab(tabs[saved.activeIndex].id);
    }
    $('welcome').style.display = 'none';
  }

  // ── Keybindings ─────────────────────────────────────────────────────────
  const monaco = (window as any).monaco;
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveFile);
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, toggleFind);
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, newFile);
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, closeActiveTab);

  // ── Initial passes ──────────────────────────────────────────────────────
  scheduleDecorate();
  scheduleDiagnostics();
  refreshOutline();
  window.addEventListener('resize', layoutEditor);

  // ── Wire up all button listeners ────────────────────────────────────────

  // Toolbar
  $('btn-open').addEventListener('click', openFolder);
  $('sb-btn-open').addEventListener('click', openFolder);
  $('btn-new').addEventListener('click', newFile);
  $('sb-btn-new').addEventListener('click', newFile);
  $('btn-save').addEventListener('click', saveFile);
  $('btn-find').addEventListener('click', toggleFind);
  $('btn-problems').addEventListener('click', toggleProblems);
  $('problems-close').addEventListener('click', toggleProblems);
  $('btn-settings').addEventListener('click', toggleSettings);
  $('settings-close-btn').addEventListener('click', toggleSettings);
  $('btn-graph').addEventListener('click', openSceneGraph);
  $('btn-export').addEventListener('click', exportProject);

  // Welcome buttons
  $('w-btn-open').addEventListener('click', openFolder);
  $('w-btn-new').addEventListener('click', newFile);
  $('w-btn-demo').addEventListener('click', loadDemoContent);

  // Status bar
  $('sb-diag').addEventListener('click', toggleProblems);

  // Settings controls
  ($('s-fontsize') as HTMLInputElement).addEventListener('input', function () { ed.updateOptions({ fontSize: +this.value }); });
  ($('s-tabsize') as HTMLSelectElement).addEventListener('change', function () { ed.updateOptions({ tabSize: +this.value }); });
  ($('s-wordwrap') as HTMLInputElement).addEventListener('change', function () { ed.updateOptions({ wordWrap: this.checked ? 'on' : 'off' }); });
  ($('s-linenums') as HTMLInputElement).addEventListener('change', function () { ed.updateOptions({ lineNumbers: this.checked ? 'on' : 'off' }); });
  ($('s-minimap') as HTMLInputElement).addEventListener('change', function () { ed.updateOptions({ minimap: { enabled: this.checked } }); });

  // Variable tracker toggle
  $('btn-toggle-vt').addEventListener('click', () => {
    $('var-tracker').classList.toggle('visible');
  });

  // Outline panel toggle
  $('btn-toggle-outline').addEventListener('click', () => {
    $('outline-panel').classList.toggle('visible');
    if ($('outline-panel').classList.contains('visible')) refreshOutline();
  });

  // Sidebar resize
  let resizing = false;
  const resizeHandle = $('sidebar-resize');
  resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
    resizing = true;
    resizeHandle.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!resizing) return;
    $('sidebar').style.width = Math.max(140, Math.min(400, e.clientX)) + 'px';
    layoutEditor();
  });
  document.addEventListener('mouseup', () => {
    resizing = false;
    resizeHandle.classList.remove('dragging');
  });

  // Scene graph buttons
  $('g-close').addEventListener('click', closeSceneGraph);
  $('g-refresh').addEventListener('click', refreshSceneGraph);
  $('g-fit').addEventListener('click', () => fitView());
  $('g-layout').addEventListener('click', () => {
    import('./graph/scene-graph.js').then(g => { g.autoLayout(); g.render(); g.fitView(); });
  });
  $('g-zin').addEventListener('click', () => zoomBy(1));
  $('g-zout').addEventListener('click', () => zoomBy(-1));

  // File input wiring
  initFolderInput();

  // Context menus
  initContextMenu();
  initSidebarMenu();

  // Find bars
  initLocalFind();
  initGlobalFind();

  // Save from context menu
  document.addEventListener('sa-save', () => saveFile());

  // Persist session on page unload
  window.addEventListener('beforeunload', () => saveSession());

  // ── Global key bindings ─────────────────────────────────────────────────
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); openFolder(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') { e.preventDefault(); openGlobalFind(); }
    if (e.key === 'Escape') {
      if ($('gfr-overlay').classList.contains('visible')) closeGlobalFind();
      if ($('graph-overlay').classList.contains('visible')) closeSceneGraph();
    }

    // Ctrl+Tab / Ctrl+Shift+Tab: cycle through tabs
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault();
      if (tabs.length < 2) return;
      const currentIdx = tabs.findIndex(t => t.id === activeTabId);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + tabs.length) % tabs.length
        : (currentIdx + 1) % tabs.length;
      activateTab(tabs[nextIdx].id);
    }
  });
});

// ── Panel toggles (defined outside require so they're hoisted) ────────────

function toggleProblems(): void {
  $('problems-panel').classList.toggle('visible');
  layoutEditor();
}

function toggleSettings(): void {
  $('settings-panel').classList.toggle('visible');
}
