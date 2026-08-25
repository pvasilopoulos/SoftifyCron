import type { Metadata } from "next";
import { EB_Garamond, Geist_Mono, Inter } from "next/font/google";
import { ThemeScript } from "@/components/theme-script";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "greek"],
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin", "latin-ext", "greek"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
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
      className={`${inter.variable} ${garamond.variable} ${geistMono.variable} h-full antialiased`}
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
