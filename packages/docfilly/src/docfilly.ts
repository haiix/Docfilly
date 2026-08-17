import DOMPurify from "dompurify";
import { marked } from "marked";
import { createControl } from "./controls";
import { parseDocfillyDocument } from "./parser";
import { escapeHtml, type CompiledTemplate } from "./template";
import type {
  DocfillyDiagnostic,
  DocfillyOptions,
  DocfillySourceType,
  DocfillyVariable,
} from "./types";

/**
 * Renders an interactive form and document preview from Docfilly source.
 */
export class Docfilly {
  readonly element: HTMLDivElement;
  readonly form: HTMLFormElement;
  readonly output: HTMLDivElement;
  readonly isDocfilly: boolean;
  readonly variables: readonly DocfillyVariable[];
  readonly sourceType: DocfillySourceType;

  private readonly compiledTemplate: CompiledTemplate;
  private readonly debounceMs: number;
  private readonly parseDiagnostics: readonly DocfillyDiagnostic[];
  private readonly diagnosticList: DocfillyDiagnostic[];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private _outputSource = "";

  /**
   * Creates a Docfilly document view.
   *
   * @param source - The complete document source.
   * @param sourceType - The source format used for rendering.
   * @param options - Optional rendering behavior.
   */
  constructor(source: string, sourceType: DocfillySourceType, options: DocfillyOptions = {}) {
    const parsed = parseDocfillyDocument(source);
    this.isDocfilly = parsed.isDocfilly;
    this.variables = parsed.variables;
    this.compiledTemplate = parsed.compiledTemplate;
    this.parseDiagnostics = parsed.diagnostics;
    this.diagnosticList = [...this.parseDiagnostics];
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

  /**
   * Gets the most recently interpolated source.
   *
   * @returns The current rendered source text.
   */
  get outputSource(): string {
    return this._outputSource;
  }

  /**
   * Gets the diagnostics from parsing and the latest render.
   *
   * @returns The current diagnostics.
   */
  get diagnostics(): readonly DocfillyDiagnostic[] {
    return this.diagnosticList;
  }

  /**
   * Gets the current form values keyed by variable name.
   *
   * @returns A read-only map of serialized control values.
   */
  get values(): ReadonlyMap<string, string> {
    const values = new Map<string, string>();
    const controls = this.form.elements;

    for (const variable of this.variables) {
      const control = controls.namedItem(variable.name);
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) continue;

      const value =
        control instanceof HTMLInputElement && control.type === "checkbox"
          ? String(control.checked)
          : control.value;
      values.set(variable.name, value);
    }

    return values;
  }

  /**
   * Interpolates the template and refreshes the rendered output.
   *
   * @returns The interpolated source text.
   */
  render(): string {
    const values = this.values;
    this.diagnosticList.splice(0, this.diagnosticList.length, ...this.parseDiagnostics);
    this._outputSource = this.compiledTemplate.render(values, undefined, (diagnostic) => {
      this.diagnosticList.push(diagnostic);
    });

    if (this.sourceType === "md") {
      try {
        const safeTemplate = this.compiledTemplate.render(values, escapeHtml);
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

    this.element.dispatchEvent(
      new CustomEvent("docfilly:render", {
        detail: { outputSource: this._outputSource },
      }),
    );
    return this._outputSource;
  }

  /**
   * Removes event listeners, cancels pending work, and detaches the view.
   */
  destroy(): void {
    if (this.debounceTimer !== undefined) clearTimeout(this.debounceTimer);
    this.form.removeEventListener("submit", this.preventSubmit);
    this.form.removeEventListener("input", this.scheduleRender);
    this.form.removeEventListener("change", this.scheduleRender);
    this.element.remove();
  }

  /**
   * Prevents the generated form from navigating on submission.
   *
   * @param event - The form submission event.
   */
  private readonly preventSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
  };

  /**
   * Schedules a debounced render after a form value changes.
   */
  private readonly scheduleRender = (): void => {
    if (this.debounceTimer !== undefined) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(), this.debounceMs);
  };
}

/**
 * Creates an interactive Docfilly document view.
 *
 * @param source - The complete document source.
 * @param sourceType - The source format used for rendering.
 * @param options - Optional rendering behavior.
 * @returns The initialized Docfilly instance.
 */
export function createDocfilly(
  source: string,
  sourceType: DocfillySourceType,
  options?: DocfillyOptions,
): Docfilly {
  return new Docfilly(source, sourceType, options);
}
