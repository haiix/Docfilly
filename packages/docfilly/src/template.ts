import type { DocfillyDiagnostic, DocfillyVariable } from "./types";

type DiagnosticReporter = (diagnostic: DocfillyDiagnostic) => void;
type ValueTransform = (value: string) => string;

interface TextNode {
  type: "text";
  value: string;
  line: number;
}

interface RawNode {
  type: "raw";
  value: string;
}

interface IfCondition {
  name: string;
  operator?: "=" | "!=";
  expected?: string;
}

interface IfNode {
  type: "if";
  condition: IfCondition;
  thenNodes: readonly TemplateNode[];
  elseNodes: readonly TemplateNode[];
}

type TemplateNode = TextNode | RawNode | IfNode;

interface TemplateLine {
  raw: string;
  trimmed: string;
  line: number;
  start: number;
  end: number;
  directive?: { type: "if"; expression: string } | { type: "else" } | { type: "endif" };
}

interface SequenceResult {
  nodes: TemplateNode[];
  nextIndex: number;
  stop?: "else" | "endif";
}

interface ConditionResult {
  condition?: IfCondition;
  diagnostic?: DocfillyDiagnostic;
}

export interface CompiledTemplate {
  readonly diagnostics: readonly DocfillyDiagnostic[];
  render(
    values: ReadonlyMap<string, string>,
    transform?: ValueTransform,
    reportDiagnostic?: DiagnosticReporter,
  ): string;
}

export const MAX_IF_NESTING_DEPTH = 32;

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

function tokenizeLines(template: string): TemplateLine[] {
  const lines: TemplateLine[] = [];
  let start = 0;
  let line = 1;

  while (start < template.length) {
    const newline = template.indexOf("\n", start);
    const end = newline === -1 ? template.length : newline + 1;
    const raw = template.slice(start, end);
    const content = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
    const trimmed = content.trim();
    const ifMatch = /^\[\[#if(?:\s+(.*))?\]\]$/u.exec(trimmed);

    let directive: TemplateLine["directive"];
    if (ifMatch) directive = { type: "if", expression: ifMatch[1] ?? "" };
    else if (trimmed === "[[#else]]") directive = { type: "else" };
    else if (trimmed === "[[#endif]]") directive = { type: "endif" };

    lines.push({ raw, trimmed, line, start, end, directive });
    start = end;
    line += 1;
  }

  return lines;
}

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
  token: TemplateLine,
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
  token: TemplateLine,
  variables: ReadonlyMap<string, DocfillyVariable>,
  lineOffset: number,
): ConditionResult {
  const line = token.line + lineOffset;
  const match = /^([\p{L}\p{N}_]+)(?:\s*(!=|=)\s*(.*))?$/u.exec(expression.trim());
  if (!match) {
    return {
      diagnostic: conditionDiagnostic(
        "invalid-if-condition",
        `${line}行目のif条件が不正なため、ifブロックの原文を保持しました。`,
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
        `${line}行目のif条件が未定義の変数「${name}」を参照しているため、ifブロックの原文を保持しました。`,
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
        `${line}行目の変数「${name}」はチェックボックスではないため、= または != で比較してください。ifブロックの原文を保持しました。`,
        token,
        lineOffset,
      ),
    };
  }

  if (variable.type === "checkbox") {
    return {
      diagnostic: conditionDiagnostic(
        "invalid-condition-type",
        `${line}行目の変数「${name}」はチェックボックスのため、変数名だけで条件を記述してください。ifブロックの原文を保持しました。`,
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
        `${line}行目のif条件の比較値が不正なため、ifブロックの原文を保持しました。`,
        token,
        lineOffset,
      ),
    };
  }

  return { condition: { name, operator: operator as "=" | "!=", expected } };
}

function evaluateCondition(condition: IfCondition, values: ReadonlyMap<string, string>): boolean {
  const value = values.get(condition.name) ?? "";
  if (!condition.operator) return value === "true";
  const equals = value === condition.expected;
  return condition.operator === "=" ? equals : !equals;
}

function renderNodes(
  nodes: readonly TemplateNode[],
  values: ReadonlyMap<string, string>,
  transform: ValueTransform,
  reportDiagnostic: DiagnosticReporter | undefined,
  lineOffset: number,
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
        );
      }
      const branch = evaluateCondition(node.condition, values) ? node.thenNodes : node.elseNodes;
      return renderNodes(branch, values, transform, reportDiagnostic, lineOffset);
    })
    .join("");
}

/** Compiles placeholders and line-based if directives into a reusable template tree. */
export function compileTemplate(
  template: string,
  variables: readonly DocfillyVariable[],
  lineOffset = 0,
  enabled = true,
): CompiledTemplate {
  if (!enabled) {
    return { diagnostics: [], render: () => template };
  }

  const lines = tokenizeLines(template);
  const diagnostics: DocfillyDiagnostic[] = [];
  const variablesByName = new Map(variables.map((variable) => [variable.name, variable]));

  const sourceBetween = (startIndex: number, endIndex: number): string => {
    if (startIndex >= lines.length) return "";
    const start = lines[startIndex].start;
    const end = endIndex <= startIndex ? start : lines[Math.min(endIndex, lines.length) - 1].end;
    return template.slice(start, end);
  };

  const findMatchingEnd = (startIndex: number): number => {
    let nested = 0;
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const directive = lines[index].directive;
      if (directive?.type === "if") nested += 1;
      else if (directive?.type === "endif") {
        if (nested === 0) return index;
        nested -= 1;
      }
    }
    return lines.length;
  };

  const parseSequence = (startIndex: number, depth: number, nested: boolean): SequenceResult => {
    const nodes: TemplateNode[] = [];
    let index = startIndex;

    while (index < lines.length) {
      const token = lines[index];
      const directive = token.directive;

      if (directive?.type === "else" || directive?.type === "endif") {
        if (nested) return { nodes, nextIndex: index, stop: directive.type };
        diagnostics.push({
          code: "unexpected-directive",
          severity: "warning",
          message: `${token.line + lineOffset}行目の${directive.type === "else" ? "#else" : "#endif"}に対応する#ifがないため、原文を保持しました。`,
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
        const nextIndex = matchingEnd < lines.length ? matchingEnd + 1 : lines.length;
        diagnostics.push({
          code: "if-nesting-too-deep",
          severity: "warning",
          message: `${token.line + lineOffset}行目のifブロックはネストの上限（${MAX_IF_NESTING_DEPTH}階層）を超えたため、原文を保持しました。`,
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
          const duplicate = lines[elseResult.nextIndex];
          diagnostics.push({
            code: "duplicate-else",
            severity: "warning",
            message: `${duplicate.line + lineOffset}行目の#elseは同じifブロック内で重複しているため、ifブロックの原文を保持しました。`,
            line: duplicate.line + lineOffset,
            source: duplicate.trimmed,
          });
          endIndex = findMatchingEnd(elseResult.nextIndex);
          structurallyValid = false;
        }
      }

      if (!structurallyValid) {
        const nextIndex = endIndex < lines.length ? endIndex + 1 : lines.length;
        if (endIndex >= lines.length) {
          diagnostics.push({
            code: "unclosed-if",
            severity: "warning",
            message: `${token.line + lineOffset}行目の#ifに対応する#endifがないため、原文を保持しました。`,
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

  const nodes = parseSequence(0, 0, false).nodes;
  return {
    diagnostics,
    render: (values, transform = (value) => value, reportDiagnostic) =>
      renderNodes(nodes, values, transform, reportDiagnostic, lineOffset),
  };
}
