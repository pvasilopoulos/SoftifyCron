"use client";

import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "@/components/toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
      <Toaster />
    </>
  );
}
