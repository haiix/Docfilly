import { resolveWebLocale, type WebLocale } from "./locale";

export type LanguagePreference = "browser" | WebLocale;

export interface UserPreferences {
  language: LanguagePreference;
}

const storageKey = "docfilly-web-preferences";
const currentVersion = 1;
const defaultPreferences: UserPreferences = { language: "browser" };

function getStorage(storage?: Storage): Storage | null {
  if (storage !== undefined) return storage;

  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readUserPreferences(storage?: Storage): UserPreferences {
  try {
    const serialized = getStorage(storage)?.getItem(storageKey);
    if (serialized === null || serialized === undefined) return defaultPreferences;

    const stored: unknown = JSON.parse(serialized);
    if (typeof stored !== "object" || stored === null) return defaultPreferences;
    if (!("version" in stored) || stored.version !== currentVersion) return defaultPreferences;
    if (!("language" in stored)) return defaultPreferences;
    if (stored.language !== "browser" && stored.language !== "en" && stored.language !== "ja") {
      return defaultPreferences;
    }

    return { language: stored.language };
  } catch {
    return defaultPreferences;
  }
}

export function writeUserPreferences(preferences: UserPreferences, storage?: Storage): boolean {
  try {
    const target = getStorage(storage);
    if (target === null) return false;
    target.setItem(storageKey, JSON.stringify({ version: currentVersion, ...preferences }));
    return true;
  } catch {
    return false;
  }
}

export function clearUserPreferences(storage?: Storage): boolean {
  try {
    const target = getStorage(storage);
    if (target === null) return false;
    target.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

export function resolvePreferredLocale(
  preference: LanguagePreference,
  languages?: readonly string[],
  language?: string,
): WebLocale {
  return preference === "browser" ? resolveWebLocale(languages, language) : preference;
}
