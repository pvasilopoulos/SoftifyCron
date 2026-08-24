"use server";

import { redirect } from "next/navigation";
import { loginUser, registerUser } from "@/lib/auth";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
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
    const { token } = await loginUser(parsed.data.email, parsed.data.password);
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
