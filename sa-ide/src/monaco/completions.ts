// ---------------------------------------------------------------------------
// completions.ts — Autocomplete, hover documentation, and code intelligence.
// ---------------------------------------------------------------------------

import { fileMap, tabs } from '../state.js';

declare const monaco: typeof import('monaco-editor');

// InsertAsSnippet = 4
const SNIPPET = 4;

interface CmdEntry {
  label:  string;
  kind:   number;
  detail: string;
  doc:    string;
  insertText?: string;
  insertTextRules?: number;
}

const COMPLETIONS: CmdEntry[] = [
  { label: '*create',       kind: 14, detail: '*create varName defaultValue',          doc: 'Declare a global persistent variable (startup.txt only).',
    insertText: '*create ${1:varName} ${2:defaultValue}', insertTextRules: SNIPPET },
  { label: '*create_stat',  kind: 14, detail: '*create_stat key "Label" value',        doc: 'Declare a stat shown in the Stats sidebar.',
    insertText: '*create_stat ${1:key} "${2:Label}" ${3:0}', insertTextRules: SNIPPET },
  { label: '*scene_list',   kind: 14, detail: '*scene_list',                           doc: 'List of scenes (startup.txt only). Indent each scene name below.',
    insertText: '*scene_list\n  ${1:prologue}', insertTextRules: SNIPPET },
  { label: '*temp',         kind: 6,  detail: '*temp varName [value]',                 doc: 'Declare a scene-local variable.',
    insertText: '*temp ${1:varName} ${2:false}', insertTextRules: SNIPPET },
  { label: '*set',          kind: 7,  detail: '*set varName expression',               doc: 'Set any variable to a value or expression.',
    insertText: '*set ${1:varName} ${2:value}', insertTextRules: SNIPPET },
  { label: '*set_stat',     kind: 7,  detail: '*set_stat varName expr [min:N] [max:N]',doc: 'Set a stat variable with optional min/max clamping.' },
  { label: '*if',           kind: 17, detail: '*if (condition)',                       doc: 'Run the indented block if condition is true.',
    insertText: '*if (${1:condition})\n  $0', insertTextRules: SNIPPET },
  { label: '*elseif',       kind: 17, detail: '*elseif (condition)',                   doc: 'Alternative branch for a *if chain.',
    insertText: '*elseif (${1:condition})', insertTextRules: SNIPPET },
  { label: '*else',         kind: 17, detail: '*else',                                 doc: 'Fallback block for a *if chain.' },
  { label: '*selectable_if',kind: 17, detail: '*selectable_if (cond) #Option text',    doc: 'Choice button visible but disabled when condition is false.',
    insertText: '*selectable_if (${1:condition}) #${2:Option text}', insertTextRules: SNIPPET },
  { label: '*loop',         kind: 17, detail: '*loop (condition)',                     doc: 'Repeat the indented block while condition is true.',
    insertText: '*loop (${1:condition})\n  $0', insertTextRules: SNIPPET },
  { label: '*goto',         kind: 2,  detail: '*goto labelName',                      doc: 'Jump to a *label within the current scene.',
    insertText: '*goto ${1:labelName}', insertTextRules: SNIPPET },
  { label: '*goto_scene',   kind: 2,  detail: '*goto_scene sceneName',                doc: 'Move to another scene file. Clears *temp variables.',
    insertText: '*goto_scene ${1:sceneName}', insertTextRules: SNIPPET },
  { label: '*gosub',        kind: 2,  detail: '*gosub labelName',                     doc: 'Call a label in the current scene as a subroutine.',
    insertText: '*gosub ${1:labelName}', insertTextRules: SNIPPET },
  { label: '*gosub_scene',  kind: 2,  detail: '*gosub_scene sceneName [label]',       doc: 'Call another scene as a subroutine.',
    insertText: '*gosub_scene ${1:sceneName}', insertTextRules: SNIPPET },
  { label: '*return',       kind: 2,  detail: '*return',                              doc: 'Return from a *gosub or *call.' },
  { label: '*finish',       kind: 2,  detail: '*finish',                              doc: 'Advance to the next scene in *scene_list.' },
  { label: '*label',        kind: 3,  detail: '*label name',                          doc: 'Mark a named jump target. Must be unique per scene.',
    insertText: '*label ${1:name}', insertTextRules: SNIPPET },
  { label: '*choice',       kind: 17, detail: '*choice',                              doc: 'Show player choice buttons. Indent # options beneath.',
    insertText: '*choice\n\n  #${1:First option}\n\n    $0\n\n  #${2:Second option}\n\n    ', insertTextRules: SNIPPET },
  { label: '*random_choice',kind: 17, detail: '*random_choice',                       doc: 'Silently pick one weighted branch. Format: "  40 #Label".',
    insertText: '*random_choice\n\n  50 #${1:First branch}\n\n    $0\n\n  50 #${2:Second branch}\n\n    ', insertTextRules: SNIPPET },
  { label: '*title',        kind: 10, detail: '*title [Tag] Text',                    doc: 'Show a chapter card and update the header.',
    insertText: '*title [${1:Chapter}] ${2:Title}', insertTextRules: SNIPPET },
  { label: '*system',       kind: 10, detail: '*system [text]',                       doc: 'Show an inline [SYSTEM] message.',
    insertText: '*system\n  ${1:message}\n*end_system', insertTextRules: SNIPPET },
  { label: '*end_system',   kind: 10, detail: '*end_system',                          doc: 'Close a multi-line *system block.' },
  { label: '*notify',       kind: 10, detail: '*notify "message" [ms]',               doc: 'Show a toast popup.',
    insertText: '*notify "${1:message}"', insertTextRules: SNIPPET },
  { label: '*page_break',   kind: 10, detail: '*page_break [buttonText]',             doc: 'Pause, clear screen on continue.' },
  { label: '*image',        kind: 10, detail: '*image "file" [alt:"text"] [width:N]', doc: 'Insert an image from the media/ folder.',
    insertText: '*image "${1:filename.png}"', insertTextRules: SNIPPET },
  { label: '*input',        kind: 10, detail: '*input varName "Prompt text"',         doc: 'Pause and show a text input field.',
    insertText: '*input ${1:varName} "${2:Prompt text}"', insertTextRules: SNIPPET },
  { label: '*grant_skill',  kind: 4,  detail: '*grant_skill skillKey',                doc: 'Give the player a skill.',
    insertText: '*grant_skill ${1:skillKey}', insertTextRules: SNIPPET },
  { label: '*revoke_skill', kind: 4,  detail: '*revoke_skill skillKey',               doc: 'Remove a skill from the player.' },
  { label: '*if_skill',     kind: 17, detail: '*if_skill skillKey',                   doc: 'Branch if the player owns this skill.',
    insertText: '*if_skill ${1:skillKey}\n  $0', insertTextRules: SNIPPET },
  { label: '*add_item',     kind: 4,  detail: '*add_item "Item Name"',                doc: 'Add one item to the player inventory.',
    insertText: '*add_item "${1:Item Name}"', insertTextRules: SNIPPET },
  { label: '*remove_item',  kind: 4,  detail: '*remove_item "Item Name"',             doc: 'Remove one item from inventory.',
    insertText: '*remove_item "${1:Item Name}"', insertTextRules: SNIPPET },
  { label: '*check_item',   kind: 4,  detail: '*check_item "Item Name" varName',      doc: 'Set varName to true/false based on item ownership.',
    insertText: '*check_item "${1:Item Name}" ${2:varName}', insertTextRules: SNIPPET },
  { label: '*award_essence',kind: 4,  detail: '*award_essence N',                     doc: 'Award N Essence points.',
    insertText: '*award_essence ${1:100}', insertTextRules: SNIPPET },
  { label: '*journal',      kind: 10, detail: '*journal text',                        doc: 'Add a journal entry.',
    insertText: '*journal ${1:text}', insertTextRules: SNIPPET },
  { label: '*achievement',  kind: 10, detail: '*achievement text',                    doc: 'Add an achievement entry.',
    insertText: '*achievement ${1:text}', insertTextRules: SNIPPET },
  { label: '*procedure',    kind: 11, detail: '*procedure name',                      doc: 'Define a reusable block in procedures.txt.',
    insertText: '*procedure ${1:name}\n  $0\n  *return', insertTextRules: SNIPPET },
  { label: '*call',         kind: 11, detail: '*call procedureName',                  doc: 'Run a named procedure.',
    insertText: '*call ${1:procedureName}', insertTextRules: SNIPPET },
  { label: '*save_point',   kind: 5,  detail: '*save_point ["Label"]',                doc: 'Trigger an immediate auto-save.' },
  { label: '*checkpoint',   kind: 5,  detail: '*checkpoint ["Label"]',                doc: 'Create a named restore point.' },
  { label: '*define_term',  kind: 10, detail: '*define_term "Term" description',      doc: 'Add or update a glossary entry.',
    insertText: '*define_term "${1:Term}" ${2:description}', insertTextRules: SNIPPET },
  { label: '*ending',       kind: 10, detail: '*ending "Title" "Subtitle"',           doc: 'Show the game-ending screen.',
    insertText: '*ending "${1:Title}" "${2:Subtitle}"', insertTextRules: SNIPPET },
  { label: '*stat_group',   kind: 3,  detail: '*stat_group "Label"',                  doc: 'Open a collapsible section in stats panel.',
    insertText: '*stat_group "${1:Label}"', insertTextRules: SNIPPET },
  { label: '*stat',         kind: 3,  detail: '*stat key "Label"',                    doc: 'Display a global variable in stats panel.',
    insertText: '*stat ${1:key} "${2:Label}"', insertTextRules: SNIPPET },
  { label: '*stat_color',   kind: 3,  detail: '*stat_color key color',                doc: 'Set highlight colour for a stat row.' },
  { label: '*stat_registered',kind:3, detail: '*stat_registered',                     doc: 'Auto-render all *create_stat attributes.' },
  { label: '*inventory',    kind: 3,  detail: '*inventory',                           doc: 'Render the player inventory list.' },
  { label: '*comment',      kind: 15, detail: '*comment text',                        doc: 'Author note — ignored by the engine.' },
  { label: '*patch_state',  kind: 15, detail: '*patch_state varName value',           doc: 'Dev tool: directly overwrite a state variable.' },
];

// ── Context helpers ────────────────────────────────────────────────────────

function getSceneNames(): string[] {
  const names = new Set<string>();
  for (const fname of fileMap.keys()) {
    names.add(fname.replace(/\.txt$/i, ''));
  }
  for (const tab of tabs) {
    names.add(tab.name.replace(/\.txt$/i, ''));
  }
  return [...names];
}

function getLabelsFromModel(model: any): string[] {
  const labels: string[] = [];
  const lineCount = model.getLineCount();
  for (let i = 1; i <= lineCount; i++) {
    const line = model.getLineContent(i).trimStart();
    const m = line.match(/^\*label\s+(\S+)/);
    if (m) labels.push(m[1]);
  }
  return labels;
}

function getDeclaredVars(): string[] {
  const vars = new Set<string>();
  for (const tab of tabs) {
    const content = tab.model.getValue();
    for (const line of content.split('\n')) {
      const t = line.trimStart();
      const mC = t.match(/^\*create(?:_stat)?\s+([a-zA-Z_]\w*)/);
      if (mC) vars.add(mC[1]);
      const mT = t.match(/^\*temp\s+([a-zA-Z_]\w*)/);
      if (mT) vars.add(mT[1]);
    }
  }
  return [...vars];
}

// ── Completion providers ───────────────────────────────────────────────────

export function registerCompletionProvider(): void {
  // Provider 1: *command completions with snippets
  monaco.languages.registerCompletionItemProvider('sa-script', {
    triggerCharacters: ['*'],
    provideCompletionItems(model: any, position: any) {
      const lineText = model.getLineContent(position.lineNumber);
      const starIdx = lineText.lastIndexOf('*', position.column - 1);
      if (starIdx === -1) return { suggestions: [] };
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber:   position.lineNumber,
        startColumn:     starIdx + 1,
        endColumn:       position.column,
      };
      const typed = lineText.slice(starIdx, position.column - 1).toLowerCase();
      return {
        suggestions: COMPLETIONS
          .filter(c => c.label.startsWith(typed) || typed === '*')
          .map(c => ({
            label: c.label, kind: c.kind, detail: c.detail,
            documentation: { value: c.doc },
            insertText: c.insertText ?? c.label,
            insertTextRules: c.insertTextRules ?? 0,
            range,
          })),
      };
    },
  });

  // Provider 2: context-aware completions (scene names, labels, variables)
  monaco.languages.registerCompletionItemProvider('sa-script', {
    triggerCharacters: [' '],
    provideCompletionItems(model: any, position: any) {
      const lineText = model.getLineContent(position.lineNumber);
      const trimmed = lineText.trimStart();
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber:   position.lineNumber,
        startColumn:     position.column,
        endColumn:       position.column,
      };

      // *goto_scene / *gosub_scene → scene file names
      if (/^\*(?:goto|gosub)_scene\s/.test(trimmed)) {
        return {
          suggestions: getSceneNames().map(name => ({
            label: name,
            kind: 17,
            detail: name + '.txt',
            documentation: { value: `Navigate to scene: **${name}.txt**` },
            insertText: name,
            range,
          })),
        };
      }

      // *goto / *gosub (not _scene) → label names in current file
      if (/^\*(?:goto|gosub)\s/.test(trimmed) && !/^\*(?:goto|gosub)_scene\s/.test(trimmed)) {
        return {
          suggestions: getLabelsFromModel(model).map(label => ({
            label: label,
            kind: 18,
            detail: '*label ' + label,
            documentation: { value: `Jump to label: **${label}**` },
            insertText: label,
            range,
          })),
        };
      }

      // *if / *elseif → variable names
      if (/^\*(?:if|elseif)\s/.test(trimmed)) {
        return {
          suggestions: getDeclaredVars().map(v => ({
            label: v,
            kind: 6,
            detail: 'variable',
            insertText: v,
            range,
          })),
        };
      }

      // *set → variable names
      if (/^\*set\s/.test(trimmed)) {
        return {
          suggestions: getDeclaredVars().map(v => ({
            label: v,
            kind: 6,
            detail: 'variable',
            insertText: v,
            range,
          })),
        };
      }

      // *call → procedure names from procedures.txt tab
      if (/^\*call\s/.test(trimmed)) {
        const procTab = tabs.find(t => t.name === 'procedures.txt');
        if (procTab) {
          const procs: string[] = [];
          const content = procTab.model.getValue();
          for (const line of content.split('\n')) {
            const m = line.trimStart().match(/^\*procedure\s+(\S+)/);
            if (m) procs.push(m[1]);
          }
          return {
            suggestions: procs.map(p => ({
              label: p,
              kind: 11,
              detail: '*procedure ' + p,
              insertText: p,
              range,
            })),
          };
        }
      }

      return { suggestions: [] };
    },
  });
}

export function registerHoverProvider(): void {
  monaco.languages.registerHoverProvider('sa-script', {
    provideHover(model: any, position: any) {
      const line = model.getLineContent(position.lineNumber);
      const trimmed = line.trimStart();
      const lead = line.length - trimmed.length;
      const m = trimmed.match(/^(\*[a-z_]+)/);
      if (!m) return null;
      const cmd = COMPLETIONS.find(c => c.label === m[1]);
      if (!cmd) return null;
      return {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber:   position.lineNumber,
          startColumn:     lead + 1,
          endColumn:       lead + 1 + m[1].length,
        },
        contents: [
          { value: '**`' + cmd.detail + '`**' },
          { value: cmd.doc },
        ],
      };
    },
  });
}

// ── Go-to-definition and find-references ──────────────────────────────────

export function registerCompletionProvider2(): void {
  const mLangs = (monaco as any).languages;
  // Go-to-definition: *goto label → jump to *label definition in same file
  // *goto_scene file → open that file
  mLangs.registerDefinitionProvider('sa-script', {
    provideDefinition(model: any, position: any) {
      const line = model.getLineContent(position.lineNumber).trimStart();

      // *goto_scene / *gosub_scene → find the target tab
      const mScene = line.match(/^\*(?:goto|gosub)_scene\s+(\S+)/);
      if (mScene) {
        const stem = mScene[1].replace(/\.txt$/i, '');
        const targetTab = tabs.find(t => t.name === stem + '.txt');
        if (targetTab) {
          return [{
            uri: targetTab.model.uri,
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
          }];
        }
        return null;
      }

      // *goto / *gosub → find *label in current file
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
              range: { startLineNumber: i, startColumn: 1, endLineNumber: i, endColumn: l.length + 1 },
            }];
          }
        }
      }

      return null;
    },
  });

  // Find references: find all *goto/gosub label references
  mLangs.registerReferenceProvider('sa-script', {
    provideReferences(model: any, position: any) {
      const line = model.getLineContent(position.lineNumber).trimStart();
      const mLabel = line.match(/^\*label\s+(\S+)/);
      if (!mLabel) return null;
      const labelName = mLabel[1].toLowerCase();
      const refs: any[] = [];
      const lineCount = model.getLineCount();
      for (let i = 1; i <= lineCount; i++) {
        const l = model.getLineContent(i).trimStart();
        const mGoto = l.match(/^\*(?:goto|gosub)\s+(\S+)/);
        if (mGoto && mGoto[1].toLowerCase() === labelName) {
          refs.push({
            uri: model.uri,
            range: { startLineNumber: i, startColumn: 1, endLineNumber: i, endColumn: l.length + 1 },
          });
        }
      }
      return refs;
    },
  });
}
