export type QuotedFieldResult<T> = { ok: true; value: T } | { ok: false };

/** Collects delimiter positions while validating CSV-style quote pairs. */
function findOutsideQuotes(value: string, delimiter: string): QuotedFieldResult<number[]> {
  let inQuotes = false;
  const delimiterIndices: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (inQuotes && value[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && character === delimiter) {
      delimiterIndices.push(index);
    }
  }

  return inQuotes ? { ok: false } : { ok: true, value: delimiterIndices };
}

/** Finds the first delimiter that is not enclosed in a CSV-style quoted field. */
export function findFirstOutsideQuotes(
  value: string,
  delimiter: string,
): QuotedFieldResult<number> {
  const indices = findOutsideQuotes(value, delimiter);
  return indices.ok ? { ok: true, value: indices.value[0] ?? -1 } : indices;
}

/** Splits text at delimiters that are not enclosed in CSV-style quoted fields. */
export function splitOutsideQuotes(value: string, delimiter: string): QuotedFieldResult<string[]> {
  const indices = findOutsideQuotes(value, delimiter);
  if (!indices.ok) return indices;

  const parts: string[] = [];
  let start = 0;
  for (const index of indices.value) {
    parts.push(value.slice(start, index));
    start = index + 1;
  }

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
