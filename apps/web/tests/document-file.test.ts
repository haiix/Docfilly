import { describe, expect, it } from "vitest";
import { detectSourceType, readDocumentFile } from "../src/document-file";

describe("document files", () => {
  it.each([
    ["document.md", "md"],
    ["DOCUMENT.MARKDOWN", "md"],
    ["notes.txt", "text"],
    ["archive.guide.MarkDown", "md"],
    [".txt", "text"],
  ] as const)("detects %s as %s", (fileName, expected) => {
    expect(detectSourceType(fileName)).toBe(expected);
  });

  it.each(["document.pdf", "document", "document."])(
    "rejects unsupported file name %s",
    (fileName) => {
      expect(detectSourceType(fileName)).toBeUndefined();
    },
  );

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

    await expect(readDocumentFile(file)).rejects.toThrow(
      "Supported file types are .md, .markdown, and .txt.",
    );
  });
});
