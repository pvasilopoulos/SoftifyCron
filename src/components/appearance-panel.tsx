"use client";

import { persistDensity, readDensity, type DensityPreference } from "@/lib/theme";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppearancePanel() {
  const [density, setDensity] = useState<DensityPreference>("comfortable");

  useEffect(() => {
    const sync = () => setDensity(readDensity());
    window.addEventListener("sc-appearance", sync);
    const frame = window.requestAnimationFrame(sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("sc-appearance", sync);
    };
  }, []);

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
    </div>
  );
}
