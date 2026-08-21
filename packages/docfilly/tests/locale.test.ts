import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocfilly, parseDocfillySource, resolveLocale, updateDocfillyDefaults } from "../src";
import {
  diagnosticMessage,
  type DiagnosticMessageKey,
  type DiagnosticMessageParams,
} from "../src/messages";

const messageParams = {
  "missing-delimiter": {},
  "invalid-quoting": { line: 2 },
  "missing-equals": { line: 2 },
  "invalid-variable-name": { line: 2, name: "bad-name" },
  "invalid-dropdown-empty-options": { line: 2 },
  "invalid-dropdown-no-options": { line: 2 },
  "duplicate-variable": { line: 3, name: "region" },
  "invalid-placeholder": { line: 4, placeholder: "[[bad-name]]" },
  "undefined-variable": { line: 4, placeholder: "[[missing]]", name: "missing" },
  "unknown-filter": { line: 4, placeholder: "[[region | mystery]]", filter: "mystery" },
  "invalid-if-condition": { line: 4 },
  "undefined-condition-variable": { line: 4, name: "missing" },
  "condition-requires-comparison": { line: 4, name: "region" },
  "checkbox-condition-requires-name": { line: 4, name: "enabled" },
  "invalid-condition-value": { line: 4 },
  "unexpected-directive": { line: 4, directive: "#else" },
  "if-nesting-too-deep": { line: 36, depth: 32 },
  "duplicate-else": { line: 6 },
  "unclosed-if": { line: 4 },
  "invalid-select-default": { line: 2, name: "region", value: "unknown" },
  "invalid-checkbox-default": { line: 2, name: "enabled", value: "perhaps" },
  "invalid-text-default": { line: 2, name: "title", value: "one\ntwo" },
  "markdown-render-fallback": {},
} satisfies DiagnosticMessageParams;

describe("diagnostic locales", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps both locale catalogs complete and preserves interpolated source values", () => {
    for (const key of Object.keys(messageParams) as DiagnosticMessageKey[]) {
      const params = messageParams[key] as never;
      const english = diagnosticMessage("en", key, params);
      const japanese = diagnosticMessage("ja", key, params);

      expect(english.length).toBeGreaterThan(0);
      expect(japanese.length).toBeGreaterThan(0);
      expect(english).not.toBe(japanese);
    }

    expect(diagnosticMessage("en", "unknown-filter", messageParams["unknown-filter"])).toContain(
      "[[region | mystery]]",
    );
    expect(diagnosticMessage("ja", "unknown-filter", messageParams["unknown-filter"])).toContain(
      "[[region | mystery]]",
    );
  });

  it("normalizes regional tags and falls back to English", () => {
    expect(resolveLocale("ja-JP")).toBe("ja");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("fr-FR")).toBe("en");
  });

  it("uses the browser locale only when no explicit locale is provided", () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    const source = "#!docfilly\ninvalid row\n---\nBody";

    expect(parseDocfillySource(source).diagnostics[0]?.message).toContain("2行目");
    expect(parseDocfillySource(source, { locale: "en-US" }).diagnostics[0]?.message).toContain(
      "Line 2",
    );
  });

  it("uses English outside browsers when no locale is available", () => {
    vi.stubGlobal("navigator", undefined);
    const parsed = parseDocfillySource("#!docfilly\ninvalid row\n---\nBody");

    expect(parsed.diagnostics[0]?.message).toContain("Line 2");
  });

  it("localizes parser, template, source update, and DOM diagnostics consistently", () => {
    const source = "#!docfilly\nchoice = [one, two]\n---\n[[missing]]";
    const parsed = parseDocfillySource("#!docfilly\ninvalid row\n---\nBody", { locale: "ja" });
    const updated = updateDocfillyDefaults(source, new Map([["choice", "other"]]), {
      locale: "ja-JP",
    });
    const view = createDocfilly(source, "text", { locale: "ja" });

    expect(parsed.diagnostics[0]?.message).toContain("2行目");
    expect(updated.diagnostics.at(-1)?.message).toContain("選択肢に存在しません");
    expect(view.diagnostics[0]?.message).toContain("定義されていない");
    expect(view.outputSource).toBe("[[missing]]");
  });
});
