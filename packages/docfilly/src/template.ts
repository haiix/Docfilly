import { MAX_IF_NESTING_DEPTH, parseTemplate } from "./template-parser";
import { renderTemplate } from "./template-renderer";
import { tokenizeTemplate } from "./template-tokenizer";
import type { DiagnosticReporter, ValueTransform } from "./template-types";
import type { DocfillyDiagnostic, DocfillyVariable, SupportedLocale } from "./types";

export { escapeHtml, interpolate } from "./template-interpolation";
export { MAX_IF_NESTING_DEPTH };

export interface CompiledTemplate {
  readonly diagnostics: readonly DocfillyDiagnostic[];
  render(
    values: ReadonlyMap<string, string>,
    transform?: ValueTransform,
    reportDiagnostic?: DiagnosticReporter,
  ): string;
}

/** Compiles placeholders and line-based if directives into a reusable template tree. */
export function compileTemplate(
  template: string,
  variables: readonly DocfillyVariable[],
  lineOffset = 0,
  enabled = true,
  locale: SupportedLocale = "en",
): CompiledTemplate {
  if (!enabled) return { diagnostics: [], render: () => template };

  const parsed = parseTemplate(template, tokenizeTemplate(template), variables, lineOffset, locale);
  return {
    diagnostics: parsed.diagnostics,
    render: (values, transform = (value) => value, reportDiagnostic) =>
      renderTemplate(parsed.nodes, values, transform, reportDiagnostic, lineOffset, locale),
  };
}
