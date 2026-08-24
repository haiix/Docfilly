import { diagnosticMessage } from "./messages";
import type { IfCondition, TemplateNode, TemplateToken } from "./template-types";
import type { DocfillyDiagnostic, DocfillyVariable, SupportedLocale } from "./types";

interface SequenceResult {
  nodes: TemplateNode[];
  nextIndex: number;
  stop?: "else" | "endif";
}

interface ConditionResult {
  condition?: IfCondition;
  diagnostic?: DocfillyDiagnostic;
}

export interface ParsedTemplate {
  readonly nodes: readonly TemplateNode[];
  readonly diagnostics: readonly DocfillyDiagnostic[];
}

export const MAX_IF_NESTING_DEPTH = 32;

function decodeConditionLiteral(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (!value.includes('"')) return /^[^\s,=!]+$/u.test(value) ? value : undefined;
  if (!value.startsWith('"')) return undefined;

  let decoded = "";
  for (let index = 1; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '"') {
      decoded += character;
      continue;
    }
    if (value[index + 1] === '"') {
      decoded += '"';
      index += 1;
      continue;
    }
    return value.slice(index + 1).trim() === "" ? decoded : undefined;
  }
  return undefined;
}

function conditionDiagnostic(
  code: "invalid-if-condition" | "undefined-condition-variable" | "invalid-condition-type",
  message: string,
  token: TemplateToken,
  lineOffset: number,
): DocfillyDiagnostic {
  return {
    code,
    severity: "warning",
    message,
    line: token.line + lineOffset,
    source: token.trimmed,
  };
}

function parseCondition(
  expression: string,
  token: TemplateToken,
  variables: ReadonlyMap<string, DocfillyVariable>,
  lineOffset: number,
  locale: SupportedLocale,
): ConditionResult {
  const line = token.line + lineOffset;
  const match = /^([\p{L}\p{N}_]+)(?:\s*(!=|=)\s*(.*))?$/u.exec(expression.trim());
  if (!match) {
    return {
      diagnostic: conditionDiagnostic(
        "invalid-if-condition",
        diagnosticMessage(locale, "invalid-if-condition", { line }),
        token,
        lineOffset,
      ),
    };
  }

  const [, name, operator, rawExpected] = match;
  const variable = variables.get(name);
  if (!variable) {
    return {
      diagnostic: conditionDiagnostic(
        "undefined-condition-variable",
        diagnosticMessage(locale, "undefined-condition-variable", { line, name }),
        token,
        lineOffset,
      ),
    };
  }

  if (!operator) {
    if (variable.type === "checkbox") return { condition: { name } };
    return {
      diagnostic: conditionDiagnostic(
        "invalid-condition-type",
        diagnosticMessage(locale, "condition-requires-comparison", { line, name }),
        token,
        lineOffset,
      ),
    };
  }

  if (variable.type === "checkbox") {
    return {
      diagnostic: conditionDiagnostic(
        "invalid-condition-type",
        diagnosticMessage(locale, "checkbox-condition-requires-name", { line, name }),
        token,
        lineOffset,
      ),
    };
  }

  const expected = decodeConditionLiteral(rawExpected ?? "");
  if (expected === undefined) {
    return {
      diagnostic: conditionDiagnostic(
        "invalid-if-condition",
        diagnosticMessage(locale, "invalid-condition-value", { line }),
        token,
        lineOffset,
      ),
    };
  }

  return { condition: { name, operator: operator as "=" | "!=", expected } };
}

/** Builds a template tree while preserving invalid blocks as raw source. */
export function parseTemplate(
  template: string,
  tokens: readonly TemplateToken[],
  variables: readonly DocfillyVariable[],
  lineOffset: number,
  locale: SupportedLocale,
): ParsedTemplate {
  const diagnostics: DocfillyDiagnostic[] = [];
  const variablesByName = new Map(variables.map((variable) => [variable.name, variable]));

  const sourceBetween = (startIndex: number, endIndex: number): string => {
    if (startIndex >= tokens.length) return "";
    const start = tokens[startIndex].start;
    const end = endIndex <= startIndex ? start : tokens[Math.min(endIndex, tokens.length) - 1].end;
    return template.slice(start, end);
  };

  const findMatchingEnd = (startIndex: number): number => {
    let nested = 0;
    for (let index = startIndex + 1; index < tokens.length; index += 1) {
      const directive = tokens[index].directive;
      if (directive?.type === "if") nested += 1;
      else if (directive?.type === "endif") {
        if (nested === 0) return index;
        nested -= 1;
      }
    }
    return tokens.length;
  };

  const parseSequence = (startIndex: number, depth: number, nested: boolean): SequenceResult => {
    const nodes: TemplateNode[] = [];
    let index = startIndex;

    while (index < tokens.length) {
      const token = tokens[index];
      const directive = token.directive;

      if (directive?.type === "else" || directive?.type === "endif") {
        if (nested) return { nodes, nextIndex: index, stop: directive.type };
        diagnostics.push({
          code: "unexpected-directive",
          severity: "warning",
          message: diagnosticMessage(locale, "unexpected-directive", {
            line: token.line + lineOffset,
            directive: directive.type === "else" ? "#else" : "#endif",
          }),
          line: token.line + lineOffset,
          source: token.trimmed,
        });
        nodes.push({ type: "raw", value: token.raw });
        index += 1;
        continue;
      }

      if (directive?.type !== "if") {
        nodes.push({ type: "text", value: token.raw, line: token.line });
        index += 1;
        continue;
      }

      if (depth >= MAX_IF_NESTING_DEPTH) {
        const matchingEnd = findMatchingEnd(index);
        const nextIndex = matchingEnd < tokens.length ? matchingEnd + 1 : tokens.length;
        diagnostics.push({
          code: "if-nesting-too-deep",
          severity: "warning",
          message: diagnosticMessage(locale, "if-nesting-too-deep", {
            line: token.line + lineOffset,
            depth: MAX_IF_NESTING_DEPTH,
          }),
          line: token.line + lineOffset,
          source: token.trimmed,
        });
        nodes.push({ type: "raw", value: sourceBetween(index, nextIndex) });
        index = nextIndex;
        continue;
      }

      const blockStart = index;
      const conditionResult = parseCondition(
        directive.expression,
        token,
        variablesByName,
        lineOffset,
        locale,
      );
      if (conditionResult.diagnostic) diagnostics.push(conditionResult.diagnostic);

      const thenResult = parseSequence(index + 1, depth + 1, true);
      let elseNodes: TemplateNode[] = [];
      let endIndex = thenResult.nextIndex;
      let structurallyValid = thenResult.stop === "endif";

      if (thenResult.stop === "else") {
        const elseResult = parseSequence(thenResult.nextIndex + 1, depth + 1, true);
        elseNodes = elseResult.nodes;
        endIndex = elseResult.nextIndex;
        structurallyValid = elseResult.stop === "endif";

        if (elseResult.stop === "else") {
          const duplicate = tokens[elseResult.nextIndex];
          diagnostics.push({
            code: "duplicate-else",
            severity: "warning",
            message: diagnosticMessage(locale, "duplicate-else", {
              line: duplicate.line + lineOffset,
            }),
            line: duplicate.line + lineOffset,
            source: duplicate.trimmed,
          });
          endIndex = findMatchingEnd(elseResult.nextIndex);
          structurallyValid = false;
        }
      }

      if (!structurallyValid) {
        const nextIndex = endIndex < tokens.length ? endIndex + 1 : tokens.length;
        if (endIndex >= tokens.length) {
          diagnostics.push({
            code: "unclosed-if",
            severity: "warning",
            message: diagnosticMessage(locale, "unclosed-if", {
              line: token.line + lineOffset,
            }),
            line: token.line + lineOffset,
            source: token.trimmed,
          });
        }
        nodes.push({ type: "raw", value: sourceBetween(blockStart, nextIndex) });
        index = nextIndex;
        continue;
      }

      const nextIndex = endIndex + 1;
      if (!conditionResult.condition) {
        nodes.push({ type: "raw", value: sourceBetween(blockStart, nextIndex) });
      } else {
        nodes.push({
          type: "if",
          condition: conditionResult.condition,
          thenNodes: thenResult.nodes,
          elseNodes,
        });
      }
      index = nextIndex;
    }

    return { nodes, nextIndex: index };
  };

  return { nodes: parseSequence(0, 0, false).nodes, diagnostics };
}
