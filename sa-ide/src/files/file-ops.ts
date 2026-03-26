// ---------------------------------------------------------------------------
// file-ops.ts — File I/O: open files, save, new file, templates, demo.
// ---------------------------------------------------------------------------

import { tabs, getActiveTab, fileMap, saveSession, $, editor, setActiveTabId } from '../state.js';
import { openTab, renderTabs, closeTab, activateTab } from '../ui/tabs.js';
import { renderSidebar, loadSidebarFile } from '../ui/sidebar.js';
import { setSaveStatus } from '../ui/statusbar.js';
import type { FileEntry } from '../state.js';

// ── Auto-save ─────────────────────────────────────────────────────────────

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let autoSaveDelay = 3000;

export function scheduleAutoSave(): void {
  if (!autoSaveDelay) return;
  if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveSession();
    setSaveStatus('Session saved');
  }, autoSaveDelay);
}

// ── Open files ────────────────────────────────────────────────────────────

export function openFiles(): void {
  $('folder-input').click();
}

export function initFileInput(): void {
  $('folder-input').addEventListener('change', async function (this: HTMLInputElement) {
    const files = Array.from(this.files || []).filter(f => f.name.endsWith('.txt'));
    if (!files.length) return;

    const order = ['startup.txt', 'stats.txt', 'skills.txt', 'items.txt', 'procedures.txt'];
    files.sort((a, b) => {
      const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    const entries: FileEntry[] = await Promise.all(files.map(async (f) => ({ name: f.name, file: f, content: await f.text() })));
    entries.forEach(e => fileMap.set(e.name, e));
    renderSidebar([...fileMap.values()]);

    const startup = entries.find(e => e.name === 'startup.txt');
    if (startup) {
      loadSidebarFile(startup);
    } else {
      loadSidebarFile(entries[0]);
    }
    this.value = '';
  });
}

// ── New file ──────────────────────────────────────────────────────────────

export function newFile(): void {
  const name = prompt('File name (e.g. chapter1.txt):', 'untitled.txt');
  if (!name?.trim()) return;
  const fname = name.trim().endsWith('.txt') ? name.trim() : name.trim() + '.txt';
  const content = getFileTemplate(fname);
  const entry: FileEntry = { name: fname, content };
  fileMap.set(fname, entry);
  openTab(fname, content);
  renderSidebar([...fileMap.values()]);
  setSaveStatus('New file');
}

// ── Save ──────────────────────────────────────────────────────────────────

export function saveFile(): void {
  const tab = getActiveTab();
  if (!tab) return;
  const blob = new Blob([tab.model.getValue()], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = tab.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  tab.modified = false;
  renderTabs();
  setSaveStatus('Saved — ' + new Date().toLocaleTimeString());
}

// ── Rename file ───────────────────────────────────────────────────────────

export function renameFile(oldName: string, newName: string): void {
  if (oldName === newName) return;
  if (fileMap.has(newName)) {
    alert(`A file named "${newName}" already exists.`);
    return;
  }
  const entry = fileMap.get(oldName);
  if (!entry) return;
  fileMap.delete(oldName);
  entry.name = newName;
  // Sync content from open tab if present
  const tab = tabs.find(t => t.name === oldName);
  if (tab) {
    entry.content = tab.model.getValue();
    tab.name = newName;
    renderTabs();
  }
  fileMap.set(newName, entry);
  renderSidebar([...fileMap.values()]);
  setSaveStatus(`Renamed to ${newName}`);
}

// ── Delete file ───────────────────────────────────────────────────────────

export function deleteFile(name: string): void {
  if (!confirm(`Delete "${name}"?\n\nThis removes it from the session. The original file on disk is unaffected.`)) return;
  fileMap.delete(name);
  const tab = tabs.find(t => t.name === name);
  if (tab) closeTab(tab.id);
  renderSidebar([...fileMap.values()]);
  setSaveStatus(`Deleted ${name}`);
}

// ── Export/import project string ──────────────────────────────────────────

function collectBundle(): Record<string, string> {
  const bundle: Record<string, string> = {};
  for (const tab of tabs) bundle[tab.name] = tab.model.getValue();
  for (const [name, entry] of fileMap.entries()) {
    if (!(name in bundle) && entry.content !== undefined) bundle[name] = entry.content;
  }
  return bundle;
}

function openStringModal(mode: 'export' | 'import', value = ''): void {
  $('string-modal').classList.add('visible');
  $('string-modal-title').textContent = mode === 'export' ? 'Export Project String' : 'Import Project String';
  $('string-modal-desc').textContent = mode === 'export'
    ? 'Copy this string to save or share your project.'
    : 'Paste a previously exported project string and click Load.';
  const ta = $('string-modal-text') as HTMLTextAreaElement;
  ta.value = value;
  ta.readOnly = mode === 'export';
  $('string-modal-copy').style.display = mode === 'export' ? '' : 'none';
  $('string-modal-load').style.display = mode === 'import' ? '' : 'none';
  ta.focus();
  ta.select();
}

function closeStringModal(): void {
  $('string-modal').classList.remove('visible');
}

function resetWorkspace(): void {
  for (const tab of [...tabs]) tab.model.dispose();
  tabs.splice(0, tabs.length);
  setActiveTabId(null);
  if (editor) editor.setModel(null);
  renderTabs();
}

function applyBundle(bundle: Record<string, string>): void {
  const entries = Object.entries(bundle)
    .filter(([name]) => name.toLowerCase().endsWith('.txt'))
    .map(([name, content]) => ({ name, content }));

  if (!entries.length) {
    alert('No .txt files found in imported data.');
    return;
  }

  const order = ['startup.txt', 'stats.txt', 'skills.txt', 'items.txt', 'procedures.txt'];
  entries.sort((a, b) => {
    const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  resetWorkspace();
  fileMap.clear();
  entries.forEach(e => fileMap.set(e.name, { name: e.name, content: e.content }));
  renderSidebar([...fileMap.values()]);

  entries.forEach(e => openTab(e.name, e.content));
  const startupTab = tabs.find(t => t.name === 'startup.txt');
  if (startupTab) activateTab(startupTab.id);

  saveSession();
  setSaveStatus(`Imported ${entries.length} files`);
}

export function exportProject(): void {
  const bundle = collectBundle();
  if (!Object.keys(bundle).length) {
    alert('No files to export. Open or create files first.');
    return;
  }
  const payload = JSON.stringify({ sa: true, version: 1, files: bundle });
  const encoded = `SAIDE:${btoa(unescape(encodeURIComponent(payload)))}`;
  openStringModal('export', encoded);
  setSaveStatus(`Exported ${Object.keys(bundle).length} files`);
}

export function openImportModal(): void {
  openStringModal('import');
}

export function importProjectFromString(raw: string): void {
  const text = raw.trim();
  if (!text) return;
  try {
    let json = text;
    if (text.startsWith('SAIDE:')) {
      json = decodeURIComponent(escape(atob(text.slice(6))));
    }
    const parsed = JSON.parse(json);
    const files = parsed?.files && typeof parsed.files === 'object' ? parsed.files : parsed;
    applyBundle(files as Record<string, string>);
    closeStringModal();
  } catch {
    alert('Could not parse import string.');
  }
}

export function initStringModal(): void {
  $('string-modal-close').addEventListener('click', closeStringModal);
  $('string-modal').addEventListener('click', (e) => {
    if (e.target === $('string-modal')) closeStringModal();
  });
  $('string-modal-copy').addEventListener('click', async () => {
    const ta = $('string-modal-text') as HTMLTextAreaElement;
    try {
      await navigator.clipboard.writeText(ta.value);
      setSaveStatus('Export string copied');
    } catch {
      ta.select();
      document.execCommand('copy');
      setSaveStatus('Export string copied');
    }
  });
  $('string-modal-load').addEventListener('click', () => {
    importProjectFromString(($('string-modal-text') as HTMLTextAreaElement).value);
  });
}

// ── Templates ─────────────────────────────────────────────────────────────

function getFileTemplate(name: string): string {
  if (name === 'startup.txt') return [
    '// startup.txt — Boot file',
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
    '*create level 1',
    '*create essence 0',
    '*create health "Healthy"',
    '*create skills []',
    '*create journal []',
    '*create inventory []',
    '',
    '*scene_list',
    '  prologue',
  ].join('\n');

  if (name === 'stats.txt') return [
    '// stats.txt',
    '*stat_group "Identity"',
    '*stat first_name "First Name"',
    '*stat last_name "Last Name"',
    '',
    '*stat_group "Progress"',
    '*stat level "Level"',
    '*stat essence "Essence"',
    '',
    '*stat_registered',
    '*inventory',
    '*skills_registered',
    '*achievements',
    '*journal_section',
  ].join('\n');

  const scene = name.replace('.txt', '');
  return [
    `// ${name}`,
    '',
    `*title [Chapter] ${scene.charAt(0).toUpperCase() + scene.slice(1)}`,
    '',
    'Your narrative text goes here.',
    '',
    '*choice',
    '',
    '  #First option.',
    '',
    '    The story continues.',
    '',
    '  #Second option.',
    '',
    '    Another path unfolds.',
  ].join('\n');
}

// ── Demo content ──────────────────────────────────────────────────────────

export function loadDemoContent(): void {
  const demoFiles: FileEntry[] = [
    { name: 'startup.txt', content: '// startup.txt — Boot file for The Iron Vault\n\n*create game_title "The Iron Vault"\n*create game_byline "Some doors were never meant to be opened."\n*create first_name ""\n*create last_name ""\n*create pronouns_subject "they"\n*create pronouns_object "them"\n*create pronouns_possessive "their"\n*create pronouns_possessive_pronoun "theirs"\n*create pronouns_reflexive "themself"\n*create pronouns_label "they/them"\n*create level 1\n*create essence 0\n*create health "Healthy"\n*create skills []\n*create journal []\n*create inventory []\n*create vault_open false\n\n*create_stat strength "Strength" 10\n*create_stat cunning "Cunning" 10\n\n*scene_list\n  prologue\n  vault' },
    { name: 'prologue.txt', content: '// prologue.txt — Opening scene\n\n*title [Prologue] The Iron Vault\n\nThe city of Ashmark has three rules: pay your debts, keep your head down,\nand stay away from the Iron Vault.\n\nYou have broken all three.\n\n*define_term "Iron Vault" A legendary sealed chamber beneath the city.\n\n*page_break\n\nA courier slips a note under your door: the vault has been partially opened.\n\n*choice\n\n  #Go in through the aqueduct — risky but fast.\n\n    You know these tunnels better than most.\n\n    *set_stat cunning (cunning + 2) min:0 max:100\n    *journal You entered the vault through the aqueduct.\n    *notify "Cunning +2"\n    *finish\n\n  #Join the rival crew.\n\n    Numbers mean safety. You fall in with the Ashmark Crew.\n\n    *journal You allied with the Ashmark Crew.\n    *finish\n\n  *selectable_if (cunning >= 15) #Slip in alone — silent and unseen.\n\n    You ghost through the shadows without a sound.\n\n    *journal You infiltrated the vault alone.\n    *award_essence 50\n    *finish' },
    { name: 'vault.txt', content: '// vault.txt — Vault scene\n\n*title [Chapter 2] Inside the Vault\n\n*temp found_key false\n\nThe vault is massive — vaulted ceilings lost in shadow, walls lined\nwith iron mechanisms older than the city above.\n\n*if (cunning >= 12)\n\n  Your sharp eyes spot a loose panel near the entrance.\n  Behind it: a worn brass key on a hook.\n\n  *add_item "Vault Key"\n  *set found_key true\n  *notify "Vault Key acquired"\n\n*else\n\n  The entrance chamber is bare. Whatever was here has been taken.\n\n*check_item "Vault Key" found_key\n\n*if found_key\n\n  You insert the key. The inner vault swings open.\n  *set vault_open true\n  *award_essence 200\n\n*else\n\n  The inner door is sealed. You need to find the key.\n\n*page_break\n\n*choice\n\n  #Search the vault systematically.\n\n    *temp roll 0\n    *set roll (random(1, 20))\n\n    *if (roll >= 15)\n\n      You land a critical find — a hidden cache of Essence crystals.\n      *award_essence 300\n\n    *elseif (roll >= 8)\n\n      You find a modest cache. Better than nothing.\n      *award_essence 100\n\n    *else\n\n      The vault has already been picked clean.\n\n  #Get out while you can.\n\n    Discretion is the better part of survival.\n    *journal You escaped the Iron Vault.\n    *ending "Out of the Dark" "You escaped with your life — and a story to tell."' },
    { name: 'procedures.txt', content: '// procedures.txt — Reusable procedures\n\n*procedure level_up\n  *system\n    LEVEL UP!\n    Strength +2  |  Cunning +1\n  *end_system\n  *set_stat strength (strength + 2) min:0 max:100\n  *set_stat cunning (cunning + 1) min:0 max:100\n  *set level (level + 1)\n  *award_essence 100\n  *return\n\n*procedure vault_alarm\n  *system\n    ALARM TRIGGERED — Guards incoming!\n  *end_system\n  *notify "Guards alerted!" 3000\n  *return' },
    { name: 'stats.txt', content: '// stats.txt — Stats panel layout\n\n*stat_group "Identity"\n*stat first_name "First Name"\n*stat last_name "Last Name"\n\n*stat_group "Progress"\n*stat_color level accent-cyan\n*stat level "Level"\n*stat_color essence accent-amber\n*stat essence "Essence"\n\n*stat_group "Vitals"\n*stat_color health accent-green\n*stat health "Health"\n\n*stat_group "Attributes"\n*stat_registered\n\n*inventory\n*skills_registered\n*achievements\n*journal_section' },
  ];

  fileMap.clear();
  demoFiles.forEach(e => fileMap.set(e.name, e));
  renderSidebar(demoFiles);
  demoFiles.forEach(e => openTab(e.name, e.content!));
  $('welcome').style.display = 'none';
}
