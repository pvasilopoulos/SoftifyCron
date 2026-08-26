"use client";

import { AppearanceBoot } from "@/components/appearance-boot";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "@/components/toaster";
import { SwRegister } from "@/components/sw-register";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppearanceBoot />
      {children}
      <CommandPalette />
      <Toaster />
      <SwRegister />
    </>
  );
}
