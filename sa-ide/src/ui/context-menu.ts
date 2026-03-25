// ---------------------------------------------------------------------------
// context-menu.ts — Tab context menu.
// ---------------------------------------------------------------------------

import { getTab, setContextTabId, contextTabId, tabs, $ } from '../state.js';
import { closeTab, activateTab } from './tabs.js';

export function showContextMenu(e: MouseEvent, tabId: number): void {
  e.preventDefault();
  setContextTabId(tabId);
  const menu = $('context-menu');
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.classList.add('visible');
}

export function initContextMenu(): void {
  document.querySelectorAll('.ctx-item').forEach(el => {
    el.addEventListener('click', () => {
      const action = (el as HTMLElement).dataset.action;
      $('context-menu').classList.remove('visible');
      if (!contextTabId) return;
      if (action === 'close') closeTab(contextTabId);
      if (action === 'closeOthers') tabs.filter(t => t.id !== contextTabId).map(t => t.id).forEach(id => closeTab(id));
      if (action === 'closeAll') [...tabs].map(t => t.id).forEach(id => closeTab(id));
      if (action === 'save') {
        activateTab(contextTabId);
        // saveFile is called from file-ops — import would be circular.
        // Instead, dispatch a custom event.
        document.dispatchEvent(new CustomEvent('sa-save'));
      }
      if (action === 'copyPath') {
        const t = getTab(contextTabId);
        if (t) navigator.clipboard.writeText(t.name);
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!$('context-menu').contains(e.target as Node))
      $('context-menu').classList.remove('visible');
  });
}
