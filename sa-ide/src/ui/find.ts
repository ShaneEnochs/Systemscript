// ---------------------------------------------------------------------------
// find.ts — Local find bar + Global find & replace.
// ---------------------------------------------------------------------------

import { editor, tabs, getActiveTab, getFileType, escHtml, GfrResult, $ } from '../state.js';
import { activateTab, renderTabs } from './tabs.js';

declare const monaco: typeof import('monaco-editor');

// ── Local find ────────────────────────────────────────────────────────────

let findMatches: import('monaco-editor').editor.FindMatch[] = [];
let findIndex = 0;

export function toggleFind(): void {
  const bar = $('find-bar');
  bar.classList.toggle('visible');
  if (bar.classList.contains('visible')) {
    const inp = $('find-input') as HTMLInputElement;
    inp.focus();
    inp.select();
  }
}

export function doFind(): void {
  if (!editor) return;
  const q = ($('find-input') as HTMLInputElement).value;
  if (!q) { $('find-count').textContent = '—'; return; }
  const model = editor.getModel();
  if (!model) return;
  findMatches = model.findMatches(q, true, false, false, null, false);
  findIndex = 0;
  $('find-count').textContent = findMatches.length ? `1/${findMatches.length}` : 'No match';
  if (findMatches.length) goToMatch(0);
}

export function goToMatch(idx: number): void {
  if (!findMatches.length || !editor) return;
  findIndex = ((idx % findMatches.length) + findMatches.length) % findMatches.length;
  const m = findMatches[findIndex];
  editor.revealRangeInCenter(m.range);
  editor.setSelection(m.range);
  $('find-count').textContent = `${findIndex + 1}/${findMatches.length}`;
}

export function initLocalFind(): void {
  ($('find-input') as HTMLInputElement).addEventListener('input', doFind);
  $('find-input').addEventListener('keydown', (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Escape') toggleFind();
    if (ke.key === 'Enter') ke.shiftKey ? goToMatch(findIndex - 1) : goToMatch(findIndex + 1);
  });
  $('find-prev').addEventListener('click', () => goToMatch(findIndex - 1));
  $('find-next').addEventListener('click', () => goToMatch(findIndex + 1));
  $('find-close').addEventListener('click', toggleFind);
}

// ── Global find & replace ─────────────────────────────────────────────────

let gfrResults: GfrResult[] = [];

export function openGlobalFind(): void {
  $('gfr-overlay').classList.add('visible');
  const inp = $('gfr-find') as HTMLInputElement;
  inp.focus();
  inp.select();
}

export function closeGlobalFind(): void {
  $('gfr-overlay').classList.remove('visible');
}

function buildGfrRegex(): RegExp | null {
  const raw = ($('gfr-find') as HTMLInputElement).value;
  const cs = ($('gfr-case') as HTMLInputElement).checked;
  const rx = ($('gfr-regex') as HTMLInputElement).checked;
  const wh = ($('gfr-whole') as HTMLInputElement).checked;
  if (!raw) return null;
  let p = rx ? raw : raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (wh) p = `\\b${p}\\b`;
  try { return new RegExp(p, cs ? 'g' : 'gi'); }
  catch { return null; }
}

export function runGlobalFind(): void {
  const regex = buildGfrRegex();
  const scope = ($('gfr-scope') as HTMLSelectElement).value;
  if (!regex) { $('gfr-summary').textContent = 'Invalid search.'; return; }
  gfrResults = [];
  const sources = scope === 'current'
    ? (getActiveTab() ? [getActiveTab()!] : [])
    : tabs;
  sources.forEach(src => {
    const lc = src.model.getLineCount();
    for (let ln = 1; ln <= lc; ln++) {
      const text = src.model.getLineContent(ln);
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        gfrResults.push({
          tabId: src.id, name: src.name, line: ln, col: m.index + 1,
          text, matchStart: m.index, matchEnd: m.index + m[0].length, match: m[0],
        });
      }
    }
  });
  renderGfrResults();
}

function renderGfrResults(): void {
  const container = $('gfr-results');
  const summary = $('gfr-summary');
  if (!gfrResults.length) {
    container.innerHTML = '<div style="padding:32px 16px;text-align:center;font-size:12px;color:var(--text-faint)">No matches found.</div>';
    summary.textContent = '';
    return;
  }
  const byFile: Record<string, (GfrResult & { idx: number })[]> = {};
  gfrResults.forEach((r, i) => {
    if (!byFile[r.name]) byFile[r.name] = [];
    byFile[r.name].push({ ...r, idx: i });
  });
  let html = '';
  Object.entries(byFile).forEach(([name, rows]) => {
    const ft = getFileType(name);
    html += `<div class="gfr-file-group"><div class="gfr-file-header"><span class="gfr-file-dot" style="background:${ft.color}"></span>${escHtml(name)} (${rows.length})</div>`;
    rows.forEach(r => {
      const pre = escHtml(r.text.slice(0, r.matchStart));
      const mid = `<mark>${escHtml(r.match)}</mark>`;
      const post = escHtml(r.text.slice(r.matchEnd));
      html += `<div class="gfr-result-row" data-idx="${r.idx}"><span class="gfr-result-ln">${r.line}</span><span class="gfr-result-text">${(pre + mid + post).trim().slice(0, 200)}</span></div>`;
    });
    html += '</div>';
  });
  container.innerHTML = html;
  summary.textContent = `${gfrResults.length} match${gfrResults.length !== 1 ? 'es' : ''} in ${Object.keys(byFile).length} file${Object.keys(byFile).length !== 1 ? 's' : ''}`;

  container.querySelectorAll('.gfr-result-row').forEach(el => {
    el.addEventListener('click', () => {
      const r = gfrResults[+(el as HTMLElement).dataset.idx!];
      if (!r) return;
      const tab = tabs.find(t => t.id === r.tabId);
      if (!tab) return;
      activateTab(tab.id);
      if (editor) {
        editor.revealLineInCenter(r.line);
        editor.setSelection(new monaco.Range(r.line, r.col, r.line, r.col + r.match.length));
        editor.focus();
      }
    });
  });
}

export function runGlobalReplace(all: boolean): void {
  const replaceStr = ($('gfr-replace') as HTMLInputElement).value;
  if (!gfrResults.length) { runGlobalFind(); return; }
  const toReplace = all ? [...gfrResults] : gfrResults.slice(0, 1);
  if (!toReplace.length) return;

  const byTab: Record<number, GfrResult[]> = {};
  toReplace.forEach(r => { if (!byTab[r.tabId]) byTab[r.tabId] = []; byTab[r.tabId].push(r); });

  Object.entries(byTab).forEach(([tid, rows]) => {
    const tab = tabs.find(t => t.id === +tid);
    if (!tab) return;
    rows.sort((a, b) => b.line !== a.line ? b.line - a.line : b.col - a.col);
    const edits = rows.map(r => ({
      range: new monaco.Range(r.line, r.col, r.line, r.col + r.match.length),
      text: replaceStr,
    }));
    tab.model.applyEdits(edits);
    tab.modified = true;
  });

  // Re-render tabs (modified state) then re-search.
  renderTabs();
  runGlobalFind();
}

export function initGlobalFind(): void {
  $('btn-global-find').addEventListener('click', openGlobalFind);
  $('gfr-close').addEventListener('click', closeGlobalFind);
  $('gfr-btn-find').addEventListener('click', runGlobalFind);
  $('gfr-btn-replace-next').addEventListener('click', () => runGlobalReplace(false));
  $('gfr-btn-replace-all').addEventListener('click', () => runGlobalReplace(true));
  $('gfr-btn-clear').addEventListener('click', () => {
    gfrResults = [];
    $('gfr-results').innerHTML = '<div style="padding:32px 16px;text-align:center;font-size:12px;color:var(--text-faint)">Enter a search term and click Find All.</div>';
    $('gfr-summary').textContent = '';
  });
  $('gfr-find').addEventListener('keydown', (e: Event) => {
    if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); runGlobalFind(); }
  });
  $('gfr-replace').addEventListener('keydown', (e: Event) => {
    if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); runGlobalReplace(false); }
  });
  $('gfr-overlay').addEventListener('click', (e) => {
    if (e.target === $('gfr-overlay')) closeGlobalFind();
  });
}
