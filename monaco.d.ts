// ---------------------------------------------------------------------------
// monaco.d.ts — Ambient type declarations for monaco-editor.
//
// Monaco is loaded via CDN at runtime.  We only declare the subset of types
// that the IDE source files reference via `import('monaco-editor')`.
// When npm is available, install `monaco-editor` as a devDependency and
// delete this file — the real types are far more complete.
// ---------------------------------------------------------------------------

declare module 'monaco-editor' {
  export namespace editor {
    interface IStandaloneCodeEditor {
      getModel(): ITextModel | null;
      setModel(model: ITextModel | null): void;
      focus(): void;
      layout(): void;
      updateOptions(options: Record<string, any>): void;
      revealLineInCenter(line: number): void;
      revealRangeInCenter(range: any): void;
      setPosition(pos: { lineNumber: number; column: number }): void;
      setSelection(range: any): void;
      onDidChangeCursorPosition(cb: (e: any) => void): void;
      onDidChangeModelContent(cb: (e: any) => void): void;
      onDidChangeModel(cb: (e: any) => void): void;
      addCommand(keybinding: number, handler: () => void): void;
      createDecorationsCollection(decs: IModelDeltaDecoration[]): IEditorDecorationsCollection;
    }
    interface ITextModel {
      uri: any;
      getLineCount(): number;
      getLineContent(line: number): string;
      getValue(): string;
      findMatches(searchString: string, searchOnlyEditableRange: boolean, isRegex: boolean, matchCase: boolean, wordSeparators: string | null, captureMatches: boolean): FindMatch[];
      applyEdits(edits: { range: any; text: string }[]): void;
      dispose(): void;
    }
    interface FindMatch {
      range: any;
    }
    interface IEditorDecorationsCollection {
      set(decorations: IModelDeltaDecoration[]): void;
    }
    interface IModelDeltaDecoration {
      range: any;
      options: {
        isWholeLine?: boolean;
        className?: string;
      };
    }
    interface IMarkerData {
      severity: number;
      message: string;
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    }
    function create(element: HTMLElement, options: Record<string, any>): IStandaloneCodeEditor;
    function createModel(value: string, language: string): ITextModel;
    function defineTheme(name: string, data: any): void;
    function setModelMarkers(model: ITextModel, owner: string, markers: IMarkerData[]): void;
    function getModelMarkers(filter: { resource: any }): (IMarkerData & { severity: number; startLineNumber: number })[];
  }
  export namespace languages {
    function register(lang: { id: string }): void;
    function setMonarchTokensProvider(id: string, def: any): void;
    function registerCompletionItemProvider(id: string, provider: any): void;
    function registerHoverProvider(id: string, provider: any): void;
    function registerFoldingRangeProvider(id: string, provider: any): void;
    interface FoldingRange {
      start: number;
      end: number;
      kind?: any;
    }
    namespace FoldingRangeKind {
      const Region: any;
    }
  }
  export namespace MarkerSeverity {
    const Error: number;
    const Warning: number;
    const Info: number;
  }
  export namespace KeyMod {
    const CtrlCmd: number;
  }
  export namespace KeyCode {
    const KeyS: number;
    const KeyF: number;
    const KeyN: number;
    const KeyW: number;
  }
  export class Range {
    constructor(startLine: number, startCol: number, endLine: number, endCol: number);
  }
}
