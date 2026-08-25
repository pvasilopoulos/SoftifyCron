export type ThemePreference = "dark" | "light" | "system";
export type DensityPreference = "comfortable" | "compact";

export const THEME_KEY = "sc-theme";
export const DENSITY_KEY = "sc-density";

export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})||"system";var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=t==="light"||t==="dark"?t:(dark?"dark":"light");var r=document.documentElement;r.setAttribute("data-theme",resolved);r.style.colorScheme=resolved;var d=localStorage.getItem(${JSON.stringify(DENSITY_KEY)});if(d==="compact"||d==="comfortable")r.setAttribute("data-density",d);}catch(e){}})();`;

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

export function applyAppearance(pref: ThemePreference, density: DensityPreference) {
  const root = document.documentElement;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(pref, dark);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
  root.setAttribute("data-density", density);
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
