// ---------------------------------------------------------------------------
// completions.ts — Autocomplete and hover documentation providers.
// ---------------------------------------------------------------------------

declare const monaco: typeof import('monaco-editor');

interface CmdEntry {
  label:  string;
  kind:   number;
  detail: string;
  doc:    string;
}

const COMPLETIONS: CmdEntry[] = [
  { label: '*create',       kind: 14, detail: '*create varName defaultValue',          doc: 'Declare a global persistent variable (startup.txt only).' },
  { label: '*create_stat',  kind: 14, detail: '*create_stat key "Label" value',        doc: 'Declare a stat shown in the Stats sidebar.' },
  { label: '*scene_list',   kind: 14, detail: '*scene_list',                           doc: 'List of scenes (startup.txt only). Indent each scene name below.' },
  { label: '*temp',         kind: 6,  detail: '*temp varName [value]',                 doc: 'Declare a scene-local variable.' },
  { label: '*set',          kind: 7,  detail: '*set varName expression',               doc: 'Set any variable to a value or expression.' },
  { label: '*set_stat',     kind: 7,  detail: '*set_stat varName expr [min:N] [max:N]',doc: 'Set a stat variable with optional min/max clamping.' },
  { label: '*if',           kind: 17, detail: '*if (condition)',                       doc: 'Run the indented block if condition is true.' },
  { label: '*elseif',       kind: 17, detail: '*elseif (condition)',                   doc: 'Alternative branch for a *if chain.' },
  { label: '*else',         kind: 17, detail: '*else',                                 doc: 'Fallback block for a *if chain.' },
  { label: '*selectable_if',kind: 17, detail: '*selectable_if (cond) #Option text',    doc: 'Choice button visible but disabled when condition is false.' },
  { label: '*loop',         kind: 17, detail: '*loop (condition)',                     doc: 'Repeat the indented block while condition is true.' },
  { label: '*goto',         kind: 2,  detail: '*goto labelName',                      doc: 'Jump to a *label within the current scene.' },
  { label: '*goto_scene',   kind: 2,  detail: '*goto_scene sceneName',                doc: 'Move to another scene file. Clears *temp variables.' },
  { label: '*gosub',        kind: 2,  detail: '*gosub labelName',                     doc: 'Call a label in the current scene as a subroutine.' },
  { label: '*gosub_scene',  kind: 2,  detail: '*gosub_scene sceneName [label]',       doc: 'Call another scene as a subroutine.' },
  { label: '*return',       kind: 2,  detail: '*return',                              doc: 'Return from a *gosub or *call.' },
  { label: '*finish',       kind: 2,  detail: '*finish',                              doc: 'Advance to the next scene in *scene_list.' },
  { label: '*label',        kind: 3,  detail: '*label name',                          doc: 'Mark a named jump target. Must be unique per scene.' },
  { label: '*choice',       kind: 17, detail: '*choice',                              doc: 'Show player choice buttons. Indent # options beneath.' },
  { label: '*random_choice',kind: 17, detail: '*random_choice',                       doc: 'Silently pick one weighted branch. Format: "  40 #Label".' },
  { label: '*title',        kind: 10, detail: '*title [Tag] Text',                    doc: 'Show a chapter card and update the header.' },
  { label: '*system',       kind: 10, detail: '*system [text]',                       doc: 'Show an inline [SYSTEM] message.' },
  { label: '*end_system',   kind: 10, detail: '*end_system',                          doc: 'Close a multi-line *system block.' },
  { label: '*notify',       kind: 10, detail: '*notify "message" [ms]',               doc: 'Show a toast popup.' },
  { label: '*page_break',   kind: 10, detail: '*page_break [buttonText]',             doc: 'Pause, clear screen on continue.' },
  { label: '*image',        kind: 10, detail: '*image "file" [alt:"text"] [width:N]', doc: 'Insert an image from the media/ folder.' },
  { label: '*input',        kind: 10, detail: '*input varName "Prompt text"',         doc: 'Pause and show a text input field.' },
  { label: '*grant_skill',  kind: 4,  detail: '*grant_skill skillKey',                doc: 'Give the player a skill.' },
  { label: '*revoke_skill', kind: 4,  detail: '*revoke_skill skillKey',               doc: 'Remove a skill from the player.' },
  { label: '*if_skill',     kind: 17, detail: '*if_skill skillKey',                   doc: 'Branch if the player owns this skill.' },
  { label: '*add_item',     kind: 4,  detail: '*add_item "Item Name"',                doc: 'Add one item to the player inventory.' },
  { label: '*remove_item',  kind: 4,  detail: '*remove_item "Item Name"',             doc: 'Remove one item from inventory.' },
  { label: '*check_item',   kind: 4,  detail: '*check_item "Item Name" varName',      doc: 'Set varName to true/false based on item ownership.' },
  { label: '*award_essence',kind: 4,  detail: '*award_essence N',                     doc: 'Award N Essence points.' },
  { label: '*journal',      kind: 10, detail: '*journal text',                        doc: 'Add a journal entry.' },
  { label: '*achievement',  kind: 10, detail: '*achievement text',                    doc: 'Add an achievement entry.' },
  { label: '*procedure',    kind: 11, detail: '*procedure name',                      doc: 'Define a reusable block in procedures.txt.' },
  { label: '*call',         kind: 11, detail: '*call procedureName',                  doc: 'Run a named procedure.' },
  { label: '*save_point',   kind: 5,  detail: '*save_point ["Label"]',                doc: 'Trigger an immediate auto-save.' },
  { label: '*checkpoint',   kind: 5,  detail: '*checkpoint ["Label"]',                doc: 'Create a named restore point.' },
  { label: '*define_term',  kind: 10, detail: '*define_term "Term" description',      doc: 'Add or update a glossary entry.' },
  { label: '*ending',       kind: 10, detail: '*ending "Title" "Subtitle"',           doc: 'Show the game-ending screen.' },
  { label: '*stat_group',   kind: 3,  detail: '*stat_group "Label"',                  doc: 'Open a collapsible section in stats panel.' },
  { label: '*stat',         kind: 3,  detail: '*stat key "Label"',                    doc: 'Display a global variable in stats panel.' },
  { label: '*stat_color',   kind: 3,  detail: '*stat_color key color',                doc: 'Set highlight colour for a stat row.' },
  { label: '*stat_registered',kind:3, detail: '*stat_registered',                     doc: 'Auto-render all *create_stat attributes.' },
  { label: '*inventory',    kind: 3,  detail: '*inventory',                           doc: 'Render the player inventory list.' },
  { label: '*comment',      kind: 15, detail: '*comment text',                        doc: 'Author note — ignored by the engine.' },
  { label: '*patch_state',  kind: 15, detail: '*patch_state varName value',           doc: 'Dev tool: directly overwrite a state variable.' },
];

export function registerCompletionProvider(): void {
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
            insertText: c.label, range,
          })),
      };
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
