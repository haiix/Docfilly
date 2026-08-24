import { parseDocfillyDocument } from "./parser";
import { diagnosticMessage, resolveLocale } from "./messages";
import { encodeField, findFirstOutsideQuotes } from "./quoted-fields";
import type {
  DocfillyDiagnostic,
  DocfillyInitialValues,
  DocfillyLocaleOptions,
  DocfillySourceUpdateResult,
  DocfillyVariable,
  SupportedLocale,
} from "./types";

function encodeTextValue(value: string): string {
  const resemblesControl = value.startsWith("[") && value.endsWith("]");
  return encodeField(value, '"', resemblesControl);
}

function encodeDropdownOption(value: string): string {
  return encodeField(value, ',"', value.startsWith("*"));
}

function encodeVariableValue(variable: DocfillyVariable, value: string): string | undefined {
  if (value.includes("\n") || value.includes("\r")) return undefined;

  if (variable.type === "text") return encodeTextValue(value);
  if (variable.type === "checkbox") {
    if (value === "true") return "[x]";
    if (value === "false") return "[ ]";
    return undefined;
  }

  if (!variable.options.includes(value)) return undefined;
  let selected = false;
  const options = variable.options.map((option) => {
    const selectionMarker = !selected && option === value ? "*" : "";
    if (selectionMarker) selected = true;
    return `${selectionMarker}${encodeDropdownOption(option)}`;
  });
  return `[${options.join(", ")}]`;
}

function invalidDefaultDiagnostic(
  variable: DocfillyVariable,
  value: string,
  line: number,
  source: string,
  locale: SupportedLocale,
): DocfillyDiagnostic {
  const key =
    variable.type === "select"
      ? "invalid-select-default"
      : variable.type === "checkbox"
        ? "invalid-checkbox-default"
        : "invalid-text-default";

  return {
    code: "invalid-default-value",
    severity: "warning",
    message: diagnosticMessage(locale, key, { line, name: variable.name, value }),
    line,
    source,
  };
}

/**
 * Applies current form values to the initial values in a Docfilly source document.
 *
 * Invalid definitions, duplicate variables, comments, and the document body are left untouched.
 */
export function updateDocfillyDefaults(
  source: string,
  values: DocfillyInitialValues,
  options: DocfillyLocaleOptions = {},
): DocfillySourceUpdateResult {
  const locale = resolveLocale(options.locale);
  const parsed = parseDocfillyDocument(source, { locale });
  if (!parsed.isDocfilly) {
    return { source, isDocfilly: false, diagnostics: parsed.diagnostics };
  }

  const parts = source.split(/(\r\n|\n)/);
  const diagnostics = [...parsed.diagnostics];
  const unsafeDefinitionLines = new Set(
    parsed.diagnostics.flatMap((diagnostic) =>
      diagnostic.line === undefined ? [] : [diagnostic.line],
    ),
  );

  for (const variable of parsed.variables) {
    const value = values.get(variable.name);
    if (value === undefined) continue;

    const lineNumber = parsed.variableLines.get(variable.name);
    if (lineNumber === undefined) continue;
    if (unsafeDefinitionLines.has(lineNumber)) continue;

    const partIndex = (lineNumber - 1) * 2;
    const line = parts[partIndex];
    const equals = findFirstOutsideQuotes(line, "=");
    if (!equals.ok || equals.value === -1) continue;
    const equalsIndex = equals.value;

    const encodedValue = encodeVariableValue(variable, value);
    if (encodedValue === undefined) {
      diagnostics.push(invalidDefaultDiagnostic(variable, value, lineNumber, line.trim(), locale));
      continue;
    }

    const rawValue = line.slice(equalsIndex + 1);
    const leadingWhitespace = /^\s*/u.exec(rawValue)?.[0] ?? "";
    const valueWithTrailingWhitespace = rawValue.slice(leadingWhitespace.length);
    const trailingWhitespace = valueWithTrailingWhitespace.slice(
      valueWithTrailingWhitespace.trimEnd().length,
    );
    parts[partIndex] =
      `${line.slice(0, equalsIndex + 1)}${leadingWhitespace}${encodedValue}${trailingWhitespace}`;
  }

  return { source: parts.join(""), isDocfilly: true, diagnostics };
}
