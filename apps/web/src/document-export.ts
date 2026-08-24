import {
  updateDocfillyDefaults,
  type DocfillyInitialValues,
  type DocfillySourceType,
  type SupportedLocale,
} from "docfilly";
import { getDocumentFormat } from "./document-format";

export interface DocumentExport {
  blob: Blob;
  fileName: string;
}

/** Raised when Docfilly-format saving is requested for an ordinary document. */
export class OrdinaryDocumentExportError extends Error {
  constructor() {
    super("Ordinary documents cannot be saved in Docfilly format.");
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
  locale?: SupportedLocale,
): DocumentExport {
  const updated = updateDocfillyDefaults(source, values, { locale });
  if (!updated.isDocfilly) throw new OrdinaryDocumentExportError();

  const { inputExtensions, outputExtension, mimeType } = getDocumentFormat(sourceType);
  const originalExtension = /\.([^.]+)$/u.exec(originalFileName)?.[1].toLowerCase();
  const extension =
    originalExtension !== undefined && inputExtensions.includes(originalExtension)
      ? originalExtension
      : outputExtension;
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
  const { outputExtension, mimeType } = getDocumentFormat(sourceType);
  const fileNameWithoutExtension = originalFileName.replace(/\.[^.]+$/, "").trim();
  const baseName = fileNameWithoutExtension || "document";

  return {
    blob: new Blob([source], { type: mimeType }),
    fileName: `${baseName}-output.${outputExtension}`,
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
