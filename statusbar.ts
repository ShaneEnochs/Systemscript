// ---------------------------------------------------------------------------
// statusbar.ts — Status bar updates.
// ---------------------------------------------------------------------------

import { Tab, $ } from '../state.js';

export function updateStatusBar(tab: Tab | null | undefined): void {
  $('sb-filename').textContent = tab ? tab.name : 'No file open';
  $('sb-type').textContent = tab ? tab.fileType.label : '—';
  $('sb-saved').textContent = tab ? (tab.modified ? '● Unsaved' : '✓ Saved') : '—';
}

export function setSaveStatus(msg: string): void {
  $('sb-saved').textContent = msg;
}
