"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error: boolean };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/admin/dashboard",
    });
    return { error: false };
  } catch (e) {
    if (e instanceof AuthError) return { error: true };
    throw e; // redirects must propagate
  }
}
