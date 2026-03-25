// ---------------------------------------------------------------------------
// language.ts — Monarch tokenizer for the System Awakening scripting language.
// ---------------------------------------------------------------------------

declare const monaco: typeof import('monaco-editor');

/** Token name constants — map 1:1 to theme rules */
export const T = {
  COMMENT:    'sa.comment',
  DECLARE:    'sa.cmd.declare',
  TEMP:       'sa.cmd.temp',
  ASSIGN:     'sa.cmd.assign',
  COND:       'sa.cmd.cond',
  LOOP:       'sa.cmd.loop',
  NAV:        'sa.cmd.nav',
  CHOICE:     'sa.cmd.choice',
  LABEL:      'sa.cmd.label',
  DISPLAY:    'sa.cmd.display',
  INPUT:      'sa.cmd.input',
  SKILLS:     'sa.cmd.skills',
  ITEMS:      'sa.cmd.items',
  JOURNAL:    'sa.cmd.journal',
  PROC:       'sa.cmd.proc',
  SAVE:       'sa.cmd.save',
  GLOSS:      'sa.cmd.gloss',
  ENDING:     'sa.cmd.ending',
  META:       'sa.cmd.meta',
  STATS_FILE: 'sa.cmd.statsfile',
  DEF_BLOCK:  'sa.cmd.defblock',
  CHOICE_OPT: 'sa.choice.option',
  STR:        'sa.string',
  INTERP:     'sa.interp',
  PRONOUN:    'sa.pronoun',
  EXPR_OPEN:  'sa.expr.paren',
  EXPR_KW:    'sa.expr.kw',
  NUMBER:     'sa.number',
  VARNAME:    'sa.varname',
  SCENENAME:  'sa.scenename',
  LABELNAME:  'sa.labelname',
  PROCNAME:   'sa.procname',
  RARITY:     'sa.rarity',
  INLINE_TAG: 'sa.inlinetag',
  UNKNOWN:    'sa.unknown',
} as const;

/**
 * Register the `sa-script` language and its Monarch tokenizer with Monaco.
 *
 * FIX (v2): Every sub-state has a `[/./, '']` catch-all BEFORE the
 * `[/$/, '', '@pop']` rule.  Monarch's `$` anchor doesn't fire when there
 * are still unmatched characters on the line, which caused the original
 * tokenizer to get stuck in a sub-state and mis-colour all subsequent lines.
 */
export function registerLanguage(): void {
  monaco.languages.register({ id: 'sa-script' });

  monaco.languages.setMonarchTokensProvider('sa-script', {
    defaultToken: '',

    tokenizer: {
      root: [
        [/\/\/.*$/, T.COMMENT],

        // Weighted choice option: "  40 #Label"
        [/^(\s*)(\d+)(\s*)(#.*)$/, ['', T.NUMBER, '', T.CHOICE_OPT]],
        // Choice option: "#Text"
        [/^(\s*)(#.+)$/, ['', T.CHOICE_OPT]],

        // ── Directives — ordered longest match first ──────────────

        // Declarations
        [/(\s*)(\*create_stat|\*create|\*scene_list)(?=\s|$)/, ['', { token: T.DECLARE, next: '@after_declare' }]],
        // Temp
        [/(\s*)(\*temp)(?=\s|$)/, ['', { token: T.TEMP, next: '@after_varname' }]],
        // Assignment
        [/(\s*)(\*set_stat|\*set)(?=\s|$)/, ['', { token: T.ASSIGN, next: '@after_assign' }]],
        // Conditional
        [/(\s*)(\*selectable_if|\*elseif|\*if|\*else)(?=\s|$|\()/, ['', { token: T.COND, next: '@after_expr' }]],
        // Loop
        [/(\s*)(\*loop)(?=\s|$|\()/, ['', { token: T.LOOP, next: '@after_expr' }]],
        // Navigation — scene-level
        [/(\s*)(\*goto_scene|\*gosub_scene)(?=\s|$)/, ['', { token: T.NAV, next: '@after_scenename' }]],
        [/(\s*)(\*goto|\*gosub)(?=\s|$)/, ['', { token: T.NAV, next: '@after_labelname' }]],
        [/(\s*)(\*return|\*finish)(?=\s|$)/, ['', T.NAV]],
        // Choice blocks
        [/(\s*)(\*random_choice|\*choice)(?=\s|$)/, ['', T.CHOICE]],
        // Labels
        [/(\s*)(\*label)(?=\s|$)/, ['', { token: T.LABEL, next: '@after_labelname' }]],
        // Display
        [/(\s*)(\*set_game_title|\*set_game_byline|\*title|\*system|\*end_system|\*notify|\*page_break|\*image)(?=\s|$)/, ['', { token: T.DISPLAY, next: '@after_generic' }]],
        // Input
        [/(\s*)(\*input)(?=\s|$)/, ['', { token: T.INPUT, next: '@after_varname' }]],
        // Skills
        [/(\s*)(\*if_skill|\*grant_skill|\*revoke_skill|\*category)(?=\s|$)/, ['', { token: T.SKILLS, next: '@after_generic' }]],
        // Items
        [/(\s*)(\*check_item|\*add_item|\*grant_item|\*remove_item|\*award_essence|\*add_essence)(?=\s|$)/, ['', { token: T.ITEMS, next: '@after_generic' }]],
        // Journal
        [/(\s*)(\*journal|\*achievement)(?=\s|$)/, ['', { token: T.JOURNAL, next: '@after_generic' }]],
        // Procedures
        [/(\s*)(\*procedure|\*call)(?=\s|$)/, ['', { token: T.PROC, next: '@after_procname' }]],
        // Save
        [/(\s*)(\*save_point|\*checkpoint)(?=\s|$)/, ['', { token: T.SAVE, next: '@after_generic' }]],
        // Glossary
        [/(\s*)(\*define_term)(?=\s|$)/, ['', { token: T.GLOSS, next: '@after_generic' }]],
        // Ending
        [/(\s*)(\*ending)(?=\s|$)/, ['', { token: T.ENDING, next: '@after_generic' }]],
        // Stats file directives
        [/(\s*)(\*stat_registered|\*skills_registered|\*journal_section|\*achievements|\*inventory|\*stat_group|\*stat_color|\*stat_icon|\*stat)(?=\s|$)/, ['', { token: T.STATS_FILE, next: '@after_generic' }]],
        // Skill/item definitions
        [/(\s*)(\*skill|\*item|\*require)(?=\s|$)/, ['', { token: T.DEF_BLOCK, next: '@after_generic' }]],
        // Meta
        [/(\s*)(\*patch_state|\*comment)(?=\s|$)/, ['', { token: T.META, next: '@after_comment' }]],
        // Unknown *command
        [/(\s*)(\*[a-z_]+)/, ['', T.UNKNOWN]],

        // ── Inline tokens (narrative lines) ──────────────────────
        // Only highlight interpolation, pronouns, inline tags, and rarity
        // badges in narrative text. Strings, numbers, and keywords are NOT
        // highlighted in root — they only fire inside directive sub-states.
        [/\$\{[a-zA-Z_][\w]*\}/, T.INTERP],
        [/\{(?:they|them|their|theirs|themself|They|Them|Their|Theirs|Themself)\}/, T.PRONOUN],
        [/\[(?:b|i|\/b|\/i|common|uncommon|rare|epic|legendary|\/common|\/uncommon|\/rare|\/epic|\/legendary)\]/i, T.INLINE_TAG],
        [/\[(?:Common|Uncommon|Rare|Epic|Legendary)\]/, T.RARITY],
      ],

      // ── Sub-states ──────────────────────────────────────────────
      after_declare: [
        [/$/, '', '@pop'],
        [/\s+/, ''],
        [/[a-zA-Z_][\w]*/, { token: T.VARNAME, next: '@after_generic' }],
        [/"[^"]*"/, { token: T.STR, next: '@after_generic' }],
        [/./, ''],
      ],
      after_varname: [
        [/$/, '', '@pop'],
        [/\s+/, ''],
        [/[a-zA-Z_][\w]*/, { token: T.VARNAME, next: '@after_generic' }],
        [/./, ''],
      ],
      after_assign: [
        [/$/, '', '@pop'],
        [/\s+/, ''],
        [/[a-zA-Z_][\w]*/, { token: T.VARNAME, next: '@after_expr' }],
        [/./, ''],
      ],
      after_scenename: [
        [/$/, '', '@pop'],
        [/\s+/, ''],
        [/[a-zA-Z_][\w.]*/, { token: T.SCENENAME, next: '@after_generic' }],
        [/./, ''],
      ],
      after_labelname: [
        [/$/, '', '@pop'],
        [/\s+/, ''],
        [/[a-zA-Z_][\w]*/, { token: T.LABELNAME, next: '@after_generic' }],
        [/./, ''],
      ],
      after_procname: [
        [/$/, '', '@pop'],
        [/\s+/, ''],
        [/[a-zA-Z_][\w]*/, { token: T.PROCNAME, next: '@after_generic' }],
        [/./, ''],
      ],
      after_expr: [
        [/$/, '', '@popall'],
        [/\s+/, ''],
        [/[()]/, T.EXPR_OPEN],
        [/\b(?:and|or|not|true|false)\b/, T.EXPR_KW],
        [/[<>=!]+/, T.EXPR_OPEN],
        [/"[^"]*"/, T.STR],
        [/\$\{[a-zA-Z_][\w]*\}/, T.INTERP],
        [/\d+(\.\d+)?/, T.NUMBER],
        [/[a-zA-Z_][\w]*/, T.VARNAME],
        [/./, ''],
      ],
      after_generic: [
        [/$/, '', '@popall'],
        [/\$\{[a-zA-Z_][\w]*\}/, T.INTERP],
        [/\{(?:they|them|their|theirs|themself|They|Them|Their|Theirs|Themself)\}/, T.PRONOUN],
        [/"[^"]*"/, T.STR],
        [/\[(?:Common|Uncommon|Rare|Epic|Legendary)\]/i, T.RARITY],
        [/\[(?:b|i|\/b|\/i|common|uncommon|rare|epic|legendary|\/common|\/uncommon|\/rare|\/epic|\/legendary)\]/i, T.INLINE_TAG],
        [/\d+(\.\d+)?/, T.NUMBER],
        [/./, ''],
      ],
      after_comment: [
        [/$/, '', '@pop'],
        [/.+/, T.COMMENT],
      ],
    }
  });
}
