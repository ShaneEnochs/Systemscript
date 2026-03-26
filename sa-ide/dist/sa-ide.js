"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/state.ts
  function getFileType(name) {
    return FILE_TYPES[name] || { label: "Scene", color: "var(--file-scene)", badge: "SCENE" };
  }
  function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function $(id) {
    return document.getElementById(id);
  }
  function setEditor(e) {
    editor = e;
  }
  function setActiveTabId(id) {
    activeTabId = id;
  }
  function setContextTabId(id) {
    contextTabId = id;
  }
  function getActiveTab() {
    return tabs.find((t) => t.id === activeTabId);
  }
  function getTab(id) {
    return tabs.find((t) => t.id === id);
  }
  function layoutEditor() {
    if (editor) requestAnimationFrame(() => editor.layout());
  }
  function updateSidebarSelection(name) {
    document.querySelectorAll(".file-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.file === name);
    });
  }
  function jumpToLine(ln) {
    if (!editor) return;
    editor.revealLineInCenter(ln);
    editor.setPosition({ lineNumber: ln, column: 1 });
    editor.focus();
  }
  function saveSession() {
    try {
      const data = {
        tabs: tabs.map((t) => ({
          name: t.name,
          content: t.model.getValue(),
          modified: t.modified
        })),
        activeIndex: tabs.findIndex((t) => t.id === activeTabId)
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch {
    }
  }
  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.tabs) || !data.tabs.length) return null;
      return data;
    } catch {
      return null;
    }
  }
  var FILE_TYPES, editor, tabs, activeTabId, contextTabId, fileMap, SESSION_KEY;
  var init_state = __esm({
    "src/state.ts"() {
      "use strict";
      FILE_TYPES = {
        "startup.txt": { label: "Boot", color: "var(--file-startup)", badge: "BOOT" },
        "stats.txt": { label: "Stats", color: "var(--file-stats)", badge: "STATS" },
        "skills.txt": { label: "Skills", color: "var(--file-skills)", badge: "SKILLS" },
        "items.txt": { label: "Items", color: "var(--file-items)", badge: "ITEMS" },
        "procedures.txt": { label: "Procedures", color: "var(--file-procs)", badge: "PROCS" },
        "glossary.txt": { label: "Glossary", color: "var(--file-stats)", badge: "GLOS" }
      };
      editor = null;
      tabs = [];
      activeTabId = null;
      contextTabId = null;
      fileMap = /* @__PURE__ */ new Map();
      SESSION_KEY = "sa-session";
    }
  });

  // src/ui/statusbar.ts
  function updateStatusBar(tab) {
    $("sb-filename").textContent = tab ? tab.name : "No file open";
    $("sb-type").textContent = tab ? tab.fileType.label : "\u2014";
    $("sb-saved").textContent = tab ? tab.modified ? "\u25CF Unsaved" : "\u2713 Saved" : "\u2014";
  }
  function setSaveStatus(msg) {
    $("sb-saved").textContent = msg;
  }
  var init_statusbar = __esm({
    "src/ui/statusbar.ts"() {
      "use strict";
      init_state();
    }
  });

  // src/ui/context-menu.ts
  function showContextMenu(e, tabId) {
    e.preventDefault();
    setContextTabId(tabId);
    const menu = $("context-menu");
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    menu.classList.add("visible");
  }
  function initContextMenu() {
    document.querySelectorAll(".ctx-item").forEach((el) => {
      el.addEventListener("click", () => {
        const action = el.dataset.action;
        $("context-menu").classList.remove("visible");
        if (!contextTabId) return;
        if (action === "close") closeTab(contextTabId);
        if (action === "closeOthers") tabs.filter((t) => t.id !== contextTabId).map((t) => t.id).forEach((id) => closeTab(id));
        if (action === "closeAll") [...tabs].map((t) => t.id).forEach((id) => closeTab(id));
        if (action === "save") {
          activateTab(contextTabId);
          document.dispatchEvent(new CustomEvent("sa-save"));
        }
        if (action === "copyPath") {
          const t = getTab(contextTabId);
          if (t) navigator.clipboard.writeText(t.name);
        }
      });
    });
    document.addEventListener("click", (e) => {
      if (!$("context-menu").contains(e.target))
        $("context-menu").classList.remove("visible");
    });
  }
  var init_context_menu = __esm({
    "src/ui/context-menu.ts"() {
      "use strict";
      init_state();
      init_tabs();
    }
  });

  // src/ui/tabs.ts
  function openTab(name, content) {
    const existing = tabs.find((t) => t.name === name);
    if (existing) {
      activateTab(existing.id);
      return;
    }
    const id = Date.now() + Math.random();
    const ft = getFileType(name);
    const model = monaco.editor.createModel(content, "sa-script");
    tabs.push({ id, name, content, model, modified: false, fileType: ft });
    if (!fileMap.has(name)) fileMap.set(name, { name, content });
    window.dispatchEvent(new CustomEvent("sa-project-files-changed"));
    activateTab(id);
    $("welcome").style.display = "none";
    saveSession();
  }
  function activateTab(id) {
    setActiveTabId(id);
    const tab = getTab(id);
    if (!tab || !editor) return;
    editor.setModel(tab.model);
    editor.focus();
    renderTabs();
    updateSidebarSelection(tab.name);
    updateStatusBar(tab);
  }
  function closeTab(id, event) {
    if (event) event.stopPropagation();
    const tab = getTab(id);
    if (!tab) return;
    if (tab.modified && !confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
    tab.model.dispose();
    const idx = tabs.findIndex((t) => t.id === id);
    tabs.splice(idx, 1);
    if (activeTabId === id) {
      const next = tabs[Math.min(idx, tabs.length - 1)];
      setActiveTabId(next ? next.id : null);
      if (next) {
        activateTab(next.id);
      } else {
        editor.setModel(null);
        $("welcome").style.display = "flex";
        updateStatusBar(null);
      }
    }
    saveSession();
    renderTabs();
  }
  function closeActiveTab() {
    if (activeTabId) closeTab(activeTabId);
  }
  function renderTabs() {
    const bar = $("tab-bar");
    bar.innerHTML = "";
    tabs.forEach((tab) => {
      const el = document.createElement("div");
      el.className = "tab" + (tab.id === activeTabId ? " active" : "") + (tab.modified ? " modified" : "");
      el.innerHTML = `<span class="tab-dot" style="background:${tab.fileType.color}"></span><span>${tab.name}</span><button class="tab-close" title="Close"></button>`;
      el.addEventListener("click", () => activateTab(tab.id));
      el.addEventListener("contextmenu", (e) => showContextMenu(e, tab.id));
      el.querySelector(".tab-close").addEventListener("click", (e) => closeTab(tab.id, e));
      bar.appendChild(el);
    });
  }
  var init_tabs = __esm({
    "src/ui/tabs.ts"() {
      "use strict";
      init_state();
      init_statusbar();
      init_context_menu();
    }
  });

  // src/graph/scene-graph.ts
  var scene_graph_exports = {};
  __export(scene_graph_exports, {
    autoLayout: () => autoLayout,
    closeSceneGraph: () => closeSceneGraph,
    fitView: () => fitView,
    initEvents: () => initEvents,
    openSceneGraph: () => openSceneGraph,
    parseGraph: () => parseGraph,
    refreshSceneGraph: () => refreshSceneGraph,
    render: () => render,
    zoomBy: () => zoomBy
  });
  function s2c(sx, sy) {
    const r = wrap().getBoundingClientRect();
    return [(sx - r.left - panX) / scale, (sy - r.top - panY) / scale];
  }
  function parseGraph() {
    nodes = [];
    edges = [];
    let idC = 1;
    const nameToId = {};
    const openContents = new Map(tabs.map((t) => [t.name, t.model.getValue()]));
    const sources = [...fileMap.values()].filter((f) => f.name.toLowerCase().endsWith(".txt")).map((f) => ({ name: f.name, content: openContents.get(f.name) ?? f.content ?? "" }));
    function fileRole(n) {
      if (n === "startup.txt") return "startup";
      if (n === "procedures.txt") return "procedures";
      if (n === "skills.txt") return "skills";
      if (n === "items.txt") return "items";
      if (n === "stats.txt") return "stats";
      return "scene";
    }
    sources.forEach((src) => {
      const name = src.name.replace(/\.txt$/i, "");
      const role = fileRole(src.name);
      const id = idC++;
      nameToId[name.toLowerCase()] = id;
      const isEnding = /^\s*\*ending\b/m.test(src.content);
      nodes.push({ id, name: src.name, label: name, role: isEnding ? "ending" : role, x: 0, y: 0, sceneListOrder: null });
    });
    sources.forEach((src) => {
      if (src.name !== "startup.txt") return;
      let inList = false;
      let listIndent = 0;
      let order = 0;
      src.content.split("\n").forEach((raw) => {
        const t = raw.trimStart();
        const indent = raw.length - t.length;
        if (/^\*scene_list\b/.test(t)) {
          inList = true;
          listIndent = indent;
          return;
        }
        if (inList) {
          if (indent > listIndent && !t.startsWith("*") && !t.startsWith("//") && t) {
            const sn = t.toLowerCase();
            const ex = nodes.find((n) => n.label.toLowerCase() === sn);
            if (ex) {
              ex.sceneListOrder = order++;
            } else {
              const id = idC++;
              nameToId[sn] = id;
              nodes.push({ id, name: sn + ".txt", label: sn, role: "scene", x: 0, y: 0, sceneListOrder: order++, ghost: true });
            }
          } else if (indent <= listIndent && t.startsWith("*")) {
            inList = false;
          }
        }
      });
    });
    sources.forEach((src) => {
      const fromName = src.name.replace(/\.txt$/i, "").toLowerCase();
      const fromId = nameToId[fromName];
      if (!fromId) return;
      src.content.split("\n").forEach((raw) => {
        const t = raw.trimStart();
        const mG = t.match(/^\*goto_scene\s+(\S+)/);
        const mS = t.match(/^\*gosub_scene\s+(\S+)/);
        const target = mG ? mG[1] : mS ? mS[1] : null;
        if (!target) return;
        const tk = target.toLowerCase().replace(/\.txt$/i, "");
        let toId = nameToId[tk];
        if (!toId) {
          toId = idC++;
          nameToId[tk] = toId;
          nodes.push({ id: toId, name: target + ".txt", label: target, role: "unlisted", x: 0, y: 0, ghost: true, sceneListOrder: null });
        }
        const kind = mG ? "goto" : "gosub";
        if (!edges.find((e) => e.from === fromId && e.to === toId && e.kind === kind)) {
          edges.push({ from: fromId, to: toId, kind });
        }
      });
    });
  }
  function autoLayout() {
    if (!nodes.length) return;
    const adj = {};
    const inDeg = {};
    nodes.forEach((n) => {
      adj[n.id] = [];
      inDeg[n.id] = 0;
    });
    edges.forEach((e) => {
      if (adj[e.from]) adj[e.from].push(e.to);
      inDeg[e.to] = (inDeg[e.to] || 0) + 1;
    });
    const layerOf = {};
    const queue = nodes.filter((n) => !inDeg[n.id]).map((n) => n.id);
    const visited = new Set(queue);
    queue.forEach((id) => {
      layerOf[id] = 0;
    });
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      (adj[id] || []).forEach((to) => {
        layerOf[to] = Math.max(layerOf[to] || 0, (layerOf[id] || 0) + 1);
        if (!visited.has(to)) {
          visited.add(to);
          queue.push(to);
        }
      });
    }
    nodes.forEach((n) => {
      if (layerOf[n.id] === void 0) layerOf[n.id] = 0;
    });
    const groups = {};
    nodes.forEach((n) => {
      const l = layerOf[n.id];
      if (!groups[l]) groups[l] = [];
      groups[l].push(n);
    });
    Object.values(groups).forEach((g) => g.sort((a, b) => (a.sceneListOrder ?? 999) - (b.sceneListOrder ?? 999)));
    const VGAP = 110;
    const HGAP = 280;
    Object.entries(groups).sort((a, b) => +a[0] - +b[0]).forEach(([layer, grp]) => {
      const totalH = grp.length * VGAP;
      grp.forEach((n, i) => {
        n.x = +layer * HGAP;
        n.y = i * VGAP - totalH / 2 + VGAP / 2;
      });
    });
    const hasOutgoing = new Set(edges.map((e) => e.from));
    deadEndIds = new Set(nodes.filter((n) => !hasOutgoing.has(n.id)).map((n) => n.id));
  }
  function computePath(targetId) {
    pathNodeIds.clear();
    pathEdgeKeys.clear();
    const startNode = nodes.find((n) => n.name === "startup.txt") || nodes[0];
    if (!startNode) return;
    pathNodeIds.add(targetId);
    if (startNode.id === targetId) return;
    const adj = {};
    nodes.forEach((n) => {
      adj[n.id] = [];
    });
    edges.forEach((e) => {
      if (adj[e.from]) adj[e.from].push(e.to);
    });
    const prev = {};
    const visited = /* @__PURE__ */ new Set([startNode.id]);
    const queue = [startNode.id];
    let found = false;
    let head = 0;
    while (head < queue.length && !found) {
      const curr = queue[head++];
      for (const next of adj[curr] || []) {
        if (!visited.has(next)) {
          visited.add(next);
          prev[next] = curr;
          if (next === targetId) {
            found = true;
            break;
          }
          queue.push(next);
        }
      }
    }
    if (found) {
      let curr = targetId;
      pathNodeIds.add(curr);
      while (prev[curr] !== void 0) {
        const p = prev[curr];
        pathEdgeKeys.add(`${p}-${curr}`);
        pathNodeIds.add(p);
        curr = p;
      }
    }
  }
  function render() {
    renderNodes();
    renderEdges();
    drawGrid();
    updXform();
    updStatus();
  }
  function updXform() {
    const xf = `translate(${panX}px,${panY}px) scale(${scale})`;
    canvasEl().style.transform = xf;
    svgEl().style.transform = xf;
    svgEl().setAttribute("width", "10000");
    svgEl().setAttribute("height", "10000");
    $("g-zoom-display").textContent = Math.round(scale * 100) + "%";
  }
  function renderNodes() {
    canvasEl().innerHTML = "";
    nodes.forEach((n) => {
      const onPath = pathNodeIds.has(n.id);
      const isDeadEnd = deadEndIds.has(n.id) && !n.ghost;
      const el = document.createElement("div");
      el.className = [
        "g-node",
        n.id === selected ? "g-selected" : "",
        n.ghost ? "g-unreachable" : "",
        onPath ? "g-path" : "",
        isDeadEnd ? "g-deadend" : ""
      ].filter(Boolean).join(" ");
      el.dataset.id = String(n.id);
      el.style.left = n.x + "px";
      el.style.top = n.y + "px";
      el.style.width = NW + "px";
      el.style.minHeight = NH + "px";
      const col = NODE_COLORS[n.role] || NODE_COLORS.unlisted;
      const deadEndBadge = isDeadEnd ? '<span class="g-dead-icon" title="Dead end \u2014 no outgoing scene links">\u2298</span>' : "";
      el.innerHTML = `<div class="g-node-header" style="border-left-color:${col}"><span class="g-node-title">${escHtml(n.label)}</span>${deadEndBadge}<span class="g-node-badge" style="color:${col}">${n.ghost ? "unlisted" : n.role}</span></div>${n.ghost ? '<div class="g-node-body" style="color:#c04800">File not open</div>' : ""}`;
      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        selected = n.id;
        dragging = n;
        const [cx, cy] = s2c(e.clientX, e.clientY);
        dragOX = cx - n.x;
        dragOY = cy - n.y;
        canvasEl().querySelectorAll(".g-node").forEach((nd) => {
          nd.classList.toggle("g-selected", nd.dataset.id === String(n.id));
        });
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (selected === n.id && pathNodeIds.size > 0) {
          pathNodeIds.clear();
          pathEdgeKeys.clear();
        } else {
          computePath(n.id);
        }
        render();
      });
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        if (n.ghost) return;
        const existing = tabs.find((t) => t.name === n.name);
        if (existing) {
          activateTab(existing.id);
        } else {
          const f = fileMap.get(n.name);
          if (f?.content !== void 0) openTab(n.name, f.content);
        }
      });
      canvasEl().appendChild(el);
    });
  }
  function renderEdges() {
    svgEl().querySelectorAll(".g-edge").forEach((el) => el.remove());
    edges.forEach((edge) => {
      const fn = nodes.find((n) => n.id === edge.from);
      const tn = nodes.find((n) => n.id === edge.to);
      if (!fn || !tn) return;
      const x1 = fn.x + NW;
      const y1 = fn.y + NH / 2;
      const x2 = tn.x;
      const y2 = tn.y + NH / 2;
      const dx = Math.abs(x2 - x1);
      const cp = Math.max(50, dx * 0.4);
      const d = `M${x1},${y1} C${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
      const onPath = pathEdgeKeys.has(`${edge.from}-${edge.to}`);
      const baseCol = edge.kind === "goto" ? EDGE_GOTO_COLOR : EDGE_GOSUB_COLOR;
      const col = onPath ? "#22C55E" : baseCol;
      const dash = edge.kind === "goto" ? "" : "6 4";
      const strokeW = onPath ? "3" : "2";
      const opacity = onPath ? "1" : "0.7";
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("g-edge");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", col);
      path.setAttribute("stroke-width", strokeW);
      path.setAttribute("stroke-opacity", opacity);
      if (dash) path.setAttribute("stroke-dasharray", dash);
      path.setAttribute("marker-end", `url(#arr-${edge.kind})`);
      path.dataset.from = String(edge.from);
      path.dataset.to = String(edge.to);
      svgEl().appendChild(path);
    });
  }
  function drawGrid() {
    const gc = gridEl();
    const w = wrap().clientWidth;
    const h = wrap().clientHeight;
    const dpr = window.devicePixelRatio || 1;
    gc.style.width = w + "px";
    gc.style.height = h + "px";
    gc.width = Math.round(w * dpr);
    gc.height = Math.round(h * dpr);
    const ctx = gc.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sp = 20 * scale;
    if (sp < 6) return;
    const ox = (panX % sp + sp) % sp;
    const oy = (panY % sp + sp) % sp;
    ctx.fillStyle = "rgba(150,142,130,0.35)";
    for (let x = ox; x < w; x += sp) {
      for (let y = oy; y < h; y += sp) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  function updStatus() {
    $("g-stat-nodes").textContent = nodes.length + " scene" + (nodes.length !== 1 ? "s" : "");
    $("g-stat-edges").textContent = edges.length + " connection" + (edges.length !== 1 ? "s" : "");
    const ghosts = nodes.filter((n) => n.ghost).length;
    $("g-stat-unreachable").textContent = ghosts ? `${ghosts} unlisted` : "";
    const deadEl = $("g-stat-deadends");
    if (deadEl) {
      const realDeadEnds = [...deadEndIds].filter((id) => !nodes.find((n) => n.id === id)?.ghost).length;
      deadEl.textContent = realDeadEnds ? `${realDeadEnds} dead end${realDeadEnds !== 1 ? "s" : ""}` : "";
      deadEl.style.color = realDeadEnds ? "#EA580C" : "";
    }
  }
  function fitView() {
    if (!nodes.length) return;
    const w = wrap().clientWidth;
    const h = wrap().clientHeight;
    if (w === 0 || h === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
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
  function zoomBy(dir) {
    const w = wrap().clientWidth / 2;
    const h = wrap().clientHeight / 2;
    const old = scale;
    scale = Math.min(3, Math.max(0.1, scale * (dir > 0 ? 1.2 : 0.833)));
    panX = w - (w - panX) * (scale / old);
    panY = h - (h - panY) * (scale / old);
    render();
  }
  function saveGraphState() {
    try {
      localStorage.setItem(GRAPH_STATE_KEY, JSON.stringify({ panX, panY, scale }));
    } catch {
    }
  }
  function restoreGraphState() {
    try {
      const raw = localStorage.getItem(GRAPH_STATE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.panX === "number") panX = s.panX;
      if (typeof s.panY === "number") panY = s.panY;
      if (typeof s.scale === "number") scale = Math.min(3, Math.max(0.1, s.scale));
    } catch {
    }
  }
  function initEvents() {
    if (eventsInit) return;
    eventsInit = true;
    const w = wrap();
    w.addEventListener("mousedown", (e) => {
      if (e.target.closest(".g-node")) return;
      panning = true;
      panSX = e.clientX - panX;
      panSY = e.clientY - panY;
      w.classList.add("dragging");
    });
    w.addEventListener("click", (e) => {
      if (e.target.closest(".g-node")) return;
      if (pathNodeIds.size > 0) {
        pathNodeIds.clear();
        pathEdgeKeys.clear();
        selected = null;
        render();
      }
    });
    window.addEventListener("mousemove", (e) => {
      if (panning) {
        panX = e.clientX - panSX;
        panY = e.clientY - panSY;
        updXform();
        drawGrid();
      }
      if (dragging) {
        const [cx, cy] = s2c(e.clientX, e.clientY);
        dragging.x = cx - dragOX;
        dragging.y = cy - dragOY;
        const idx = nodes.indexOf(dragging);
        const el = canvasEl().children[idx];
        if (el) {
          el.style.left = dragging.x + "px";
          el.style.top = dragging.y + "px";
        }
        renderEdges();
      }
    });
    window.addEventListener("mouseup", () => {
      dragging = null;
      panning = false;
      wrap().classList.remove("dragging");
    });
    w.addEventListener("wheel", (e) => {
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
  function openSceneGraph() {
    $("graph-overlay").classList.add("visible");
    initEvents();
    requestAnimationFrame(() => {
      parseGraph();
      autoLayout();
      const hadState = !!localStorage.getItem(GRAPH_STATE_KEY);
      if (hadState) {
        restoreGraphState();
        render();
      } else {
        render();
        fitView();
      }
    });
  }
  function closeSceneGraph() {
    saveGraphState();
    $("graph-overlay").classList.remove("visible");
  }
  function refreshSceneGraph() {
    pathNodeIds.clear();
    pathEdgeKeys.clear();
    selected = null;
    parseGraph();
    autoLayout();
    render();
    fitView();
  }
  var NW, NH, EDGE_GOTO_COLOR, EDGE_GOSUB_COLOR, NODE_COLORS, nodes, edges, scale, panX, panY, dragging, dragOX, dragOY, panning, panSX, panSY, selected, eventsInit, pathNodeIds, pathEdgeKeys, deadEndIds, wrap, canvasEl, svgEl, gridEl, GRAPH_STATE_KEY;
  var init_scene_graph = __esm({
    "src/graph/scene-graph.ts"() {
      "use strict";
      init_state();
      init_tabs();
      NW = 200;
      NH = 72;
      EDGE_GOTO_COLOR = "#2563EB";
      EDGE_GOSUB_COLOR = "#EA580C";
      NODE_COLORS = {
        startup: "#1D55C7",
        scene: "#1A7F3C",
        ending: "#A02020",
        procedures: "#6B21D6",
        skills: "#7c5c2e",
        items: "#C44A00",
        stats: "#0A7E6E",
        unlisted: "#a8a49d"
      };
      nodes = [];
      edges = [];
      scale = 1;
      panX = 60;
      panY = 60;
      dragging = null;
      dragOX = 0;
      dragOY = 0;
      panning = false;
      panSX = 0;
      panSY = 0;
      selected = null;
      eventsInit = false;
      pathNodeIds = /* @__PURE__ */ new Set();
      pathEdgeKeys = /* @__PURE__ */ new Set();
      deadEndIds = /* @__PURE__ */ new Set();
      wrap = () => $("graph-canvas-wrap");
      canvasEl = () => $("graph-canvas");
      svgEl = () => $("graph-svg-layer");
      gridEl = () => $("graph-grid");
      GRAPH_STATE_KEY = "sa-graph-state";
    }
  });

  // src/main.ts
  init_state();

  // src/monaco/language.ts
  var T = {
    COMMENT: "sa.comment",
    DECLARE: "sa.cmd.declare",
    TEMP: "sa.cmd.temp",
    ASSIGN: "sa.cmd.assign",
    COND: "sa.cmd.cond",
    LOOP: "sa.cmd.loop",
    NAV: "sa.cmd.nav",
    CHOICE: "sa.cmd.choice",
    LABEL: "sa.cmd.label",
    DISPLAY: "sa.cmd.display",
    INPUT: "sa.cmd.input",
    SKILLS: "sa.cmd.skills",
    ITEMS: "sa.cmd.items",
    JOURNAL: "sa.cmd.journal",
    PROC: "sa.cmd.proc",
    SAVE: "sa.cmd.save",
    GLOSS: "sa.cmd.gloss",
    ENDING: "sa.cmd.ending",
    META: "sa.cmd.meta",
    STATS_FILE: "sa.cmd.statsfile",
    DEF_BLOCK: "sa.cmd.defblock",
    CHOICE_OPT: "sa.choice.option",
    STR: "sa.string",
    INTERP: "sa.interp",
    PRONOUN: "sa.pronoun",
    EXPR_OPEN: "sa.expr.paren",
    EXPR_KW: "sa.expr.kw",
    NUMBER: "sa.number",
    VARNAME: "sa.varname",
    SCENENAME: "sa.scenename",
    LABELNAME: "sa.labelname",
    PROCNAME: "sa.procname",
    RARITY: "sa.rarity",
    INLINE_TAG: "sa.inlinetag",
    UNKNOWN: "sa.unknown"
  };
  function registerLanguage() {
    monaco.languages.register({ id: "sa-script" });
    monaco.languages.setMonarchTokensProvider("sa-script", {
      defaultToken: "",
      tokenizer: {
        root: [
          [/\/\/.*$/, T.COMMENT],
          // Weighted choice option: "  40 #Label"
          [/^(\s*)(\d+)(\s*)(#.*)$/, ["", T.NUMBER, "", T.CHOICE_OPT]],
          // Choice option: "#Text"
          [/^(\s*)(#.+)$/, ["", T.CHOICE_OPT]],
          // ── Directives — ordered longest match first ──────────────
          // Declarations
          [/(\s*)(\*create_stat|\*create|\*scene_list)(?=\s|$)/, ["", { token: T.DECLARE, next: "@after_declare" }]],
          // Temp
          [/(\s*)(\*temp)(?=\s|$)/, ["", { token: T.TEMP, next: "@after_varname" }]],
          // Assignment
          [/(\s*)(\*set_stat|\*set)(?=\s|$)/, ["", { token: T.ASSIGN, next: "@after_assign" }]],
          // Conditional
          [/(\s*)(\*selectable_if|\*elseif|\*if|\*else)(?=\s|$|\()/, ["", { token: T.COND, next: "@after_expr" }]],
          // Loop
          [/(\s*)(\*loop)(?=\s|$|\()/, ["", { token: T.LOOP, next: "@after_expr" }]],
          // Navigation — scene-level
          [/(\s*)(\*goto_scene|\*gosub_scene)(?=\s|$)/, ["", { token: T.NAV, next: "@after_scenename" }]],
          [/(\s*)(\*goto|\*gosub)(?=\s|$)/, ["", { token: T.NAV, next: "@after_labelname" }]],
          [/(\s*)(\*return|\*finish)(?=\s|$)/, ["", T.NAV]],
          // Choice blocks
          [/(\s*)(\*random_choice|\*choice)(?=\s|$)/, ["", T.CHOICE]],
          // Labels
          [/(\s*)(\*label)(?=\s|$)/, ["", { token: T.LABEL, next: "@after_labelname" }]],
          // Display
          [/(\s*)(\*set_game_title|\*set_game_byline|\*title|\*system|\*end_system|\*notify|\*page_break|\*image)(?=\s|$)/, ["", { token: T.DISPLAY, next: "@after_generic" }]],
          // Input
          [/(\s*)(\*input)(?=\s|$)/, ["", { token: T.INPUT, next: "@after_varname" }]],
          // Skills
          [/(\s*)(\*if_skill|\*grant_skill|\*revoke_skill|\*category)(?=\s|$)/, ["", { token: T.SKILLS, next: "@after_generic" }]],
          // Items
          [/(\s*)(\*check_item|\*add_item|\*grant_item|\*remove_item|\*award_essence|\*add_essence)(?=\s|$)/, ["", { token: T.ITEMS, next: "@after_generic" }]],
          // Journal
          [/(\s*)(\*journal|\*achievement)(?=\s|$)/, ["", { token: T.JOURNAL, next: "@after_generic" }]],
          // Procedures
          [/(\s*)(\*procedure|\*call)(?=\s|$)/, ["", { token: T.PROC, next: "@after_procname" }]],
          // Save
          [/(\s*)(\*save_point|\*checkpoint)(?=\s|$)/, ["", { token: T.SAVE, next: "@after_generic" }]],
          // Glossary
          [/(\s*)(\*define_term)(?=\s|$)/, ["", { token: T.GLOSS, next: "@after_generic" }]],
          // Ending
          [/(\s*)(\*ending)(?=\s|$)/, ["", { token: T.ENDING, next: "@after_generic" }]],
          // Stats file directives
          [/(\s*)(\*stat_registered|\*skills_registered|\*journal_section|\*achievements|\*inventory|\*stat_group|\*stat_color|\*stat_icon|\*stat)(?=\s|$)/, ["", { token: T.STATS_FILE, next: "@after_generic" }]],
          // Skill/item definitions
          [/(\s*)(\*skill|\*item|\*require)(?=\s|$)/, ["", { token: T.DEF_BLOCK, next: "@after_generic" }]],
          // Meta
          [/(\s*)(\*patch_state|\*comment)(?=\s|$)/, ["", { token: T.META, next: "@after_comment" }]],
          // Unknown *command
          [/(\s*)(\*[a-z_]+)/, ["", T.UNKNOWN]],
          // ── Inline tokens (narrative lines) ──────────────────────
          // Only highlight interpolation, pronouns, inline tags, and rarity
          // badges in narrative text. Strings, numbers, and keywords are NOT
          // highlighted in root — they only fire inside directive sub-states.
          [/\$\{[a-zA-Z_][\w]*\}/, T.INTERP],
          [/\{(?:they|them|their|theirs|themself|They|Them|Their|Theirs|Themself)\}/, T.PRONOUN],
          [/\[(?:b|i|\/b|\/i|common|uncommon|rare|epic|legendary|\/common|\/uncommon|\/rare|\/epic|\/legendary)\]/i, T.INLINE_TAG],
          [/\[(?:Common|Uncommon|Rare|Epic|Legendary)\]/, T.RARITY]
        ],
        // ── Sub-states ──────────────────────────────────────────────
        after_declare: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\s+/, ""],
          [/[a-zA-Z_][\w]*/, { token: T.VARNAME, next: "@after_generic" }],
          [/"[^"]*"/, { token: T.STR, next: "@after_generic" }],
          [/./, ""]
        ],
        after_varname: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\s+/, ""],
          [/[a-zA-Z_][\w]*/, { token: T.VARNAME, next: "@after_generic" }],
          [/./, ""]
        ],
        after_assign: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\s+/, ""],
          [/[a-zA-Z_][\w]*/, { token: T.VARNAME, next: "@after_expr" }],
          [/./, ""]
        ],
        after_scenename: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\s+/, ""],
          [/[a-zA-Z_][\w.]*/, { token: T.SCENENAME, next: "@after_generic" }],
          [/./, ""]
        ],
        after_labelname: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\s+/, ""],
          [/[a-zA-Z_][\w]*/, { token: T.LABELNAME, next: "@after_generic" }],
          [/./, ""]
        ],
        after_procname: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\s+/, ""],
          [/[a-zA-Z_][\w]*/, { token: T.PROCNAME, next: "@after_generic" }],
          [/./, ""]
        ],
        after_expr: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\s+/, ""],
          [/[()]/, T.EXPR_OPEN],
          [/\b(?:and|or|not|true|false)\b/, T.EXPR_KW],
          [/[<>=!]+/, T.EXPR_OPEN],
          [/"[^"]*"/, T.STR],
          [/\$\{[a-zA-Z_][\w]*\}/, T.INTERP],
          [/\d+(\.\d+)?/, T.NUMBER],
          [/[a-zA-Z_][\w]*/, T.VARNAME],
          [/./, ""]
        ],
        after_generic: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/\$\{[a-zA-Z_][\w]*\}/, T.INTERP],
          [/\{(?:they|them|their|theirs|themself|They|Them|Their|Theirs|Themself)\}/, T.PRONOUN],
          [/"[^"]*"/, T.STR],
          [/\[(?:Common|Uncommon|Rare|Epic|Legendary)\]/i, T.RARITY],
          [/\[(?:b|i|\/b|\/i|common|uncommon|rare|epic|legendary|\/common|\/uncommon|\/rare|\/epic|\/legendary)\]/i, T.INLINE_TAG],
          [/\d+(\.\d+)?/, T.NUMBER],
          [/./, ""]
        ],
        after_comment: [
          [/\r$/, "", "@pop"],
          [/$/, "", "@pop"],
          [/.+/, T.COMMENT]
        ]
      }
    });
  }

  // src/monaco/theme.ts
  function registerTheme() {
    monaco.editor.defineTheme("sa-light", {
      base: "vs",
      inherit: false,
      rules: [
        { token: T.COMMENT, foreground: "9C9890", fontStyle: "italic" },
        { token: T.UNKNOWN, foreground: "E03030", fontStyle: "bold" },
        { token: "", foreground: "2c2a26" },
        { token: T.DECLARE, foreground: "1D55C7", fontStyle: "bold" },
        { token: T.TEMP, foreground: "3B6DD4", fontStyle: "bold" },
        { token: T.ASSIGN, foreground: "5B3FBF", fontStyle: "bold" },
        { token: T.COND, foreground: "6B21D6", fontStyle: "bold" },
        { token: T.LOOP, foreground: "8B1FA0", fontStyle: "bold" },
        { token: T.NAV, foreground: "1055B0", fontStyle: "bold" },
        { token: T.CHOICE, foreground: "1A7F3C", fontStyle: "bold" },
        { token: T.CHOICE_OPT, foreground: "1A7F3C" },
        { token: T.LABEL, foreground: "0A6E50", fontStyle: "bold" },
        { token: T.DISPLAY, foreground: "0A7E6E", fontStyle: "bold" },
        { token: T.INPUT, foreground: "096860", fontStyle: "bold" },
        { token: T.SKILLS, foreground: "7C5C2E", fontStyle: "bold" },
        { token: T.ITEMS, foreground: "C44A00", fontStyle: "bold" },
        { token: T.JOURNAL, foreground: "8A6400", fontStyle: "bold" },
        { token: T.PROC, foreground: "6B21D6", fontStyle: "bold" },
        { token: T.SAVE, foreground: "3A5FA0", fontStyle: "bold" },
        { token: T.GLOSS, foreground: "4A6880", fontStyle: "bold" },
        { token: T.ENDING, foreground: "A02020", fontStyle: "bold" },
        { token: T.META, foreground: "A8A49D", fontStyle: "italic" },
        { token: T.STATS_FILE, foreground: "0A7E6E", fontStyle: "bold" },
        { token: T.DEF_BLOCK, foreground: "A05020", fontStyle: "bold" },
        { token: T.STR, foreground: "C04800" },
        { token: T.INTERP, foreground: "0A7E6E", fontStyle: "bold" },
        { token: T.PRONOUN, foreground: "0A7E6E", fontStyle: "italic" },
        { token: T.EXPR_OPEN, foreground: "7A5800" },
        { token: T.EXPR_KW, foreground: "A0006E", fontStyle: "bold" },
        { token: T.NUMBER, foreground: "8B2500" },
        { token: T.VARNAME, foreground: "1c1a17" },
        { token: T.SCENENAME, foreground: "1D55C7" },
        { token: T.LABELNAME, foreground: "0A6E50" },
        { token: T.PROCNAME, foreground: "6B21D6" },
        { token: T.RARITY, foreground: "B07800", fontStyle: "bold" },
        { token: T.INLINE_TAG, foreground: "A8A49D" }
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#2c2a26",
        "editor.lineHighlightBackground": "#f8f6f2",
        "editor.selectionBackground": "#d4ccbc",
        "editor.inactiveSelectionBackground": "#e8e4dc",
        "editor.findMatchBackground": "#f5c97a",
        "editor.findMatchHighlightBackground": "#fae5b0",
        "editorLineNumber.foreground": "#c8c4bc",
        "editorLineNumber.activeForeground": "#7c5c2e",
        "editorCursor.foreground": "#7c5c2e",
        "editorIndentGuide.background1": "#ece8e0",
        "editorIndentGuide.activeBackground1": "#c4b89a",
        "editorGutter.background": "#f9f8f5",
        "editorBracketMatch.background": "#eddfc8",
        "editorBracketMatch.border": "#b8935a",
        "editorBracketHighlight.foreground1": "#6B21D6",
        "editorBracketHighlight.foreground2": "#1A7F3C",
        "editorBracketHighlight.foreground3": "#1D55C7",
        "editorBracketHighlight.foreground4": "#C44A00",
        "editorBracketHighlight.foreground5": "#0A7E6E",
        "editorBracketHighlight.foreground6": "#7c5c2e",
        "scrollbarSlider.background": "#d8d4cc88",
        "scrollbarSlider.hoverBackground": "#c4c0b888",
        "scrollbarSlider.activeBackground": "#a8a49d88"
      }
    });
  }

  // src/monaco/completions.ts
  init_state();
  var SNIPPET = 4;
  var COMPLETIONS = [
    {
      label: "*create",
      kind: 14,
      detail: "*create varName defaultValue",
      doc: "Declare a global persistent variable (startup.txt only).",
      insertText: "*create ${1:varName} ${2:defaultValue}",
      insertTextRules: SNIPPET
    },
    {
      label: "*create_stat",
      kind: 14,
      detail: '*create_stat key "Label" value',
      doc: "Declare a stat shown in the Stats sidebar.",
      insertText: '*create_stat ${1:key} "${2:Label}" ${3:0}',
      insertTextRules: SNIPPET
    },
    {
      label: "*scene_list",
      kind: 14,
      detail: "*scene_list",
      doc: "List of scenes (startup.txt only). Indent each scene name below.",
      insertText: "*scene_list\n  ${1:prologue}",
      insertTextRules: SNIPPET
    },
    {
      label: "*temp",
      kind: 6,
      detail: "*temp varName [value]",
      doc: "Declare a scene-local variable.",
      insertText: "*temp ${1:varName} ${2:false}",
      insertTextRules: SNIPPET
    },
    {
      label: "*set",
      kind: 7,
      detail: "*set varName expression",
      doc: "Set any variable to a value or expression.",
      insertText: "*set ${1:varName} ${2:value}",
      insertTextRules: SNIPPET
    },
    { label: "*set_stat", kind: 7, detail: "*set_stat varName expr [min:N] [max:N]", doc: "Set a stat variable with optional min/max clamping." },
    {
      label: "*if",
      kind: 17,
      detail: "*if (condition)",
      doc: "Run the indented block if condition is true.",
      insertText: "*if (${1:condition})\n  $0",
      insertTextRules: SNIPPET
    },
    {
      label: "*elseif",
      kind: 17,
      detail: "*elseif (condition)",
      doc: "Alternative branch for a *if chain.",
      insertText: "*elseif (${1:condition})",
      insertTextRules: SNIPPET
    },
    { label: "*else", kind: 17, detail: "*else", doc: "Fallback block for a *if chain." },
    {
      label: "*selectable_if",
      kind: 17,
      detail: "*selectable_if (cond) #Option text",
      doc: "Choice button visible but disabled when condition is false.",
      insertText: "*selectable_if (${1:condition}) #${2:Option text}",
      insertTextRules: SNIPPET
    },
    {
      label: "*loop",
      kind: 17,
      detail: "*loop (condition)",
      doc: "Repeat the indented block while condition is true.",
      insertText: "*loop (${1:condition})\n  $0",
      insertTextRules: SNIPPET
    },
    {
      label: "*goto",
      kind: 2,
      detail: "*goto labelName",
      doc: "Jump to a *label within the current scene.",
      insertText: "*goto ${1:labelName}",
      insertTextRules: SNIPPET
    },
    {
      label: "*goto_scene",
      kind: 2,
      detail: "*goto_scene sceneName",
      doc: "Move to another scene file. Clears *temp variables.",
      insertText: "*goto_scene ${1:sceneName}",
      insertTextRules: SNIPPET
    },
    {
      label: "*gosub",
      kind: 2,
      detail: "*gosub labelName",
      doc: "Call a label in the current scene as a subroutine.",
      insertText: "*gosub ${1:labelName}",
      insertTextRules: SNIPPET
    },
    {
      label: "*gosub_scene",
      kind: 2,
      detail: "*gosub_scene sceneName [label]",
      doc: "Call another scene as a subroutine.",
      insertText: "*gosub_scene ${1:sceneName}",
      insertTextRules: SNIPPET
    },
    { label: "*return", kind: 2, detail: "*return", doc: "Return from a *gosub or *call." },
    { label: "*finish", kind: 2, detail: "*finish", doc: "Advance to the next scene in *scene_list." },
    {
      label: "*label",
      kind: 3,
      detail: "*label name",
      doc: "Mark a named jump target. Must be unique per scene.",
      insertText: "*label ${1:name}",
      insertTextRules: SNIPPET
    },
    {
      label: "*choice",
      kind: 17,
      detail: "*choice",
      doc: "Show player choice buttons. Indent # options beneath.",
      insertText: "*choice\n\n  #${1:First option}\n\n    $0\n\n  #${2:Second option}\n\n    ",
      insertTextRules: SNIPPET
    },
    {
      label: "*random_choice",
      kind: 17,
      detail: "*random_choice",
      doc: 'Silently pick one weighted branch. Format: "  40 #Label".',
      insertText: "*random_choice\n\n  50 #${1:First branch}\n\n    $0\n\n  50 #${2:Second branch}\n\n    ",
      insertTextRules: SNIPPET
    },
    {
      label: "*title",
      kind: 10,
      detail: "*title [Tag] Text",
      doc: "Show a chapter card and update the header.",
      insertText: "*title [${1:Chapter}] ${2:Title}",
      insertTextRules: SNIPPET
    },
    {
      label: "*system",
      kind: 10,
      detail: "*system [text]",
      doc: "Show an inline [SYSTEM] message.",
      insertText: "*system\n  ${1:message}\n*end_system",
      insertTextRules: SNIPPET
    },
    { label: "*end_system", kind: 10, detail: "*end_system", doc: "Close a multi-line *system block." },
    {
      label: "*notify",
      kind: 10,
      detail: '*notify "message" [ms]',
      doc: "Show a toast popup.",
      insertText: '*notify "${1:message}"',
      insertTextRules: SNIPPET
    },
    { label: "*page_break", kind: 10, detail: "*page_break [buttonText]", doc: "Pause, clear screen on continue." },
    {
      label: "*image",
      kind: 10,
      detail: '*image "file" [alt:"text"] [width:N]',
      doc: "Insert an image from the media/ folder.",
      insertText: '*image "${1:filename.png}"',
      insertTextRules: SNIPPET
    },
    {
      label: "*input",
      kind: 10,
      detail: '*input varName "Prompt text"',
      doc: "Pause and show a text input field.",
      insertText: '*input ${1:varName} "${2:Prompt text}"',
      insertTextRules: SNIPPET
    },
    {
      label: "*grant_skill",
      kind: 4,
      detail: "*grant_skill skillKey",
      doc: "Give the player a skill.",
      insertText: "*grant_skill ${1:skillKey}",
      insertTextRules: SNIPPET
    },
    { label: "*revoke_skill", kind: 4, detail: "*revoke_skill skillKey", doc: "Remove a skill from the player." },
    {
      label: "*if_skill",
      kind: 17,
      detail: "*if_skill skillKey",
      doc: "Branch if the player owns this skill.",
      insertText: "*if_skill ${1:skillKey}\n  $0",
      insertTextRules: SNIPPET
    },
    {
      label: "*add_item",
      kind: 4,
      detail: '*add_item "Item Name"',
      doc: "Add one item to the player inventory.",
      insertText: '*add_item "${1:Item Name}"',
      insertTextRules: SNIPPET
    },
    {
      label: "*remove_item",
      kind: 4,
      detail: '*remove_item "Item Name"',
      doc: "Remove one item from inventory.",
      insertText: '*remove_item "${1:Item Name}"',
      insertTextRules: SNIPPET
    },
    {
      label: "*check_item",
      kind: 4,
      detail: '*check_item "Item Name" varName',
      doc: "Set varName to true/false based on item ownership.",
      insertText: '*check_item "${1:Item Name}" ${2:varName}',
      insertTextRules: SNIPPET
    },
    {
      label: "*award_essence",
      kind: 4,
      detail: "*award_essence N",
      doc: "Award N Essence points.",
      insertText: "*award_essence ${1:100}",
      insertTextRules: SNIPPET
    },
    {
      label: "*journal",
      kind: 10,
      detail: "*journal text",
      doc: "Add a journal entry.",
      insertText: "*journal ${1:text}",
      insertTextRules: SNIPPET
    },
    {
      label: "*achievement",
      kind: 10,
      detail: "*achievement text",
      doc: "Add an achievement entry.",
      insertText: "*achievement ${1:text}",
      insertTextRules: SNIPPET
    },
    {
      label: "*procedure",
      kind: 11,
      detail: "*procedure name",
      doc: "Define a reusable block in procedures.txt.",
      insertText: "*procedure ${1:name}\n  $0\n  *return",
      insertTextRules: SNIPPET
    },
    {
      label: "*call",
      kind: 11,
      detail: "*call procedureName",
      doc: "Run a named procedure.",
      insertText: "*call ${1:procedureName}",
      insertTextRules: SNIPPET
    },
    { label: "*save_point", kind: 5, detail: '*save_point ["Label"]', doc: "Trigger an immediate auto-save." },
    { label: "*checkpoint", kind: 5, detail: '*checkpoint ["Label"]', doc: "Create a named restore point." },
    {
      label: "*define_term",
      kind: 10,
      detail: '*define_term "Term" description',
      doc: "Add or update a glossary entry.",
      insertText: '*define_term "${1:Term}" ${2:description}',
      insertTextRules: SNIPPET
    },
    {
      label: "*ending",
      kind: 10,
      detail: '*ending "Title" "Subtitle"',
      doc: "Show the game-ending screen.",
      insertText: '*ending "${1:Title}" "${2:Subtitle}"',
      insertTextRules: SNIPPET
    },
    {
      label: "*stat_group",
      kind: 3,
      detail: '*stat_group "Label"',
      doc: "Open a collapsible section in stats panel.",
      insertText: '*stat_group "${1:Label}"',
      insertTextRules: SNIPPET
    },
    {
      label: "*stat",
      kind: 3,
      detail: '*stat key "Label"',
      doc: "Display a global variable in stats panel.",
      insertText: '*stat ${1:key} "${2:Label}"',
      insertTextRules: SNIPPET
    },
    { label: "*stat_color", kind: 3, detail: "*stat_color key color", doc: "Set highlight colour for a stat row." },
    { label: "*stat_registered", kind: 3, detail: "*stat_registered", doc: "Auto-render all *create_stat attributes." },
    { label: "*inventory", kind: 3, detail: "*inventory", doc: "Render the player inventory list." },
    { label: "*comment", kind: 15, detail: "*comment text", doc: "Author note \u2014 ignored by the engine." },
    { label: "*patch_state", kind: 15, detail: "*patch_state varName value", doc: "Dev tool: directly overwrite a state variable." }
  ];
  function getSceneNames() {
    const names = /* @__PURE__ */ new Set();
    for (const fname of fileMap.keys()) {
      names.add(fname.replace(/\.txt$/i, ""));
    }
    for (const tab of tabs) {
      names.add(tab.name.replace(/\.txt$/i, ""));
    }
    return [...names];
  }
  function getLabelsFromModel(model) {
    const labels = [];
    const lineCount = model.getLineCount();
    for (let i = 1; i <= lineCount; i++) {
      const line = model.getLineContent(i).trimStart();
      const m = line.match(/^\*label\s+(\S+)/);
      if (m) labels.push(m[1]);
    }
    return labels;
  }
  function getDeclaredVars() {
    const vars = /* @__PURE__ */ new Set();
    for (const tab of tabs) {
      const content = tab.model.getValue();
      for (const line of content.split("\n")) {
        const t = line.trimStart();
        const mC = t.match(/^\*create(?:_stat)?\s+([a-zA-Z_]\w*)/);
        if (mC) vars.add(mC[1]);
        const mT = t.match(/^\*temp\s+([a-zA-Z_]\w*)/);
        if (mT) vars.add(mT[1]);
      }
    }
    return [...vars];
  }
  function registerCompletionProvider() {
    monaco.languages.registerCompletionItemProvider("sa-script", {
      triggerCharacters: ["*"],
      provideCompletionItems(model, position) {
        const lineText = model.getLineContent(position.lineNumber);
        const starIdx = lineText.lastIndexOf("*", position.column - 1);
        if (starIdx === -1) return { suggestions: [] };
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: starIdx + 1,
          endColumn: position.column
        };
        const typed = lineText.slice(starIdx, position.column - 1).toLowerCase();
        return {
          suggestions: COMPLETIONS.filter((c) => c.label.startsWith(typed) || typed === "*").map((c) => ({
            label: c.label,
            kind: c.kind,
            detail: c.detail,
            documentation: { value: c.doc },
            insertText: c.insertText ?? c.label,
            insertTextRules: c.insertTextRules ?? 0,
            range
          }))
        };
      }
    });
    monaco.languages.registerCompletionItemProvider("sa-script", {
      triggerCharacters: [" "],
      provideCompletionItems(model, position) {
        const lineText = model.getLineContent(position.lineNumber);
        const trimmed = lineText.trimStart();
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column
        };
        if (/^\*(?:goto|gosub)_scene\s/.test(trimmed)) {
          return {
            suggestions: getSceneNames().map((name) => ({
              label: name,
              kind: 17,
              detail: name + ".txt",
              documentation: { value: `Navigate to scene: **${name}.txt**` },
              insertText: name,
              range
            }))
          };
        }
        if (/^\*(?:goto|gosub)\s/.test(trimmed) && !/^\*(?:goto|gosub)_scene\s/.test(trimmed)) {
          return {
            suggestions: getLabelsFromModel(model).map((label) => ({
              label,
              kind: 18,
              detail: "*label " + label,
              documentation: { value: `Jump to label: **${label}**` },
              insertText: label,
              range
            }))
          };
        }
        if (/^\*(?:if|elseif)\s/.test(trimmed)) {
          return {
            suggestions: getDeclaredVars().map((v) => ({
              label: v,
              kind: 6,
              detail: "variable",
              insertText: v,
              range
            }))
          };
        }
        if (/^\*set\s/.test(trimmed)) {
          return {
            suggestions: getDeclaredVars().map((v) => ({
              label: v,
              kind: 6,
              detail: "variable",
              insertText: v,
              range
            }))
          };
        }
        if (/^\*call\s/.test(trimmed)) {
          const procTab = tabs.find((t) => t.name === "procedures.txt");
          if (procTab) {
            const procs = [];
            const content = procTab.model.getValue();
            for (const line of content.split("\n")) {
              const m = line.trimStart().match(/^\*procedure\s+(\S+)/);
              if (m) procs.push(m[1]);
            }
            return {
              suggestions: procs.map((p) => ({
                label: p,
                kind: 11,
                detail: "*procedure " + p,
                insertText: p,
                range
              }))
            };
          }
        }
        return { suggestions: [] };
      }
    });
  }
  function registerHoverProvider() {
    monaco.languages.registerHoverProvider("sa-script", {
      provideHover(model, position) {
        const line = model.getLineContent(position.lineNumber);
        const trimmed = line.trimStart();
        const lead = line.length - trimmed.length;
        const m = trimmed.match(/^(\*[a-z_]+)/);
        if (!m) return null;
        const cmd = COMPLETIONS.find((c) => c.label === m[1]);
        if (!cmd) return null;
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: lead + 1,
            endColumn: lead + 1 + m[1].length
          },
          contents: [
            { value: "**`" + cmd.detail + "`**" },
            { value: cmd.doc }
          ]
        };
      }
    });
  }
  function registerCompletionProvider2() {
    const mLangs = monaco.languages;
    mLangs.registerDefinitionProvider("sa-script", {
      provideDefinition(model, position) {
        const line = model.getLineContent(position.lineNumber).trimStart();
        const mScene = line.match(/^\*(?:goto|gosub)_scene\s+(\S+)/);
        if (mScene) {
          const stem = mScene[1].replace(/\.txt$/i, "");
          const targetTab = tabs.find((t) => t.name === stem + ".txt");
          if (targetTab) {
            return [{
              uri: targetTab.model.uri,
              range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }
            }];
          }
          return null;
        }
        const mGoto = line.match(/^\*(?:goto|gosub)\s+(\S+)/);
        if (mGoto && !/^\*(?:goto|gosub)_scene/.test(line)) {
          const targetLabel = mGoto[1].toLowerCase();
          const lineCount = model.getLineCount();
          for (let i = 1; i <= lineCount; i++) {
            const l = model.getLineContent(i).trimStart();
            const mL = l.match(/^\*label\s+(\S+)/);
            if (mL && mL[1].toLowerCase() === targetLabel) {
              return [{
                uri: model.uri,
                range: { startLineNumber: i, startColumn: 1, endLineNumber: i, endColumn: l.length + 1 }
              }];
            }
          }
        }
        return null;
      }
    });
    mLangs.registerReferenceProvider("sa-script", {
      provideReferences(model, position) {
        const line = model.getLineContent(position.lineNumber).trimStart();
        const mLabel = line.match(/^\*label\s+(\S+)/);
        if (!mLabel) return null;
        const labelName = mLabel[1].toLowerCase();
        const refs = [];
        const lineCount = model.getLineCount();
        for (let i = 1; i <= lineCount; i++) {
          const l = model.getLineContent(i).trimStart();
          const mGoto = l.match(/^\*(?:goto|gosub)\s+(\S+)/);
          if (mGoto && mGoto[1].toLowerCase() === labelName) {
            refs.push({
              uri: model.uri,
              range: { startLineNumber: i, startColumn: 1, endLineNumber: i, endColumn: l.length + 1 }
            });
          }
        }
        return refs;
      }
    });
  }

  // src/features/decorations.ts
  init_state();
  var decorationCollection = null;
  var _timer = null;
  function initDecorations() {
    if (editor) {
      decorationCollection = editor.createDecorationsCollection([]);
    }
  }
  function blockCategory(t) {
    if (/^\*(if|elseif|selectable_if)\b/.test(t)) return "if";
    if (/^\*(choice|random_choice)\b/.test(t)) return "choice";
    if (/^\*loop\b/.test(t)) return "loop";
    if (/^\*procedure\b/.test(t)) return "proc";
    if (/^\*system\b/.test(t)) return "system";
    if (/^#/.test(t)) return "option";
    return null;
  }
  function buildDecorations(model) {
    const lineCount = model.getLineCount();
    const decs = [];
    const stack = [];
    for (let ln = 1; ln <= lineCount; ln++) {
      const raw = model.getLineContent(ln);
      const trimmed = raw.trimStart();
      if (!trimmed) continue;
      const indent = raw.length - trimmed.length;
      const isComment = trimmed.startsWith("//");
      if (!isComment) {
        while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      }
      stack.forEach((frame) => {
        decs.push({
          range: new monaco.Range(ln, 1, ln, 1),
          options: { isWholeLine: false, className: `sa-guide-${frame.category}` }
        });
      });
      if (!isComment) {
        const cat = blockCategory(trimmed);
        if (cat) {
          decs.push({
            range: new monaco.Range(ln, 1, ln, 1),
            options: { isWholeLine: true, className: `sa-block-header-${cat}` }
          });
          stack.push({ indent, category: cat });
        }
      }
    }
    return decs;
  }
  function scheduleDecorate() {
    if (_timer !== null) clearTimeout(_timer);
    _timer = setTimeout(() => {
      const model = editor?.getModel();
      if (model && decorationCollection) {
        decorationCollection.set(buildDecorations(model));
      }
    }, 80);
  }

  // src/features/diagnostics.ts
  init_state();
  var DIAG_OWNER = "sa-diagnostics";
  var _timer2 = null;
  function runDiagnostics(model, filename) {
    const markers = [];
    const lineCount = model.getLineCount();
    const isStartup = filename === "startup.txt";
    const lines = [];
    for (let i = 1; i <= lineCount; i++) {
      const raw = model.getLineContent(i);
      const trimmed = raw.trimStart();
      lines.push({ raw, trimmed, indent: raw.length - trimmed.length, ln: i });
    }
    const addMarker = (ln, col, endCol, message, severity) => {
      markers.push({ severity, message, startLineNumber: ln, startColumn: col, endLineNumber: ln, endColumn: endCol });
    };
    const addError = (ln, c, ec, msg) => addMarker(ln, c, ec, msg, monaco.MarkerSeverity.Error);
    const addWarning = (ln, c, ec, msg) => addMarker(ln, c, ec, msg, monaco.MarkerSeverity.Warning);
    const definedLabels = /* @__PURE__ */ new Map();
    const openSystemLns = [];
    lines.forEach(({ trimmed, indent, ln }) => {
      if (!trimmed || trimmed.startsWith("//")) return;
      const mLabel = trimmed.match(/^\*label\s+(\S+)/);
      if (mLabel) {
        const name = mLabel[1].toLowerCase();
        if (definedLabels.has(name)) {
          addError(
            ln,
            indent + 1,
            indent + 1 + trimmed.length,
            `Duplicate *label "${mLabel[1]}" \u2014 already defined at line ${definedLabels.get(name)}.`
          );
        } else {
          definedLabels.set(name, ln);
        }
      }
      if (/^\*system\b/.test(trimmed)) openSystemLns.push(ln);
      if (/^\*end_system\b/.test(trimmed)) openSystemLns.pop();
    });
    openSystemLns.forEach((sln) => {
      const t = lines[sln - 1];
      addError(
        sln,
        t.indent + 1,
        t.indent + 1 + t.trimmed.length,
        "*system block is never closed \u2014 add *end_system."
      );
    });
    const knownScenes = /* @__PURE__ */ new Set();
    for (const fname of fileMap.keys()) {
      knownScenes.add(fname.toLowerCase());
      knownScenes.add(fname.toLowerCase().replace(/\.txt$/i, ""));
    }
    for (const tab of tabs) {
      knownScenes.add(tab.name.toLowerCase());
      knownScenes.add(tab.name.toLowerCase().replace(/\.txt$/i, ""));
    }
    const declaredVars = /* @__PURE__ */ new Set();
    for (const tab of tabs) {
      const content = tab.model.getValue();
      for (const line of content.split("\n")) {
        const t = line.trimStart();
        const mC = t.match(/^\*create(?:_stat)?\s+([a-zA-Z_]\w*)/);
        if (mC) declaredVars.add(mC[1].toLowerCase());
        const mT = t.match(/^\*temp\s+([a-zA-Z_]\w*)/);
        if (mT) declaredVars.add(mT[1].toLowerCase());
      }
    }
    lines.forEach(({ trimmed }) => {
      const mC = trimmed.match(/^\*create(?:_stat)?\s+([a-zA-Z_]\w*)/);
      if (mC) declaredVars.add(mC[1].toLowerCase());
      const mT = trimmed.match(/^\*temp\s+([a-zA-Z_]\w*)/);
      if (mT) declaredVars.add(mT[1].toLowerCase());
    });
    lines.forEach(({ raw, trimmed, indent, ln }) => {
      if (!trimmed || trimmed.startsWith("//")) return;
      if (isStartup && /^\*temp\b/.test(trimmed))
        addError(ln, indent + 1, indent + 1 + 5, "*temp cannot be used in startup.txt \u2014 use *create.");
      if (!isStartup && /^\*create\b/.test(trimmed) && !/^\*create_stat\b/.test(trimmed))
        addWarning(ln, indent + 1, indent + 1 + 7, "*create should only appear in startup.txt. Use *temp for scene-local variables.");
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
      const mGotoScene = trimmed.match(/^\*goto_scene\s+(\S+)/);
      if (mGotoScene && knownScenes.size > 0) {
        const raw2 = mGotoScene[1];
        const stem = raw2.toLowerCase().replace(/\.txt$/i, "");
        if (!knownScenes.has(stem) && !knownScenes.has(stem + ".txt")) {
          const col = indent + 1 + trimmed.indexOf(raw2);
          addError(
            ln,
            col,
            col + raw2.length,
            `*goto_scene "${raw2}" \u2014 scene not found in project. Open or create "${stem}.txt".`
          );
        }
      }
      const mGosubScene = trimmed.match(/^\*gosub_scene\s+(\S+)/);
      if (mGosubScene && knownScenes.size > 0) {
        const raw2 = mGosubScene[1].split(/\s/)[0];
        const stem = raw2.toLowerCase().replace(/\.txt$/i, "");
        if (!knownScenes.has(stem) && !knownScenes.has(stem + ".txt")) {
          const col = indent + 1 + trimmed.indexOf(raw2);
          addError(
            ln,
            col,
            col + raw2.length,
            `*gosub_scene "${raw2}" \u2014 scene not found in project. Open or create "${stem}.txt".`
          );
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
          if (/^(\*selectable_if.*)?#/.test(next.trimmed)) {
            hasOpt = true;
            break;
          }
        }
        if (!hasOpt)
          addWarning(
            ln,
            indent + 1,
            indent + 1 + trimmed.length,
            "*choice has no options \u2014 add at least one # line beneath it."
          );
      }
      if (declaredVars.size > 0 && !trimmed.startsWith("*") && !trimmed.startsWith("//")) {
        const interpRe = /\{([a-zA-Z_]\w*)\}/g;
        let im;
        while ((im = interpRe.exec(raw)) !== null) {
          const varname = im[1];
          if (!declaredVars.has(varname.toLowerCase())) {
            const col = im.index + 1;
            addWarning(
              ln,
              col,
              col + im[0].length,
              `Variable "{${varname}}" may not be declared \u2014 check *create or *temp.`
            );
          }
        }
      }
    });
    monaco.editor.setModelMarkers(model, DIAG_OWNER, markers);
  }
  function buildVarTracker(model, filename) {
    const panel = $("var-tracker-list");
    const lineCount = model.getLineCount();
    const globals = [];
    const temps = [];
    for (let i = 1; i <= lineCount; i++) {
      const raw = model.getLineContent(i);
      const trimmed = raw.trimStart();
      const mC = trimmed.match(/^\*create(?:_stat)?\s+([a-zA-Z_][\w]*)\s+(.+)?$/);
      if (mC) {
        globals.push({ name: mC[1], value: (mC[2] || "").trim().slice(0, 30), ln: i });
        continue;
      }
      const mT = trimmed.match(/^\*temp\s+([a-zA-Z_][\w]*)\s*(.+)?$/);
      if (mT) temps.push({ name: mT[1], value: (mT[2] || "").trim().slice(0, 30), ln: i });
    }
    let html = "";
    if (globals.length) {
      html += `<div class="vt-section-label">Global (${globals.length})</div>`;
      globals.forEach((v) => {
        html += `<div class="vt-row" title="Line ${v.ln}" data-line="${v.ln}"><span class="vt-name">${v.name}</span><span class="vt-value">${v.value || "\u2014"}</span></div>`;
      });
    }
    if (temps.length) {
      html += `<div class="vt-section-label" style="margin-top:8px">Local *temp (${temps.length})</div>`;
      temps.forEach((v) => {
        html += `<div class="vt-row" title="Line ${v.ln}" data-line="${v.ln}"><span class="vt-name">${v.name}</span><span class="vt-value">${v.value || "\u2014"}</span></div>`;
      });
    }
    if (!globals.length && !temps.length)
      html = '<div style="color:var(--text-faint);font-size:12px;padding:8px 0">No variables declared.</div>';
    panel.innerHTML = html;
    panel.querySelectorAll(".vt-row").forEach((el) => {
      el.addEventListener("click", () => jumpToLine(+el.dataset.line));
    });
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
    const warnings = markers.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length;
    const diagEl = $("vt-diag-summary");
    if (errors || warnings) {
      diagEl.innerHTML = `<span style="color:#C00">${errors}E</span> <span style="color:#A06000">${warnings}W</span>`;
    } else {
      diagEl.innerHTML = '<span style="color:#1A7F3C">\u2713</span>';
    }
    updateDiagStatusBar(model);
    refreshProblemsPanel();
  }
  function updateDiagStatusBar(model) {
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
    const warnings = markers.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length;
    const el = $("sb-diag-text");
    if (errors) {
      el.textContent = `\u2715 ${errors} error${errors !== 1 ? "s" : ""}`;
      el.style.color = "#ffbbbb";
    } else if (warnings) {
      el.textContent = `\u26A0 ${warnings} warning${warnings !== 1 ? "s" : ""}`;
      el.style.color = "#ffd080";
    } else {
      el.textContent = "\u2713 Clean";
      el.style.color = "rgba(180,255,180,0.9)";
    }
    const tbBtn = $("btn-problems");
    const tbLabel = $("tb-problems-label");
    if (errors) {
      tbBtn.style.color = "#C00";
      tbLabel.textContent = `${errors} error${errors !== 1 ? "s" : ""}`;
    } else if (warnings) {
      tbBtn.style.color = "#A06000";
      tbLabel.textContent = `${warnings} warning${warnings !== 1 ? "s" : ""}`;
    } else {
      tbBtn.style.color = "";
      tbLabel.textContent = "Problems";
    }
  }
  function refreshProblemsPanel() {
    const model = editor?.getModel();
    if (!model) return;
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    const list = $("problems-list");
    const title = $("problems-title");
    const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error);
    const warnings = markers.filter((m) => m.severity === monaco.MarkerSeverity.Warning);
    title.textContent = markers.length ? `Problems \u2014 ${errors.length}E, ${warnings.length}W` : "Problems";
    if (!markers.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-faint);font-family:DM Sans,sans-serif">\u2713 No problems detected.</div>';
      return;
    }
    const sorted = [...errors, ...warnings].sort((a, b) => a.severity !== b.severity ? a.severity - b.severity : a.startLineNumber - b.startLineNumber);
    list.innerHTML = sorted.map((m) => {
      const sc = m.severity === monaco.MarkerSeverity.Error ? "error" : "warning";
      const si = m.severity === monaco.MarkerSeverity.Error ? "\u2715" : "\u26A0";
      return `<div class="problem-item" data-line="${m.startLineNumber}">
      <span class="problem-sev ${sc}">${si}</span>
      <span class="problem-msg">${escHtml(m.message)}</span>
      <span class="problem-loc">Ln ${m.startLineNumber}</span>
    </div>`;
    }).join("");
    list.querySelectorAll(".problem-item").forEach((el) => {
      el.addEventListener("click", () => jumpToLine(+el.dataset.line));
    });
  }
  function scheduleDiagnostics() {
    if (_timer2 !== null) clearTimeout(_timer2);
    _timer2 = setTimeout(() => {
      const model = editor?.getModel();
      const tab = getActiveTab();
      if (!model || !tab) return;
      runDiagnostics(model, tab.name);
      buildVarTracker(model, tab.name);
    }, 120);
  }

  // src/features/folding.ts
  function registerFoldingProvider() {
    monaco.languages.registerFoldingRangeProvider("sa-script", {
      provideFoldingRanges(model) {
        const ranges = [];
        const lineCount = model.getLineCount();
        const stack = [];
        const sysStack = [];
        const pushRange = (s, e) => {
          while (e > s && !model.getLineContent(e).trim()) e--;
          if (e > s) ranges.push({ start: s, end: e, kind: monaco.languages.FoldingRangeKind.Region });
        };
        for (let ln = 1; ln <= lineCount; ln++) {
          const raw = model.getLineContent(ln);
          const trimmed = raw.trimStart();
          if (!trimmed || trimmed.startsWith("//")) continue;
          const indent = raw.length - trimmed.length;
          if (/^\*system\b/.test(trimmed)) {
            sysStack.push(ln);
            continue;
          }
          if (/^\*end_system\b/.test(trimmed)) {
            if (sysStack.length) pushRange(sysStack.pop(), ln);
            continue;
          }
          const isOpener = /^\*(if|elseif|else|selectable_if|choice|random_choice|loop|procedure|scene_list)\b/.test(trimmed) || /^#/.test(trimmed);
          while (stack.length && stack[stack.length - 1].indent >= indent) {
            const f = stack.pop();
            pushRange(f.line, ln - 1);
          }
          if (isOpener) stack.push({ line: ln, indent });
        }
        while (stack.length) {
          const f = stack.pop();
          pushRange(f.line, lineCount);
        }
        return ranges;
      }
    });
  }

  // src/main.ts
  init_tabs();
  init_context_menu();

  // src/ui/sidebar.ts
  init_state();
  init_tabs();
  init_state();

  // src/files/file-ops.ts
  init_state();
  init_tabs();
  init_statusbar();
  var autoSaveTimer = null;
  var autoSaveDelay = 3e3;
  function scheduleAutoSave() {
    if (!autoSaveDelay) return;
    if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveSession();
      setSaveStatus("Session saved");
    }, autoSaveDelay);
  }
  function openFiles() {
    $("folder-input").click();
  }
  function initFileInput() {
    $("folder-input").addEventListener("change", async function() {
      const files = Array.from(this.files || []).filter((f) => f.name.endsWith(".txt"));
      if (!files.length) return;
      const order = ["startup.txt", "stats.txt", "skills.txt", "items.txt", "procedures.txt"];
      files.sort((a, b) => {
        const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      const entries = await Promise.all(files.map(async (f) => ({ name: f.name, file: f, content: await f.text() })));
      entries.forEach((e) => fileMap.set(e.name, e));
      renderSidebar([...fileMap.values()]);
      const startup = entries.find((e) => e.name === "startup.txt");
      if (startup) {
        loadSidebarFile(startup);
      } else {
        loadSidebarFile(entries[0]);
      }
      this.value = "";
    });
  }
  function newFile() {
    const name = prompt("File name (e.g. chapter1.txt):", "untitled.txt");
    if (!name?.trim()) return;
    const fname = name.trim().endsWith(".txt") ? name.trim() : name.trim() + ".txt";
    const content = getFileTemplate(fname);
    const entry = { name: fname, content };
    fileMap.set(fname, entry);
    openTab(fname, content);
    renderSidebar([...fileMap.values()]);
    setSaveStatus("New file");
  }
  function saveFile() {
    const tab = getActiveTab();
    if (!tab) return;
    const blob = new Blob([tab.model.getValue()], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = tab.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e4);
    tab.modified = false;
    renderTabs();
    setSaveStatus("Saved \u2014 " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
  }
  function renameFile(oldName, newName) {
    if (oldName === newName) return;
    if (fileMap.has(newName)) {
      alert(`A file named "${newName}" already exists.`);
      return;
    }
    const entry = fileMap.get(oldName);
    if (!entry) return;
    fileMap.delete(oldName);
    entry.name = newName;
    const tab = tabs.find((t) => t.name === oldName);
    if (tab) {
      entry.content = tab.model.getValue();
      tab.name = newName;
      renderTabs();
    }
    fileMap.set(newName, entry);
    renderSidebar([...fileMap.values()]);
    setSaveStatus(`Renamed to ${newName}`);
  }
  function deleteFile(name) {
    if (!confirm(`Delete "${name}"?

This removes it from the session. The original file on disk is unaffected.`)) return;
    fileMap.delete(name);
    const tab = tabs.find((t) => t.name === name);
    if (tab) closeTab(tab.id);
    renderSidebar([...fileMap.values()]);
    setSaveStatus(`Deleted ${name}`);
  }
  function collectBundle() {
    const bundle = {};
    for (const tab of tabs) bundle[tab.name] = tab.model.getValue();
    for (const [name, entry] of fileMap.entries()) {
      if (!(name in bundle) && entry.content !== void 0) bundle[name] = entry.content;
    }
    return bundle;
  }
  function openStringModal(mode, value = "") {
    $("string-modal").classList.add("visible");
    $("string-modal-title").textContent = mode === "export" ? "Export Project String" : "Import Project String";
    $("string-modal-desc").textContent = mode === "export" ? "Copy this string to save or share your project." : "Paste a previously exported project string and click Load.";
    const ta = $("string-modal-text");
    ta.value = value;
    ta.readOnly = mode === "export";
    $("string-modal-copy").style.display = mode === "export" ? "" : "none";
    $("string-modal-load").style.display = mode === "import" ? "" : "none";
    ta.focus();
    ta.select();
  }
  function closeStringModal() {
    $("string-modal").classList.remove("visible");
  }
  function resetWorkspace() {
    for (const tab of [...tabs]) tab.model.dispose();
    tabs.splice(0, tabs.length);
    setActiveTabId(null);
    if (editor) editor.setModel(null);
    renderTabs();
  }
  function applyBundle(bundle) {
    const entries = Object.entries(bundle).filter(([name]) => name.toLowerCase().endsWith(".txt")).map(([name, content]) => ({ name, content }));
    if (!entries.length) {
      alert("No .txt files found in imported data.");
      return;
    }
    const order = ["startup.txt", "stats.txt", "skills.txt", "items.txt", "procedures.txt"];
    entries.sort((a, b) => {
      const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    resetWorkspace();
    fileMap.clear();
    entries.forEach((e) => fileMap.set(e.name, { name: e.name, content: e.content }));
    renderSidebar([...fileMap.values()]);
    entries.forEach((e) => openTab(e.name, e.content));
    const startupTab = tabs.find((t) => t.name === "startup.txt");
    if (startupTab) activateTab(startupTab.id);
    saveSession();
    setSaveStatus(`Imported ${entries.length} files`);
  }
  function exportProject() {
    const bundle = collectBundle();
    if (!Object.keys(bundle).length) {
      alert("No files to export. Open or create files first.");
      return;
    }
    const payload = JSON.stringify({ sa: true, version: 1, files: bundle });
    const encoded = `SAIDE:${btoa(unescape(encodeURIComponent(payload)))}`;
    openStringModal("export", encoded);
    setSaveStatus(`Exported ${Object.keys(bundle).length} files`);
  }
  function openImportModal() {
    openStringModal("import");
  }
  function importProjectFromString(raw) {
    const text = raw.trim();
    if (!text) return;
    try {
      let json = text;
      if (text.startsWith("SAIDE:")) {
        json = decodeURIComponent(escape(atob(text.slice(6))));
      }
      const parsed = JSON.parse(json);
      const files = parsed?.files && typeof parsed.files === "object" ? parsed.files : parsed;
      applyBundle(files);
      closeStringModal();
    } catch {
      alert("Could not parse import string.");
    }
  }
  function initStringModal() {
    $("string-modal-close").addEventListener("click", closeStringModal);
    $("string-modal").addEventListener("click", (e) => {
      if (e.target === $("string-modal")) closeStringModal();
    });
    $("string-modal-copy").addEventListener("click", async () => {
      const ta = $("string-modal-text");
      try {
        await navigator.clipboard.writeText(ta.value);
        setSaveStatus("Export string copied");
      } catch {
        ta.select();
        document.execCommand("copy");
        setSaveStatus("Export string copied");
      }
    });
    $("string-modal-load").addEventListener("click", () => {
      importProjectFromString($("string-modal-text").value);
    });
  }
  function getFileTemplate(name) {
    if (name === "startup.txt") return [
      "// startup.txt \u2014 Boot file",
      '*create game_title "My Adventure"',
      '*create game_byline "An interactive story."',
      '*create first_name ""',
      '*create last_name ""',
      '*create pronouns_subject "they"',
      '*create pronouns_object "them"',
      '*create pronouns_possessive "their"',
      '*create pronouns_possessive_pronoun "theirs"',
      '*create pronouns_reflexive "themself"',
      '*create pronouns_label "they/them"',
      "*create level 1",
      "*create essence 0",
      '*create health "Healthy"',
      "*create skills []",
      "*create journal []",
      "*create inventory []",
      "",
      "*scene_list",
      "  prologue"
    ].join("\n");
    if (name === "stats.txt") return [
      "// stats.txt",
      '*stat_group "Identity"',
      '*stat first_name "First Name"',
      '*stat last_name "Last Name"',
      "",
      '*stat_group "Progress"',
      '*stat level "Level"',
      '*stat essence "Essence"',
      "",
      "*stat_registered",
      "*inventory",
      "*skills_registered",
      "*achievements",
      "*journal_section"
    ].join("\n");
    const scene = name.replace(".txt", "");
    return [
      `// ${name}`,
      "",
      `*title [Chapter] ${scene.charAt(0).toUpperCase() + scene.slice(1)}`,
      "",
      "Your narrative text goes here.",
      "",
      "*choice",
      "",
      "  #First option.",
      "",
      "    The story continues.",
      "",
      "  #Second option.",
      "",
      "    Another path unfolds."
    ].join("\n");
  }
  function loadDemoContent() {
    const demoFiles = [
      { name: "startup.txt", content: '// startup.txt \u2014 Boot file for The Iron Vault\n\n*create game_title "The Iron Vault"\n*create game_byline "Some doors were never meant to be opened."\n*create first_name ""\n*create last_name ""\n*create pronouns_subject "they"\n*create pronouns_object "them"\n*create pronouns_possessive "their"\n*create pronouns_possessive_pronoun "theirs"\n*create pronouns_reflexive "themself"\n*create pronouns_label "they/them"\n*create level 1\n*create essence 0\n*create health "Healthy"\n*create skills []\n*create journal []\n*create inventory []\n*create vault_open false\n\n*create_stat strength "Strength" 10\n*create_stat cunning "Cunning" 10\n\n*scene_list\n  prologue\n  vault' },
      { name: "prologue.txt", content: '// prologue.txt \u2014 Opening scene\n\n*title [Prologue] The Iron Vault\n\nThe city of Ashmark has three rules: pay your debts, keep your head down,\nand stay away from the Iron Vault.\n\nYou have broken all three.\n\n*define_term "Iron Vault" A legendary sealed chamber beneath the city.\n\n*page_break\n\nA courier slips a note under your door: the vault has been partially opened.\n\n*choice\n\n  #Go in through the aqueduct \u2014 risky but fast.\n\n    You know these tunnels better than most.\n\n    *set_stat cunning (cunning + 2) min:0 max:100\n    *journal You entered the vault through the aqueduct.\n    *notify "Cunning +2"\n    *finish\n\n  #Join the rival crew.\n\n    Numbers mean safety. You fall in with the Ashmark Crew.\n\n    *journal You allied with the Ashmark Crew.\n    *finish\n\n  *selectable_if (cunning >= 15) #Slip in alone \u2014 silent and unseen.\n\n    You ghost through the shadows without a sound.\n\n    *journal You infiltrated the vault alone.\n    *award_essence 50\n    *finish' },
      { name: "vault.txt", content: '// vault.txt \u2014 Vault scene\n\n*title [Chapter 2] Inside the Vault\n\n*temp found_key false\n\nThe vault is massive \u2014 vaulted ceilings lost in shadow, walls lined\nwith iron mechanisms older than the city above.\n\n*if (cunning >= 12)\n\n  Your sharp eyes spot a loose panel near the entrance.\n  Behind it: a worn brass key on a hook.\n\n  *add_item "Vault Key"\n  *set found_key true\n  *notify "Vault Key acquired"\n\n*else\n\n  The entrance chamber is bare. Whatever was here has been taken.\n\n*check_item "Vault Key" found_key\n\n*if found_key\n\n  You insert the key. The inner vault swings open.\n  *set vault_open true\n  *award_essence 200\n\n*else\n\n  The inner door is sealed. You need to find the key.\n\n*page_break\n\n*choice\n\n  #Search the vault systematically.\n\n    *temp roll 0\n    *set roll (random(1, 20))\n\n    *if (roll >= 15)\n\n      You land a critical find \u2014 a hidden cache of Essence crystals.\n      *award_essence 300\n\n    *elseif (roll >= 8)\n\n      You find a modest cache. Better than nothing.\n      *award_essence 100\n\n    *else\n\n      The vault has already been picked clean.\n\n  #Get out while you can.\n\n    Discretion is the better part of survival.\n    *journal You escaped the Iron Vault.\n    *ending "Out of the Dark" "You escaped with your life \u2014 and a story to tell."' },
      { name: "procedures.txt", content: '// procedures.txt \u2014 Reusable procedures\n\n*procedure level_up\n  *system\n    LEVEL UP!\n    Strength +2  |  Cunning +1\n  *end_system\n  *set_stat strength (strength + 2) min:0 max:100\n  *set_stat cunning (cunning + 1) min:0 max:100\n  *set level (level + 1)\n  *award_essence 100\n  *return\n\n*procedure vault_alarm\n  *system\n    ALARM TRIGGERED \u2014 Guards incoming!\n  *end_system\n  *notify "Guards alerted!" 3000\n  *return' },
      { name: "stats.txt", content: '// stats.txt \u2014 Stats panel layout\n\n*stat_group "Identity"\n*stat first_name "First Name"\n*stat last_name "Last Name"\n\n*stat_group "Progress"\n*stat_color level accent-cyan\n*stat level "Level"\n*stat_color essence accent-amber\n*stat essence "Essence"\n\n*stat_group "Vitals"\n*stat_color health accent-green\n*stat health "Health"\n\n*stat_group "Attributes"\n*stat_registered\n\n*inventory\n*skills_registered\n*achievements\n*journal_section' }
    ];
    fileMap.clear();
    demoFiles.forEach((e) => fileMap.set(e.name, e));
    renderSidebar(demoFiles);
    demoFiles.forEach((e) => openTab(e.name, e.content));
    $("welcome").style.display = "none";
  }

  // src/ui/sidebar.ts
  function renderSidebar(files) {
    const list = $("file-list");
    const empty = $("sidebar-empty");
    empty.style.display = files.length ? "none" : "flex";
    const systemOrder = ["startup.txt", "stats.txt", "skills.txt", "items.txt", "procedures.txt"];
    const groups = {
      boot: files.filter((f) => f.name === "startup.txt"),
      system: files.filter((f) => ["stats.txt", "skills.txt", "items.txt", "procedures.txt"].includes(f.name)),
      scenes: files.filter((f) => !systemOrder.includes(f.name) && f.name !== "glossary.txt"),
      data: files.filter((f) => f.name === "glossary.txt")
    };
    list.innerHTML = "";
    [["boot", "Boot"], ["system", "System"], ["scenes", "Scenes"], ["data", "Data"]].forEach(([key, label]) => {
      if (!groups[key]?.length) return;
      const g = document.createElement("div");
      g.className = "file-group";
      g.innerHTML = `<div class="file-group-label">${label}</div>`;
      groups[key].forEach((f) => {
        const ft = getFileType(f.name);
        const item = document.createElement("div");
        item.className = "file-item";
        item.dataset.file = f.name;
        item.innerHTML = `<span class="file-dot" style="background:${ft.color}"></span><span class="filename">${f.name}</span><span class="file-badge">${ft.badge}</span>`;
        item.addEventListener("click", () => loadSidebarFile(f));
        item.addEventListener("contextmenu", (e) => showSidebarMenu(e, f.name));
        g.appendChild(item);
      });
      list.appendChild(g);
    });
    list.appendChild(empty);
  }
  var _menuTarget = null;
  function showSidebarMenu(e, filename) {
    e.preventDefault();
    _menuTarget = filename;
    const menu = $("sidebar-menu");
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    menu.classList.add("visible");
  }
  function initSidebarMenu() {
    document.querySelectorAll("#sidebar-menu .ctx-item").forEach((el) => {
      el.addEventListener("click", () => {
        const action = el.dataset.action;
        $("sidebar-menu").classList.remove("visible");
        if (!_menuTarget) return;
        if (action === "rename") {
          const newName = prompt(`Rename "${_menuTarget}" to:`, _menuTarget);
          if (newName?.trim() && newName.trim() !== _menuTarget) {
            const n = newName.trim().endsWith(".txt") ? newName.trim() : newName.trim() + ".txt";
            renameFile(_menuTarget, n);
          }
        }
        if (action === "delete") {
          deleteFile(_menuTarget);
        }
        _menuTarget = null;
      });
    });
    document.addEventListener("click", (e) => {
      const menu = $("sidebar-menu");
      if (!menu.contains(e.target)) menu.classList.remove("visible");
    });
  }
  function loadSidebarFile(f) {
    const existing = tabs.find((t) => t.name === f.name);
    if (existing) {
      activateTab(existing.id);
      return;
    }
    if (f.content !== void 0) {
      openTab(f.name, f.content);
      return;
    }
    if (f.file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        f.content = e.target.result;
        openTab(f.name, f.content);
      };
      reader.readAsText(f.file);
    }
  }

  // src/ui/find.ts
  init_state();
  init_tabs();
  var findMatches = [];
  var findIndex = 0;
  function toggleFind() {
    const bar = $("find-bar");
    bar.classList.toggle("visible");
    if (bar.classList.contains("visible")) {
      const inp = $("find-input");
      inp.focus();
      inp.select();
    }
  }
  function doFind() {
    if (!editor) return;
    const q = $("find-input").value;
    if (!q) {
      $("find-count").textContent = "\u2014";
      return;
    }
    const model = editor.getModel();
    if (!model) return;
    findMatches = model.findMatches(q, true, false, false, null, false);
    findIndex = 0;
    $("find-count").textContent = findMatches.length ? `1/${findMatches.length}` : "No match";
    if (findMatches.length) goToMatch(0);
  }
  function goToMatch(idx) {
    if (!findMatches.length || !editor) return;
    findIndex = (idx % findMatches.length + findMatches.length) % findMatches.length;
    const m = findMatches[findIndex];
    editor.revealRangeInCenter(m.range);
    editor.setSelection(m.range);
    $("find-count").textContent = `${findIndex + 1}/${findMatches.length}`;
  }
  function initLocalFind() {
    $("find-input").addEventListener("input", doFind);
    $("find-input").addEventListener("keydown", (e) => {
      const ke = e;
      if (ke.key === "Escape") toggleFind();
      if (ke.key === "Enter") ke.shiftKey ? goToMatch(findIndex - 1) : goToMatch(findIndex + 1);
    });
    $("find-prev").addEventListener("click", () => goToMatch(findIndex - 1));
    $("find-next").addEventListener("click", () => goToMatch(findIndex + 1));
    $("find-close").addEventListener("click", toggleFind);
  }
  var gfrResults = [];
  function openGlobalFind() {
    $("gfr-overlay").classList.add("visible");
    const inp = $("gfr-find");
    inp.focus();
    inp.select();
  }
  function closeGlobalFind() {
    $("gfr-overlay").classList.remove("visible");
  }
  function buildGfrRegex() {
    const raw = $("gfr-find").value;
    const cs = $("gfr-case").checked;
    const rx = $("gfr-regex").checked;
    const wh = $("gfr-whole").checked;
    if (!raw) return null;
    let p = rx ? raw : raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (wh) p = `\\b${p}\\b`;
    try {
      return new RegExp(p, cs ? "g" : "gi");
    } catch {
      return null;
    }
  }
  function runGlobalFind() {
    const regex = buildGfrRegex();
    const scope = $("gfr-scope").value;
    if (!regex) {
      $("gfr-summary").textContent = "Invalid search.";
      return;
    }
    gfrResults = [];
    const sources = scope === "current" ? getActiveTab() ? [getActiveTab()] : [] : tabs;
    sources.forEach((src) => {
      const lc = src.model.getLineCount();
      for (let ln = 1; ln <= lc; ln++) {
        const text = src.model.getLineContent(ln);
        regex.lastIndex = 0;
        let m;
        while ((m = regex.exec(text)) !== null) {
          gfrResults.push({
            tabId: src.id,
            name: src.name,
            line: ln,
            col: m.index + 1,
            text,
            matchStart: m.index,
            matchEnd: m.index + m[0].length,
            match: m[0]
          });
        }
      }
    });
    renderGfrResults();
  }
  function renderGfrResults() {
    const container = $("gfr-results");
    const summary = $("gfr-summary");
    if (!gfrResults.length) {
      container.innerHTML = '<div style="padding:32px 16px;text-align:center;font-size:12px;color:var(--text-faint)">No matches found.</div>';
      summary.textContent = "";
      return;
    }
    const byFile = {};
    gfrResults.forEach((r, i) => {
      if (!byFile[r.name]) byFile[r.name] = [];
      byFile[r.name].push({ ...r, idx: i });
    });
    let html = "";
    Object.entries(byFile).forEach(([name, rows]) => {
      const ft = getFileType(name);
      html += `<div class="gfr-file-group"><div class="gfr-file-header"><span class="gfr-file-dot" style="background:${ft.color}"></span>${escHtml(name)} (${rows.length})</div>`;
      rows.forEach((r) => {
        const pre = escHtml(r.text.slice(0, r.matchStart));
        const mid = `<mark>${escHtml(r.match)}</mark>`;
        const post = escHtml(r.text.slice(r.matchEnd));
        html += `<div class="gfr-result-row" data-idx="${r.idx}"><span class="gfr-result-ln">${r.line}</span><span class="gfr-result-text">${(pre + mid + post).trim().slice(0, 200)}</span></div>`;
      });
      html += "</div>";
    });
    container.innerHTML = html;
    summary.textContent = `${gfrResults.length} match${gfrResults.length !== 1 ? "es" : ""} in ${Object.keys(byFile).length} file${Object.keys(byFile).length !== 1 ? "s" : ""}`;
    container.querySelectorAll(".gfr-result-row").forEach((el) => {
      el.addEventListener("click", () => {
        const r = gfrResults[+el.dataset.idx];
        if (!r) return;
        const tab = tabs.find((t) => t.id === r.tabId);
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
  function runGlobalReplace(all) {
    const replaceStr = $("gfr-replace").value;
    if (!gfrResults.length) {
      runGlobalFind();
      return;
    }
    const toReplace = all ? [...gfrResults] : gfrResults.slice(0, 1);
    if (!toReplace.length) return;
    const byTab = {};
    toReplace.forEach((r) => {
      if (!byTab[r.tabId]) byTab[r.tabId] = [];
      byTab[r.tabId].push(r);
    });
    Object.entries(byTab).forEach(([tid, rows]) => {
      const tab = tabs.find((t) => t.id === +tid);
      if (!tab) return;
      rows.sort((a, b) => b.line !== a.line ? b.line - a.line : b.col - a.col);
      const edits = rows.map((r) => ({
        range: new monaco.Range(r.line, r.col, r.line, r.col + r.match.length),
        text: replaceStr
      }));
      tab.model.applyEdits(edits);
      tab.modified = true;
    });
    renderTabs();
    runGlobalFind();
  }
  function initGlobalFind() {
    $("btn-global-find").addEventListener("click", openGlobalFind);
    $("gfr-close").addEventListener("click", closeGlobalFind);
    $("gfr-btn-find").addEventListener("click", runGlobalFind);
    $("gfr-btn-replace-next").addEventListener("click", () => runGlobalReplace(false));
    $("gfr-btn-replace-all").addEventListener("click", () => runGlobalReplace(true));
    $("gfr-btn-clear").addEventListener("click", () => {
      gfrResults = [];
      $("gfr-results").innerHTML = '<div style="padding:32px 16px;text-align:center;font-size:12px;color:var(--text-faint)">Enter a search term and click Find All.</div>';
      $("gfr-summary").textContent = "";
    });
    $("gfr-find").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runGlobalFind();
      }
    });
    $("gfr-replace").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runGlobalReplace(false);
      }
    });
    $("gfr-overlay").addEventListener("click", (e) => {
      if (e.target === $("gfr-overlay")) closeGlobalFind();
    });
  }

  // src/main.ts
  init_statusbar();

  // src/ui/outline.ts
  init_state();
  function refreshOutline() {
    const container = $("outline-list");
    const model = editor?.getModel();
    if (!model) {
      container.innerHTML = '<div class="outline-empty">No file open.</div>';
      return;
    }
    const items = [];
    const lineCount = model.getLineCount();
    for (let i = 1; i <= lineCount; i++) {
      const line = model.getLineContent(i).trimStart();
      const mLabel = line.match(/^\*label\s+(\S+)/);
      if (mLabel) {
        items.push({ label: `\u2B26 ${mLabel[1]}`, line: i, kind: "label" });
        continue;
      }
      const mChoice = line.match(/^#\s*(.+)$/);
      if (mChoice) {
        items.push({ label: `\u25C8 ${mChoice[1]}`, line: i, kind: "choice" });
        continue;
      }
      const mSelectable = line.match(/^\*selectable_if\b.*?#\s*(.+)$/);
      if (mSelectable) {
        items.push({ label: `\u25C8 ${mSelectable[1]}`, line: i, kind: "choice" });
      }
    }
    if (!items.length) {
      container.innerHTML = '<div class="outline-empty">No *label or choice entries in this file.</div>';
      return;
    }
    container.innerHTML = items.map(
      (item) => `<div class="outline-item" data-kind="${item.kind}" data-line="${item.line}">${item.label}</div>`
    ).join("");
    container.querySelectorAll(".outline-item").forEach((el) => {
      el.addEventListener("click", () => {
        const ln = +el.dataset.line;
        if (editor) {
          editor.revealLineInCenter(ln);
          editor.setPosition({ lineNumber: ln, column: 1 });
          editor.focus();
        }
      });
    });
  }

  // src/main.ts
  init_scene_graph();
  __require.config({
    paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" }
  });
  __require(["vs/editor/editor.main"], function() {
    registerLanguage();
    registerTheme();
    registerCompletionProvider();
    registerHoverProvider();
    registerCompletionProvider2();
    registerFoldingProvider();
    const ed = window.monaco.editor.create($("monaco-mount"), {
      value: "",
      language: "sa-script",
      theme: "sa-light",
      fontFamily: '"DM Mono", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 22,
      letterSpacing: 0.2,
      wordWrap: "on",
      lineNumbers: "on",
      renderLineHighlight: "line",
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      guides: { indentation: true, bracketPairs: true },
      bracketPairColorization: { enabled: true },
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 12, bottom: 24 },
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      folding: true,
      suggest: { showWords: false },
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
      overviewRulerLanes: 0,
      automaticLayout: true
    });
    setEditor(ed);
    initDecorations();
    ed.onDidChangeCursorPosition((e) => {
      $("sb-cursor").textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });
    ed.onDidChangeModelContent(() => {
      const tab = getActiveTab();
      if (tab && !tab.modified) {
        tab.modified = true;
        renderTabs();
        setSaveStatus("Unsaved changes");
      }
      scheduleAutoSave();
      scheduleDecorate();
      scheduleDiagnostics();
      refreshOutline();
    });
    ed.onDidChangeModel(() => {
      scheduleDecorate();
      scheduleDiagnostics();
      refreshOutline();
    });
    const saved = loadSession();
    if (saved) {
      saved.tabs.forEach((st) => {
        openTab(st.name, st.content);
      });
      if (saved.activeIndex >= 0 && saved.activeIndex < tabs.length) {
        activateTab(tabs[saved.activeIndex].id);
      }
      $("welcome").style.display = "none";
    }
    if (tabs.length) renderSidebar([...fileMap.values()]);
    const monaco2 = window.monaco;
    ed.addCommand(monaco2.KeyMod.CtrlCmd | monaco2.KeyCode.KeyS, saveFile);
    ed.addCommand(monaco2.KeyMod.CtrlCmd | monaco2.KeyCode.KeyF, toggleFind);
    ed.addCommand(monaco2.KeyMod.CtrlCmd | monaco2.KeyCode.KeyN, newFile);
    ed.addCommand(monaco2.KeyMod.CtrlCmd | monaco2.KeyCode.KeyW, closeActiveTab);
    scheduleDecorate();
    scheduleDiagnostics();
    refreshOutline();
    window.addEventListener("resize", layoutEditor);
    $("btn-open").addEventListener("click", openFiles);
    $("sb-btn-open").addEventListener("click", openFiles);
    $("btn-new").addEventListener("click", newFile);
    $("sb-btn-new").addEventListener("click", newFile);
    $("btn-save").addEventListener("click", saveFile);
    $("btn-problems").addEventListener("click", toggleProblems);
    $("problems-close").addEventListener("click", toggleProblems);
    $("btn-settings").addEventListener("click", toggleSettings);
    $("settings-close-btn").addEventListener("click", toggleSettings);
    $("btn-graph").addEventListener("click", openSceneGraph);
    $("btn-export").addEventListener("click", exportProject);
    $("btn-import").addEventListener("click", openImportModal);
    $("w-btn-open").addEventListener("click", openFiles);
    $("w-btn-new").addEventListener("click", newFile);
    $("w-btn-demo").addEventListener("click", loadDemoContent);
    $("sb-diag").addEventListener("click", toggleProblems);
    $("s-fontsize").addEventListener("input", function() {
      ed.updateOptions({ fontSize: +this.value });
    });
    $("s-tabsize").addEventListener("change", function() {
      ed.updateOptions({ tabSize: +this.value });
    });
    $("s-wordwrap").addEventListener("change", function() {
      ed.updateOptions({ wordWrap: this.checked ? "on" : "off" });
    });
    $("s-linenums").addEventListener("change", function() {
      ed.updateOptions({ lineNumbers: this.checked ? "on" : "off" });
    });
    $("s-minimap").addEventListener("change", function() {
      ed.updateOptions({ minimap: { enabled: this.checked } });
    });
    $("btn-toggle-vt").addEventListener("click", () => {
      $("var-tracker").classList.toggle("visible");
    });
    $("btn-toggle-outline").addEventListener("click", () => {
      $("outline-panel").classList.toggle("visible");
      if ($("outline-panel").classList.contains("visible")) refreshOutline();
    });
    let resizing = false;
    const resizeHandle = $("sidebar-resize");
    resizeHandle.addEventListener("mousedown", (e) => {
      resizing = true;
      resizeHandle.classList.add("dragging");
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!resizing) return;
      $("sidebar").style.width = Math.max(140, Math.min(400, e.clientX)) + "px";
      layoutEditor();
    });
    document.addEventListener("mouseup", () => {
      resizing = false;
      resizeHandle.classList.remove("dragging");
    });
    $("g-close").addEventListener("click", closeSceneGraph);
    $("g-refresh").addEventListener("click", refreshSceneGraph);
    $("g-fit").addEventListener("click", () => fitView());
    $("g-layout").addEventListener("click", () => {
      Promise.resolve().then(() => (init_scene_graph(), scene_graph_exports)).then((g) => {
        g.autoLayout();
        g.render();
        g.fitView();
      });
    });
    $("g-zin").addEventListener("click", () => zoomBy(1));
    $("g-zout").addEventListener("click", () => zoomBy(-1));
    initFileInput();
    initContextMenu();
    initSidebarMenu();
    window.addEventListener("sa-project-files-changed", () => renderSidebar([...fileMap.values()]));
    initLocalFind();
    initGlobalFind();
    initStringModal();
    document.addEventListener("sa-save", () => saveFile());
    window.addEventListener("beforeunload", () => saveSession());
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        openFiles();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        openGlobalFind();
      }
      if (e.key === "Escape") {
        if ($("gfr-overlay").classList.contains("visible")) closeGlobalFind();
        if ($("graph-overlay").classList.contains("visible")) closeSceneGraph();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length < 2) return;
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const nextIdx = e.shiftKey ? (currentIdx - 1 + tabs.length) % tabs.length : (currentIdx + 1) % tabs.length;
        activateTab(tabs[nextIdx].id);
      }
    });
  });
  function toggleProblems() {
    $("problems-panel").classList.toggle("visible");
    layoutEditor();
  }
  function toggleSettings() {
    $("settings-panel").classList.toggle("visible");
  }
})();
//# sourceMappingURL=sa-ide.js.map
