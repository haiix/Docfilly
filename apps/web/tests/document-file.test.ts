import { describe, expect, it } from "vitest";
import { detectSourceType, readDocumentFile } from "../src/document-file";

describe("document files", () => {
  it.each([
    ["document.md", "md"],
    ["DOCUMENT.MARKDOWN", "md"],
    ["notes.txt", "text"],
  ] as const)("detects %s as %s", (fileName, expected) => {
    expect(detectSourceType(fileName)).toBe(expected);
  });

  it("rejects unsupported extensions", () => {
    expect(detectSourceType("document.pdf")).toBeUndefined();
  });

  it("reads a supported document", async () => {
    const file = new File(["# Hello"], "hello.md", { type: "text/markdown" });

    await expect(readDocumentFile(file)).resolves.toEqual({
      name: "hello.md",
      source: "# Hello",
      sourceType: "md",
    });
  });

  it("reports supported extensions for an unsupported document", async () => {
    const file = new File(["content"], "document.pdf", { type: "application/pdf" });

    await expect(readDocumentFile(file)).rejects.toThrow(".md、.markdown、.txt");
  });
});
