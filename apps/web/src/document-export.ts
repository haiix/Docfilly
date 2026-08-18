import type { DocfillySourceType } from "docfilly";

export interface DocumentExport {
  blob: Blob;
  fileName: string;
}

const exportTypes: Record<DocfillySourceType, { extension: string; mimeType: string }> = {
  md: { extension: "md", mimeType: "text/markdown;charset=utf-8" },
  text: { extension: "txt", mimeType: "text/plain;charset=utf-8" },
};

/**
 * Creates the file payload used to download the currently rendered document.
 *
 * @param source - The latest rendered output, with current form values applied.
 * @param sourceType - The displayed document format.
 * @param originalFileName - The local file name used when the document was opened.
 * @returns The Blob and suggested download file name.
 */
export function createDocumentExport(
  source: string,
  sourceType: DocfillySourceType,
  originalFileName: string,
): DocumentExport {
  const { extension, mimeType } = exportTypes[sourceType];
  const fileNameWithoutExtension = originalFileName.replace(/\.[^.]+$/, "").trim();
  const baseName = fileNameWithoutExtension || "document";

  return {
    blob: new Blob([source], { type: mimeType }),
    fileName: `${baseName}-output.${extension}`,
  };
}

/** Starts a browser download for a rendered document. */
export function downloadDocumentExport(documentExport: DocumentExport): void {
  const objectUrl = URL.createObjectURL(documentExport.blob);
  const link = document.createElement("a");

  try {
    link.href = objectUrl;
    link.download = documentExport.fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
