import { redirect } from "next/navigation";
import { hydratePortalAccess } from "@/lib/portal";
import { readPortalCookie, type PortalPayload } from "@/lib/portal-session";

export async function loadPortalAccess() {
  const payload = await readPortalCookie();
  if (!payload) return null;
  return hydratePortalAccess(payload);
}

export async function requirePortalAccess() {
  const access = await loadPortalAccess();
  if (!access) redirect("/portal/login");
  return access;
}

export type { PortalPayload };
