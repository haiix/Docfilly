import DOMPurify from "dompurify";
import { marked } from "marked";
import { createControl } from "./controls";
import { parseDocfillySource } from "./parser";
import { escapeHtml, interpolate } from "./template";
import type {
  DocfillyDiagnostic,
  DocfillyOptions,
  DocfillySourceType,
  DocfillyVariable,
} from "./types";

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
      this.form.append(createControl(variable));
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
