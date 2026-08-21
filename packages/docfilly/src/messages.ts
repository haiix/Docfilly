import type { SupportedLocale } from "./types";

export interface DiagnosticMessageParams {
  "missing-delimiter": Record<string, never>;
  "invalid-quoting": { line: number };
  "missing-equals": { line: number };
  "invalid-variable-name": { line: number; name: string };
  "invalid-dropdown-empty-options": { line: number };
  "invalid-dropdown-no-options": { line: number };
  "duplicate-variable": { line: number; name: string };
  "invalid-placeholder": { line: number; placeholder: string };
  "undefined-variable": { line: number; placeholder: string; name: string };
  "unknown-filter": { line: number; placeholder: string; filter: string };
  "invalid-if-condition": { line: number };
  "undefined-condition-variable": { line: number; name: string };
  "condition-requires-comparison": { line: number; name: string };
  "checkbox-condition-requires-name": { line: number; name: string };
  "invalid-condition-value": { line: number };
  "unexpected-directive": { line: number; directive: "#else" | "#endif" };
  "if-nesting-too-deep": { line: number; depth: number };
  "duplicate-else": { line: number };
  "unclosed-if": { line: number };
  "invalid-select-default": { line: number; name: string; value: string };
  "invalid-checkbox-default": { line: number; name: string; value: string };
  "invalid-text-default": { line: number; name: string; value: string };
  "markdown-render-fallback": Record<string, never>;
}

export type DiagnosticMessageKey = keyof DiagnosticMessageParams;

type MessageCatalog = {
  [Key in DiagnosticMessageKey]: (params: DiagnosticMessageParams[Key]) => string;
};

const catalogs = {
  en: {
    "missing-delimiter": () =>
      "The delimiter line (---) was not found, so the content after the Docfilly identifier was displayed as the document body.",
    "invalid-quoting": ({ line }) =>
      `Line ${line} was skipped as a setting because its quoting is invalid. Enclose an entire value in " and escape a " inside it as "".`,
    "missing-equals": ({ line }) =>
      `Line ${line} was skipped as a setting because it does not contain an equals sign (=).`,
    "invalid-variable-name": ({ line, name }) =>
      `The variable name "${name}" on line ${line} is invalid, so the setting was skipped. Variable names may contain letters, numbers, and underscores.`,
    "invalid-dropdown-empty-options": ({ line }) =>
      `Empty dropdown options on line ${line} were skipped.`,
    "invalid-dropdown-no-options": ({ line }) =>
      `Line ${line} has no valid dropdown options, so it was displayed as a text input.`,
    "duplicate-variable": ({ line, name }) =>
      `The variable "${name}" on line ${line} is already defined, so the first definition was used.`,
    "invalid-placeholder": ({ line, placeholder }) =>
      `The placeholder "${placeholder}" on line ${line} has invalid syntax, so the original text was preserved.`,
    "undefined-variable": ({ line, placeholder, name }) =>
      `The placeholder "${placeholder}" on line ${line} refers to the undefined variable "${name}", so the original text was preserved.`,
    "unknown-filter": ({ line, placeholder, filter }) =>
      `The placeholder "${placeholder}" on line ${line} uses the unknown filter "${filter}", so the original text was preserved.`,
    "invalid-if-condition": ({ line }) =>
      `The if condition on line ${line} is invalid, so the original if block was preserved.`,
    "undefined-condition-variable": ({ line, name }) =>
      `The if condition on line ${line} refers to the undefined variable "${name}", so the original if block was preserved.`,
    "condition-requires-comparison": ({ line, name }) =>
      `The variable "${name}" on line ${line} is not a checkbox. Compare it with = or !=. The original if block was preserved.`,
    "checkbox-condition-requires-name": ({ line, name }) =>
      `The variable "${name}" on line ${line} is a checkbox. Use only the variable name as the condition. The original if block was preserved.`,
    "invalid-condition-value": ({ line }) =>
      `The comparison value in the if condition on line ${line} is invalid, so the original if block was preserved.`,
    "unexpected-directive": ({ line, directive }) =>
      `${directive} on line ${line} has no matching #if, so the original text was preserved.`,
    "if-nesting-too-deep": ({ line, depth }) =>
      `The if block on line ${line} exceeds the nesting limit of ${depth}, so the original text was preserved.`,
    "duplicate-else": ({ line }) =>
      `#else on line ${line} is duplicated within the same if block, so the original if block was preserved.`,
    "unclosed-if": ({ line }) =>
      `#if on line ${line} has no matching #endif, so the original text was preserved.`,
    "invalid-select-default": ({ line, name, value }) =>
      `The value "${value}" for "${name}" on line ${line} is not one of its options. The original default was preserved.`,
    "invalid-checkbox-default": ({ line, name, value }) =>
      `The value "${value}" for "${name}" on line ${line} is not true or false. The original default was preserved.`,
    "invalid-text-default": ({ line, name, value }) =>
      `The value "${value}" for "${name}" on line ${line} contains a line break and cannot be saved as a single-line setting. The original default was preserved.`,
    "markdown-render-fallback": () =>
      "The content could not be rendered as Markdown, so it was displayed as plain text.",
  },
  ja: {
    "missing-delimiter": () =>
      "区切り行（---）が見つからなかったため、識別子より後の内容を本文として表示しました。",
    "invalid-quoting": ({ line }) =>
      `${line}行目の引用符の使い方が不正なため、設定項目として読み飛ばしました。値を引用する場合は全体を「"」で囲み、値に含む「"」は「""」と記述してください。`,
    "missing-equals": ({ line }) =>
      `${line}行目は「=」がないため、設定項目として読み飛ばしました。`,
    "invalid-variable-name": ({ line, name }) =>
      `${line}行目の変数名「${name}」は使用できないため、読み飛ばしました。変数名には文字、数字、_を使用できます。`,
    "invalid-dropdown-empty-options": ({ line }) => `${line}行目の空の選択肢を読み飛ばしました。`,
    "invalid-dropdown-no-options": ({ line }) =>
      `${line}行目には有効な選択肢がないため、テキスト入力として表示しました。`,
    "duplicate-variable": ({ line, name }) =>
      `${line}行目の「${name}」はすでに定義されているため、最初の設定を使用しました。`,
    "invalid-placeholder": ({ line, placeholder }) =>
      `${line}行目のプレースホルダー「${placeholder}」の構文が不正なため、原文を保持しました。`,
    "undefined-variable": ({ line, placeholder, name }) =>
      `${line}行目のプレースホルダー「${placeholder}」が参照する変数「${name}」は定義されていないため、原文を保持しました。`,
    "unknown-filter": ({ line, placeholder, filter }) =>
      `${line}行目のプレースホルダー「${placeholder}」に未知のフィルター「${filter}」があるため、原文を保持しました。`,
    "invalid-if-condition": ({ line }) =>
      `${line}行目のif条件が不正なため、ifブロックの原文を保持しました。`,
    "undefined-condition-variable": ({ line, name }) =>
      `${line}行目のif条件が未定義の変数「${name}」を参照しているため、ifブロックの原文を保持しました。`,
    "condition-requires-comparison": ({ line, name }) =>
      `${line}行目の変数「${name}」はチェックボックスではないため、= または != で比較してください。ifブロックの原文を保持しました。`,
    "checkbox-condition-requires-name": ({ line, name }) =>
      `${line}行目の変数「${name}」はチェックボックスのため、変数名だけで条件を記述してください。ifブロックの原文を保持しました。`,
    "invalid-condition-value": ({ line }) =>
      `${line}行目のif条件の比較値が不正なため、ifブロックの原文を保持しました。`,
    "unexpected-directive": ({ line, directive }) =>
      `${line}行目の${directive}に対応する#ifがないため、原文を保持しました。`,
    "if-nesting-too-deep": ({ line, depth }) =>
      `${line}行目のifブロックはネストの上限（${depth}階層）を超えたため、原文を保持しました。`,
    "duplicate-else": ({ line }) =>
      `${line}行目の#elseは同じifブロック内で重複しているため、ifブロックの原文を保持しました。`,
    "unclosed-if": ({ line }) => `${line}行目の#ifに対応する#endifがないため、原文を保持しました。`,
    "invalid-select-default": ({ line, name, value }) =>
      `${line}行目の「${name}」の値「${value}」は選択肢に存在しません。元の初期値を維持しました。`,
    "invalid-checkbox-default": ({ line, name, value }) =>
      `${line}行目の「${name}」の値「${value}」はtrueまたはfalseではありません。元の初期値を維持しました。`,
    "invalid-text-default": ({ line, name, value }) =>
      `${line}行目の「${name}」の値「${value}」は改行を含むため1行の設定値として保存できません。元の初期値を維持しました。`,
    "markdown-render-fallback": () =>
      "Markdownとして表示できなかったため、内容をプレーンテキストで表示しました。",
  },
} satisfies Record<SupportedLocale, MessageCatalog>;

export function resolveLocale(locale?: string): SupportedLocale {
  const requested = locale ?? (typeof navigator === "undefined" ? undefined : navigator.language);
  const language = requested?.trim().toLowerCase().split("-")[0];
  return language === "ja" ? "ja" : "en";
}

export function diagnosticMessage<Key extends DiagnosticMessageKey>(
  locale: SupportedLocale,
  key: Key,
  params: DiagnosticMessageParams[Key],
): string {
  const format = catalogs[locale][key] as (value: DiagnosticMessageParams[Key]) => string;
  return format(params);
}
