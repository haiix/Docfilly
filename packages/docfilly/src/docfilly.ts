import { createControl } from "./controls";
import { evaluateDocument } from "./document-evaluation";
import { resolveLocale } from "./messages";
import { parseDocfillyDocument } from "./parser";
import type { CompiledTemplate } from "./template";
import type {
  DocfillyDiagnostic,
  DocfillyOptions,
  DocfillySourceType,
  DocfillyVariable,
  SupportedLocale,
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
  private readonly locale: SupportedLocale;
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
    this.locale = resolveLocale(options.locale);
    const parsed = parseDocfillyDocument(source, { locale: this.locale });
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

    for (const item of parsed.formItems) {
      if (item.kind === "description") {
        const description = document.createElement("p");
        description.className = "docfilly__description";
        description.textContent = item.text;
        this.form.append(description);
        continue;
      }

      const { variable } = item;
      this.form.append(createControl(variable, options.initialValues?.get(variable.name)));
    }
    if (parsed.formItems.length === 0) {
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
    const result = evaluateDocument({
      compiledTemplate: this.compiledTemplate,
      values: this.values,
      sourceType: this.sourceType,
      locale: this.locale,
      parseDiagnostics: this.parseDiagnostics,
    });
    this._outputSource = result.outputSource;
    this.diagnosticList.splice(0, this.diagnosticList.length, ...result.diagnostics);

    if (result.payload.kind === "html") {
      this.output.innerHTML = result.payload.html;
      this.output.classList.remove("docfilly__output--fallback");
    } else {
      this.output.textContent = result.payload.text;
      this.output.classList.toggle("docfilly__output--fallback", result.payload.fallback);
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
