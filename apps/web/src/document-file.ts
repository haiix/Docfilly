import type { DocfillySourceType } from "docfilly";

export const supportedFileDescription = ".md, .markdown, and .txt";

export interface LoadedDocument {
  name: string;
  source: string;
  sourceType: DocfillySourceType;
}

export class UnsupportedDocumentFileError extends Error {
  constructor() {
    super(`Supported file types are ${supportedFileDescription}.`);
    this.name = "UnsupportedDocumentFileError";
  }
}

/**
 * Determines the supported source type from a file name.
 *
 * @param fileName - The name of the local document file.
 * @returns The source type, or `undefined` when the extension is unsupported.
 */
export function detectSourceType(fileName: string): DocfillySourceType | undefined {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "md" || extension === "markdown") return "md";
  if (extension === "txt") return "text";
  return undefined;
}

/**
 * Reads a supported local document file.
 *
 * @param file - The document selected or dropped by the user.
 * @returns The source, display name, and detected source type.
 * @throws An error when the file extension is unsupported or reading fails.
 */
export async function readDocumentFile(file: File): Promise<LoadedDocument> {
  const sourceType = detectSourceType(file.name);
  if (!sourceType) {
    throw new UnsupportedDocumentFileError();
  }

  return {
    name: file.name,
    source: await file.text(),
    sourceType,
  };
}
