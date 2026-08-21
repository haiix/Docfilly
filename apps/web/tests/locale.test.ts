import { describe, expect, it } from "vitest";
import { resolveWebLocale, webMessages } from "../src/locale";

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
});
