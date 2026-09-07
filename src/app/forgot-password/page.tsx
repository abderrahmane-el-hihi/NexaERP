"use client";

import Link from "next/link";
import { useActionState } from "react";
import { motion } from "framer-motion";
import { requestPasswordReset } from "@/app/auth/actions";
import { CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

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
              Mot de passe oublié
            </h1>
            <p className="text-[var(--color-ink-soft)] text-sm">
              Saisissez votre adresse email professionnelle pour recevoir un lien de réinitialisation sécurisé.
            </p>
          </div>

          {state?.success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-[4px] text-emerald-900 text-sm flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                {state.message}
              </div>
            </div>
          )}

          {state?.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[4px] text-red-900 text-sm flex items-start gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                {state.error}
              </div>
            </div>
          )}

          {!state?.success && (
            <form action={formAction} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[var(--color-ink)]">
                  Adresse email
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

              <button 
                type="submit" 
                disabled={isPending}
                className="w-full h-11 bg-[var(--color-cachet)] text-white font-bold rounded-[6px] hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer les instructions"
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-[var(--color-rule)] text-center text-sm text-[var(--color-ink-soft)]">
            <Link href="/login" className="text-[var(--color-ink)] hover:underline font-medium inline-flex items-center gap-1.5 transition-colors">
              &larr; Retour à la connexion
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
