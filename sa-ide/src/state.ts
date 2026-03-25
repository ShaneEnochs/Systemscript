// ---------------------------------------------------------------------------
// state.ts — Shared mutable state, types, and utility functions.
//
// Every other module imports from here. This file imports from NOTHING
// inside src/ — it is the dependency root.
// ---------------------------------------------------------------------------

// ── Monaco global type (loaded via CDN, not npm) ──────────────────────────
// We reference the `monaco` namespace that exists at runtime after the AMD
// loader finishes.  The `declare` block tells TypeScript about it.
declare const monaco: typeof import('monaco-editor');

// ── Types ─────────────────────────────────────────────────────────────────

export interface FileType {
  label: string;
  color: string;
  badge: string;
}

export interface Tab {
  id:       number;
  name:     string;
  content:  string;
  model:    import('monaco-editor').editor.ITextModel;
  modified: boolean;
  fileType: FileType;
}

export interface FileEntry {
  name:     string;
  file?:    File;
  content?: string;
}

export interface GfrResult {
  tabId:      number;
  name:       string;
  line:       number;
  col:        number;
  text:       string;
  matchStart: number;
  matchEnd:   number;
  match:      string;
}

// ── File type classification ──────────────────────────────────────────────

const FILE_TYPES: Record<string, FileType> = {
  'startup.txt':    { label: 'Boot',       color: 'var(--file-startup)',  badge: 'BOOT'  },
  'stats.txt':      { label: 'Stats',      color: 'var(--file-stats)',    badge: 'STATS' },
  'skills.txt':     { label: 'Skills',     color: 'var(--file-skills)',   badge: 'SKILLS'},
  'items.txt':      { label: 'Items',      color: 'var(--file-items)',    badge: 'ITEMS' },
  'procedures.txt': { label: 'Procedures', color: 'var(--file-procs)',    badge: 'PROCS' },
  'glossary.txt':   { label: 'Glossary',   color: 'var(--file-stats)',    badge: 'GLOS'  },
};

export function getFileType(name: string): FileType {
  return FILE_TYPES[name] || { label: 'Scene', color: 'var(--file-scene)', badge: 'SCENE' };
}

// ── Utility functions ─────────────────────────────────────────────────────

export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

// ── Shared mutable state ──────────────────────────────────────────────────
// Modules read and write these directly.  The editor ref is set once by
// main.ts after Monaco initialises.

export let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;

export function setEditor(e: import('monaco-editor').editor.IStandaloneCodeEditor): void {
  editor = e;
}

export const tabs: Tab[] = [];

export let activeTabId: number | null = null;

export function setActiveTabId(id: number | null): void {
  activeTabId = id;
}

export let contextTabId: number | null = null;

export function setContextTabId(id: number | null): void {
  contextTabId = id;
}

export const fileMap = new Map<string, FileEntry>();

// ── Tab lookup helpers ────────────────────────────────────────────────────

export function getActiveTab(): Tab | undefined {
  return tabs.find(t => t.id === activeTabId);
}

export function getTab(id: number): Tab | undefined {
  return tabs.find(t => t.id === id);
}

// ── Layout helper ─────────────────────────────────────────────────────────

export function layoutEditor(): void {
  if (editor) requestAnimationFrame(() => editor!.layout());
}

// ── Sidebar selection (lives here to avoid circular dep tabs↔sidebar) ─────

export function updateSidebarSelection(name: string): void {
  document.querySelectorAll('.file-item').forEach(el => {
    (el as HTMLElement).classList.toggle('active', (el as HTMLElement).dataset.file === name);
  });
}

export function jumpToLine(ln: number): void {
  if (!editor) return;
  editor.revealLineInCenter(ln);
  editor.setPosition({ lineNumber: ln, column: 1 });
  editor.focus();
}
