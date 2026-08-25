"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; text: string; tone: "ok" | "err" };

const listeners = new Set<(toast: Toast) => void>();

export function toast(text: string, tone: "ok" | "err" = "ok") {
  const event: Toast = { id: Date.now() + Math.random(), text, tone };
  listeners.forEach((listener) => listener(event));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (event: Toast) => {
      setItems((current) => [...current.slice(-4), event]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== event.id));
      }, 2800);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.tone === "err" ? "toast-err" : ""}`}>
          {item.text}
        </div>
      ))}
    </div>
  );
}
