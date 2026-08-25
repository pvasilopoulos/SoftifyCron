"use server";

import { redirect } from "next/navigation";
import { loginUser, registerUser } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
  signSession,
} from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validators";

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const { token } = await loginUser(
      parsed.data.email,
      parsed.data.password,
      String(formData.get("invite") ?? "") || null,
    );
    await setSessionCookie(token);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Login failed" };
  }
  redirect("/dashboard");
}

export async function registerAction(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    organization: formData.get("organization"),
    invite: String(formData.get("invite") ?? "") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const { token } = await registerUser(parsed.data);
    await setSessionCookie(token);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("invite") ?? "");
  if (!token) redirect("/login");
  const session = await getSession();
  if (!session) redirect(`/register?invite=${encodeURIComponent(token)}`);
  try {
    const invite = await acceptInvite(token, session.sub, session.email);
    await setSessionCookie(
      await signSession({
        sub: session.sub,
        tid: invite.tenantId,
        email: session.email,
        name: session.name,
        role: invite.role,
        tname: invite.tenant.name,
        tslug: invite.tenant.slug,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite failed";
    redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
  }
  redirect("/dashboard");
}
