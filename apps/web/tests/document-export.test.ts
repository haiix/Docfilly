import { describe, expect, it } from "vitest";
import { createDocumentExport } from "../src/document-export";

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Blobをテキストとして読み取れませんでした。"));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Blobの読み取りに失敗しました。")),
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
});
