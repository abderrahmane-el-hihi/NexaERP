"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { SparklesIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, HandRaisedIcon } from "@heroicons/react/24/outline";
import type { ComponentType } from "react";
import CachetStamp from "../../_components/CachetStamp";

const COMPANY_PAGES: Record<string, { title: string, content: string, icon: ComponentType<{ className?: string }>, theme: string }> = {
  about: {
    title: "À propos",
    content: "NexaERP a été fondé avec une mission simple : créer la plateforme de gestion connectée que les entreprises en croissance méritent. Nous pensons que vous n'avez pas besoin d'un budget d'entreprise d'un million de dirhams pour obtenir un logiciel qui fonctionne réellement.",
    icon: SparklesIcon,
    theme: "text-[var(--color-safran)]"
  },
  careers: {
    title: "Carrières",
    content: "Rejoignez notre équipe en pleine croissance. Nous sommes toujours à la recherche d'ingénieurs, de designers et de spécialistes du succès client passionnés qui veulent aider les petites entreprises à prospérer. Consultez nos postes ouverts ou envoyez une candidature spontanée.",
    icon: BriefcaseIcon,
    theme: "text-[var(--color-zellige)]"
  },
  contact: {
    title: "Nous contacter",
    content: "Vous avez une question ou besoin de nous joindre ? Contactez notre équipe de support à contact@nexaerp.ma, ou appelez notre équipe commerciale. Nous sommes là pour vous aider à tirer le meilleur parti de votre entreprise.",
    icon: ChatBubbleLeftRightIcon,
    theme: "text-[var(--color-terre)]"
  },
  partners: {
    title: "Partenaires",
    content: "Devenez partenaire certifié NexaERP et aidez vos clients à mettre en place le système parfait pour leur entreprise. Nous offrons un partage de revenus compétitif et des ressources d'assistance dédiées aux partenaires.",
    icon: HandRaisedIcon,
    theme: "text-[var(--color-cachet)]"
  }
};

export default function CompanyPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const data = COMPANY_PAGES[params.slug];

  if (!data) return notFound();
  
  const Icon = data.icon;

  return (
    <div className="w-full bg-[var(--color-paper-deep)] min-h-screen border-t border-[var(--color-rule)]">
      <div className="py-24 px-6 max-w-[1120px] mx-auto min-h-[80vh] relative">
        
        {/* Background motif */}
        <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none transform scale-[2] translate-x-1/3 -translate-y-1/3">
          <CachetStamp />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative z-10">
          <Link href="/" className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] mb-12 inline-flex items-center gap-2 transition-colors">
            &larr; Retour à l&apos;accueil
          </Link>
          
          <div className="flex flex-col md:flex-row gap-16">
            <div className="md:w-1/3 shrink-0">
              <div className={`w-16 h-16 rounded-[2px] bg-[var(--color-paper)] border border-[var(--color-rule)] flex items-center justify-center mb-8 ${data.theme}`}>
                <Icon className="w-8 h-8" />
              </div>
              <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] mb-4 tracking-[-0.03em] leading-tight">
                {data.title}
              </h1>
            </div>
            
            <div className="md:w-2/3 md:pt-4">
              <p className="leading-[1.65] text-lg text-[var(--color-ink-soft)] max-w-2xl">
                {data.content}
              </p>
              
              <div className="mt-16 p-8 bg-[var(--color-paper)] rounded-[2px] border border-[var(--color-rule)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
                <div className="relative z-10">
                  <h3 className="font-bold text-[var(--color-ink)] text-lg mb-1">Prêt à moderniser votre gestion ?</h3>
                  <p className="text-sm text-[var(--color-ink-soft)]">Ouvrez un compte gratuitement et émettez votre première facture.</p>
                </div>
                <Link href="/signup" className="relative z-10 shrink-0 inline-block text-white bg-[var(--color-cachet)] px-8 py-3 rounded-[6px] font-bold hover:-translate-y-[1px] transition-all shadow-sm">
                  Commencer
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
