export type QuotedFieldResult<T> = { ok: true; value: T } | { ok: false };

/** Visits delimiters outside quotes and reports whether all quote pairs are closed. */
function scanOutsideQuotes(
  value: string,
  delimiter: string,
  visitDelimiter: (index: number) => void,
): boolean {
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (inQuotes && value[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && character === delimiter) {
      visitDelimiter(index);
    }
  }

  return !inQuotes;
}

/** Finds the first delimiter that is not enclosed in a CSV-style quoted field. */
export function findFirstOutsideQuotes(
  value: string,
  delimiter: string,
): QuotedFieldResult<number> {
  let delimiterIndex = -1;
  const valid = scanOutsideQuotes(value, delimiter, (index) => {
    if (delimiterIndex === -1) delimiterIndex = index;
  });
  return valid ? { ok: true, value: delimiterIndex } : { ok: false };
}

/** Splits text at delimiters that are not enclosed in CSV-style quoted fields. */
export function splitOutsideQuotes(value: string, delimiter: string): QuotedFieldResult<string[]> {
  const parts: string[] = [];
  let start = 0;
  const valid = scanOutsideQuotes(value, delimiter, (index) => {
    parts.push(value.slice(start, index));
    start = index + 1;
  });
  if (!valid) return { ok: false };

  parts.push(value.slice(start));
  return { ok: true, value: parts };
}

/** Trims an unquoted field or decodes a CSV-style quoted field. */
export function decodeField(rawField: string): QuotedFieldResult<string> {
  const field = rawField.trim();
  if (!field.includes('"')) return { ok: true, value: field };
  if (!field.startsWith('"')) return { ok: false };

  let decoded = "";
  for (let index = 1; index < field.length; index += 1) {
    const character = field[index];
    if (character !== '"') {
      decoded += character;
      continue;
    }

    if (field[index + 1] === '"') {
      decoded += '"';
      index += 1;
      continue;
    }

    return field.slice(index + 1).trim().length === 0
      ? { ok: true, value: decoded }
      : { ok: false };
  }

  return { ok: false };
}

/** Quotes a field when required or when its raw representation would parse differently. */
export function encodeField(value: string, delimiters: string, forceQuotes = false): string {
  const requiresQuotes =
    forceQuotes ||
    value !== value.trim() ||
    value.includes('"') ||
    [...delimiters].some((delimiter) => value.includes(delimiter));

  return requiresQuotes ? `"${value.replaceAll('"', '""')}"` : value;
}
