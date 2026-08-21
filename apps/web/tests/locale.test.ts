import { describe, expect, it } from "vitest";
import { resolveWebLocale, webMessages } from "../src/locale";
import englishSample from "../src/samples/en.md?raw";
import japaneseSample from "../src/samples/ja.md?raw";

describe("web locale resources", () => {
  it("resolves the first supported navigator language and falls back to English", () => {
    expect(resolveWebLocale(["fr-FR", "ja-JP"], "en-US")).toBe("ja");
    expect(resolveWebLocale([], "en-US")).toBe("en");
    expect(resolveWebLocale(["fr-FR"], "de-DE")).toBe("en");
    expect(resolveWebLocale([], undefined)).toBe("en");
  });

  it("keeps interpolation functions available in both typed catalogs", () => {
    expect(webMessages.en.diagnostics(2)).toContain("2");
    expect(webMessages.ja.diagnostics(2)).toContain("2");
    expect(webMessages.en.renderedExportStarted("guide.md")).toContain("guide.md");
    expect(webMessages.ja.renderedExportStarted("guide.md")).toContain("guide.md");
  });

  it("keeps the conditional tutorial source aligned with its rendered steps", () => {
    expect(japaneseSample).toContain(`\\[[#if team_work]]
### チームで作業する場合

1. 作業ブランチを作成します。
2. 変更後にレビューを依頼します。`);
    expect(englishSample).toContain(`\\[[#if team_work]]
### Team workflow

1. Create a working branch.
2. Request a review after making your changes.`);
  });
});
