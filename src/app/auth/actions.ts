'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    companyName: formData.get('companyName') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  // Provision the User record in Prisma
  const createdUser = authData.user
  if (createdUser) {
    try {
      // Creating the User row happens before any tenant exists, so it is a
      // platform-level write by definition.
      await withPlatformBypass((tx) =>
        tx.user.create({
          data: {
            id: createdUser.id,
            email: data.email,
            status: 'active'
          }
        })
      );
    } catch (e) {
      console.error('Error provisioning user:', e);
      // Clean up supabase user if we failed to provision
      // Or just fail gracefully
    }
  }

  revalidatePath('/', 'layout')
  // We'll just auto-login them or redirect to dashboard (which redirects to onboarding)
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}
