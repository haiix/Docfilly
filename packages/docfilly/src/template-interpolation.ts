import { diagnosticMessage } from "./messages";
import type { DiagnosticReporter, ValueTransform } from "./template-types";
import type { SupportedLocale } from "./types";

/** Escapes characters that have special meaning in HTML. */
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

function isInlineDirective(expression: string): boolean {
  return /^(?:#if(?:\s|$)|#else$|#endif$)/u.test(expression.trim());
}

/** Replaces placeholders without interpreting inserted values as syntax. */
export function interpolate(
  template: string,
  values: ReadonlyMap<string, string>,
  transform: ValueTransform = (value) => value,
  reportDiagnostic?: DiagnosticReporter,
  lineOffset = 0,
  locale: SupportedLocale = "en",
): string {
  return template.replace(
    /(\\)?\[\[((?:(?!\[\[|\]\])[^\r\n])*)\]\]/gu,
    (match, escaped: string | undefined, expression: string, offset: number) => {
      if (escaped) return match.slice(1);
      if (isInlineDirective(expression)) return match;

      const parts = expression.split("|").map((part) => part.trim());
      const [name = "", ...filterNames] = parts;
      const line = lineNumberAt(template, offset) + lineOffset;

      if (!/^[\p{L}\p{N}_]+$/u.test(name) || filterNames.some((filter) => filter.length === 0)) {
        reportDiagnostic?.({
          code: "invalid-placeholder",
          severity: "warning",
          message: diagnosticMessage(locale, "invalid-placeholder", { line, placeholder: match }),
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
          message: diagnosticMessage(locale, "undefined-variable", {
            line,
            placeholder: match,
            name,
          }),
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
            message: diagnosticMessage(locale, "unknown-filter", {
              line,
              placeholder: match,
              filter: filterName,
            }),
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
