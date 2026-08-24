import type { DocfillySourceType } from "docfilly";

export interface DocumentFormat {
  readonly inputExtensions: readonly string[];
  readonly outputExtension: string;
  readonly mimeType: string;
}

/** Metadata shared by document detection, file selection, and exports. */
export const documentFormats = {
  md: {
    inputExtensions: ["md", "markdown"],
    outputExtension: "md",
    mimeType: "text/markdown;charset=utf-8",
  },
  text: {
    inputExtensions: ["txt"],
    outputExtension: "txt",
    mimeType: "text/plain;charset=utf-8",
  },
} as const satisfies Record<DocfillySourceType, DocumentFormat>;

const sourceTypes = Object.keys(documentFormats) as DocfillySourceType[];

export const supportedFileExtensions = sourceTypes.flatMap(
  (sourceType) => documentFormats[sourceType].inputExtensions,
);

export const supportedFileDescription = supportedFileExtensions
  .map((extension) => `.${extension}`)
  .join(", ")
  .replace(/, ([^,]+)$/u, ", and $1");

export const documentFileAccept = [
  ...supportedFileExtensions.map((extension) => `.${extension}`),
  ...sourceTypes.map((sourceType) => documentFormats[sourceType].mimeType.split(";", 1)[0]),
].join(",");

export function getDocumentFormat(sourceType: DocfillySourceType): DocumentFormat {
  return documentFormats[sourceType];
}

export function getSourceTypeForExtension(extension: string): DocfillySourceType | undefined {
  return sourceTypes.find((sourceType) =>
    getDocumentFormat(sourceType).inputExtensions.includes(extension),
  );
}
