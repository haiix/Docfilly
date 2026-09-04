import { describe, expect, it } from "vitest";
import {
  clearUserPreferences,
  readUserPreferences,
  resolvePreferredLocale,
  writeUserPreferences,
} from "../src/user-preferences";

describe("user preferences", () => {
  it("stores versioned language preferences separately from document data", () => {
    const storage = window.localStorage;
    storage.clear();

    expect(readUserPreferences(storage)).toEqual({ language: "browser", theme: "system" });
    expect(writeUserPreferences({ language: "ja", theme: "dark" }, storage)).toBe(true);
    expect(JSON.parse(storage.getItem("docfilly-web-preferences")!)).toEqual({
      version: 1,
      language: "ja",
      theme: "dark",
    });
    expect(readUserPreferences(storage)).toEqual({ language: "ja", theme: "dark" });
  });

  it("ignores malformed, unknown-version, and unsupported settings", () => {
    const storage = window.localStorage;
    for (const value of [
      "not json",
      JSON.stringify({ version: 2, language: "ja" }),
      JSON.stringify({ version: 1, language: "fr" }),
    ]) {
      storage.setItem("docfilly-web-preferences", value);
      expect(readUserPreferences(storage)).toEqual({ language: "browser", theme: "system" });
    }
  });

  it("defaults legacy preferences to the system theme and rejects unsupported themes", () => {
    const storage = window.localStorage;
    storage.setItem("docfilly-web-preferences", JSON.stringify({ version: 1, language: "ja" }));
    expect(readUserPreferences(storage)).toEqual({ language: "ja", theme: "system" });

    storage.setItem(
      "docfilly-web-preferences",
      JSON.stringify({ version: 1, language: "ja", theme: "sepia" }),
    );
    expect(readUserPreferences(storage)).toEqual({ language: "browser", theme: "system" });
  });

  it("uses the browser locale only for the browser preference", () => {
    expect(resolvePreferredLocale("browser", ["ja-JP"], "en-US")).toBe("ja");
    expect(resolvePreferredLocale("en", ["ja-JP"], "ja-JP")).toBe("en");
  });

  it("clears stored preferences", () => {
    const storage = window.localStorage;
    writeUserPreferences({ language: "en", theme: "light" }, storage);

    expect(clearUserPreferences(storage)).toBe(true);
    expect(readUserPreferences(storage)).toEqual({ language: "browser", theme: "system" });
  });
});
