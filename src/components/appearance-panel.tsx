"use client";

import { persistDensity, readDensity, type DensityPreference } from "@/lib/theme";
import {
  fillFooterNav,
  navForSession,
  persistFooterNav,
  readFooterNav,
  DEFAULT_FOOTER_NAV,
  FOOTER_PIN_COUNT,
  type NavId,
} from "@/lib/nav";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppearancePanel({ platform = false }: { platform?: boolean }) {
  const [density, setDensity] = useState<DensityPreference>("comfortable");
  const choices = useMemo(() => navForSession(platform), [platform]);
  const allowed = useMemo(() => choices.map((item) => item.id), [choices]);
  const [pins, setPins] = useState<NavId[]>(() => fillFooterNav(DEFAULT_FOOTER_NAV, allowed));

  useEffect(() => {
    const sync = () => {
      setDensity(readDensity());
      setPins(readFooterNav(allowed));
    };
    window.addEventListener("sc-appearance", sync);
    const frame = window.requestAnimationFrame(sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("sc-appearance", sync);
    };
  }, [allowed]);

  function setPin(index: number, id: NavId) {
    const next = [...pins];
    next[index] = id;
    const unique = fillFooterNav(next, allowed);
    setPins(unique);
    persistFooterNav(unique);
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl">Appearance</h2>
      <p className="mt-2 text-sm text-ink-dim">
        Theme follows this device. Compact density tightens cards and fields. Press ⌘K to jump
        anywhere.
      </p>
      <div className="mt-5">
        <p className="field-label">Theme</p>
        <ThemeToggle />
      </div>
      <div className="mt-5">
        <p className="field-label">Density</p>
        <div className="theme-toggle" role="radiogroup" aria-label="Density">
          {(["comfortable", "compact"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={density === value}
              className={density === value ? "is-on" : ""}
              onClick={() => {
                setDensity(value);
                persistDensity(value);
              }}
            >
              {value === "comfortable" ? "Comfortable" : "Compact"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 border-t border-line pt-6">
        <h3 className="font-display text-2xl">Mobile footer</h3>
        <p className="mt-2 text-sm text-ink-dim">
          Choose {FOOTER_PIN_COUNT} shortcuts. The fourth button is always More, which opens every
          page.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: FOOTER_PIN_COUNT }, (_, index) => (
            <label key={index} className="block">
              <span className="field-label">Shortcut {index + 1}</span>
              <select
                className="field"
                value={pins[index] ?? ""}
                onChange={(event) => setPin(index, event.target.value as NavId)}
              >
                {choices.map((item) => (
                  <option key={item.id} value={item.id} disabled={pins.includes(item.id) && pins[index] !== item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
