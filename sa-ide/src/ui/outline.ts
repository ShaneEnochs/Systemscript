// ---------------------------------------------------------------------------
// outline.ts — Label outline panel for quick in-file navigation.
// ---------------------------------------------------------------------------

import { editor, $ } from '../state.js';

export function refreshOutline(): void {
  const container = $('outline-list');
  const model = editor?.getModel();

  if (!model) {
    container.innerHTML = '<div class="outline-empty">No file open.</div>';
    return;
  }

  const labels: { name: string; line: number }[] = [];
  const lineCount = model.getLineCount();
  for (let i = 1; i <= lineCount; i++) {
    const line = model.getLineContent(i).trimStart();
    const m = line.match(/^\*label\s+(\S+)/);
    if (m) labels.push({ name: m[1], line: i });
  }

  if (!labels.length) {
    container.innerHTML = '<div class="outline-empty">No *label entries in this file.</div>';
    return;
  }

  container.innerHTML = labels.map(l =>
    `<div class="outline-item" data-line="${l.line}">⬦ ${l.name}</div>`
  ).join('');

  container.querySelectorAll('.outline-item').forEach(el => {
    (el as HTMLElement).addEventListener('click', () => {
      const ln = +(el as HTMLElement).dataset.line!;
      if (editor) {
        editor.revealLineInCenter(ln);
        editor.setPosition({ lineNumber: ln, column: 1 });
        editor.focus();
      }
    });
  });
}
