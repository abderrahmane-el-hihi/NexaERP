"use client";

import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { motion } from "framer-motion";
import { use } from "react";

export default function SignupPage(props: {
  searchParams: Promise<{ error?: string; info?: string }>
}) {
  const searchParams = use(props.searchParams);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper-deep)] p-6 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-[var(--color-paper)] rounded-[2px] p-8 border border-[var(--color-rule)] shadow-sm relative">
          <div className="flex justify-center mb-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-[var(--color-cachet)] flex items-center justify-center shadow-xs">
                <span className="text-white font-bold text-xl leading-none">N</span>
              </div>
            </Link>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-[var(--font-bricolage)] text-[var(--color-ink)] mb-2 tracking-tight">
              Créer votre espace
            </h1>
            <p className="text-[var(--color-ink-soft)] text-sm">
              Commencez votre période d&apos;essai de 14 jours. Sans engagement.
            </p>
          </div>

          {searchParams?.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[4px] text-red-900 text-sm text-center">
              {searchParams.error}
            </div>
          )}

          {searchParams?.info && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-[4px] text-emerald-900 text-sm text-center">
              {searchParams.info}
            </div>
          )}
          
          <form action={signup} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium text-[var(--color-ink)]">
                Nom de l&apos;entreprise
              </label>
              <input 
                id="companyName" 
                name="companyName" 
                type="text" 
                placeholder="Ex. Maghreb Distribution SARL"
                className="flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)] transition-all"
                required 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[var(--color-ink)]">
                Adresse email professionnelle
              </label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                autoComplete="email"
                placeholder="nom@entreprise.ma"
                className="flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)] transition-all"
                required 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--color-ink)]">
                Mot de passe (8 caractères minimum)
              </label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                autoComplete="new-password"
                placeholder="••••••••"
                className="flex h-11 w-full rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-deep)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-cachet)]/40 focus:border-[var(--color-cachet)] transition-all"
                required 
                minLength={8}
              />
            </div>
            <button 
              type="submit" 
              className="w-full h-11 bg-[var(--color-cachet)] text-white font-bold rounded-[6px] hover:opacity-90 transition-all flex items-center justify-center shadow-xs cursor-pointer mt-4"
            >
              Créer mon compte
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-[var(--color-rule)] text-center text-sm text-[var(--color-ink-soft)]">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-[var(--color-ink)] hover:underline font-semibold transition-colors">
              Se connecter
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
