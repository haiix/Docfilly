import { describe, expect, it, vi } from "vitest";
import { parseTemplate } from "../src/template-parser";
import { renderTemplate } from "../src/template-renderer";
import { tokenizeTemplate } from "../src/template-tokenizer";
import type { DocfillyVariable } from "../src/types";

const published: DocfillyVariable = {
  type: "checkbox",
  name: "published",
  label: "published",
  initialValue: true,
};

describe("template pipeline", () => {
  it("tokenizes LF and CRLF lines without changing their source ranges", () => {
    const template = "first\r\n  [[#if published]]  \r\nlast\n";

    const tokens = tokenizeTemplate(template);

    expect(
      tokens.map(({ raw, line, start, end, directive }) => ({
        raw,
        line,
        start,
        end,
        directive,
      })),
    ).toEqual([
      { raw: "first\r\n", line: 1, start: 0, end: 7, directive: undefined },
      {
        raw: "  [[#if published]]  \r\n",
        line: 2,
        start: 7,
        end: 30,
        directive: { type: "if", expression: "published" },
      },
      { raw: "last\n", line: 3, start: 30, end: 35, directive: undefined },
    ]);
    expect(tokens.map((token) => token.raw).join("")).toBe(template);
  });

  it("keeps an invalid parsed block raw and preserves localized diagnostic context", () => {
    const template = "before\n[[#if missing]]\n[[name]]\n[[#endif]]\nafter";

    const parsed = parseTemplate(template, tokenizeTemplate(template), [published], 10, "ja");

    expect(parsed.nodes).toEqual([
      { type: "text", value: "before\n", line: 1 },
      { type: "raw", value: "[[#if missing]]\n[[name]]\n[[#endif]]\n" },
      { type: "text", value: "after", line: 5 },
    ]);
    expect(parsed.diagnostics).toMatchObject([
      {
        code: "undefined-condition-variable",
        line: 12,
        source: "[[#if missing]]",
      },
    ]);
    expect(parsed.diagnostics[0]?.message).toContain("12行目");
  });

  it("renders only the selected branch and delegates placeholder diagnostics", () => {
    const template = [
      "[[#if published]]",
      "[[name|upper]] / [[missing]]",
      "[[#else]]",
      "draft",
      "[[#endif]]",
    ].join("\n");
    const parsed = parseTemplate(template, tokenizeTemplate(template), [published], 4, "en");
    const reportDiagnostic = vi.fn();

    const output = renderTemplate(
      parsed.nodes,
      new Map([
        ["published", "true"],
        ["name", "Alice"],
      ]),
      (value) => `<${value}>`,
      reportDiagnostic,
      4,
      "en",
    );

    expect(output).toBe("<ALICE> / [[missing]]\n");
    expect(reportDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ code: "undefined-variable", line: 6, source: "[[missing]]" }),
    );
  });
});
