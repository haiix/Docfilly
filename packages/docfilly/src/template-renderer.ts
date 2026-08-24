import { interpolate } from "./template-interpolation";
import type {
  DiagnosticReporter,
  IfCondition,
  TemplateNode,
  ValueTransform,
} from "./template-types";
import type { SupportedLocale } from "./types";

function evaluateCondition(condition: IfCondition, values: ReadonlyMap<string, string>): boolean {
  const value = values.get(condition.name) ?? "";
  if (!condition.operator) return value === "true";
  const equals = value === condition.expected;
  return condition.operator === "=" ? equals : !equals;
}

/** Evaluates a parsed template tree and interpolates placeholders in selected text nodes. */
export function renderTemplate(
  nodes: readonly TemplateNode[],
  values: ReadonlyMap<string, string>,
  transform: ValueTransform,
  reportDiagnostic: DiagnosticReporter | undefined,
  lineOffset: number,
  locale: SupportedLocale,
): string {
  return nodes
    .map((node) => {
      if (node.type === "raw") return node.value;
      if (node.type === "text") {
        return interpolate(
          node.value,
          values,
          transform,
          reportDiagnostic,
          lineOffset + node.line - 1,
          locale,
        );
      }
      const branch = evaluateCondition(node.condition, values) ? node.thenNodes : node.elseNodes;
      return renderTemplate(branch, values, transform, reportDiagnostic, lineOffset, locale);
    })
    .join("");
}
