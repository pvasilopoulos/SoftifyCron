"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin, setSessionCookie, signSession } from "@/lib/session";
import { createCustomer, getCustomer } from "@/lib/admin";
import { customerCreateSchema } from "@/lib/validators";

export async function enterCustomerAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const tenant = await getCustomer(tenantId);
  if (!tenant) redirect("/admin");
  await setSessionCookie(
    await signSession({
      ...session,
      tid: tenant.id,
      tname: tenant.name,
      tslug: tenant.slug,
      role: "OWNER",
      platform: true,
    }),
  );
  redirect("/dashboard");
}

export async function exitCustomerAction() {
  const session = await requirePlatformAdmin();
  await setSessionCookie(
    await signSession({
      ...session,
      tid: "",
      tname: "Platform",
      tslug: "admin",
      role: "OWNER",
      platform: true,
    }),
  );
  redirect("/admin");
}

export async function createCustomerAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  await requirePlatformAdmin();
  const parsed = customerCreateSchema.safeParse({
    name: formData.get("name"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword"),
    timezone: formData.get("timezone") || "Europe/Athens",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await createCustomer(parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create customer" };
  }
  redirect("/admin");
}
