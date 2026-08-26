export type ThemePreference = "dark" | "light" | "system";
export type DensityPreference = "comfortable" | "compact";

export const THEME_KEY = "sc-theme";
export const DENSITY_KEY = "sc-density";
export const THEME_COOKIE = "sc-resolved-theme";
export const DENSITY_COOKIE = "sc-density";

export function resolveTheme(pref: ThemePreference, darkMq = true): "dark" | "light" {
  if (pref === "light" || pref === "dark") return pref;
  return darkMq ? "dark" : "light";
}

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* ignore */
  }
  return "system";
}

export function readDensity(): DensityPreference {
  try {
    const value = localStorage.getItem(DENSITY_KEY);
    if (value === "compact" || value === "comfortable") return value;
  } catch {
    /* ignore */
  }
  return "comfortable";
}

function writeCookie(name: string, value: string) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function applyAppearance(pref: ThemePreference, density: DensityPreference) {
  const root = document.documentElement;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(pref, dark);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
  root.setAttribute("data-density", density);
  writeCookie(THEME_COOKIE, resolved);
  writeCookie(DENSITY_COOKIE, density);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "light" ? "#eef2ef" : "#06070a");
}

export function persistTheme(pref: ThemePreference) {
  localStorage.setItem(THEME_KEY, pref);
  applyAppearance(pref, readDensity());
  window.dispatchEvent(new Event("sc-appearance"));
}

export function persistDensity(density: DensityPreference) {
  localStorage.setItem(DENSITY_KEY, density);
  applyAppearance(readThemePreference(), density);
  window.dispatchEvent(new Event("sc-appearance"));
}
