import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Inter, Outfit } from "next/font/google";
import { ThemeScript } from "@/components/theme-script";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "greek"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#07080c" },
  ],
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "SoftifyCron",
    template: "%s · SoftifyCron",
  },
  description:
    "Multi-tenant cron control plane. Isolated workspaces, MySQL-backed jobs, and HTTP schedules you can actually manage.",
  appleWebApp: {
    capable: true,
    title: "SoftifyCron",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      data-density="comfortable"
      className={`${outfit.variable} ${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full min-h-dvh flex flex-col text-ink">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
