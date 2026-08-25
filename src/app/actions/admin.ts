"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin, requireSession, setSessionCookie, signSession } from "@/lib/session";
import {
  createCustomer,
  createPlatformUser,
  deleteCustomer,
  deletePlatformUser,
  getCustomer,
  setPlatformUserRole,
  updateCustomer,
  updatePlatformUser,
} from "@/lib/admin";
import { getWorkspaceForUser } from "@/lib/members";
import { writeAudit } from "@/lib/audit";
import { customerCreateSchema, platformPersonSchema, platformUserRoleSchema, platformUserUpdateSchema, tenantUpdateSchema } from "@/lib/validators";

function safeAdminUserPath(next: string, userId: string) {
  if (next === "/admin/users") return next;
  if (next === `/admin/users/${userId}`) return next;
  return `/admin/users/${userId}`;
}

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

export async function updatePlatformUserAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  await requirePlatformAdmin();
  const parsed = platformUserUpdateSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await updatePlatformUser(parsed.data.userId, {
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password || undefined,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save user" };
  }
  const next = safeAdminUserPath(String(formData.get("next") ?? ""), parsed.data.userId);
  redirect(next);
}

export async function updatePlatformUserRoleAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  await requirePlatformAdmin();
  const parsed = platformUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    membershipId: String(formData.get("membershipId") ?? ""),
    tenantId: String(formData.get("tenantId") ?? ""),
    role: formData.get("role") || "MEMBER",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await setPlatformUserRole(parsed.data.userId, {
      membershipId: parsed.data.membershipId || undefined,
      tenantId: parsed.data.tenantId || undefined,
      role: parsed.data.role,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not change role" };
  }
  const next = safeAdminUserPath(String(formData.get("next") ?? ""), parsed.data.userId);
  redirect(next);
}

export async function deletePlatformUserAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const userId = String(formData.get("userId") ?? "");
  const fromList = String(formData.get("next") ?? "") === "/admin/users";
  try {
    await deletePlatformUser(userId);
    await writeAudit({
      actorId: session.sub,
      action: "user.delete",
      target: userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete user";
    if (fromList) {
      redirect(`/admin/users?error=${encodeURIComponent(message)}`);
    }
    redirect(
      `/admin/users/${encodeURIComponent(userId)}?error=${encodeURIComponent(message)}`,
    );
  }
  redirect("/admin/users");
}

export async function deleteCustomerAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const tenant = await getCustomer(tenantId);
  if (!tenant) redirect("/admin");
  await deleteCustomer(tenantId);
  await writeAudit({
    tenantId,
    actorId: session.sub,
    action: "tenant.delete",
    target: tenantId,
    meta: { name: tenant.name },
  });
  if (session.tid === tenantId) {
    await setSessionCookie(
      await signSession({
        ...session,
        tid: "",
        tname: "Platform",
        tslug: "admin",
        role: "OWNER",
        grants: "",
        platform: true,
      }),
    );
  }
  redirect("/admin");
}
