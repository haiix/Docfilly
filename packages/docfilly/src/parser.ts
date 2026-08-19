import { compileTemplate, type CompiledTemplate } from "./template";
import type {
  DocfillyDiagnostic,
  DocfillyFormItem,
  DocfillyVariable,
  ParsedDocfillySource,
} from "./types";

interface SplitSource {
  isDocfilly: boolean;
  definitions: string;
  template: string;
  definitionLineOffset: number;
  templateLineOffset: number;
  diagnostic?: DocfillyDiagnostic;
}

interface ParsedVariableRow {
  variable?: DocfillyVariable;
  diagnostic?: DocfillyDiagnostic;
}

type ScanResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Separates Docfilly definitions from the document template.
 *
 * @param source - The complete document source.
 * @returns The split source and any delimiter diagnostic.
 */
function splitAtDelimiterLine(source: string): SplitSource {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  const isDocfilly = lines[0]?.trim().toLowerCase() === "#!docfilly";

  if (!isDocfilly) {
    return {
      isDocfilly: false,
      definitions: "",
      template: lines.join("\n"),
      definitionLineOffset: 1,
      templateLineOffset: 0,
    };
  }

  const delimiterIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

  if (delimiterIndex === -1) {
    return {
      isDocfilly: true,
      definitions: "",
      template: lines.slice(1).join("\n"),
      definitionLineOffset: 2,
      templateLineOffset: 1,
      diagnostic: {
        code: "missing-delimiter",
        severity: "warning",
        message:
          "区切り行（---）が見つからなかったため、識別子より後の内容を本文として表示しました。",
      },
    };
  }

  return {
    isDocfilly: true,
    definitions: lines.slice(1, delimiterIndex).join("\n"),
    template: lines.slice(delimiterIndex + 1).join("\n"),
    definitionLineOffset: 2,
    templateLineOffset: delimiterIndex + 1,
  };
}

/**
 * Finds the first delimiter that is not enclosed in a quoted field.
 *
 * @param value - The text to scan.
 * @param delimiter - The single-character delimiter to locate.
 * @returns The delimiter index, or a failed result for an unclosed quote.
 */
function findFirstOutsideQuotes(value: string, delimiter: string): ScanResult<number> {
  let inQuotes = false;
  let delimiterIndex = -1;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (inQuotes && value[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && character === delimiter && delimiterIndex === -1) {
      delimiterIndex = index;
    }
  }

  return inQuotes ? { ok: false } : { ok: true, value: delimiterIndex };
}

/**
 * Splits text at delimiters that are not enclosed in quoted fields.
 *
 * @param value - The text to split.
 * @param delimiter - The single-character delimiter to use.
 * @returns The split fields, or a failed result for an unclosed quote.
 */
function splitOutsideQuotes(value: string, delimiter: string): ScanResult<string[]> {
  const parts: string[] = [];
  let start = 0;
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (inQuotes && value[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && character === delimiter) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  if (inQuotes) return { ok: false };
  parts.push(value.slice(start));
  return { ok: true, value: parts };
}

/**
 * Trims an unquoted field or decodes a CSV-style quoted field.
 *
 * @param rawField - The field text, including any surrounding quotes.
 * @returns The decoded field, or a failed result for invalid quoting.
 */
function decodeField(rawField: string): ScanResult<string> {
  const field = rawField.trim();
  if (!field.includes('"')) return { ok: true, value: field };
  if (!field.startsWith('"')) return { ok: false };

  let decoded = "";
  for (let index = 1; index < field.length; index += 1) {
    const character = field[index];
    if (character !== '"') {
      decoded += character;
      continue;
    }

    if (field[index + 1] === '"') {
      decoded += '"';
      index += 1;
      continue;
    }

    return field.slice(index + 1).trim().length === 0
      ? { ok: true, value: decoded }
      : { ok: false };
  }

  return { ok: false };
}

/**
 * Creates a diagnostic for a variable row with invalid CSV-style quoting.
 */
function invalidQuotingDiagnostic(row: string, lineNumber: number): DocfillyDiagnostic {
  return {
    code: "invalid-quoting",
    severity: "warning",
    message: `${lineNumber}行目の引用符の使い方が不正なため、設定項目として読み飛ばしました。値を引用する場合は全体を「"」で囲み、値に含む「"」は「""」と記述してください。`,
    line: lineNumber,
    source: row,
  };
}

/**
 * Parses a single variable definition row.
 *
 * @param row - The trimmed variable definition.
 * @param lineNumber - The one-based source line number.
 * @returns The parsed variable and any associated diagnostic.
 */
function parseVariable(row: string, lineNumber: number): ParsedVariableRow {
  const equals = findFirstOutsideQuotes(row, "=");
  if (!equals.ok) {
    return { diagnostic: invalidQuotingDiagnostic(row, lineNumber) };
  }

  if (equals.value === -1) {
    return {
      diagnostic: {
        code: "missing-equals",
        severity: "warning",
        message: `${lineNumber}行目は「=」がないため、設定項目として読み飛ばしました。`,
        line: lineNumber,
        source: row,
      },
    };
  }

  const nameAndLabel = row.slice(0, equals.value);
  const rawValue = row.slice(equals.value + 1);
  const nameAndLabelFields = splitOutsideQuotes(nameAndLabel, "|");
  if (!nameAndLabelFields.ok) {
    return { diagnostic: invalidQuotingDiagnostic(row, lineNumber) };
  }

  const [rawName, rawLabel = ""] = nameAndLabelFields.value;
  const name = rawName.trim();
  if (rawName.includes('"')) {
    return { diagnostic: invalidQuotingDiagnostic(row, lineNumber) };
  }
  const decodedLabel = decodeField(rawLabel);
  if (!decodedLabel.ok) {
    return { diagnostic: invalidQuotingDiagnostic(row, lineNumber) };
  }
  const label = decodedLabel.value || name;
  const value = rawValue.trim();

  if (!/^[\p{L}\p{N}_]+$/u.test(name)) {
    return {
      diagnostic: {
        code: "invalid-variable-name",
        severity: "warning",
        message: `${lineNumber}行目の変数名「${name}」は使用できないため、読み飛ばしました。変数名には文字、数字、_を使用できます。`,
        line: lineNumber,
        source: row,
      },
    };
  }

  if (/^\[[xX ]\]$/.test(value)) {
    return {
      variable: {
        type: "checkbox",
        name,
        label,
        initialValue: value.toLowerCase() === "[x]",
      },
    };
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const splitCandidates = splitOutsideQuotes(value.slice(1, -1), ",");
    if (!splitCandidates.ok) {
      return { diagnostic: invalidQuotingDiagnostic(row, lineNumber) };
    }

    const entries: { selected: boolean; value: string }[] = [];
    for (const rawCandidate of splitCandidates.value) {
      const candidate = rawCandidate.trim();
      const selected = candidate.startsWith("*");
      const decoded = decodeField(selected ? candidate.slice(1) : candidate);
      if (!decoded.ok) {
        return { diagnostic: invalidQuotingDiagnostic(row, lineNumber) };
      }
      if (decoded.value.length > 0) entries.push({ selected, value: decoded.value });
    }

    const diagnostic =
      entries.length === splitCandidates.value.length
        ? undefined
        : {
            code: "invalid-dropdown" as const,
            severity: "warning" as const,
            message: `${lineNumber}行目の空の選択肢を読み飛ばしました。`,
            line: lineNumber,
            source: row,
          };

    if (entries.length === 0) {
      return {
        variable: { type: "text", name, label, initialValue: value },
        diagnostic: {
          code: "invalid-dropdown",
          severity: "warning",
          message: `${lineNumber}行目には有効な選択肢がないため、テキスト入力として表示しました。`,
          line: lineNumber,
          source: row,
        },
      };
    }

    const selected = entries.find((item) => item.selected) ?? entries[0];
    return {
      variable: {
        type: "select",
        name,
        label,
        options: entries.map((item) => item.value),
        initialValue: selected.value,
      },
      diagnostic,
    };
  }

  const decodedValue = decodeField(value);
  if (!decodedValue.ok) {
    return { diagnostic: invalidQuotingDiagnostic(row, lineNumber) };
  }

  return { variable: { type: "text", name, label, initialValue: decodedValue.value } };
}

export interface ParsedDocfillyDocument extends ParsedDocfillySource {
  compiledTemplate: CompiledTemplate;
  formItems: readonly DocfillyFormItem[];
  variableLines: ReadonlyMap<string, number>;
}

/** Parses source and compiles its body for use by the interactive renderer. */
export function parseDocfillyDocument(source: string): ParsedDocfillyDocument {
  const split = splitAtDelimiterLine(source);
  const variables: DocfillyVariable[] = [];
  const formItems: DocfillyFormItem[] = [];
  const diagnostics: DocfillyDiagnostic[] = split.diagnostic ? [split.diagnostic] : [];
  const names = new Set<string>();
  const variableLines = new Map<string, number>();

  split.definitions.split("\n").forEach((rawRow, index) => {
    const row = rawRow.trim();
    if (!row || row.startsWith("#")) return;

    if (row.startsWith(">")) {
      const text = row.slice(1).replace(/^\s/, "");
      formItems.push({ kind: "description", text });
      return;
    }

    const lineNumber = index + split.definitionLineOffset;
    const parsed = parseVariable(row, lineNumber);
    if (parsed.diagnostic) diagnostics.push(parsed.diagnostic);
    const variable = parsed.variable;
    if (!variable) return;

    if (names.has(variable.name)) {
      diagnostics.push({
        code: "duplicate-variable",
        severity: "warning",
        message: `${lineNumber}行目の「${variable.name}」はすでに定義されているため、最初の設定を使用しました。`,
        line: lineNumber,
        source: row,
      });
      return;
    }

    names.add(variable.name);
    variableLines.set(variable.name, lineNumber);
    variables.push(variable);
    formItems.push({ kind: "variable", variable });
  });

  const compiledTemplate = compileTemplate(
    split.template,
    variables,
    split.templateLineOffset,
    split.isDocfilly,
  );
  diagnostics.push(...compiledTemplate.diagnostics);

  return {
    isDocfilly: split.isDocfilly,
    variables,
    formItems,
    template: split.template,
    templateLineOffset: split.templateLineOffset,
    diagnostics,
    compiledTemplate,
    variableLines,
  };
}

/**
 * Parses document source into Docfilly variables, template content, and diagnostics.
 *
 * @param source - The complete document source.
 * @returns The parsed Docfilly source model.
 */
export function parseDocfillySource(source: string): ParsedDocfillySource {
  const parsed = parseDocfillyDocument(source);
  return {
    isDocfilly: parsed.isDocfilly,
    variables: parsed.variables,
    template: parsed.template,
    templateLineOffset: parsed.templateLineOffset,
    diagnostics: parsed.diagnostics,
  };
}
