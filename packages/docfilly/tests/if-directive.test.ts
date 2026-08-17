import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocfilly } from "../src";

describe("if directives", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("renders the matching checkbox branch and updates after form changes", () => {
    vi.useFakeTimers();
    const view = createDocfilly(
      [
        "#!docfilly",
        "published = [x]",
        "---",
        "[[#if published]]",
        "公開",
        "[[#else]]",
        "非公開",
        "[[#endif]]",
      ].join("\n"),
      "text",
    );

    expect(view.outputSource).toBe("公開\n");

    const checkbox = view.form.elements.namedItem("published");
    expect(checkbox).toBeInstanceOf(HTMLInputElement);
    if (!(checkbox instanceof HTMLInputElement)) throw new Error("Expected a checkbox");
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    vi.advanceTimersByTime(200);

    expect(view.outputSource).toBe("非公開\n");
    expect(view.output.textContent).toBe("非公開\n");
    expect(view.diagnostics).toEqual([]);
  });

  it("compares text and dropdown values with = and != using exact case", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "environment = [development, *production]",
        "name = Docfilly",
        "---",
        "[[#if environment = production]]",
        "production",
        "[[#endif]]",
        "[[#if environment != development]]",
        "not development",
        "[[#endif]]",
        "[[#if name = docfilly]]",
        "wrong case",
        "[[#endif]]",
      ].join("\n"),
      "text",
    );

    expect(view.outputSource).toBe("production\nnot development\n");
  });

  it("decodes quoted comparison values and supports empty strings", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        'message = "彼は ""はい"" と言った"',
        'environment = [development, *"staging, preview"]',
        "memo =",
        "---",
        '[[#if message = "彼は ""はい"" と言った"]]',
        "quoted",
        "[[#endif]]",
        '[[#if environment = "staging, preview"]]',
        "comma",
        "[[#endif]]",
        '[[#if memo = ""]]',
        "empty",
        "[[#endif]]",
      ].join("\n"),
      "text",
    );

    expect(view.outputSource).toBe("quoted\ncomma\nempty\n");
    expect(view.diagnostics).toEqual([]);
  });

  it("allows surrounding whitespace and nested blocks", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "published = [x]",
        "environment = [*production, development]",
        "---",
        "  [[#if published]]  ",
        "[[#if environment=production]]",
        "公開用の本番手順",
        "[[#endif]]",
        "  [[#endif]]  ",
      ].join("\n"),
      "text",
    );

    expect(view.outputSource).toBe("公開用の本番手順\n");
    expect(view.diagnostics).toEqual([]);
  });

  it("treats inline directives as ordinary text", () => {
    const source = [
      "#!docfilly",
      "published = [x]",
      "---",
      "この文の [[#if published]] 一部だけを表示する",
    ].join("\n");
    const view = createDocfilly(source, "text");

    expect(view.outputSource).toBe("この文の [[#if published]] 一部だけを表示する");
    expect(view.diagnostics).toEqual([]);
  });

  it("escapes placeholders and directives with a backslash", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "name = Alice",
        "published = [x]",
        "---",
        String.raw`\[[name]]`,
        String.raw`\[[#if published]]`,
        "[[name]]",
      ].join("\n"),
      "text",
    );

    expect(view.outputSource).toBe("[[name]]\n[[#if published]]\nAlice");
    expect(view.diagnostics).toEqual([]);
  });

  it("preserves an invalid condition block and reports its source line", () => {
    const block = ["[[#if missing]]", "[[name]]", "[[#endif]]"].join("\n");
    const view = createDocfilly(`#!docfilly\nname = Alice\n---\nbefore\n${block}\nafter`, "text");

    expect(view.outputSource).toBe(`before\n${block}\nafter`);
    expect(view.diagnostics).toMatchObject([
      { code: "undefined-condition-variable", line: 5, source: "[[#if missing]]" },
    ]);
  });

  it("requires bare conditions for checkboxes and comparisons for other inputs", () => {
    const source = [
      "#!docfilly",
      "published = [x]",
      "title = Docfilly",
      "---",
      "[[#if published = true]]",
      "checkbox comparison",
      "[[#endif]]",
      "[[#if title]]",
      "text truthiness",
      "[[#endif]]",
    ].join("\n");
    const view = createDocfilly(source, "text");

    expect(view.outputSource).toBe(source.split("---\n")[1]);
    expect(view.diagnostics.map((item) => item.code)).toEqual([
      "invalid-condition-type",
      "invalid-condition-type",
    ]);
  });

  it.each([
    "[[#if title == Docfilly]]",
    "[[#if title = Doc filly]]",
    "[[#if title = unquoted,value]]",
    '[[#if title = "unclosed]]',
  ])("preserves an unsupported condition: %s", (directive) => {
    const block = `${directive}\ncontent\n[[#endif]]`;
    const view = createDocfilly(`#!docfilly\ntitle = Docfilly\n---\n${block}`, "text");

    expect(view.outputSource).toBe(block);
    expect(view.diagnostics).toMatchObject([{ code: "invalid-if-condition", line: 4 }]);
  });

  it("preserves unmatched and duplicate structural directives", () => {
    const duplicateBlock = [
      "[[#if published]]",
      "first",
      "[[#else]]",
      "second",
      "[[#else]]",
      "third",
      "[[#endif]]",
    ].join("\n");
    const view = createDocfilly(
      `#!docfilly\npublished = [x]\n---\n[[#endif]]\n${duplicateBlock}`,
      "text",
    );

    expect(view.outputSource).toBe(`[[#endif]]\n${duplicateBlock}`);
    expect(view.diagnostics.map((item) => item.code)).toEqual([
      "unexpected-directive",
      "duplicate-else",
    ]);
  });

  it("preserves an unclosed block", () => {
    const block = "[[#if published]]\nimportant";
    const view = createDocfilly(`#!docfilly\npublished = [x]\n---\n${block}`, "text");

    expect(view.outputSource).toBe(block);
    expect(view.diagnostics).toMatchObject([{ code: "unclosed-if", line: 4 }]);
  });

  it("accepts 32 levels and preserves the 33rd level", () => {
    const openings = Array.from({ length: 33 }, () => "[[#if published]]");
    const closings = Array.from({ length: 33 }, () => "[[#endif]]");
    const template = [...openings, "content", ...closings].join("\n");
    const view = createDocfilly(`#!docfilly\npublished = [x]\n---\n${template}`, "text");

    expect(view.outputSource).toContain("[[#if published]]\ncontent\n[[#endif]]");
    expect(view.diagnostics).toMatchObject([{ code: "if-nesting-too-deep", line: 36 }]);
  });

  it("does not reinterpret inserted values as directives", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        'value = "[[#endif]]"',
        "published = [x]",
        "---",
        "[[#if published]]",
        "[[value]]",
        "[[#endif]]",
      ].join("\n"),
      "text",
    );

    expect(view.outputSource).toBe("[[#endif]]\n");
    expect(view.diagnostics).toEqual([]);
  });

  it("keeps conditional markdown values inside the existing safety boundary", () => {
    const view = createDocfilly(
      [
        "#!docfilly",
        "published = [x]",
        "value = <img src=x onerror=alert(1)>",
        "---",
        "[[#if published]]",
        "[[value]]",
        "[[#endif]]",
      ].join("\n"),
      "md",
    );

    expect(view.output.querySelector("img")).toBeNull();
    expect(view.output.textContent?.trim()).toBe("<img src=x onerror=alert(1)>");
  });

  it("does not interpret directives without the Docfilly identifier", () => {
    const source = "[[#if published]]\nordinary\n[[#endif]]";
    const view = createDocfilly(source, "text");

    expect(view.outputSource).toBe(source);
    expect(view.diagnostics).toEqual([]);
  });
});
