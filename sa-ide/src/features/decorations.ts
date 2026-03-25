// ---------------------------------------------------------------------------
// decorations.ts — Semantic indentation guides and block header highlights.
// ---------------------------------------------------------------------------

import { editor } from '../state.js';

declare const monaco: typeof import('monaco-editor');

let decorationCollection: import('monaco-editor').editor.IEditorDecorationsCollection | null = null;
let _timer: ReturnType<typeof setTimeout> | null = null;

export function initDecorations(): void {
  if (editor) {
    decorationCollection = editor.createDecorationsCollection([]);
  }
}

function blockCategory(t: string): string | null {
  if (/^\*(if|elseif|selectable_if)\b/.test(t)) return 'if';
  if (/^\*(choice|random_choice)\b/.test(t))    return 'choice';
  if (/^\*loop\b/.test(t))                       return 'loop';
  if (/^\*procedure\b/.test(t))                  return 'proc';
  if (/^\*system\b/.test(t))                     return 'system';
  if (/^#/.test(t))                              return 'option';
  return null;
}

function buildDecorations(model: import('monaco-editor').editor.ITextModel): import('monaco-editor').editor.IModelDeltaDecoration[] {
  const lineCount = model.getLineCount();
  const decs: import('monaco-editor').editor.IModelDeltaDecoration[] = [];
  const stack: { indent: number; category: string }[] = [];

  for (let ln = 1; ln <= lineCount; ln++) {
    const raw = model.getLineContent(ln);
    const trimmed = raw.trimStart();
    if (!trimmed) continue;
    const indent = raw.length - trimmed.length;
    const isComment = trimmed.startsWith('//');

    if (!isComment) {
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    }

    stack.forEach(frame => {
      decs.push({
        range: new monaco.Range(ln, 1, ln, 1),
        options: { isWholeLine: false, className: `sa-guide-${frame.category}` },
      });
    });

    if (!isComment) {
      const cat = blockCategory(trimmed);
      if (cat) {
        decs.push({
          range: new monaco.Range(ln, 1, ln, 1),
          options: { isWholeLine: true, className: `sa-block-header-${cat}` },
        });
        stack.push({ indent, category: cat });
      }
    }
  }
  return decs;
}

export function scheduleDecorate(): void {
  if (_timer !== null) clearTimeout(_timer);
  _timer = setTimeout(() => {
    const model = editor?.getModel();
    if (model && decorationCollection) {
      decorationCollection.set(buildDecorations(model));
    }
  }, 80);
}
