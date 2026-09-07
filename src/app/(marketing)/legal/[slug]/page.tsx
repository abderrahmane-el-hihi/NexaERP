"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { DocumentCheckIcon, ShieldCheckIcon, ScaleIcon } from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

const LEGAL_PAGES: Record<string, { title: string, updated: string, icon: ComponentType<{ className?: string }> }> = {
  privacy: {
    title: "Politique de Confidentialité",
    updated: "1 Août 2026",
    icon: ShieldCheckIcon
  },
  terms: {
    title: "Conditions Générales",
    updated: "1 Août 2026",
    icon: ScaleIcon
  },
  security: {
    title: "Sécurité des Données",
    updated: "1 Août 2026",
    icon: DocumentCheckIcon
  }
};

export default function LegalPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const data = LEGAL_PAGES[params.slug];

  if (!data) return notFound();
  
  const Icon = data.icon;

  return (
    <div className="w-full bg-[var(--color-paper)] min-h-screen border-t border-[var(--color-rule)]">
      <div className="py-24 px-6 max-w-[800px] mx-auto min-h-[80vh] relative">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Link href="/" className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] mb-12 inline-flex items-center gap-2 transition-colors">
            &larr; Retour à l&apos;accueil
          </Link>
          
          <div className="flex items-center gap-6 mb-12 pb-8 border-b border-[var(--color-rule)]">
            <div className="w-16 h-16 rounded-[2px] bg-[var(--color-paper-deep)] flex items-center justify-center border border-[var(--color-rule)] shrink-0">
              <Icon className="w-8 h-8 text-[var(--color-ink)]" />
            </div>
            <div>
              <h1 className="text-[clamp(2rem,4vw,3.25rem)] font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] tracking-[-0.03em] leading-tight">
                {data.title}
              </h1>
              <p className="font-mono text-xs text-[var(--color-ink-soft)] mt-3 uppercase tracking-widest font-semibold">
                Dernière mise à jour : {data.updated}
              </p>
            </div>
          </div>
          
          <div className="text-[var(--color-ink)] font-[var(--font-plex-sans)] leading-[1.7] text-lg max-w-none">
            <p className="mb-6">
              Ceci est un emplacement réservé pour {data.title.toLowerCase()}. Dans un environnement de production, cette page contiendrait le texte juridiquement contraignant, les définitions, les obligations de l&apos;utilisateur, les limitations de responsabilité et les accords de traitement des données requis pour l&apos;exploitation d&apos;une plateforme SaaS au Maroc.
            </p>
            <p className="mb-6">
              Nous prenons très au sérieux votre confidentialité et la sécurité de vos données, en conformité avec la loi 09-08 relative à la protection des personnes physiques à l&apos;égard du traitement des données à caractère personnel.
            </p>
            <div className="bg-[var(--color-paper-deep)] p-6 border-l-4 border-[var(--color-ink)] my-8 text-[var(--color-ink-soft)] italic">
              Pour toute question d&apos;ordre juridique, veuillez contacter notre service juridique à legal@nexaerp.ma.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
