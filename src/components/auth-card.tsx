"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthCard({
  kicker,
  title,
  copy,
  children,
}: {
  kicker: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle compact />
      </div>
      <div className="mx-auto mt-12 w-full max-w-md card p-6 sm:mt-16 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">{kicker}</p>
        <h1 className="mt-3 font-display text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-ink-dim">{copy}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-ink-dim">
          <Link className="text-gold" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
