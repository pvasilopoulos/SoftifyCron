import Script from "next/script";
import { THEME_BOOTSTRAP } from "@/lib/theme";

export function ThemeScript() {
  return (
    <Script id="sc-theme" strategy="beforeInteractive">
      {THEME_BOOTSTRAP}
    </Script>
  );
}
