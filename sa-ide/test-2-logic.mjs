// ============================================================
// TEST SUITE 2: LOGIC UNIT TESTS
// Reimplements and exercises pure algorithmic functions:
//   a) escHtml() — HTML entity escaping
//   b) getFileType() — file type classification
//   c) parseGraph() logic — node/edge extraction
//   d) autoLayout() algorithm — hierarchical positioning
//   e) diagnostics engine — linting rule accuracy
//   f) completions list — completeness & integrity
//   g) folding patterns — opener/closer detection
// ============================================================

let pass = 0, fail = 0;
const failures = [];

function ok(label, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else       { fail++; failures.push(`${label}${detail ? ': ' + detail : ''}`); console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
}
function eq(label, a, b) {
  const cond = JSON.stringify(a) === JSON.stringify(b);
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else       { fail++; failures.push(`${label}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); console.log(`  ✗ ${label} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}

// ══════════════════════════════════════════════════════════
// 2a. escHtml
// ══════════════════════════════════════════════════════════
console.log('\n── 2a. escHtml ─────────────────────────────────────────\n');

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

eq('plain text unchanged',         escHtml('Hello world'), 'Hello world');
eq('< escaped',                    escHtml('<b>'),         '&lt;b&gt;');
eq('> escaped',                    escHtml('>'),           '&gt;');
eq('& escaped',                    escHtml('a & b'),       'a &amp; b');
eq('all special chars',            escHtml('<a & b>'),     '&lt;a &amp; b&gt;');
eq('empty string',                 escHtml(''),            '');
eq('already-escaped passthrough',  escHtml('&amp;'),       '&amp;amp;');
eq('multiple < in string',         escHtml('1<2<3'),       '1&lt;2&lt;3');

// ══════════════════════════════════════════════════════════
// 2b. getFileType
// ══════════════════════════════════════════════════════════
console.log('\n── 2b. getFileType ─────────────────────────────────────\n');

const FILE_TYPES = {
  'startup.txt':    { label: 'Boot',       badge: 'BOOT'   },
  'stats.txt':      { label: 'Stats',      badge: 'STATS'  },
  'skills.txt':     { label: 'Skills',     badge: 'SKILLS' },
  'items.txt':      { label: 'Items',      badge: 'ITEMS'  },
  'procedures.txt': { label: 'Procedures', badge: 'PROCS'  },
  'glossary.txt':   { label: 'Glossary',   badge: 'GLOS'   },
};
function getFileType(name) {
  return FILE_TYPES[name] || { label: 'Scene', badge: 'SCENE' };
}

eq('startup.txt → Boot/BOOT',       getFileType('startup.txt').label,  'Boot');
eq('stats.txt → Stats/STATS',       getFileType('stats.txt').badge,    'STATS');
eq('skills.txt → Skills/SKILLS',    getFileType('skills.txt').badge,   'SKILLS');
eq('items.txt → Items/ITEMS',       getFileType('items.txt').badge,    'ITEMS');
eq('procedures.txt → Procs/PROCS',  getFileType('procedures.txt').badge,'PROCS');
eq('glossary.txt → Glossary/GLOS',  getFileType('glossary.txt').badge, 'GLOS');
eq('unknown.txt → Scene/SCENE',     getFileType('unknown.txt').label,  'Scene');
eq('prologue.txt → Scene',          getFileType('prologue.txt').label,  'Scene');
eq('vault.txt → Scene',             getFileType('vault.txt').label,     'Scene');

// ══════════════════════════════════════════════════════════
// 2c. parseGraph logic
// ══════════════════════════════════════════════════════════
console.log('\n── 2c. parseGraph logic ────────────────────────────────\n');

function parseGraph(sources) {
  const nodes = [], edges = [];
  let idC = 1;
  const nameToId = {};

  function fileRole(n) {
    if (n === 'startup.txt')    return 'startup';
    if (n === 'procedures.txt') return 'procedures';
    if (n === 'skills.txt')     return 'skills';
    if (n === 'items.txt')      return 'items';
    if (n === 'stats.txt')      return 'stats';
    return 'scene';
  }

  sources.forEach(src => {
    const name = src.name.replace(/\.txt$/i, '');
    const role = fileRole(src.name);
    const id = idC++;
    nameToId[name.toLowerCase()] = id;
    const isEnding = /^\s*\*ending\b/m.test(src.content);
    nodes.push({ id, name: src.name, label: name, role: isEnding ? 'ending' : role, x: 0, y: 0, sceneListOrder: null });
  });

  sources.forEach(src => {
    if (src.name !== 'startup.txt') return;
    let inList = false, listIndent = 0, order = 0;
    src.content.split('\n').forEach(raw => {
      const t = raw.trimStart();
      const indent = raw.length - t.length;
      if (/^\*scene_list\b/.test(t)) { inList = true; listIndent = indent; return; }
      if (inList) {
        if (indent > listIndent && !t.startsWith('*') && !t.startsWith('//') && t) {
          const sn = t.toLowerCase();
          const ex = nodes.find(n => n.label.toLowerCase() === sn);
          if (ex) { ex.sceneListOrder = order++; }
          else {
            const id = idC++;
            nameToId[sn] = id;
            nodes.push({ id, name: sn + '.txt', label: sn, role: 'scene', x: 0, y: 0, sceneListOrder: order++, ghost: true });
          }
        } else if (indent <= listIndent && t.startsWith('*')) { inList = false; }
      }
    });
  });

  sources.forEach(src => {
    const fromName = src.name.replace(/\.txt$/i, '').toLowerCase();
    const fromId = nameToId[fromName];
    if (!fromId) return;
    src.content.split('\n').forEach(raw => {
      const t = raw.trimStart();
      const mG = t.match(/^\*goto_scene\s+(\S+)/);
      const mS = t.match(/^\*gosub_scene\s+(\S+)/);
      const target = mG ? mG[1] : mS ? mS[1] : null;
      if (!target) return;
      const tk = target.toLowerCase().replace(/\.txt$/i, '');
      let toId = nameToId[tk];
      if (!toId) {
        toId = idC++;
        nameToId[tk] = toId;
        nodes.push({ id: toId, name: target + '.txt', label: target, role: 'unlisted', x: 0, y: 0, ghost: true, sceneListOrder: null });
      }
      const kind = mG ? 'goto' : 'gosub';
      if (!edges.find(e => e.from === fromId && e.to === toId && e.kind === kind))
        edges.push({ from: fromId, to: toId, kind });
    });
  });

  return { nodes, edges };
}

// Single file, no edges
{
  const { nodes, edges } = parseGraph([{ name: 'startup.txt', content: '*create x 0' }]);
  eq('single file → 1 node', nodes.length, 1);
  eq('single file → 0 edges', edges.length, 0);
  eq('startup role assigned', nodes[0].role, 'startup');
}

// Ending detection
{
  const { nodes } = parseGraph([{ name: 'vault.txt', content: '*ending "Done"\nsome text' }]);
  eq('*ending → role=ending', nodes[0].role, 'ending');
}

// goto_scene creates edge + ghost node
{
  const { nodes, edges } = parseGraph([
    { name: 'startup.txt', content: '*goto_scene prologue' },
  ]);
  eq('goto_scene → 2 nodes', nodes.length, 2);
  eq('goto_scene → 1 edge', edges.length, 1);
  eq('edge kind is goto', edges[0].kind, 'goto');
  ok('ghost node created for prologue', nodes.find(n => n.ghost && n.label === 'prologue') !== undefined);
}

// gosub_scene creates dashed edge
{
  const { nodes, edges } = parseGraph([
    { name: 'startup.txt', content: '*gosub_scene procedures level_up' },
  ]);
  eq('gosub_scene → 1 edge', edges.length, 1);
  eq('edge kind is gosub', edges[0].kind, 'gosub');
}

// scene_list creates ghost nodes in order
{
  const { nodes } = parseGraph([
    { name: 'startup.txt', content: '*scene_list\n  prologue\n  vault\n  ending_scene' },
  ]);
  eq('scene_list creates ghost nodes', nodes.filter(n => n.ghost).length, 3);
  const ghost0 = nodes.find(n => n.label === 'prologue');
  const ghost1 = nodes.find(n => n.label === 'vault');
  ok('prologue sceneListOrder=0', ghost0?.sceneListOrder === 0);
  ok('vault sceneListOrder=1',    ghost1?.sceneListOrder === 1);
}

// scene_list with open file gets order assigned (not ghost)
{
  const { nodes } = parseGraph([
    { name: 'startup.txt',  content: '*scene_list\n  prologue\n  vault' },
    { name: 'prologue.txt', content: 'The prologue.' },
  ]);
  const pNode = nodes.find(n => n.label === 'prologue');
  ok('open file gets sceneListOrder', pNode?.sceneListOrder === 0);
  ok('open file not marked ghost', !pNode?.ghost);
}

// No duplicate edges
{
  const { edges } = parseGraph([
    { name: 'startup.txt', content: '*goto_scene vault\n*goto_scene vault' },
  ]);
  eq('duplicate goto_scene → 1 edge only', edges.length, 1);
}

// File role classification in graph
{
  const files = [
    { name: 'procedures.txt', content: '' },
    { name: 'skills.txt',     content: '' },
    { name: 'items.txt',      content: '' },
    { name: 'stats.txt',      content: '' },
    { name: 'scene1.txt',     content: '' },
  ];
  const { nodes } = parseGraph(files);
  eq('procedures.txt role', nodes.find(n=>n.name==='procedures.txt').role, 'procedures');
  eq('skills.txt role',     nodes.find(n=>n.name==='skills.txt').role,     'skills');
  eq('items.txt role',      nodes.find(n=>n.name==='items.txt').role,      'items');
  eq('stats.txt role',      nodes.find(n=>n.name==='stats.txt').role,      'stats');
  eq('scene1.txt role',     nodes.find(n=>n.name==='scene1.txt').role,     'scene');
}

// ══════════════════════════════════════════════════════════
// 2d. autoLayout algorithm
// ══════════════════════════════════════════════════════════
console.log('\n── 2d. autoLayout algorithm ────────────────────────────\n');

function autoLayout(nodes, edges) {
  if (!nodes.length) return;
  const VGAP = 110, HGAP = 280;
  const adj = {}, inDeg = {};
  nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
  edges.forEach(e => { if (adj[e.from]) adj[e.from].push(e.to); inDeg[e.to] = (inDeg[e.to]||0)+1; });

  const layerOf = {};
  const queue = nodes.filter(n => !inDeg[n.id]).map(n => n.id);
  const visited = new Set(queue);
  queue.forEach(id => { layerOf[id] = 0; });
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    (adj[id]||[]).forEach(to => {
      layerOf[to] = Math.max(layerOf[to]||0, (layerOf[id]||0)+1);
      if (!visited.has(to)) { visited.add(to); queue.push(to); }
    });
  }
  nodes.forEach(n => { if (layerOf[n.id] === undefined) layerOf[n.id] = 0; });

  const groups = {};
  nodes.forEach(n => { const l = layerOf[n.id]; if (!groups[l]) groups[l]=[]; groups[l].push(n); });
  Object.values(groups).forEach(g => g.sort((a,b) => (a.sceneListOrder??999)-(b.sceneListOrder??999)));

  Object.entries(groups).sort((a,b) => +a[0]-+b[0]).forEach(([layer, grp]) => {
    const totalH = grp.length * VGAP;
    grp.forEach((n,i) => { n.x = +layer * HGAP; n.y = i * VGAP - totalH/2 + VGAP/2; });
  });
}

// Empty graph — no crash
{
  autoLayout([], []);
  ok('empty graph no crash', true);
}

// Single node — placed at 0,0
{
  const nodes = [{ id:1, sceneListOrder:null }];
  autoLayout(nodes, []);
  eq('single node x=0', nodes[0].x, 0);
  eq('single node y=0', nodes[0].y, 0);
}

// Linear chain A→B→C — 3 layers
{
  const ns = [{id:1,sceneListOrder:null},{id:2,sceneListOrder:null},{id:3,sceneListOrder:null}];
  const es = [{from:1,to:2},{from:2,to:3}];
  autoLayout(ns, es);
  eq('chain: node1 x=0',   ns[0].x, 0);
  eq('chain: node2 x=280', ns[1].x, 280);
  eq('chain: node3 x=560', ns[2].x, 560);
}

// Branch A→B, A→C — B and C in same layer
{
  const ns = [{id:1,sceneListOrder:null},{id:2,sceneListOrder:null},{id:3,sceneListOrder:null}];
  const es = [{from:1,to:2},{from:1,to:3}];
  autoLayout(ns, es);
  eq('branch: root x=0',  ns[0].x, 0);
  eq('branch: B x=280',   ns[1].x, 280);
  eq('branch: C x=280',   ns[2].x, 280);
  ok('B and C have different y', ns[1].y !== ns[2].y);
}

// Converge A→C, B→C — C in layer 1
{
  const ns = [{id:1,sceneListOrder:null},{id:2,sceneListOrder:null},{id:3,sceneListOrder:null}];
  const es = [{from:1,to:3},{from:2,to:3}];
  autoLayout(ns, es);
  eq('converge: C x=280', ns[2].x, 280);
}

// sceneListOrder respected — lower order → smaller y
{
  const ns = [
    {id:1,sceneListOrder:0},
    {id:2,sceneListOrder:1},
    {id:3,sceneListOrder:null},
  ];
  autoLayout(ns, []);
  ok('sceneListOrder: order0 y < order1 y', ns[0].y < ns[1].y);
}

// ══════════════════════════════════════════════════════════
// 2e. Diagnostics engine
// ══════════════════════════════════════════════════════════
console.log('\n── 2e. Diagnostics engine ──────────────────────────────\n');

// Reimplements runDiagnostics as pure function (returns markers array)
const ERROR = 8, WARNING = 4;

function runDiagnostics(content, filename) {
  const markers = [];
  const isStartup = filename === 'startup.txt';

  const lines = content.split('\n').map((raw, idx) => {
    const trimmed = raw.trimStart();
    return { raw, trimmed, indent: raw.length - trimmed.length, ln: idx + 1 };
  });

  const addError   = (ln, msg) => markers.push({ severity: ERROR,   ln, msg });
  const addWarning = (ln, msg) => markers.push({ severity: WARNING, ln, msg });

  // Pass 1
  const definedLabels = new Map();
  const openSystemLns = [];

  lines.forEach(({ trimmed, indent, ln }) => {
    if (!trimmed || trimmed.startsWith('//')) return;
    const mLabel = trimmed.match(/^\*label\s+(\S+)/);
    if (mLabel) {
      const name = mLabel[1].toLowerCase();
      if (definedLabels.has(name))
        addError(ln, `Duplicate *label "${mLabel[1]}" — already defined at line ${definedLabels.get(name)}.`);
      else definedLabels.set(name, ln);
    }
    if (/^\*system\b/.test(trimmed))     openSystemLns.push(ln);
    if (/^\*end_system\b/.test(trimmed)) openSystemLns.pop();
  });

  openSystemLns.forEach(sln => addError(sln, '*system block is never closed — add *end_system.'));

  // Pass 2
  lines.forEach(({ trimmed, indent, ln }) => {
    if (!trimmed || trimmed.startsWith('//')) return;

    if (isStartup && /^\*temp\b/.test(trimmed))
      addError(ln, '*temp cannot be used in startup.txt — use *create.');

    if (!isStartup && /^\*create\b/.test(trimmed) && !/^\*create_stat\b/.test(trimmed))
      addWarning(ln, '*create should only appear in startup.txt. Use *temp for scene-local variables.');

    const mGoto = trimmed.match(/^\*goto\s+(\S+)/);
    if (mGoto && !/^\*goto_scene/.test(trimmed))
      if (!definedLabels.has(mGoto[1].toLowerCase()))
        addError(ln, `*goto references undefined label "${mGoto[1]}".`);

    const mGosub = trimmed.match(/^\*gosub\s+(\S+)/);
    if (mGosub && !/^\*gosub_scene/.test(trimmed))
      if (!definedLabels.has(mGosub[1].toLowerCase()))
        addError(ln, `*gosub references undefined label "${mGosub[1]}".`);

    if (/^\*(if|elseif|loop)\s*$/.test(trimmed))
      addError(ln, `${trimmed.trim()} requires a condition.`);

    if (/^\*choice\s*$/.test(trimmed)) {
      let hasOpt = false;
      for (let k = ln; k < Math.min(ln + 15, lines.length); k++) {
        const next = lines[k];
        if (!next?.trimmed) continue;
        if (next.indent <= indent && next.ln > ln) break;
        if (/^(\*selectable_if.*)?#/.test(next.trimmed)) { hasOpt = true; break; }
      }
      if (!hasOpt) addWarning(ln, '*choice has no options — add at least one # line beneath it.');
    }
  });

  return markers;
}

// No errors on clean code
{
  const m = runDiagnostics('*create x 0\n*label start\n  Some text.', 'startup.txt');
  eq('clean code → 0 markers', m.length, 0);
}

// Duplicate label
{
  const m = runDiagnostics('*label foo\n  text\n*label foo\n  text2', 'scene.txt');
  eq('duplicate label → 1 error', m.filter(x=>x.severity===ERROR).length, 1);
  ok('duplicate label on line 3', m.find(x=>x.ln===3 && x.msg.includes('Duplicate')));
}

// *temp in startup.txt
{
  const m = runDiagnostics('*temp x 5', 'startup.txt');
  eq('*temp in startup → error', m.filter(x=>x.severity===ERROR).length, 1);
  ok('error message mentions *temp', m[0].msg.includes('*temp cannot be used'));
}

// *create in non-startup (warning)
{
  const m = runDiagnostics('*create foo 0', 'scene.txt');
  eq('*create in scene → warning', m.filter(x=>x.severity===WARNING).length, 1);
  ok('warning for *create', m[0].msg.includes('*create should only appear'));
}

// *create_stat in non-startup — NOT a warning (only *create triggers it)
{
  const m = runDiagnostics('*create_stat strength "Strength" 10', 'scene.txt');
  eq('*create_stat in scene → no warning', m.length, 0);
}

// Undefined *goto target
{
  const m = runDiagnostics('*goto missing_label', 'scene.txt');
  eq('undefined goto → 1 error', m.filter(x=>x.severity===ERROR).length, 1);
  ok('error mentions label name', m[0].msg.includes('missing_label'));
}

// Defined *goto target — no error
{
  const m = runDiagnostics('*label done\n*goto done', 'scene.txt');
  eq('defined goto → no error', m.filter(x=>x.severity===ERROR).length, 0);
}

// Undefined *gosub target
{
  const m = runDiagnostics('*gosub nowhere', 'scene.txt');
  eq('undefined gosub → 1 error', m.filter(x=>x.severity===ERROR).length, 1);
}

// *gosub_scene doesn't trigger undefined check
{
  const m = runDiagnostics('*gosub_scene procedures level_up', 'scene.txt');
  eq('*gosub_scene → no error', m.filter(x=>x.severity===ERROR).length, 0);
}

// *goto_scene doesn't trigger undefined check
{
  const m = runDiagnostics('*goto_scene vault', 'scene.txt');
  eq('*goto_scene → no error', m.filter(x=>x.severity===ERROR).length, 0);
}

// *if without condition
{
  const m = runDiagnostics('*if', 'scene.txt');
  eq('*if without condition → error', m.filter(x=>x.severity===ERROR).length, 1);
  ok('error msg mentions condition', m[0].msg.includes('requires a condition'));
}

// *if WITH condition — no error
{
  const m = runDiagnostics('*if (x > 5)', 'scene.txt');
  eq('*if with condition → no error', m.length, 0);
}

// *loop without condition
{
  const m = runDiagnostics('*loop', 'scene.txt');
  eq('*loop without condition → error', m.filter(x=>x.severity===ERROR).length, 1);
}

// Unclosed *system block
{
  const m = runDiagnostics('*system\n  Hello', 'scene.txt');
  eq('unclosed *system → error', m.filter(x=>x.severity===ERROR).length, 1);
  ok('error mentions *end_system', m[0].msg.includes('*end_system'));
}

// Closed *system block — no error
{
  const m = runDiagnostics('*system\n  Hello\n*end_system', 'scene.txt');
  eq('closed *system → no error', m.length, 0);
}

// *choice without options
{
  const m = runDiagnostics('*choice', 'scene.txt');
  eq('*choice without options → warning', m.filter(x=>x.severity===WARNING).length, 1);
}

// *choice with options
{
  const m = runDiagnostics('*choice\n  # Option A\n    Go left\n  # Option B\n    Go right', 'scene.txt');
  eq('*choice with options → no warning', m.filter(x=>x.severity===WARNING).length, 0);
}

// *choice with *selectable_if option
{
  const m = runDiagnostics('*choice\n  *selectable_if (x>0) # Hidden option\n    Text', 'scene.txt');
  eq('*choice with selectable_if → no warning', m.filter(x=>x.severity===WARNING).length, 0);
}

// Comments ignored
{
  const m = runDiagnostics('// *label foo\n*goto foo', 'scene.txt');
  eq('commented label still triggers goto error', m.filter(x=>x.severity===ERROR).length, 1);
}

// ══════════════════════════════════════════════════════════
// 2f. Completions list
// ══════════════════════════════════════════════════════════
console.log('\n── 2f. Completions list ────────────────────────────────\n');

import { readFileSync } from 'fs';
const compSrc = readFileSync('src/monaco/completions.ts', 'utf8');

// Extract all labels from COMPLETIONS array
const compLabels = [];
for (const m of compSrc.matchAll(/\{\s*label:\s*'(\*[^']+)'/g)) compLabels.push(m[1]);

const REQUIRED_COMPLETIONS = [
  '*create', '*create_stat', '*scene_list', '*temp', '*set', '*set_stat',
  '*if', '*elseif', '*else', '*selectable_if', '*loop',
  '*goto', '*goto_scene', '*gosub', '*gosub_scene', '*return', '*finish',
  '*label', '*choice', '*random_choice',
  '*title', '*system', '*end_system', '*notify', '*page_break', '*image', '*input',
  '*grant_skill', '*revoke_skill', '*if_skill',
  '*add_item', '*remove_item', '*check_item', '*award_essence',
  '*journal', '*achievement',
  '*procedure', '*call',
  '*save_point', '*checkpoint',
  '*define_term', '*ending',
  '*stat_group', '*stat', '*stat_color', '*stat_registered', '*inventory',
  '*comment', '*patch_state',
];

for (const cmd of REQUIRED_COMPLETIONS) {
  ok(`completion: ${cmd}`, compLabels.includes(cmd));
}

// Each completion has detail and doc
const missingDoc = [];
for (const m of compSrc.matchAll(/\{\s*label:\s*'\*[^']+',\s*kind:\s*\d+,\s*detail:\s*'[^']*',\s*doc:\s*'([^']*)'/g)) {
  if (!m[1]) missingDoc.push(m[0].match(/label:\s*'([^']+)'/)?.[1]);
}
ok(`all completions have non-empty doc strings`, missingDoc.length === 0,
   missingDoc.length ? `missing doc: ${missingDoc.join(', ')}` : '');

ok(`completions trigger char is '*'`, compSrc.includes("triggerCharacters: ['*']"));

// ══════════════════════════════════════════════════════════
// 2g. Folding patterns
// ══════════════════════════════════════════════════════════
console.log('\n── 2g. Folding patterns ────────────────────────────────\n');

const foldSrc = readFileSync('src/features/folding.ts', 'utf8');

// isOpener regex from source
const openerPattern = /^\*(if|elseif|else|selectable_if|choice|random_choice|loop|procedure|scene_list)\b/;
const isOpener = (line) =>
  openerPattern.test(line.trimStart()) || /^#/.test(line.trimStart());

const EXPECTED_OPENERS = [
  '  *if (x > 5)',
  '  *elseif (y)',
  '  *else',
  '  *choice',
  '  *random_choice',
  '  *loop (running)',
  '  *procedure my_proc',
  '  *scene_list',
  '  # Option A',
  '*selectable_if (cond) # opt',
];

for (const line of EXPECTED_OPENERS) {
  ok(`opener: "${line.trim()}"`, isOpener(line));
}

// Non-openers
const NON_OPENERS = [
  '  *goto label',
  '  *label name',
  '  *set x 5',
  '  Some prose text',
  '  // comment',
];

for (const line of NON_OPENERS) {
  ok(`non-opener: "${line.trim()}"`, !isOpener(line));
}

// *system/*end_system handled separately in folding
ok('folding source handles *system blocks', foldSrc.includes('*system'));
ok('folding source handles *end_system',    foldSrc.includes('*end_system'));

// ══════════════════════════════════════════════════════════
// 2h. Session persistence format
// ══════════════════════════════════════════════════════════
console.log('\n── 2h. Session persistence format ──────────────────────\n');

// Verify the save/load format works correctly
const SESSION_KEY = 'sa-session';

function makeSession(tabData, activeIdx) {
  return JSON.stringify({
    tabs: tabData.map(t => ({ name: t.name, content: t.content, modified: t.modified })),
    activeIndex: activeIdx,
  });
}

function loadSession(raw) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.tabs) || !data.tabs.length) return null;
    return data;
  } catch { return null; }
}

const sessionData = makeSession([
  { name: 'startup.txt', content: '*create x 0', modified: false },
  { name: 'vault.txt',   content: '*ending',      modified: true  },
], 1);

const loaded = loadSession(sessionData);
ok('session roundtrip: tabs restored',    loaded?.tabs.length === 2);
ok('session roundtrip: names preserved',  loaded?.tabs[0].name === 'startup.txt');
ok('session roundtrip: content preserved',loaded?.tabs[1].content === '*ending');
ok('session roundtrip: modified flag',    loaded?.tabs[1].modified === true);
ok('session roundtrip: activeIndex',      loaded?.activeIndex === 1);
ok('empty tabs → null',                   loadSession(JSON.stringify({tabs:[],activeIndex:0})) === null);
ok('invalid JSON → null',                 loadSession('not json') === null);
ok('missing tabs key → null',             loadSession(JSON.stringify({activeIndex:0})) === null);

// ══════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════');
console.log(`Suite 2 Result: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
}
console.log('══════════════════════════════════════════════════════════\n');

process.exitCode = fail > 0 ? 1 : 0;
