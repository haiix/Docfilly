import type { TemplateToken } from "./template-types";

/** Splits a template into lines and identifies standalone structural directives. */
export function tokenizeTemplate(template: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let start = 0;
  let line = 1;

  while (start < template.length) {
    const newline = template.indexOf("\n", start);
    const end = newline === -1 ? template.length : newline + 1;
    const raw = template.slice(start, end);
    const content = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
    const trimmed = content.trim();
    const ifMatch = /^\[\[#if(?:\s+(.*))?\]\]$/u.exec(trimmed);

    let directive: TemplateToken["directive"];
    if (ifMatch) directive = { type: "if", expression: ifMatch[1] ?? "" };
    else if (trimmed === "[[#else]]") directive = { type: "else" };
    else if (trimmed === "[[#endif]]") directive = { type: "endif" };

    tokens.push({ raw, trimmed, line, start, end, directive });
    start = end;
    line += 1;
  }

  return tokens;
}
