import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "public/styles.css"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  exports: Record<string, unknown>;
  sideEffects: string[];
};

describe("official styles", () => {
  it("publishes the opt-in stylesheet as a side-effectful subpath", () => {
    expect(packageJson.exports["./styles.css"]).toBe("./dist/styles.css");
    expect(packageJson.sideEffects).toContain("**/*.css");
  });

  it("covers every public view state", () => {
    expect(styles).toContain(".docfilly__form");
    expect(styles).toContain(".docfilly--without-form .docfilly__output");
    expect(styles).toContain(".docfilly__output--md");
    expect(styles).toContain(".docfilly__output--text");
    expect(styles).toContain(".docfilly__output--fallback");
    expect(styles).toContain("@container (min-width: 47.5rem)");
    expect(styles).toContain("@media (prefers-color-scheme: dark)");
    expect(styles).toContain(':where(.docfilly)[data-docfilly-theme="light"]');
    expect(styles).toContain(':where(.docfilly)[data-docfilly-theme="dark"]');
    expect(styles).not.toContain("light-dark(");
    expect(styles).toMatch(/\.docfilly\s*{[^}]*background: var\(--docfilly-form-background\);/s);
    expect(styles).toMatch(/\.docfilly__output\s*{[^}]*background: var\(--docfilly-background\);/s);
    expect(styles).toContain("border-left: 1px solid var(--docfilly-border-color)");
  });

  it("exposes customization properties without global selectors or app variables", () => {
    expect(styles).toContain("--docfilly-accent-color");
    expect(styles).toContain("--docfilly-spacing");
    expect(styles).toContain("--docfilly-form-width");
    expect(styles).toContain("--docfilly-sticky-top");
    expect(styles).toMatch(/\.docfilly__form\s*{[^}]*box-sizing: border-box;/s);
    expect(styles).not.toMatch(/(^|[}\n]\s*)(:root|body|html|\*)\s*[{,]/m);
    expect(styles).not.toContain("> *");
    expect(styles).not.toContain(".docfilly *");
    expect(styles).not.toContain("--app-");
  });
});
