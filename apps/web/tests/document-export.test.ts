import { describe, expect, it } from "vitest";
import { parseDocfillySource } from "docfilly";
import {
  createDocfillyDocumentExport,
  createDocumentExport,
  OrdinaryDocumentExportError,
} from "../src/document-export";

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("The Blob could not be read as text."));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Reading the Blob failed.")),
    );
    reader.readAsText(blob);
  });
}

describe("createDocumentExport", () => {
  it("creates a Markdown Blob and output file name from a Markdown document", async () => {
    const result = createDocumentExport("# Hello Alice\n", "md", "guide.markdown");

    expect(result.fileName).toBe("guide-output.md");
    expect(result.blob.type).toBe("text/markdown;charset=utf-8");
    await expect(readBlob(result.blob)).resolves.toBe("# Hello Alice\n");
  });

  it("creates a plain-text Blob without changing its content", async () => {
    const result = createDocumentExport("first\nsecond", "text", "notes.txt");

    expect(result.fileName).toBe("notes-output.txt");
    expect(result.blob.type).toBe("text/plain;charset=utf-8");
    await expect(readBlob(result.blob)).resolves.toBe("first\nsecond");
  });

  it("uses a safe fallback when the original base name is empty", () => {
    expect(createDocumentExport("content", "md", ".md").fileName).toBe("document-output.md");
  });

  it("uses the source-type extension for an extensionless file name", () => {
    expect(createDocumentExport("content", "text", "notes").fileName).toBe("notes-output.txt");
  });
});

describe("createDocfillyDocumentExport", () => {
  it("stores current values while preserving the Docfilly template and original extension", async () => {
    const source = [
      "#!docfilly",
      "title = Before",
      "region = [*east, west]",
      "enabled = [ ]",
      "---",
      "# [[title]]",
      "[[#if enabled]]",
      "Region: [[region]]",
      "[[#endif]]",
    ].join("\n");
    const result = createDocfillyDocumentExport(
      source,
      new Map([
        ["title", '彼は "はい" と言った'],
        ["region", "west"],
        ["enabled", "true"],
      ]),
      "md",
      "guide.markdown",
    );

    expect(result.fileName).toBe("guide.markdown");
    expect(result.blob.type).toBe("text/markdown;charset=utf-8");
    const savedSource = await readBlob(result.blob);
    expect(savedSource).toBe(
      source
        .replace("title = Before", 'title = "彼は ""はい"" と言った"')
        .replace("region = [*east, west]", "region = [east, *west]")
        .replace("enabled = [ ]", "enabled = [x]"),
    );
    expect(parseDocfillySource(savedSource).variables).toMatchObject([
      { name: "title", initialValue: '彼は "はい" と言った' },
      { name: "region", initialValue: "west" },
      { name: "enabled", initialValue: true },
    ]);
  });

  it("rejects an ordinary document", () => {
    expect(() =>
      createDocfillyDocumentExport("# Ordinary", new Map(), "md", "ordinary.md"),
    ).toThrow(OrdinaryDocumentExportError);
    expect(() =>
      createDocfillyDocumentExport("# Ordinary", new Map(), "md", "ordinary.md"),
    ).toThrow("Ordinary documents cannot be saved in Docfilly format.");
  });

  it("uses a source-type fallback when the original file name has no usable base", () => {
    const result = createDocfillyDocumentExport("#!docfilly\n---\nBody", new Map(), "text", ".txt");

    expect(result.fileName).toBe("document.txt");
  });

  it("preserves a valid extension after multiple dots and normalizes its case", () => {
    const result = createDocfillyDocumentExport(
      "#!docfilly\n---\nBody",
      new Map(),
      "md",
      "draft.guide.MARKDOWN",
    );

    expect(result.fileName).toBe("draft.guide.markdown");
  });

  it("uses the source-type extension when the original extension is unsupported", () => {
    const result = createDocfillyDocumentExport(
      "#!docfilly\n---\nBody",
      new Map(),
      "md",
      "guide.pdf",
    );

    expect(result.fileName).toBe("guide.md");
  });
});
