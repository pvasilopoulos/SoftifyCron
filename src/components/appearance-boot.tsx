"use client";

import { useEffect } from "react";
import { applyAppearance, readDensity, readThemePreference } from "@/lib/theme";

export function AppearanceBoot() {
  useEffect(() => {
    applyAppearance(readThemePreference(), readDensity());
  }, []);
  return null;
}
