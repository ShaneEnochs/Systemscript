// ---------------------------------------------------------------------------
// diagnostics.ts — Inline linting, variable tracker, and problems panel.
// ---------------------------------------------------------------------------

import { editor, getActiveTab, escHtml, jumpToLine, $, tabs, fileMap } from '../state.js';

declare const monaco: typeof import('monaco-editor');

const DIAG_OWNER = 'sa-diagnostics';
let _timer: ReturnType<typeof setTimeout> | null = null;

// ── Diagnostic runner ─────────────────────────────────────────────────────

function runDiagnostics(
  model: import('monaco-editor').editor.ITextModel,
  filename: string,
): void {
  const markers: import('monaco-editor').editor.IMarkerData[] = [];
  const lineCount = model.getLineCount();
  const isStartup = filename === 'startup.txt';

  interface ParsedLine { raw: string; trimmed: string; indent: number; ln: number }
  const lines: ParsedLine[] = [];
  for (let i = 1; i <= lineCount; i++) {
    const raw = model.getLineContent(i);
    const trimmed = raw.trimStart();
    lines.push({ raw, trimmed, indent: raw.length - trimmed.length, ln: i });
  }

  const addMarker = (
    ln: number, col: number, endCol: number,
    message: string, severity: number,
  ): void => {
    markers.push({ severity, message, startLineNumber: ln, startColumn: col, endLineNumber: ln, endColumn: endCol });
  };
  const addError   = (ln: number, c: number, ec: number, msg: string) => addMarker(ln, c, ec, msg, monaco.MarkerSeverity.Error);
  const addWarning = (ln: number, c: number, ec: number, msg: string) => addMarker(ln, c, ec, msg, monaco.MarkerSeverity.Warning);

  // Pass 1: collect labels, track *system blocks
  const definedLabels = new Map<string, number>();
  const openSystemLns: number[] = [];

  lines.forEach(({ trimmed, indent, ln }) => {
    if (!trimmed || trimmed.startsWith('//')) return;
    const mLabel = trimmed.match(/^\*label\s+(\S+)/);
    if (mLabel) {
      const name = mLabel[1].toLowerCase();
      if (definedLabels.has(name)) {
        addError(ln, indent + 1, indent + 1 + trimmed.length,
          `Duplicate *label "${mLabel[1]}" — already defined at line ${definedLabels.get(name)}.`);
      } else { definedLabels.set(name, ln); }
    }
    if (/^\*system\b/.test(trimmed)) openSystemLns.push(ln);
    if (/^\*end_system\b/.test(trimmed)) openSystemLns.pop();
  });

  openSystemLns.forEach(sln => {
    const t = lines[sln - 1];
    addError(sln, t.indent + 1, t.indent + 1 + t.trimmed.length,
      '*system block is never closed — add *end_system.');
  });

  // Build set of all known scene file names (for cross-file validation)
  const knownScenes = new Set<string>();
  for (const fname of fileMap.keys()) {
    knownScenes.add(fname.toLowerCase());
    knownScenes.add(fname.toLowerCase().replace(/\.txt$/i, ''));
  }
  for (const tab of tabs) {
    knownScenes.add(tab.name.toLowerCase());
    knownScenes.add(tab.name.toLowerCase().replace(/\.txt$/i, ''));
  }

  // Build declared variable set from all open tabs (for undefined-var detection)
  const declaredVars = new Set<string>();
  for (const tab of tabs) {
    const content = tab.model.getValue();
    for (const line of content.split('\n')) {
      const t = line.trimStart();
      const mC = t.match(/^\*create(?:_stat)?\s+([a-zA-Z_]\w*)/);
      if (mC) declaredVars.add(mC[1].toLowerCase());
      const mT = t.match(/^\*temp\s+([a-zA-Z_]\w*)/);
      if (mT) declaredVars.add(mT[1].toLowerCase());
    }
  }
  // Also collect from current model (handles unsaved declarations)
  lines.forEach(({ trimmed }) => {
    const mC = trimmed.match(/^\*create(?:_stat)?\s+([a-zA-Z_]\w*)/);
    if (mC) declaredVars.add(mC[1].toLowerCase());
    const mT = trimmed.match(/^\*temp\s+([a-zA-Z_]\w*)/);
    if (mT) declaredVars.add(mT[1].toLowerCase());
  });

  // Pass 2: validate references
  lines.forEach(({ raw, trimmed, indent, ln }) => {
    if (!trimmed || trimmed.startsWith('//')) return;

    if (isStartup && /^\*temp\b/.test(trimmed))
      addError(ln, indent + 1, indent + 1 + 5, '*temp cannot be used in startup.txt — use *create.');

    if (!isStartup && /^\*create\b/.test(trimmed) && !/^\*create_stat\b/.test(trimmed))
      addWarning(ln, indent + 1, indent + 1 + 7, '*create should only appear in startup.txt. Use *temp for scene-local variables.');

    const mGoto = trimmed.match(/^\*goto\s+(\S+)/);
    if (mGoto && !/^\*goto_scene/.test(trimmed)) {
      if (!definedLabels.has(mGoto[1].toLowerCase())) {
        const col = indent + 1 + trimmed.indexOf(mGoto[1]);
        addError(ln, col, col + mGoto[1].length, `*goto references undefined label "${mGoto[1]}".`);
      }
    }

    const mGosub = trimmed.match(/^\*gosub\s+(\S+)/);
    if (mGosub && !/^\*gosub_scene/.test(trimmed)) {
      if (!definedLabels.has(mGosub[1].toLowerCase())) {
        const col = indent + 1 + trimmed.indexOf(mGosub[1]);
        addError(ln, col, col + mGosub[1].length, `*gosub references undefined label "${mGosub[1]}".`);
      }
    }

    // Cross-file: *goto_scene / *gosub_scene validation
    const mGotoScene = trimmed.match(/^\*goto_scene\s+(\S+)/);
    if (mGotoScene && knownScenes.size > 0) {
      const raw2 = mGotoScene[1];
      const stem = raw2.toLowerCase().replace(/\.txt$/i, '');
      if (!knownScenes.has(stem) && !knownScenes.has(stem + '.txt')) {
        const col = indent + 1 + trimmed.indexOf(raw2);
        addError(ln, col, col + raw2.length,
          `*goto_scene "${raw2}" — scene not found in project. Open or create "${stem}.txt".`);
      }
    }

    const mGosubScene = trimmed.match(/^\*gosub_scene\s+(\S+)/);
    if (mGosubScene && knownScenes.size > 0) {
      const raw2 = mGosubScene[1].split(/\s/)[0];
      const stem = raw2.toLowerCase().replace(/\.txt$/i, '');
      if (!knownScenes.has(stem) && !knownScenes.has(stem + '.txt')) {
        const col = indent + 1 + trimmed.indexOf(raw2);
        addError(ln, col, col + raw2.length,
          `*gosub_scene "${raw2}" — scene not found in project. Open or create "${stem}.txt".`);
      }
    }

    if (/^\*(if|elseif|loop)\s*$/.test(trimmed))
      addError(ln, indent + 1, indent + 1 + trimmed.length, `${trimmed.trim()} requires a condition.`);

    if (/^\*choice\s*$/.test(trimmed)) {
      let hasOpt = false;
      for (let k = ln; k < Math.min(ln + 15, lines.length); k++) {
        const next = lines[k];
        if (!next?.trimmed) continue;
        if (next.indent <= indent && next.ln > ln) break;
        if (/^(\*selectable_if.*)?#/.test(next.trimmed)) { hasOpt = true; break; }
      }
      if (!hasOpt)
        addWarning(ln, indent + 1, indent + 1 + trimmed.length,
          '*choice has no options — add at least one # line beneath it.');
    }

    // Check {varname} interpolations against declared vars (only when vars are known)
    if (declaredVars.size > 0 && !trimmed.startsWith('*') && !trimmed.startsWith('//')) {
      const interpRe = /\{([a-zA-Z_]\w*)\}/g;
      let im: RegExpExecArray | null;
      while ((im = interpRe.exec(raw)) !== null) {
        const varname = im[1];
        if (!declaredVars.has(varname.toLowerCase())) {
          const col = im.index + 1;
          addWarning(ln, col, col + im[0].length,
            `Variable "{${varname}}" may not be declared — check *create or *temp.`);
        }
      }
    }
  });

  monaco.editor.setModelMarkers(model, DIAG_OWNER, markers);
}

// ── Variable tracker ──────────────────────────────────────────────────────

function buildVarTracker(
  model: import('monaco-editor').editor.ITextModel,
  filename: string,
): void {
  const panel = $('var-tracker-list');
  const lineCount = model.getLineCount();
  const globals: { name: string; value: string; ln: number }[] = [];
  const temps: { name: string; value: string; ln: number }[] = [];

  for (let i = 1; i <= lineCount; i++) {
    const raw = model.getLineContent(i);
    const trimmed = raw.trimStart();
    const mC = trimmed.match(/^\*create(?:_stat)?\s+([a-zA-Z_][\w]*)\s+(.+)?$/);
    if (mC) { globals.push({ name: mC[1], value: (mC[2] || '').trim().slice(0, 30), ln: i }); continue; }
    const mT = trimmed.match(/^\*temp\s+([a-zA-Z_][\w]*)\s*(.+)?$/);
    if (mT) temps.push({ name: mT[1], value: (mT[2] || '').trim().slice(0, 30), ln: i });
  }

  let html = '';
  if (globals.length) {
    html += `<div class="vt-section-label">Global (${globals.length})</div>`;
    globals.forEach(v => {
      html += `<div class="vt-row" title="Line ${v.ln}" data-line="${v.ln}"><span class="vt-name">${v.name}</span><span class="vt-value">${v.value || '—'}</span></div>`;
    });
  }
  if (temps.length) {
    html += `<div class="vt-section-label" style="margin-top:8px">Local *temp (${temps.length})</div>`;
    temps.forEach(v => {
      html += `<div class="vt-row" title="Line ${v.ln}" data-line="${v.ln}"><span class="vt-name">${v.name}</span><span class="vt-value">${v.value || '—'}</span></div>`;
    });
  }
  if (!globals.length && !temps.length)
    html = '<div style="color:var(--text-faint);font-size:12px;padding:8px 0">No variables declared.</div>';

  panel.innerHTML = html;
  panel.querySelectorAll('.vt-row').forEach(el => {
    (el as HTMLElement).addEventListener('click', () => jumpToLine(+(el as HTMLElement).dataset.line!));
  });

  // Summary
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  const errors = markers.filter(m => m.severity === monaco.MarkerSeverity.Error).length;
  const warnings = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning).length;
  const diagEl = $('vt-diag-summary');
  if (errors || warnings) {
    diagEl.innerHTML = `<span style="color:#C00">${errors}E</span> <span style="color:#A06000">${warnings}W</span>`;
  } else {
    diagEl.innerHTML = '<span style="color:#1A7F3C">✓</span>';
  }

  updateDiagStatusBar(model);
  refreshProblemsPanel();
}

// ── Status bar diagnostic indicator ───────────────────────────────────────

export function updateDiagStatusBar(model: import('monaco-editor').editor.ITextModel): void {
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  const errors = markers.filter(m => m.severity === monaco.MarkerSeverity.Error).length;
  const warnings = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning).length;
  const el = $('sb-diag-text');

  if (errors) {
    el.textContent = `✕ ${errors} error${errors !== 1 ? 's' : ''}`;
    el.style.color = '#ffbbbb';
  } else if (warnings) {
    el.textContent = `⚠ ${warnings} warning${warnings !== 1 ? 's' : ''}`;
    el.style.color = '#ffd080';
  } else {
    el.textContent = '✓ Clean';
    el.style.color = 'rgba(180,255,180,0.9)';
  }

  // Toolbar badge
  const tbBtn = $('btn-problems');
  const tbLabel = $('tb-problems-label');
  if (errors) {
    tbBtn.style.color = '#C00';
    tbLabel.textContent = `${errors} error${errors !== 1 ? 's' : ''}`;
  } else if (warnings) {
    tbBtn.style.color = '#A06000';
    tbLabel.textContent = `${warnings} warning${warnings !== 1 ? 's' : ''}`;
  } else {
    tbBtn.style.color = '';
    tbLabel.textContent = 'Problems';
  }
}

// ── Problems panel ────────────────────────────────────────────────────────

export function refreshProblemsPanel(): void {
  const model = editor?.getModel();
  if (!model) return;
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  const list = $('problems-list');
  const title = $('problems-title');

  const errors = markers.filter(m => m.severity === monaco.MarkerSeverity.Error);
  const warnings = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning);

  title.textContent = markers.length
    ? `Problems — ${errors.length}E, ${warnings.length}W`
    : 'Problems';

  if (!markers.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-faint);font-family:DM Sans,sans-serif">✓ No problems detected.</div>';
    return;
  }

  const sorted = [...errors, ...warnings].sort((a, b) =>
    a.severity !== b.severity ? a.severity - b.severity : a.startLineNumber - b.startLineNumber);

  list.innerHTML = sorted.map(m => {
    const sc = m.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning';
    const si = m.severity === monaco.MarkerSeverity.Error ? '✕' : '⚠';
    return `<div class="problem-item" data-line="${m.startLineNumber}">
      <span class="problem-sev ${sc}">${si}</span>
      <span class="problem-msg">${escHtml(m.message)}</span>
      <span class="problem-loc">Ln ${m.startLineNumber}</span>
    </div>`;
  }).join('');

  list.querySelectorAll('.problem-item').forEach(el => {
    (el as HTMLElement).addEventListener('click', () => jumpToLine(+(el as HTMLElement).dataset.line!));
  });
}

// ── Debounced scheduler ───────────────────────────────────────────────────

export function scheduleDiagnostics(): void {
  if (_timer !== null) clearTimeout(_timer);
  _timer = setTimeout(() => {
    const model = editor?.getModel();
    const tab = getActiveTab();
    if (!model || !tab) return;
    runDiagnostics(model, tab.name);
    buildVarTracker(model, tab.name);
  }, 400);
}
