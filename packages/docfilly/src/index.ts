import DOMPurify from "dompurify";
import { marked } from "marked";

export type DocfillySourceType = "md" | "text";

export type DocfillyVariable =
  | {
      type: "text";
      name: string;
      label: string;
      initialValue: string;
    }
  | {
      type: "select";
      name: string;
      label: string;
      options: readonly string[];
      initialValue: string;
    }
  | {
      type: "checkbox";
      name: string;
      label: string;
      initialValue: boolean;
    };

export interface DocfillyOptions {
  debounceMs?: number;
}

export type DocfillyDiagnosticCode =
  | "missing-delimiter"
  | "missing-equals"
  | "invalid-variable-name"
  | "duplicate-variable"
  | "invalid-dropdown"
  | "markdown-render-fallback";

export interface DocfillyDiagnostic {
  code: DocfillyDiagnosticCode;
  severity: "warning";
  message: string;
  line?: number;
  source?: string;
}

export interface ParsedDocfillySource {
  isDocfilly: boolean;
  variables: readonly DocfillyVariable[];
  template: string;
  diagnostics: readonly DocfillyDiagnostic[];
}

let controlId = 0;

function nextControlId(): string {
  controlId += 1;
  return `docfilly-control-${controlId}`;
}

interface SplitSource {
  isDocfilly: boolean;
  definitions: string;
  template: string;
  definitionLineOffset: number;
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
        message: "区切り行（---）が見つからなかったため、識別子より後の内容を本文として表示しました。",
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

interface ParsedVariableRow {
  variable?: DocfillyVariable;
  diagnostic?: DocfillyDiagnostic;
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
    return { variable: {
      type: "checkbox",
      name,
      label,
      initialValue: value === "[x]",
    } };
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const candidates = value.slice(1, -1).split(",").map((item) => item.trim());
    const entries = candidates
      .map((item) => ({ raw: item, value: item.replace(/^\*/, "").trim() }))
      .filter((item) => item.value.length > 0);
    const diagnostic = entries.length === candidates.length ? undefined : {
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

function escapeHtml(value: string): string {
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

function interpolate(
  template: string,
  values: ReadonlyMap<string, string>,
  transform: (value: string) => string = (value) => value,
): string {
  return template.replace(/\[\[([\p{L}\p{N}_]+)\]\]/gu, (match, name: string) => {
    const value = values.get(name);
    return value === undefined ? match : transform(value);
  });
}

export class Docfilly {
  readonly element: HTMLDivElement;
  readonly form: HTMLFormElement;
  readonly output: HTMLDivElement;
  readonly isDocfilly: boolean;
  readonly variables: readonly DocfillyVariable[];
  readonly sourceType: DocfillySourceType;

  private readonly template: string;
  private readonly debounceMs: number;
  private readonly diagnosticList: DocfillyDiagnostic[];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private _outputSource = "";

  constructor(source: string, sourceType: DocfillySourceType, options: DocfillyOptions = {}) {
    const parsed = parseDocfillySource(source);
    this.isDocfilly = parsed.isDocfilly;
    this.variables = parsed.variables;
    this.diagnosticList = [...parsed.diagnostics];
    this.template = parsed.template;
    this.sourceType = sourceType;
    this.debounceMs = options.debounceMs ?? 200;

    this.element = document.createElement("div");
    this.element.className = "docfilly";
    this.form = document.createElement("form");
    this.form.className = "docfilly__form";
    this.form.addEventListener("submit", this.preventSubmit);

    for (const variable of this.variables) {
      this.form.append(this.createControl(variable));
    }
    if (this.variables.length === 0) {
      this.form.hidden = true;
      this.element.classList.add("docfilly--without-form");
    }

    this.output = document.createElement("div");
    this.output.className = `docfilly__output docfilly__output--${sourceType}`;
    this.element.append(this.form, this.output);

    this.form.addEventListener("input", this.scheduleRender);
    this.form.addEventListener("change", this.scheduleRender);
    this.render();
  }

  get outputSource(): string {
    return this._outputSource;
  }

  get diagnostics(): readonly DocfillyDiagnostic[] {
    return this.diagnosticList;
  }

  get values(): ReadonlyMap<string, string> {
    const values = new Map<string, string>();
    const controls = this.form.elements;

    for (const variable of this.variables) {
      const control = controls.namedItem(variable.name);
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) continue;

      const value = control instanceof HTMLInputElement && control.type === "checkbox"
        ? String(control.checked)
        : control.value;
      values.set(variable.name, value);
    }

    return values;
  }

  render(): string {
    const values = this.values;
    this._outputSource = interpolate(this.template, values);

    if (this.sourceType === "md") {
      try {
        const safeTemplate = interpolate(this.template, values, escapeHtml);
        const html = marked.parse(safeTemplate, { async: false });
        this.output.innerHTML = DOMPurify.sanitize(html);
      } catch {
        this.output.textContent = this._outputSource;
        this.output.classList.add("docfilly__output--fallback");
        if (!this.diagnosticList.some((item) => item.code === "markdown-render-fallback")) {
          this.diagnosticList.push({
            code: "markdown-render-fallback",
            severity: "warning",
            message: "Markdownとして表示できなかったため、内容をプレーンテキストで表示しました。",
          });
        }
      }
    } else {
      this.output.textContent = this._outputSource;
    }

    this.element.dispatchEvent(new CustomEvent("docfilly:render", {
      detail: { outputSource: this._outputSource },
    }));
    return this._outputSource;
  }

  destroy(): void {
    if (this.debounceTimer !== undefined) clearTimeout(this.debounceTimer);
    this.form.removeEventListener("submit", this.preventSubmit);
    this.form.removeEventListener("input", this.scheduleRender);
    this.form.removeEventListener("change", this.scheduleRender);
    this.element.remove();
  }

  private createControl(variable: DocfillyVariable): HTMLDivElement {
    const group = document.createElement("div");
    group.className = `docfilly__field docfilly__field--${variable.type}`;

    const id = nextControlId();
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = variable.label;

    if (variable.type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.name = variable.name;
      input.checked = variable.initialValue;
      group.append(input, label);
      return group;
    }

    if (variable.type === "select") {
      const select = document.createElement("select");
      select.id = id;
      select.name = variable.name;
      for (const option of variable.options) {
        const optionElement = document.createElement("option");
        optionElement.value = option;
        optionElement.textContent = option;
        optionElement.selected = option === variable.initialValue;
        select.append(optionElement);
      }
      group.append(label, select);
      return group;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.name = variable.name;
    input.value = variable.initialValue;
    group.append(label, input);
    return group;
  }

  private readonly preventSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
  };

  private readonly scheduleRender = (): void => {
    if (this.debounceTimer !== undefined) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(), this.debounceMs);
  };
}

export function createDocfilly(
  source: string,
  sourceType: DocfillySourceType,
  options?: DocfillyOptions,
): Docfilly {
  return new Docfilly(source, sourceType, options);
}
