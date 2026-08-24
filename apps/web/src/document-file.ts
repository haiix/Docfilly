import type { DocfillySourceType } from "docfilly";
import { getSourceTypeForExtension, supportedFileDescription } from "./document-format";

export { supportedFileDescription } from "./document-format";

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
  const extension = /\.([^.]+)$/u.exec(fileName)?.[1].toLowerCase();
  return extension === undefined ? undefined : getSourceTypeForExtension(extension);
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
