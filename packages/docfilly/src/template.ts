export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function interpolate(
  template: string,
  values: ReadonlyMap<string, string>,
  transform: (value: string) => string = (value) => value,
): string {
  return template.replace(/\[\[([\p{L}\p{N}_]+)\]\]/gu, (match, name: string) => {
    const value = values.get(name);
    return value === undefined ? match : transform(value);
  });
}
