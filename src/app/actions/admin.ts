"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin, requireSession, setSessionCookie, signSession } from "@/lib/session";
import { createCustomer, createPlatformUser, getCustomer, updateCustomer } from "@/lib/admin";
import { getWorkspaceForUser } from "@/lib/members";
import { customerCreateSchema, platformPersonSchema, tenantUpdateSchema } from "@/lib/validators";

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

export async function switchWorkspaceAction(formData: FormData) {
  const session = await requireSession();
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) redirect(session.platform ? "/admin" : "/dashboard");

  if (session.platform) {
    const tenant = await getCustomer(tenantId);
    if (!tenant) redirect("/admin");
    await setSessionCookie(
      await signSession({
        ...session,
        tid: tenant.id,
        tname: tenant.name,
        tslug: tenant.slug,
        role: "OWNER",
        grants: "",
        platform: true,
      }),
    );
    redirect("/dashboard");
  }

  const membership = await getWorkspaceForUser(session.sub, tenantId);
  if (!membership) redirect("/dashboard");
  await setSessionCookie(
    await signSession({
      ...session,
      tid: membership.tenantId,
      tname: membership.tenant.name,
      tslug: membership.tenant.slug,
      role: membership.role,
      grants: membership.grants,
      platform: false,
    }),
  );
  redirect("/dashboard");
}

export async function createCustomerAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  await requirePlatformAdmin();
  const parsed = customerCreateSchema.safeParse({
    name: formData.get("name"),
    ownerMode: formData.get("ownerMode") || "create",
    ownerName: String(formData.get("ownerName") ?? ""),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: String(formData.get("ownerPassword") ?? ""),
    timezone: formData.get("timezone") || "Europe/Athens",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  let created;
  try {
    created = await createCustomer({
      name: parsed.data.name,
      ownerMode: parsed.data.ownerMode,
      ownerName: parsed.data.ownerName || undefined,
      ownerEmail: parsed.data.ownerEmail,
      ownerPassword: parsed.data.ownerPassword || undefined,
      timezone: parsed.data.timezone,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create customer" };
  }
  redirect(`/admin/tenants/${created.tenant.id}`);
}

export async function updateCustomerAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  await requirePlatformAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const parsed = tenantUpdateSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await updateCustomer(tenantId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save tenant" };
  }
  redirect(`/admin/tenants/${tenantId}`);
}

export async function createPlatformUserAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  await requirePlatformAdmin();
  const parsed = platformPersonSchema.safeParse({
    email: formData.get("email"),
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
    tenantId: formData.get("tenantId"),
    role: formData.get("role") || "MEMBER",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await createPlatformUser({
      email: parsed.data.email,
      name: parsed.data.name || undefined,
      password: parsed.data.password || undefined,
      tenantId: parsed.data.tenantId,
      role: parsed.data.role,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create user" };
  }
  redirect(`/admin/tenants/${parsed.data.tenantId}`);
}
