import { describe, expect, it } from "vitest";
import { parseDocfillySource, updateDocfillyDefaults } from "../src";

describe("updateDocfillyDefaults", () => {
  it("updates text, dropdown, and checkbox defaults while preserving the document", () => {
    const source = [
      "#!docfilly",
      "# keep this comment",
      "project | プロジェクト名 = Before",
      "environment | 実行環境 = [development, *staging, production]",
      "enabled | 有効 = [ ]",
      "---",
      "# [[project]]",
      "[[#if enabled]]",
      "Enabled in [[environment]]",
      "[[#endif]]",
    ].join("\n");

    const result = updateDocfillyDefaults(
      source,
      new Map([
        ["project", "更新後"],
        ["environment", "production"],
        ["enabled", "true"],
      ]),
    );

    expect(result.isDocfilly).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.source).toBe(
      [
        "#!docfilly",
        "# keep this comment",
        "project | プロジェクト名 = 更新後",
        "environment | 実行環境 = [development, staging, *production]",
        "enabled | 有効 = [x]",
        "---",
        "# [[project]]",
        "[[#if enabled]]",
        "Enabled in [[environment]]",
        "[[#endif]]",
      ].join("\n"),
    );

    expect(parseDocfillySource(result.source).variables).toMatchObject([
      { type: "text", name: "project", initialValue: "更新後" },
      { type: "select", name: "environment", initialValue: "production" },
      { type: "checkbox", name: "enabled", initialValue: true },
    ]);
  });

  it.each([
    ['彼は "はい" と言った', '"彼は ""はい"" と言った"'],
    ["  前後に空白  ", '"  前後に空白  "'],
    ["[x]", '"[x]"'],
    ["[one, two]", '"[one, two]"'],
    ["", ""],
    ["日本語, equals=kept", "日本語, equals=kept"],
  ])("safely encodes the text default %j", (value, encoded) => {
    const result = updateDocfillyDefaults(
      "#!docfilly\nvalue | ラベル = before\n---\n[[value]]",
      new Map([["value", value]]),
    );

    expect(result.source).toBe(`#!docfilly\nvalue | ラベル = ${encoded}\n---\n[[value]]`);
    expect(parseDocfillySource(result.source).variables[0]).toMatchObject({
      type: "text",
      initialValue: value,
    });
  });

  it("preserves dropdown option values and order when moving the selection", () => {
    const source = [
      "#!docfilly",
      'region = [*"東京, 日本", "大阪, ""中央""", "*通常値"]',
      "---",
      "[[region]]",
    ].join("\n");

    const result = updateDocfillyDefaults(source, new Map([["region", '大阪, "中央"']]));
    const variable = parseDocfillySource(result.source).variables[0];

    expect(variable).toEqual({
      type: "select",
      name: "region",
      label: "region",
      options: ["東京, 日本", '大阪, "中央"', "*通常値"],
      initialValue: '大阪, "中央"',
    });
  });

  it("leaves unspecified, unknown, invalid, and duplicate definitions untouched", () => {
    const source = [
      "#!docfilly",
      "first = before",
      "broken row",
      "first = duplicate",
      "second = unchanged",
      "---",
      "[[first]] [[second]]",
    ].join("\n");

    const result = updateDocfillyDefaults(
      source,
      new Map([
        ["first", "after"],
        ["unknown", "ignored"],
      ]),
    );

    expect(result.source).toBe(source.replace("first = before", "first = after"));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "missing-equals",
      "duplicate-variable",
    ]);
  });

  it("does not reconstruct a definition whose invalid fragments were ignored", () => {
    const source = "#!docfilly\nchoice = [one, , *two]\n---\n[[choice]]";

    const result = updateDocfillyDefaults(source, new Map([["choice", "one"]]));

    expect(result.source).toBe(source);
    expect(result.diagnostics).toMatchObject([{ code: "invalid-dropdown", line: 2 }]);
  });

  it.each([
    ["choice", "missing"],
    ["enabled", "yes"],
    ["text", "two\nlines"],
  ])("keeps %s unchanged when its value cannot be serialized", (name, value) => {
    const source = [
      "#!docfilly",
      "choice = [*one, two]",
      "enabled = [x]",
      "text = one line",
      "---",
      "body",
    ].join("\n");

    const result = updateDocfillyDefaults(source, new Map([[name, value]]));

    expect(result.source).toBe(source);
    expect(result.diagnostics).toMatchObject([{ code: "invalid-default-value" }]);
  });

  it("returns an ordinary document unchanged", () => {
    const source = "# Markdown\n\nname = value\n---\n[[name]]";

    expect(updateDocfillyDefaults(source, new Map([["name", "updated"]]))).toEqual({
      source,
      isDocfilly: false,
      diagnostics: [],
    });
  });

  it.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
  ])("preserves a BOM, %s line endings, and trailing newline", (_label, newline) => {
    const source = `\uFEFF#!docfilly${newline}name = before${newline}---${newline}[[name]]${newline}`;
    const result = updateDocfillyDefaults(source, new Map([["name", "後"]]));

    expect(result.source).toBe(
      `\uFEFF#!docfilly${newline}name = 後${newline}---${newline}[[name]]${newline}`,
    );
  });

  it("preserves whitespace around a replaced value without duplicating an empty value's space", () => {
    const source = "#!docfilly\n  name | Name =    \n---\n[[name]]";

    const result = updateDocfillyDefaults(source, new Map([["name", "updated"]]));

    expect(result.source).toBe("#!docfilly\n  name | Name =    updated\n---\n[[name]]");
  });
});
