'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { withPlatformBypass } from '@/shared/db/prisma'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

import { signupInputSchema } from './schemas'

/**
 * Pure platform helper to provision or reconcile a Prisma User row from Supabase auth.
 * Idempotent: safe to run multiple times for the same user ID.
 */
export async function provisionPlatformUser(user: { id: string; email: string; name?: string }) {
  return withPlatformBypass((tx) =>
    tx.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name ?? null,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        status: "active",
      },
    })
  );
}

export async function signup(formData: FormData) {
  const parsed = signupInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    companyName: formData.get("companyName"),
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Données d'inscription invalides.";
    redirect("/signup?error=" + encodeURIComponent(errorMsg));
  }

  const { email, password, companyName } = parsed.data;
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        company_name: companyName,
      },
    },
  });

  if (error) {
    const rawMsg = error.message.toLowerCase();
    if (rawMsg.includes("already registered") || rawMsg.includes("already in use") || rawMsg.includes("user already exists")) {
      redirect("/signup?error=" + encodeURIComponent("Un compte existe déjà avec cette adresse email. Veuillez vous connecter."));
    }
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  const createdUser = authData.user;
  if (!createdUser) {
    redirect("/signup?error=" + encodeURIComponent("Échec de création du compte utilisateur."));
  }

  // Provision Prisma User with platform bypass
  try {
    await provisionPlatformUser({
      id: createdUser.id,
      email,
      name: companyName,
    });
  } catch (err: unknown) {
    console.error("Prisma User provisioning error:", err);
    redirect(
      "/signup?error=" +
        encodeURIComponent("Erreur lors de l'initialisation de votre profil en base de données. Veuillez réessayer.")
    );
  }

  // If email confirmation is required and session is null
  if (!authData.session && createdUser && !createdUser.confirmed_at) {
    redirect(
      "/login?info=" +
        encodeURIComponent("Compte créé avec succès ! Un lien de confirmation a été envoyé à votre adresse email.")
    );
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}

const passwordResetSchema = z.object({
  email: z.string().trim().email("Veuillez saisir une adresse email valide."),
});

export interface PasswordResetState {
  success?: boolean;
  message?: string;
  error?: string;
}

export interface PasswordResetClient {
  auth: {
    resetPasswordForEmail: (
      email: string,
      options: { redirectTo: string }
    ) => Promise<{ data: unknown; error: { status?: number; message?: string } | null }>;
  };
}

export async function getSafeRedirectUrl(siteUrlOverride?: string): Promise<string> {
  const envUrl =
    siteUrlOverride ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const cleanUrl = envUrl.replace(/\/$/, "");
  return `${cleanUrl}/auth/callback?next=/reset-password`;
}

export async function executePasswordReset(
  emailInput: string,
  client?: PasswordResetClient,
  siteUrlOverride?: string
): Promise<PasswordResetState> {
  const parsed = passwordResetSchema.safeParse({ email: emailInput });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Format d'email invalide.",
    };
  }

  const email = parsed.data.email;
  const redirectTo = await getSafeRedirectUrl(siteUrlOverride);

  const supabase = client || (await createClient());

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      const status = error.status;
      const message = (error.message || "").toLowerCase();
      
      if (status === 429 || message.includes("rate limit") || message.includes("too many requests")) {
        return {
          success: false,
          error: "Trop de tentatives. Veuillez patienter avant de réessayer.",
        };
      }
      
      if ((status && status >= 500) || message.includes("network") || message.includes("connection")) {
        return {
          success: false,
          error: "Le service d'authentification est temporairement indisponible. Veuillez réessayer plus tard.",
        };
      }
    }
  } catch (err: unknown) {
    console.error("Erreur inattendue lors de la demande de réinitialisation:", err);
    return {
      success: false,
      error: "Une erreur inattendue est survenue. Veuillez réessayer.",
    };
  }

  // Anti-enumeration generic success message
  return {
    success: true,
    message: "Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation sous peu. Vérifiez vos courriers indésirables.",
  };
}

export async function requestPasswordReset(
  _prevState: PasswordResetState | null,
  formData: FormData
): Promise<PasswordResetState> {
  const email = (formData.get("email") as string) || "";
  return await executePasswordReset(email);
}
