import DOMPurify from "dompurify";
import { marked } from "marked";
import { diagnosticMessage } from "./messages";
import { escapeHtml, type CompiledTemplate } from "./template";
import type { DocfillyDiagnostic, DocfillySourceType, SupportedLocale } from "./types";

export type DocumentRenderPayload =
  { kind: "html"; html: string } | { kind: "text"; text: string; fallback: boolean };

export interface DocumentEvaluationResult {
  outputSource: string;
  payload: DocumentRenderPayload;
  diagnostics: readonly DocfillyDiagnostic[];
}

interface DocumentEvaluationInput {
  compiledTemplate: CompiledTemplate;
  values: ReadonlyMap<string, string>;
  sourceType: DocfillySourceType;
  locale: SupportedLocale;
  parseDiagnostics: readonly DocfillyDiagnostic[];
}

interface DocumentEvaluationDependencies {
  markdownToSafeHtml(source: string): string;
}

const defaultDependencies: DocumentEvaluationDependencies = {
  markdownToSafeHtml: (source) => {
    const html = marked.parse(source, { async: false });
    return DOMPurify.sanitize(html);
  },
};

/** Evaluates a compiled document without reading from or writing to the rendered DOM. */
export function evaluateDocument(
  input: DocumentEvaluationInput,
  dependencies: DocumentEvaluationDependencies = defaultDependencies,
): DocumentEvaluationResult {
  const renderDiagnostics: DocfillyDiagnostic[] = [];
  const outputSource = input.compiledTemplate.render(input.values, undefined, (diagnostic) => {
    renderDiagnostics.push(diagnostic);
  });
  const diagnostics = [...input.parseDiagnostics, ...renderDiagnostics];

  if (input.sourceType === "text") {
    return {
      outputSource,
      payload: { kind: "text", text: outputSource, fallback: false },
      diagnostics,
    };
  }

  try {
    const safeTemplate = input.compiledTemplate.render(input.values, escapeHtml);
    return {
      outputSource,
      payload: { kind: "html", html: dependencies.markdownToSafeHtml(safeTemplate) },
      diagnostics,
    };
  } catch {
    if (!diagnostics.some((diagnostic) => diagnostic.code === "markdown-render-fallback")) {
      diagnostics.push({
        code: "markdown-render-fallback",
        severity: "warning",
        message: diagnosticMessage(input.locale, "markdown-render-fallback", {}),
      });
    }
    return {
      outputSource,
      payload: { kind: "text", text: outputSource, fallback: true },
      diagnostics,
    };
  }
}
