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
  });

  it("exposes customization properties without global selectors or app variables", () => {
    expect(styles).toContain("--docfilly-accent-color");
    expect(styles).toContain("--docfilly-spacing");
    expect(styles).toContain("--docfilly-form-width");
    expect(styles).toContain("--docfilly-sticky-top");
    expect(styles).not.toMatch(/(^|[}\n]\s*)(:root|body|html|\*)\s*[{,]/m);
    expect(styles).not.toContain("> *");
    expect(styles).not.toContain(".docfilly *");
    expect(styles).not.toContain("--app-");
  });
});
