import { describe, expect, it } from "vitest";
import { parseDocfillySource } from "../src";

describe("parseDocfillySource", () => {
  it("parses text, dropdown, and checkbox definitions", () => {
    const parsed = parseDocfillySource(
      [
        "#!docfilly",
        "# comment",
        "project | プロジェクト名 = Docfilly",
        "environment | 実行環境 = [development, *staging, production]",
        "enabled | 有効 = [x]",
        "---",
        "# [[project]]",
      ].join("\n"),
    );

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
    expect(parsed.templateLineOffset).toBe(6);
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
    const parsed = parseDocfillySource(
      "  #!DOCFILLY  \nタイトル = はじめての文書\n  ---  \n# [[タイトル]]",
    );

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
    expect(parsed.templateLineOffset).toBe(0);
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
    const parsed = parseDocfillySource(
      [
        "#!docfilly",
        "name = Alice",
        "この行にはイコールがありません",
        "invalid-name = ignored",
        "name = Bob",
        "---",
        "Hello [[name]]",
      ].join("\n"),
    );

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
