import type { DocfillyDiagnostic } from "./types";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

type DiagnosticReporter = (diagnostic: DocfillyDiagnostic) => void;

const filters = {
  upper: (value: string) => value.toUpperCase(),
  lower: (value: string) => value.toLowerCase(),
  snake: (value: string) => splitWords(value).join("_"),
  kebab: (value: string) => splitWords(value).join("-"),
  pascal: (value: string) => splitWords(value).map(capitalize).join(""),
  camel: (value: string) => {
    const words = splitWords(value);
    return [words[0] ?? "", ...words.slice(1).map(capitalize)].join("");
  },
} satisfies Record<string, (value: string) => string>;

function splitWords(value: string): string[] {
  return value
    .trim()
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function capitalize(value: string): string {
  const [first = "", ...rest] = [...value];
  return first.toUpperCase() + rest.join("").toLowerCase();
}

function lineNumberAt(template: string, offset: number): number {
  return template.slice(0, offset).split("\n").length;
}

export function interpolate(
  template: string,
  values: ReadonlyMap<string, string>,
  transform: (value: string) => string = (value) => value,
  reportDiagnostic?: DiagnosticReporter,
  lineOffset = 0,
): string {
  return template.replace(
    /\[\[((?:(?!\[\[|\]\])[^\r\n])*)\]\]/gu,
    (match, expression: string, offset: number) => {
      const parts = expression.split("|").map((part) => part.trim());
      const [name = "", ...filterNames] = parts;
      const line = lineNumberAt(template, offset) + lineOffset;

      if (!/^[\p{L}\p{N}_]+$/u.test(name) || filterNames.some((filter) => filter.length === 0)) {
        reportDiagnostic?.({
          code: "invalid-placeholder",
          severity: "warning",
          message: `${line}行目のプレースホルダー「${match}」の構文が不正なため、原文を保持しました。`,
          line,
          source: match,
        });
        return match;
      }

      const value = values.get(name);
      if (value === undefined) {
        reportDiagnostic?.({
          code: "undefined-variable",
          severity: "warning",
          message: `${line}行目のプレースホルダー「${match}」が参照する変数「${name}」は定義されていないため、原文を保持しました。`,
          line,
          source: match,
        });
        return match;
      }

      let result = value;
      for (const filterName of filterNames) {
        const filter = filters[filterName as keyof typeof filters];
        if (!filter) {
          reportDiagnostic?.({
            code: "unknown-filter",
            severity: "warning",
            message: `${line}行目のプレースホルダー「${match}」に未知のフィルター「${filterName}」があるため、原文を保持しました。`,
            line,
            source: match,
          });
          return match;
        }
        result = filter(result);
      }

      return transform(result);
    },
  );
}
