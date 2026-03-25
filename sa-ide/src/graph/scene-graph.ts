// ---------------------------------------------------------------------------
// scene-graph.ts — Scene graph parser, auto-layout, and interactive renderer.
//
// FIX (v2): SVG layer now shares the same CSS transform as the node canvas,
// so edges always align with nodes.  Edges are drawn in canvas-local coords.
// ---------------------------------------------------------------------------

import { tabs, escHtml, fileMap, $ } from '../state.js';
import { activateTab } from '../ui/tabs.js';
import { loadSidebarFile } from '../ui/sidebar.js';

// ── Types ─────────────────────────────────────────────────────────────────

interface GNode {
  id:    number;
  name:  string;
  label: string;
  role:  string;
  x:     number;
  y:     number;
  sceneListOrder: number | null;
  ghost?: boolean;
}

interface GEdge {
  from: number;
  to:   number;
  kind: 'goto' | 'gosub';
}

// ── Constants ─────────────────────────────────────────────────────────────

const NW = 200;
const NH = 72;

const NODE_COLORS: Record<string, string> = {
  startup:    '#1D55C7',
  scene:      '#1A7F3C',
  ending:     '#A02020',
  procedures: '#6B21D6',
  skills:     '#7c5c2e',
  items:      '#C44A00',
  stats:      '#0A7E6E',
  unlisted:   '#a8a49d',
};

// ── State ─────────────────────────────────────────────────────────────────

let nodes: GNode[] = [];
let edges: GEdge[] = [];
let scale = 1;
let panX = 60;
let panY = 60;
let dragging: GNode | null = null;
let dragOX = 0;
let dragOY = 0;
let panning = false;
let panSX = 0;
let panSY = 0;
let selected: number | null = null;
let eventsInit = false;

// ── DOM refs ──────────────────────────────────────────────────────────────

const wrap     = () => $('graph-canvas-wrap');
const canvasEl = () => $('graph-canvas');
const svgEl    = () => $('graph-svg-layer') as unknown as SVGSVGElement;
const gridEl   = () => $('graph-grid') as HTMLCanvasElement;

// ── Coordinate helpers ────────────────────────────────────────────────────

function s2c(sx: number, sy: number): [number, number] {
  const r = wrap().getBoundingClientRect();
  return [(sx - r.left - panX) / scale, (sy - r.top - panY) / scale];
}

// ── Parser ────────────────────────────────────────────────────────────────

export function parseGraph(): void {
  nodes = [];
  edges = [];
  let idC = 1;
  const nameToId: Record<string, number> = {};

  const sources = tabs.map(t => ({ name: t.name, content: t.model.getValue() }));

  function fileRole(n: string): string {
    if (n === 'startup.txt')    return 'startup';
    if (n === 'procedures.txt') return 'procedures';
    if (n === 'skills.txt')     return 'skills';
    if (n === 'items.txt')      return 'items';
    if (n === 'stats.txt')      return 'stats';
    return 'scene';
  }

  // Pass 1: nodes from open files
  sources.forEach(src => {
    const name = src.name.replace(/\.txt$/i, '');
    const role = fileRole(src.name);
    const id = idC++;
    nameToId[name.toLowerCase()] = id;
    const isEnding = /^\s*\*ending\b/m.test(src.content);
    nodes.push({ id, name: src.name, label: name, role: isEnding ? 'ending' : role, x: 0, y: 0, sceneListOrder: null });
  });

  // Collect scene names from *scene_list
  sources.forEach(src => {
    if (src.name !== 'startup.txt') return;
    let inList = false;
    let listIndent = 0;
    let order = 0;
    src.content.split('\n').forEach(raw => {
      const t = raw.trimStart();
      const indent = raw.length - t.length;
      if (/^\*scene_list\b/.test(t)) { inList = true; listIndent = indent; return; }
      if (inList) {
        if (indent > listIndent && !t.startsWith('*') && !t.startsWith('//') && t) {
          const sn = t.toLowerCase();
          const ex = nodes.find(n => n.label.toLowerCase() === sn);
          if (ex) {
            ex.sceneListOrder = order++;
          } else {
            const id = idC++;
            nameToId[sn] = id;
            nodes.push({ id, name: sn + '.txt', label: sn, role: 'scene', x: 0, y: 0, sceneListOrder: order++, ghost: true });
          }
        } else if (indent <= listIndent && t.startsWith('*')) {
          inList = false;
        }
      }
    });
  });

  // Pass 2: edges
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
      const kind: 'goto' | 'gosub' = mG ? 'goto' : 'gosub';
      if (!edges.find(e => e.from === fromId && e.to === toId && e.kind === kind)) {
        edges.push({ from: fromId, to: toId, kind });
      }
    });
  });
}

// ── Auto layout ───────────────────────────────────────────────────────────

export function autoLayout(): void {
  if (!nodes.length) return;

  const adj: Record<number, number[]> = {};
  const inDeg: Record<number, number> = {};
  nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
  edges.forEach(e => {
    if (adj[e.from]) adj[e.from].push(e.to);
    inDeg[e.to] = (inDeg[e.to] || 0) + 1;
  });

  const layerOf: Record<number, number> = {};
  const queue = nodes.filter(n => !inDeg[n.id]).map(n => n.id);
  const visited = new Set(queue);
  queue.forEach(id => { layerOf[id] = 0; });

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    (adj[id] || []).forEach(to => {
      layerOf[to] = Math.max(layerOf[to] || 0, (layerOf[id] || 0) + 1);
      if (!visited.has(to)) { visited.add(to); queue.push(to); }
    });
  }
  nodes.forEach(n => { if (layerOf[n.id] === undefined) layerOf[n.id] = 0; });

  const groups: Record<number, GNode[]> = {};
  nodes.forEach(n => { const l = layerOf[n.id]; if (!groups[l]) groups[l] = []; groups[l].push(n); });
  Object.values(groups).forEach(g => g.sort((a, b) => (a.sceneListOrder ?? 999) - (b.sceneListOrder ?? 999)));

  const VGAP = 110;
  const HGAP = 280;
  Object.entries(groups)
    .sort((a, b) => +a[0] - +b[0])
    .forEach(([layer, grp]) => {
      const totalH = grp.length * VGAP;
      grp.forEach((n, i) => {
        n.x = +layer * HGAP;
        n.y = i * VGAP - totalH / 2 + VGAP / 2;
      });
    });
}

// ── Rendering ─────────────────────────────────────────────────────────────

export function render(): void {
  renderNodes();
  renderEdges();
  drawGrid();
  updXform();
  updStatus();
}

function updXform(): void {
  const xf = `translate(${panX}px,${panY}px) scale(${scale})`;
  canvasEl().style.transform = xf;
  (svgEl() as unknown as HTMLElement).style.transform = xf;
  svgEl().setAttribute('width', '10000');
  svgEl().setAttribute('height', '10000');
  $('g-zoom-display').textContent = Math.round(scale * 100) + '%';
}

function renderNodes(): void {
  canvasEl().innerHTML = '';
  nodes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'g-node' + (n.id === selected ? ' g-selected' : '') + (n.ghost ? ' g-unreachable' : '');
    el.style.left = n.x + 'px';
    el.style.top = n.y + 'px';
    el.style.width = NW + 'px';
    el.style.minHeight = NH + 'px';
    const col = NODE_COLORS[n.role] || NODE_COLORS.unlisted;
    el.innerHTML = `<div class="g-node-header" style="border-left-color:${col}"><span class="g-node-title">${escHtml(n.label)}</span><span class="g-node-badge" style="color:${col}">${n.ghost ? 'unlisted' : n.role}</span></div>${n.ghost ? '<div class="g-node-body" style="color:#c04800">File not open</div>' : ''}`;

    el.addEventListener('mousedown', (e: MouseEvent) => {
      e.stopPropagation();
      selected = n.id;
      dragging = n;
      const [cx, cy] = s2c(e.clientX, e.clientY);
      dragOX = cx - n.x;
      dragOY = cy - n.y;
      renderNodes();
    });

    el.addEventListener('click', () => {
      if (!n.ghost) {
        const tab = tabs.find(t => t.name === n.name);
        if (tab) {
          activateTab(tab.id);
        } else {
          const f = fileMap.get(n.name);
          if (f) loadSidebarFile(f);
        }
      }
    });

    canvasEl().appendChild(el);
  });
}

function renderEdges(): void {
  svgEl().querySelectorAll('.g-edge').forEach(el => el.remove());
  edges.forEach(edge => {
    const fn = nodes.find(n => n.id === edge.from);
    const tn = nodes.find(n => n.id === edge.to);
    if (!fn || !tn) return;
    const x1 = fn.x + NW;
    const y1 = fn.y + NH / 2;
    const x2 = tn.x;
    const y2 = tn.y + NH / 2;
    const dx = Math.abs(x2 - x1);
    const cp = Math.max(50, dx * 0.4);
    const d = `M${x1},${y1} C${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
    const col = edge.kind === 'goto' ? '#1A7F3C' : '#6B21D6';
    const dash = edge.kind === 'goto' ? '' : '6 4';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('g-edge');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', col);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-opacity', '0.7');
    if (dash) path.setAttribute('stroke-dasharray', dash);
    path.setAttribute('marker-end', `url(#arr-${edge.kind})`);
    svgEl().appendChild(path);
  });
}

function drawGrid(): void {
  const gc = gridEl();
  const w = wrap().clientWidth;
  const h = wrap().clientHeight;
  const dpr = window.devicePixelRatio || 1;
  gc.style.width = w + 'px';
  gc.style.height = h + 'px';
  gc.width = Math.round(w * dpr);
  gc.height = Math.round(h * dpr);
  const ctx = gc.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const sp = 20 * scale;
  if (sp < 6) return;
  const ox = ((panX % sp) + sp) % sp;
  const oy = ((panY % sp) + sp) % sp;
  ctx.fillStyle = 'rgba(150,142,130,0.35)';
  for (let x = ox; x < w; x += sp) {
    for (let y = oy; y < h; y += sp) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function updStatus(): void {
  $('g-stat-nodes').textContent = nodes.length + ' scene' + (nodes.length !== 1 ? 's' : '');
  $('g-stat-edges').textContent = edges.length + ' connection' + (edges.length !== 1 ? 's' : '');
  const ghosts = nodes.filter(n => n.ghost).length;
  $('g-stat-unreachable').textContent = ghosts ? `${ghosts} unlisted` : '';
}

// ── Fit view and zoom ─────────────────────────────────────────────────────

export function fitView(): void {
  if (!nodes.length) return;
  const w = wrap().clientWidth;
  const h = wrap().clientHeight;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + NW);
    maxY = Math.max(maxY, n.y + NH);
  });
  const pad = 80;
  const rW = maxX - minX + pad * 2;
  const rH = maxY - minY + pad * 2;
  scale = Math.min(1.4, Math.min(w / rW, h / rH));
  panX = (w - rW * scale) / 2 - (minX - pad) * scale;
  panY = (h - rH * scale) / 2 - (minY - pad) * scale;
  render();
}

export function zoomBy(dir: number): void {
  const w = wrap().clientWidth / 2;
  const h = wrap().clientHeight / 2;
  const old = scale;
  scale = Math.min(3, Math.max(0.1, scale * (dir > 0 ? 1.2 : 0.833)));
  panX = w - (w - panX) * (scale / old);
  panY = h - (h - panY) * (scale / old);
  render();
}

// ── Pointer events ────────────────────────────────────────────────────────

export function initEvents(): void {
  if (eventsInit) return;
  eventsInit = true;
  const w = wrap();

  w.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.g-node')) return;
    panning = true;
    panSX = e.clientX - panX;
    panSY = e.clientY - panY;
    w.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (panning) {
      panX = e.clientX - panSX;
      panY = e.clientY - panSY;
      updXform();
      renderEdges();
      drawGrid();
    }
    if (dragging) {
      const [cx, cy] = s2c(e.clientX, e.clientY);
      dragging.x = cx - dragOX;
      dragging.y = cy - dragOY;
      const idx = nodes.indexOf(dragging);
      const el = canvasEl().children[idx] as HTMLElement | undefined;
      if (el) {
        el.style.left = dragging.x + 'px';
        el.style.top = dragging.y + 'px';
      }
      renderEdges();
    }
  });

  window.addEventListener('mouseup', () => {
    dragging = null;
    panning = false;
    wrap().classList.remove('dragging');
  });

  w.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const r = w.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const old = scale;
    scale = Math.min(3, Math.max(0.1, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
    panX = mx - (mx - panX) * (scale / old);
    panY = my - (my - panY) * (scale / old);
    render();
  }, { passive: false });
}

// ── Public API for main.ts ────────────────────────────────────────────────

export function openSceneGraph(): void {
  $('graph-overlay').classList.add('visible');
  initEvents();
  refreshSceneGraph();
}

export function closeSceneGraph(): void {
  $('graph-overlay').classList.remove('visible');
}

export function refreshSceneGraph(): void {
  parseGraph();
  autoLayout();
  render();
  fitView();
}
