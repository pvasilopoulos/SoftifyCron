import type { Metadata } from "next";
import { Geist_Mono, Inter, Outfit } from "next/font/google";
import { ThemeScript } from "@/components/theme-script";
import { AppAmbient } from "@/components/app-ambient";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "greek"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#06070a" },
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/icons/icon-192.png", sizes: "192x192" },
  },
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
      className={`${inter.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full min-h-dvh flex flex-col text-ink">
        <ThemeScript />
        <AppAmbient />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
