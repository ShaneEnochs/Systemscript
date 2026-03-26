// ---------------------------------------------------------------------------
// outline.ts — Label and choice outline panel for quick in-file navigation.
// ---------------------------------------------------------------------------

import { editor, $ } from '../state.js';

type OutlineItem = {
  label: string;
  line: number;
  kind: 'label' | 'choice';
};

export function refreshOutline(): void {
  const container = $('outline-list');
  const model = editor?.getModel();

  if (!model) {
    container.innerHTML = '<div class="outline-empty">No file open.</div>';
    return;
  }

  const items: OutlineItem[] = [];
  const lineCount = model.getLineCount();
  for (let i = 1; i <= lineCount; i++) {
    const line = model.getLineContent(i).trimStart();
    const mLabel = line.match(/^\*label\s+(\S+)/);
    if (mLabel) {
      items.push({ label: `⬦ ${mLabel[1]}`, line: i, kind: 'label' });
      continue;
    }

    const mChoice = line.match(/^#\s*(.+)$/);
    if (mChoice) {
      items.push({ label: `◈ ${mChoice[1]}`, line: i, kind: 'choice' });
      continue;
    }

    const mSelectable = line.match(/^\*selectable_if\b.*?#\s*(.+)$/);
    if (mSelectable) {
      items.push({ label: `◈ ${mSelectable[1]}`, line: i, kind: 'choice' });
    }
  }

  if (!items.length) {
    container.innerHTML = '<div class="outline-empty">No *label or choice entries in this file.</div>';
    return;
  }

  container.innerHTML = items.map(item =>
    `<div class="outline-item" data-kind="${item.kind}" data-line="${item.line}">${item.label}</div>`
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
