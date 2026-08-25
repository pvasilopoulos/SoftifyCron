"use server";

import { redirect } from "next/navigation";
import {
  beginTotp,
  changePassword,
  confirmTotp,
  disableTotp,
  loginUser,
  loginWithTotp,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import { writeAudit } from "@/lib/audit";
import {
  clearSessionCookie,
  getSession,
  homePath,
  requireSession,
  setSessionCookie,
  signSession,
} from "@/lib/session";
import {
  forgotSchema,
  loginSchema,
  passwordChangeSchema,
  registerSchema,
  resetPasswordSchema,
  totpCodeSchema,
} from "@/lib/validators";

export type AuthFormState = {
  error?: string;
  needsTotp?: boolean;
  challenge?: string;
  message?: string;
} | null;

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const invite = String(formData.get("invite") ?? "") || null;
  let next = "/dashboard";
  try {
    const result = await loginUser(parsed.data.email, parsed.data.password, invite);
    if ("needsTotp" in result) {
      return { needsTotp: true, challenge: result.challenge };
    }
    await setSessionCookie(result.token);
    next = homePath(result.payload);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Login failed" };
  }
  redirect(next);
}

export async function totpLoginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = totpCodeSchema.safeParse({
    challenge: formData.get("challenge"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return {
      needsTotp: true,
      challenge: String(formData.get("challenge") ?? ""),
      error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code",
    };
  }
  const invite = String(formData.get("invite") ?? "") || null;
  let next = "/dashboard";
  try {
    const { token, payload } = await loginWithTotp(
      parsed.data.challenge,
      parsed.data.code,
      invite,
    );
    await setSessionCookie(token);
    next = homePath(payload);
  } catch (error) {
    return {
      needsTotp: true,
      challenge: parsed.data.challenge,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
  redirect(next);
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
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
  redirect("/login");
}

export async function forgotAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }
  try {
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    console.error("[forgot]", error);
  }
  return { message: "If that account exists, we sent a reset link." };
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Reset failed" };
  }
  redirect("/login");
}

export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    nextPassword: formData.get("nextPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await changePassword(session.sub, parsed.data.currentPassword, parsed.data.nextPassword);
    await writeAudit({
      tenantId: session.tid || null,
      actorId: session.sub,
      action: "password.change",
      target: session.sub,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not change password" };
  }
  return { message: "Password updated." };
}

export async function startTotpAction(): Promise<
  { error: string } | { secret: string; otpauth: string }
> {
  const session = await requireSession();
  try {
    return await beginTotp(session.sub, session.email);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not start 2FA" };
  }
}

export async function confirmTotpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  const code = String(formData.get("code") ?? "");
  try {
    await confirmTotp(session.sub, code);
    await writeAudit({
      tenantId: session.tid || null,
      actorId: session.sub,
      action: "totp.enable",
      target: session.sub,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not enable 2FA" };
  }
  return { message: "Authenticator app enabled." };
}

export async function disableTotpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSession();
  try {
    await disableTotp(session.sub, String(formData.get("password") ?? ""));
    await writeAudit({
      tenantId: session.tid || null,
      actorId: session.sub,
      action: "totp.disable",
      target: session.sub,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not disable 2FA" };
  }
  return { message: "Authenticator app disabled." };
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
        platform: session.platform,
        rolePerms: invite.roleRef?.permissions ?? "",
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite failed";
    redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
  }
  redirect("/dashboard");
}
