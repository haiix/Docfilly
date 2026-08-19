import {
  updateDocfillyDefaults,
  type DocfillyInitialValues,
  type DocfillySourceType,
} from "docfilly";

export interface DocumentExport {
  blob: Blob;
  fileName: string;
}

const exportTypes: Record<DocfillySourceType, { extension: string; mimeType: string }> = {
  md: { extension: "md", mimeType: "text/markdown;charset=utf-8" },
  text: { extension: "txt", mimeType: "text/plain;charset=utf-8" },
};

const sourceTypeExtensions: Record<DocfillySourceType, readonly string[]> = {
  md: ["md", "markdown"],
  text: ["txt"],
};

/** Raised when Docfilly-format saving is requested for an ordinary document. */
export class OrdinaryDocumentExportError extends Error {
  constructor() {
    super("通常文書はDocfilly形式で保存できません。");
    this.name = "OrdinaryDocumentExportError";
  }
}

/**
 * Creates a Docfilly source file with the current form values stored as defaults.
 */
export function createDocfillyDocumentExport(
  source: string,
  values: DocfillyInitialValues,
  sourceType: DocfillySourceType,
  originalFileName: string,
): DocumentExport {
  const updated = updateDocfillyDefaults(source, values);
  if (!updated.isDocfilly) throw new OrdinaryDocumentExportError();

  const { extension: fallbackExtension, mimeType } = exportTypes[sourceType];
  const originalExtension = /\.([^.]+)$/u.exec(originalFileName)?.[1].toLowerCase();
  const extension =
    originalExtension !== undefined && sourceTypeExtensions[sourceType].includes(originalExtension)
      ? originalExtension
      : fallbackExtension;
  const fileNameWithoutExtension = originalFileName.replace(/\.[^.]+$/u, "").trim();
  const baseName = fileNameWithoutExtension || "document";

  return {
    blob: new Blob([updated.source], { type: mimeType }),
    fileName: `${baseName}.${extension}`,
  };
}

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
