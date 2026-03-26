// ---------------------------------------------------------------------------
// tabs.ts — Tab management: open, activate, close, render.
// ---------------------------------------------------------------------------

import {
  editor, tabs, activeTabId, setActiveTabId, getTab, getFileType,
  $, updateSidebarSelection, saveSession, fileMap,
} from '../state.js';
import { updateStatusBar } from './statusbar.js';
import { showContextMenu } from './context-menu.js';

declare const monaco: typeof import('monaco-editor');

export function openTab(name: string, content: string): void {
  const existing = tabs.find(t => t.name === name);
  if (existing) { activateTab(existing.id); return; }

  const id = Date.now() + Math.random();
  const ft = getFileType(name);
  const model = monaco.editor.createModel(content, 'sa-script');
  tabs.push({ id, name, content, model, modified: false, fileType: ft });
  if (!fileMap.has(name)) fileMap.set(name, { name, content });
  window.dispatchEvent(new CustomEvent('sa-project-files-changed'));

  activateTab(id);
  $('welcome').style.display = 'none';
  saveSession();
}

export function activateTab(id: number): void {
  setActiveTabId(id);
  const tab = getTab(id);
  if (!tab || !editor) return;
  editor.setModel(tab.model);
  editor.focus();
  renderTabs();
  updateSidebarSelection(tab.name);
  updateStatusBar(tab);
}

export function closeTab(id: number, event?: Event): void {
  if (event) event.stopPropagation();
  const tab = getTab(id);
  if (!tab) return;
  if (tab.modified && !confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
  tab.model.dispose();
  const idx = tabs.findIndex(t => t.id === id);
  tabs.splice(idx, 1);
  if (activeTabId === id) {
    const next = tabs[Math.min(idx, tabs.length - 1)];
    setActiveTabId(next ? next.id : null);
    if (next) {
      activateTab(next.id);
    } else {
      editor!.setModel(null);
      $('welcome').style.display = 'flex';
      updateStatusBar(null);
    }
  }
  saveSession();
  renderTabs();
}

export function closeActiveTab(): void {
  if (activeTabId) closeTab(activeTabId);
}

export function renderTabs(): void {
  const bar = $('tab-bar');
  bar.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '') + (tab.modified ? ' modified' : '');
    el.innerHTML = `<span class="tab-dot" style="background:${tab.fileType.color}"></span><span>${tab.name}</span><button class="tab-close" title="Close"></button>`;
    el.addEventListener('click', () => activateTab(tab.id));
    el.addEventListener('contextmenu', e => showContextMenu(e, tab.id));
    el.querySelector('.tab-close')!.addEventListener('click', e => closeTab(tab.id, e));
    bar.appendChild(el);
  });
}
