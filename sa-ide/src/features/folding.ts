// ---------------------------------------------------------------------------
// folding.ts — Custom folding range provider for sa-script.
// ---------------------------------------------------------------------------

declare const monaco: typeof import('monaco-editor');

export function registerFoldingProvider(): void {
  monaco.languages.registerFoldingRangeProvider('sa-script', {
    provideFoldingRanges(model: any) {
      const ranges: import('monaco-editor').languages.FoldingRange[] = [];
      const lineCount = model.getLineCount();
      const stack: { line: number; indent: number }[] = [];
      const sysStack: number[] = [];

      const pushRange = (s: number, e: number): void => {
        while (e > s && !model.getLineContent(e).trim()) e--;
        if (e > s) ranges.push({ start: s, end: e, kind: monaco.languages.FoldingRangeKind.Region });
      };

      for (let ln = 1; ln <= lineCount; ln++) {
        const raw = model.getLineContent(ln);
        const trimmed = raw.trimStart();
        if (!trimmed || trimmed.startsWith('//')) continue;
        const indent = raw.length - trimmed.length;

        if (/^\*system\b/.test(trimmed)) { sysStack.push(ln); continue; }
        if (/^\*end_system\b/.test(trimmed)) { if (sysStack.length) pushRange(sysStack.pop()!, ln); continue; }

        const isOpener =
          /^\*(if|elseif|else|selectable_if|choice|random_choice|loop|procedure|scene_list)\b/.test(trimmed) ||
          /^#/.test(trimmed);
        while (stack.length && stack[stack.length - 1].indent >= indent) {
          const f = stack.pop()!;
          pushRange(f.line, ln - 1);
        }
        if (isOpener) stack.push({ line: ln, indent });
      }
      while (stack.length) { const f = stack.pop()!; pushRange(f.line, lineCount); }
      return ranges;
    },
  });
}
