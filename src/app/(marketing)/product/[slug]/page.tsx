"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { BanknotesIcon, CubeIcon, CreditCardIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

const PRODUCTS: Record<string, { title: string, subtitle: string, icon: ComponentType<{ className?: string }>, features: string[], theme: string }> = {
  finance: {
    title: "Comptabilité & Finance",
    subtitle: "Gagnez du temps sur votre saisie comptable et collaborez avec votre expert.",
    icon: BanknotesIcon,
    features: ["Plan comptable marocain", "TVA prête à déclarer", "Rapprochement bancaire", "Journaux d'achat et vente", "Bilan et compte de résultat"],
    theme: "text-[var(--color-safran)]"
  },
  inventory: {
    title: "Gestion de Stock",
    subtitle: "Ne soyez plus jamais en rupture de stock par surprise.",
    icon: CubeIcon,
    features: ["Multi-dépôts", "Traçabilité des lots", "Alertes de réapprovisionnement", "Bons de commande fournisseurs", "Bons de réception"],
    theme: "text-[var(--color-zellige)]"
  },
  sales: {
    title: "Ventes & Facturation",
    subtitle: "Éditez vos factures et faites-vous payer plus rapidement.",
    icon: CreditCardIcon,
    features: ["Devis en 1 clic", "Bons de livraison", "Factures conformes DGI", "Avoirs", "Relances automatiques"],
    theme: "text-[var(--color-terre)]"
  },
  hr: {
    title: "RH & Paie",
    subtitle: "Gérez votre équipe avec simplicité et rigueur.",
    icon: UserGroupIcon,
    features: ["Dossiers du personnel", "Gestion des congés", "Calcul de la paie", "Génération des fiches de paie", "Déclarations CNSS"],
    theme: "text-[var(--color-cachet)]"
  }
};

export default function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const data = PRODUCTS[params.slug];

  if (!data) return notFound();
  
  const Icon = data.icon;

  return (
    <div className="w-full bg-[var(--color-paper)] min-h-screen border-t border-[var(--color-rule)]">
      <div className="py-24 px-6 max-w-[1120px] mx-auto min-h-[80vh]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Link href="/" className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] mb-12 inline-flex items-center gap-2 transition-colors">
            &larr; Retour à l&apos;accueil
          </Link>
          
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <div className={`w-16 h-16 rounded-[2px] bg-[var(--color-paper-deep)] border border-[var(--color-rule)] flex items-center justify-center mb-8 ${data.theme}`}>
                <Icon className="w-8 h-8" />
              </div>
              <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] mb-6 tracking-[-0.03em] leading-tight">
                {data.title}
              </h1>
              <p className="text-xl text-[var(--color-ink-soft)] mb-10 leading-relaxed max-w-lg">
                {data.subtitle}
              </p>
              <ul className="space-y-4 mb-12 border-l border-[var(--color-rule)] pl-6">
                {data.features.map((f, i) => (
                  <li key={i} className="flex items-center text-[var(--color-ink)] text-lg">
                    <span className={`mr-4 font-bold ${data.theme}`}>·</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex gap-4">
                <Link href="/signup" className="inline-block bg-[var(--color-cachet)] text-white px-8 py-3 rounded-[6px] font-bold hover:-translate-y-[1px] transition-all shadow-sm">
                  Commencer
                </Link>
                <Link href="/company/contact" className="inline-block text-[var(--color-ink)] bg-[var(--color-paper-deep)] border border-[var(--color-rule)] px-8 py-3 rounded-[6px] font-bold hover:bg-[var(--color-paper)] hover:-translate-y-[1px] transition-all">
                  Démo
                </Link>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-md">
              <div className="w-full aspect-[4/5] bg-[var(--color-paper-deep)] border border-[var(--color-rule)] p-8 flex flex-col font-mono text-[var(--color-ink)] text-sm relative shadow-sm">
                
                {/* Document Mockup Header */}
                <div className="flex justify-between items-start mb-12 border-b border-[var(--color-rule)] pb-6">
                  <div>
                    <div className="font-bold text-lg">{data.title}</div>
                    <div className="text-[var(--color-ink-soft)]">Module NexaERP</div>
                  </div>
                  <div className={`w-10 h-10 ${data.theme}`}>
                    <Icon className="w-full h-full" />
                  </div>
                </div>
                
                {/* Document Mockup Body Lines */}
                <div className="space-y-6 flex-grow">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between items-center border-b border-[var(--color-rule)] pb-2 border-dashed">
                      <div className="h-4 w-1/2 bg-[var(--color-rule)] rounded-sm"></div>
                      <div className="h-4 w-1/4 bg-[var(--color-rule)] rounded-sm"></div>
                    </div>
                  ))}
                </div>
                
                {/* Document Mockup Footer */}
                <div className="mt-auto pt-6 border-t-[3px] border-double border-[var(--color-ink)] flex justify-between items-end">
                  <div className="text-xs text-[var(--color-ink-soft)]">Système de gestion intégré</div>
                  <div className="w-16 h-16 border-2 border-[var(--color-rule)] rounded-full flex items-center justify-center opacity-50">
                    <span className="text-[8px] uppercase tracking-widest rotate-[-15deg]">Approuvé</span>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
