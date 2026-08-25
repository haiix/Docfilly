import { describe, expect, it } from "vitest";
import { evaluateDocument } from "../src/document-evaluation";
import { compileTemplate } from "../src/template";
import type { DocfillyDiagnostic, DocfillyVariable } from "../src/types";

const nameVariable: DocfillyVariable = {
  type: "text",
  name: "name",
  label: "name",
  initialValue: "Alice",
};

describe("evaluateDocument", () => {
  it("evaluates text without accessing a rendered DOM target", () => {
    const result = evaluateDocument({
      compiledTemplate: compileTemplate("Hello [[name]]", [nameVariable]),
      values: new Map([["name", "Bob"]]),
      sourceType: "text",
      locale: "en",
      parseDiagnostics: [],
    });

    expect(result).toEqual({
      outputSource: "Hello Bob",
      payload: { kind: "text", text: "Hello Bob", fallback: false },
      diagnostics: [],
    });
  });

  it("escapes interpolated values and sanitizes the Markdown payload", () => {
    const result = evaluateDocument({
      compiledTemplate: compileTemplate("[[name]]\n<script>alert(1)</script>", [nameVariable]),
      values: new Map([["name", "<img src=x onerror=alert(1)>"]]),
      sourceType: "md",
      locale: "en",
      parseDiagnostics: [],
    });

    expect(result.outputSource).toContain("<img src=x onerror=alert(1)>");
    expect(result.payload.kind).toBe("html");
    if (result.payload.kind !== "html") throw new Error("Expected an HTML payload");
    expect(result.payload.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(result.payload.html).not.toContain("<img");
    expect(result.payload.html).not.toContain("<script");
  });

  it("combines parse and current render diagnostics without accumulating them", () => {
    const parseDiagnostic: DocfillyDiagnostic = {
      code: "missing-equals",
      severity: "warning",
      message: "parse warning",
      line: 2,
    };
    const input = {
      compiledTemplate: compileTemplate("[[missing]]", [nameVariable]),
      values: new Map([["name", "Alice"]]),
      sourceType: "text" as const,
      locale: "en" as const,
      parseDiagnostics: [parseDiagnostic],
    };

    const first = evaluateDocument(input);
    const second = evaluateDocument(input);

    expect(first.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "missing-equals",
      "undefined-variable",
    ]);
    expect(second.diagnostics).toEqual(first.diagnostics);
  });

  it("falls back to output source when Markdown conversion fails", () => {
    const result = evaluateDocument(
      {
        compiledTemplate: compileTemplate("Hello [[name]]", [nameVariable]),
        values: new Map([["name", "Alice"]]),
        sourceType: "md",
        locale: "ja",
        parseDiagnostics: [],
      },
      {
        markdownToSafeHtml: () => {
          throw new Error("conversion failed");
        },
      },
    );

    expect(result.outputSource).toBe("Hello Alice");
    expect(result.payload).toEqual({ kind: "text", text: "Hello Alice", fallback: true });
    expect(result.diagnostics).toMatchObject([{ code: "markdown-render-fallback" }]);
    expect(result.diagnostics[0]?.message).toContain("Markdown");
  });
});
