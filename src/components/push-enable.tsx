"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function bytesFromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function subscribeNoop() {
  return () => undefined;
}

function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && window.isSecureContext;
}

export function PushEnable() {
  const supported = useSyncExternalStore(subscribeNoop, pushSupported, () => false);
  const [status, setStatus] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void fetch("/api/push")
      .then((response) => response.json())
      .then((data: { subscribed?: boolean }) => {
        if (!cancelled) setSubscribed(Boolean(data.subscribed));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function enable() {
    setStatus(null);
    try {
      const meta = await fetch("/api/push").then((response) => response.json());
      if (!meta.publicKey) throw new Error("Push is not available");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications were blocked");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytesFromBase64Url(String(meta.publicKey)),
      });
      const json = subscription.toJSON();
      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not save subscription");
      setSubscribed(true);
      setStatus("This device will get job alerts.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not enable push");
    }
  }

  async function disable() {
    setStatus(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription?.endpoint ?? "" }),
      });
      setSubscribed(false);
      setStatus("Push alerts off on this device.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not disable push");
    }
  }

  if (!supported) {
    return (
      <p className="mt-3 text-sm text-ink-dim">
        Browser push needs HTTPS (or localhost) and a browser that supports Web Push.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {subscribed ? (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void disable()}>
            Disable push on this device
          </button>
        ) : (
          <button className="btn btn-gold btn-sm" type="button" onClick={() => void enable()}>
            Enable push alerts
          </button>
        )}
      </div>
      {status ? <p className="mt-2 text-sm text-ink-dim">{status}</p> : null}
    </div>
  );
}
