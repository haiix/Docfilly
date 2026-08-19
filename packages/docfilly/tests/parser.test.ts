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

  it("recognizes description rows without exposing them as variables or diagnostics", () => {
    const parsed = parseDocfillySource(
      [
        "#!docfilly",
        "  > 説明文 = 設定行ではありません。  ",
        ">  先頭の空白は1文字だけ除去します。",
        "> <strong>プレーンテキスト</strong>",
        "name = Alice",
        "---",
        "Hello [[name]]",
      ].join("\n"),
    );

    expect(parsed.variables).toEqual([
      { type: "text", name: "name", label: "name", initialValue: "Alice" },
    ]);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("uses the variable name when the label is omitted", () => {
    const parsed = parseDocfillySource("#!docfilly\nauthor = 山田太郎\n---\n[[author]]");

    expect(parsed.variables[0]).toMatchObject({ name: "author", label: "author" });
  });

  it("decodes quoted labels and text values", () => {
    const parsed = parseDocfillySource(
      [
        "#!docfilly",
        'message | "表示文 | 補足 = 詳細" = "彼は ""はい"" と言った, 本当です"',
        'spacing | " 前後に空白 " = "  value  "',
        "---",
        "[[message]]",
      ].join("\n"),
    );

    expect(parsed.variables).toEqual([
      {
        type: "text",
        name: "message",
        label: "表示文 | 補足 = 詳細",
        initialValue: '彼は "はい" と言った, 本当です',
      },
      {
        type: "text",
        name: "spacing",
        label: " 前後に空白 ",
        initialValue: "  value  ",
      },
    ]);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("treats quoted input type syntax as text", () => {
    const parsed = parseDocfillySource(
      '#!docfilly\ncheckbox = "[x]"\nlist = "[one, two]"\n---\n[[checkbox]]',
    );

    expect(parsed.variables).toMatchObject([
      { type: "text", name: "checkbox", initialValue: "[x]" },
      { type: "text", name: "list", initialValue: "[one, two]" },
    ]);
  });

  it("decodes quoted dropdown choices and distinguishes the selection marker", () => {
    const parsed = parseDocfillySource(
      [
        "#!docfilly",
        'region = ["東京, 日本", *"大阪, ""中央""", "*通常値"]',
        "---",
        "[[region]]",
      ].join("\n"),
    );

    expect(parsed.variables[0]).toEqual({
      type: "select",
      name: "region",
      label: "region",
      options: ["東京, 日本", '大阪, "中央"', "*通常値"],
      initialValue: '大阪, "中央"',
    });
    expect(parsed.diagnostics).toEqual([]);
  });

  it.each([
    ["[x]", true],
    ["[X]", true],
    ["[ ]", false],
  ])("parses %s as a checkbox with initialValue %s", (value, initialValue) => {
    const parsed = parseDocfillySource(`#!docfilly\nenabled = ${value}\n---\n[[enabled]]`);

    expect(parsed.variables[0]).toMatchObject({ type: "checkbox", initialValue });
  });

  it.each(["[True]", "[False]"])("treats %s as a dropdown rather than a checkbox", (value) => {
    const parsed = parseDocfillySource(`#!docfilly\nenabled = ${value}\n---\n[[enabled]]`);

    expect(parsed.variables[0]).toMatchObject({
      type: "select",
      options: [value.slice(1, -1)],
      initialValue: value.slice(1, -1),
    });
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

  it.each([
    ["without blank lines", "#!docfilly\nname = Alice\n---\nHello", "Hello"],
    ["with blank lines", "#!docfilly\nname = Alice\n\n---\n\nHello", "\nHello"],
  ])("parses a delimiter %s without diagnostics", (_label, source, expectedTemplate) => {
    const parsed = parseDocfillySource(source);

    expect(parsed.variables[0]).toMatchObject({ name: "name", initialValue: "Alice" });
    expect(parsed.template).toBe(expectedTemplate);
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

  it("keeps comments hidden and reports non-description rows without equals", () => {
    const parsed = parseDocfillySource(
      "#!docfilly\n# author comment\n> reader description\nbroken row\n---\nBody",
    );

    expect(parsed.variables).toEqual([]);
    expect(parsed.diagnostics).toMatchObject([
      { code: "missing-equals", line: 4, source: "broken row" },
    ]);
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

  it.each([
    ['value = "unclosed', 2],
    ['value = "closed" trailing', 2],
    ['value = unquoted "quote"', 2],
    ['value = [valid, "unclosed]', 2],
    ['"quoted-name" = value', 2],
  ])("skips invalid quoting and continues parsing: %s", (invalidRow, expectedLine) => {
    const parsed = parseDocfillySource(
      ["#!docfilly", invalidRow, "valid = accepted", "---", "[[valid]]"].join("\n"),
    );

    expect(parsed.variables).toEqual([
      { type: "text", name: "valid", label: "valid", initialValue: "accepted" },
    ]);
    expect(parsed.diagnostics).toMatchObject([
      { code: "invalid-quoting", line: expectedLine, source: invalidRow },
    ]);
  });

  it("reports invalid if blocks without creating a DOM view", () => {
    const parsed = parseDocfillySource(
      "#!docfilly\npublished = [x]\n---\n[[#if missing]]\ncontent\n[[#endif]]",
    );

    expect(parsed.diagnostics).toMatchObject([
      { code: "undefined-condition-variable", line: 4, source: "[[#if missing]]" },
    ]);
  });
});
