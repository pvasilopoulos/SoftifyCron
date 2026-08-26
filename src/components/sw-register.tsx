"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
