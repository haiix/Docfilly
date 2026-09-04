import type { ThemePreference } from "./user-preferences";

export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const themeColors: Record<ResolvedTheme, string> = {
  light: "#f3f5f8",
  dark: "#111827",
};

export function resolvePreferredTheme(
  preference: ThemePreference,
  prefersDark = typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches,
): ResolvedTheme {
  return preference === "system" ? (prefersDark ? "dark" : "light") : preference;
}

export function applyTheme(theme: ResolvedTheme, documentNode: Document = document): void {
  const root = documentNode.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  documentNode
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", themeColors[theme]);
}
