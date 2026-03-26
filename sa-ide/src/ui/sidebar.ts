// ---------------------------------------------------------------------------
// sidebar.ts — File tree panel rendering and sidebar file actions.
// ---------------------------------------------------------------------------

import { FileEntry, getFileType, $, fileMap } from '../state.js';
import { openTab, activateTab } from './tabs.js';
import { tabs } from '../state.js';
import { deleteFile, renameFile } from '../files/file-ops.js';

export function renderSidebar(files: FileEntry[]): void {
  const list = $('file-list');
  const empty = $('sidebar-empty');
  empty.style.display = files.length ? 'none' : 'flex';

  const systemOrder = ['startup.txt', 'stats.txt', 'skills.txt', 'items.txt', 'procedures.txt'];
  const groups: Record<string, FileEntry[]> = {
    boot:   files.filter(f => f.name === 'startup.txt'),
    system: files.filter(f => ['stats.txt', 'skills.txt', 'items.txt', 'procedures.txt'].includes(f.name)),
    scenes: files.filter(f => !systemOrder.includes(f.name) && f.name !== 'glossary.txt'),
    data:   files.filter(f => f.name === 'glossary.txt'),
  };

  list.innerHTML = '';
  ([['boot', 'Boot'], ['system', 'System'], ['scenes', 'Scenes'], ['data', 'Data']] as const).forEach(([key, label]) => {
    if (!groups[key]?.length) return;
    const g = document.createElement('div');
    g.className = 'file-group';
    g.innerHTML = `<div class="file-group-label">${label}</div>`;
    groups[key].forEach(f => {
      const ft = getFileType(f.name);
      const item = document.createElement('div');
      item.className = 'file-item';
      item.dataset.file = f.name;
      item.innerHTML = `<span class="file-dot" style="background:${ft.color}"></span><span class="filename">${f.name}</span><span class="file-badge">${ft.badge}</span>`;
      item.addEventListener('click', () => loadSidebarFile(f));
      item.addEventListener('contextmenu', (e: MouseEvent) => showSidebarMenu(e, f.name));
      g.appendChild(item);
    });
    list.appendChild(g);
  });
  list.appendChild(empty);
}

// ── Sidebar context menu ──────────────────────────────────────────────────

let _menuTarget: string | null = null;

function showSidebarMenu(e: MouseEvent, filename: string): void {
  e.preventDefault();
  _menuTarget = filename;
  const menu = $('sidebar-menu');
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.classList.add('visible');
}

export function initSidebarMenu(): void {
  document.querySelectorAll('#sidebar-menu .ctx-item').forEach(el => {
    el.addEventListener('click', () => {
      const action = (el as HTMLElement).dataset.action;
      $('sidebar-menu').classList.remove('visible');
      if (!_menuTarget) return;
      if (action === 'rename') {
        const newName = prompt(`Rename "${_menuTarget}" to:`, _menuTarget);
        if (newName?.trim() && newName.trim() !== _menuTarget) {
          const n = newName.trim().endsWith('.txt') ? newName.trim() : newName.trim() + '.txt';
          renameFile(_menuTarget!, n);
        }
      }
      if (action === 'delete') {
        deleteFile(_menuTarget!);
      }
      _menuTarget = null;
    });
  });

  document.addEventListener('click', (e) => {
    const menu = $('sidebar-menu');
    if (!menu.contains(e.target as Node)) menu.classList.remove('visible');
  });
}

// updateSidebarSelection lives in state.ts to avoid circular dep with tabs.ts

export function loadSidebarFile(f: FileEntry): void {
  const existing = tabs.find(t => t.name === f.name);
  if (existing) { activateTab(existing.id); return; }
  if (f.content !== undefined) { openTab(f.name, f.content); return; }
  if (f.file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      f.content = (e.target as FileReader).result as string;
      openTab(f.name, f.content!);
    };
    reader.readAsText(f.file);
  }
}
