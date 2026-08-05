import type { DocfillyDiagnostic, DocfillyVariable, ParsedDocfillySource } from "./types";

interface SplitSource {
  isDocfilly: boolean;
  definitions: string;
  template: string;
  definitionLineOffset: number;
  diagnostic?: DocfillyDiagnostic;
}

interface ParsedVariableRow {
  variable?: DocfillyVariable;
  diagnostic?: DocfillyDiagnostic;
}

function splitAtDelimiterLine(source: string): SplitSource {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  const isDocfilly = lines[0]?.trim().toLowerCase() === "#!docfilly";

  if (!isDocfilly) {
    return {
      isDocfilly: false,
      definitions: "",
      template: lines.join("\n"),
      definitionLineOffset: 1,
    };
  }

  const delimiterIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

  if (delimiterIndex === -1) {
    return {
      isDocfilly: true,
      definitions: "",
      template: lines.slice(1).join("\n"),
      definitionLineOffset: 2,
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
  };
}

function splitAtFirst(value: string, delimiter: string): [string, string] {
  const index = value.indexOf(delimiter);
  if (index === -1) return [value, ""];
  return [value.slice(0, index), value.slice(index + delimiter.length)];
}

function parseVariable(row: string, lineNumber: number): ParsedVariableRow {
  const [nameAndLabel, rawValue] = splitAtFirst(row, "=");

  if (!row.includes("=")) {
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

  const [rawName, rawLabel = ""] = nameAndLabel.split("|", 2);
  const name = rawName.trim();
  const label = rawLabel.trim() || name;
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
        initialValue: value === "[x]",
      },
    };
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const candidates = value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim());
    const entries = candidates
      .map((item) => ({ raw: item, value: item.replace(/^\*/, "").trim() }))
      .filter((item) => item.value.length > 0);
    const diagnostic =
      entries.length === candidates.length
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

    const selected = entries.find((item) => item.raw.startsWith("*")) ?? entries[0];
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

  return { variable: { type: "text", name, label, initialValue: value } };
}

export function parseDocfillySource(source: string): ParsedDocfillySource {
  const split = splitAtDelimiterLine(source);
  const variables: DocfillyVariable[] = [];
  const diagnostics: DocfillyDiagnostic[] = split.diagnostic ? [split.diagnostic] : [];
  const names = new Set<string>();

  split.definitions.split("\n").forEach((rawRow, index) => {
    const row = rawRow.trim();
    if (!row || row.startsWith("#")) return;

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
    variables.push(variable);
  });

  return { isDocfilly: split.isDocfilly, variables, template: split.template, diagnostics };
}
