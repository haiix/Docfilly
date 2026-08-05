import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocfilly, parseDocfillySource } from "./index";

describe("parseDocfillySource", () => {
  it("parses text, dropdown, and checkbox definitions", () => {
    const parsed = parseDocfillySource([
      "#!docfilly",
      "# comment",
      "project | プロジェクト名 = Docfilly",
      "environment | 実行環境 = [development, *staging, production]",
      "enabled | 有効 = [x]",
      "---",
      "# [[project]]",
    ].join("\n"));

    expect(parsed.variables).toEqual([
      {
        type: "text",
        name: "project",
        label: "プロジェクト名",
        initialValue: "Docfilly",
      },
      {
        type: "select",
        name: "environment",
        label: "実行環境",
        options: ["development", "staging", "production"],
        initialValue: "staging",
      },
      {
        type: "checkbox",
        name: "enabled",
        label: "有効",
        initialValue: true,
      },
    ]);
    expect(parsed.isDocfilly).toBe(true);
    expect(parsed.template).toBe("# [[project]]");
    expect(parsed.diagnostics).toEqual([]);
  });

  it("supports CRLF and strips a UTF-8 BOM", () => {
    const parsed = parseDocfillySource("\uFEFF#!docfilly\r\nname = Alice\r\n---\r\nHello [[name]]");

    expect(parsed.variables[0]).toMatchObject({ name: "name", initialValue: "Alice" });
    expect(parsed.template).toBe("Hello [[name]]");
  });

  it("uses the variable name when the label is omitted", () => {
    const parsed = parseDocfillySource("#!docfilly\nauthor = 山田太郎\n---\n[[author]]");

    expect(parsed.variables[0]).toMatchObject({ name: "author", label: "author" });
  });

  it("treats uppercase X as an unchecked checkbox", () => {
    const parsed = parseDocfillySource("#!docfilly\nenabled = [X]\n---\n[[enabled]]");

    expect(parsed.variables[0]).toMatchObject({ type: "checkbox", initialValue: false });
  });

  it("accepts Japanese variable names and a delimiter with surrounding spaces", () => {
    const parsed = parseDocfillySource("  #!DOCFILLY  \nタイトル = はじめての文書\n  ---  \n# [[タイトル]]");

    expect(parsed.variables[0]).toMatchObject({ name: "タイトル", initialValue: "はじめての文書" });
    expect(parsed.isDocfilly).toBe(true);
    expect(parsed.template).toBe("# [[タイトル]]");
    expect(parsed.diagnostics).toEqual([]);
  });

  it("treats a source without the identifier as an ordinary document", () => {
    const source = "# 普通のMarkdown\n\n区切りがなくても表示します。";
    const parsed = parseDocfillySource(source);

    expect(parsed.isDocfilly).toBe(false);
    expect(parsed.variables).toEqual([]);
    expect(parsed.template).toBe(source);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("does not interpret definitions when the identifier is absent", () => {
    const source = "name = Alice\n---\nHello [[name]]";
    const parsed = parseDocfillySource(source);

    expect(parsed.isDocfilly).toBe(false);
    expect(parsed.variables).toEqual([]);
    expect(parsed.template).toBe(source);
  });

  it("shows content after the identifier when a Docfilly delimiter is missing", () => {
    const parsed = parseDocfillySource("#!docfilly\n# 本文として表示\nHello");

    expect(parsed.isDocfilly).toBe(true);
    expect(parsed.variables).toEqual([]);
    expect(parsed.template).toBe("# 本文として表示\nHello");
    expect(parsed.diagnostics).toMatchObject([{ code: "missing-delimiter" }]);
  });

  it("skips malformed definitions and continues parsing", () => {
    const parsed = parseDocfillySource([
      "#!docfilly",
      "name = Alice",
      "この行にはイコールがありません",
      "invalid-name = ignored",
      "name = Bob",
      "---",
      "Hello [[name]]",
    ].join("\n"));

    expect(parsed.variables).toHaveLength(1);
    expect(parsed.variables[0]).toMatchObject({ name: "name", initialValue: "Alice" });
    expect(parsed.diagnostics.map((item) => item.code)).toEqual([
      "missing-equals",
      "invalid-variable-name",
      "duplicate-variable",
    ]);
    expect(parsed.diagnostics.map((item) => item.line)).toEqual([3, 4, 5]);
  });

  it("ignores empty dropdown choices when valid choices remain", () => {
    const parsed = parseDocfillySource("#!docfilly\nchoice = [one, , *two]\n---\n[[choice]]");

    expect(parsed.variables[0]).toMatchObject({
      type: "select",
      options: ["one", "two"],
      initialValue: "two",
    });
    expect(parsed.diagnostics).toMatchObject([{ code: "invalid-dropdown" }]);
  });

  it("falls back to a text field for a dropdown without valid choices", () => {
    const parsed = parseDocfillySource("#!docfilly\nchoice = []\n---\n[[choice]]");

    expect(parsed.variables[0]).toMatchObject({ type: "text", initialValue: "[]" });
    expect(parsed.diagnostics).toMatchObject([{ code: "invalid-dropdown" }]);
  });
});

describe("Docfilly", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("creates a form and renders markdown with initial values", () => {
    const view = createDocfilly([
      "#!docfilly",
      "title | タイトル = Docfilly",
      "environment = [dev, *prod]",
      "enabled = [x]",
      "---",
      "# [[title]]",
      "Environment: **[[environment]]** / Enabled: [[enabled]]",
    ].join("\n"), "md");

    document.body.append(view.element);

    expect(view.isDocfilly).toBe(true);
    expect(view.form.elements.namedItem("title")).toBeInstanceOf(HTMLInputElement);
    expect(view.form.elements.namedItem("environment")).toBeInstanceOf(HTMLSelectElement);
    expect(view.outputSource).toContain("# Docfilly");
    expect(view.output.innerHTML).toContain("<h1>Docfilly</h1>");
    expect(view.output.innerHTML).toContain("<strong>prod</strong>");
    expect(view.values).toEqual(new Map([
      ["title", "Docfilly"],
      ["environment", "prod"],
      ["enabled", "true"],
    ]));
  });

  it("updates output after a form input changes", () => {
    vi.useFakeTimers();
    const view = createDocfilly("#!docfilly\nname = before\n---\nHello [[name]]", "text");
    const input = view.form.elements.namedItem("name");

    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) throw new Error("Expected a text input");
    input.value = "after";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(200);

    expect(view.outputSource).toBe("Hello after");
    expect(view.output.textContent).toBe("Hello after");
  });

  it("leaves undefined placeholders unchanged", () => {
    const view = createDocfilly("#!docfilly\nname = Alice\n---\n[[name]] / [[missing]]", "text");

    expect(view.outputSource).toBe("Alice / [[missing]]");
  });

  it("shows an ordinary document without a form when definitions are absent", () => {
    const view = createDocfilly("# 通常の文書", "md");

    expect(view.output.innerHTML).toContain("<h1>通常の文書</h1>");
    expect(view.isDocfilly).toBe(false);
    expect(view.form.hidden).toBe(true);
    expect(view.element.classList.contains("docfilly--without-form")).toBe(true);
    expect(view.diagnostics).toEqual([]);
  });

  it("escapes variable HTML and sanitizes markdown HTML", () => {
    const view = createDocfilly([
      "#!docfilly",
      "value = <img src=x onerror=alert(1)>",
      "---",
      "[[value]]",
      "<script>alert(1)</script>",
    ].join("\n"), "md");

    expect(view.output.querySelector("img")).toBeNull();
    expect(view.output.innerHTML).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(view.output.innerHTML).not.toContain("<script");
    expect(view.output.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("emits a render event and removes its element when destroyed", () => {
    const view = createDocfilly("#!docfilly\nname = Alice\n---\n[[name]]", "text");
    const listener = vi.fn();
    view.element.addEventListener("docfilly:render", listener);
    document.body.append(view.element);

    view.render();
    expect(listener).toHaveBeenCalledOnce();

    view.destroy();
    expect(document.body.contains(view.element)).toBe(false);
  });
});
