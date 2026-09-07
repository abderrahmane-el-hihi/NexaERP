"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PricingSection() {
  const fadeInUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.3 }
  };

  return (
    <section id="tarifs" className="w-full max-w-[1120px] mx-auto px-6 py-[clamp(5rem,10vw,8rem)]">
      <motion.div {...fadeInUp} className="mb-12">
        <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] mb-8">
          Tarifs
        </h2>
        
        <div className="border-l-4 border-[var(--color-safran)] pl-6 py-2 mb-12 bg-[var(--color-paper-deep)] p-4 rounded-r-[2px]">
          <p className="font-bold text-[var(--color-ink)]">Jusqu&apos;à 90 % pris en charge.</p>
          <p className="text-[var(--color-ink-soft)]">
            Les programmes publics de digitalisation couvrent une large part du coût pour les TPE et PME. Nous montons le dossier avec vous.<br/>
            <span className="italic text-sm">Éligibilité à confirmer selon votre situation.</span>
          </p>
        </div>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Essentiel */}
        <motion.div {...fadeInUp} transition={{ delay: 0.1 }} className="border border-[var(--color-rule)] p-8 rounded-[2px] flex flex-col bg-[var(--color-paper)]">
          <h3 className="text-xl font-bold font-[var(--font-bricolage)] text-[var(--color-ink)] mb-2 uppercase tracking-wide">Essentiel</h3>
          <div className="font-mono text-2xl font-bold text-[var(--color-ink)] mb-1">4 800 MAD/an</div>
          <div className="font-mono text-xs text-[var(--color-ink-soft)] mb-8">à partir de 480 MAD/an après subvention</div>
          
          <div className="text-sm text-[var(--color-ink-soft)] mb-8 font-medium">2 Utilisateurs</div>
          
          <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-8 flex-grow">
            Facturation + DGI, clients, TVA, relances
          </p>
          
          <Link href="/signup" className="block text-center w-full py-3 rounded-[6px] text-[var(--color-ink)] border border-[var(--color-rule)] font-semibold hover:bg-[var(--color-paper-deep)] hover:-translate-y-[1px] transition-all">
            Choisir
          </Link>
        </motion.div>
        
        {/* Gestion (Recommended) */}
        <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="border-2 border-[var(--color-cachet)] p-8 rounded-[2px] flex flex-col bg-[var(--color-paper)] relative -mt-4 mb-4 shadow-[0_10px_30px_rgba(107,47,160,0.1)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-cachet)] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">Recommandé</div>
          
          <h3 className="text-xl font-bold font-[var(--font-bricolage)] text-[var(--color-cachet)] mb-2 uppercase tracking-wide">Gestion</h3>
          <div className="font-mono text-2xl font-bold text-[var(--color-ink)] mb-1">12 000 MAD/an</div>
          <div className="font-mono text-xs text-[var(--color-cachet)] mb-8 opacity-80">à partir de 1 200 MAD/an après subvention</div>
          
          <div className="text-sm text-[var(--color-ink-soft)] mb-8 font-medium">5 Utilisateurs</div>
          
          <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-8 flex-grow">
            + achats, stock, marge, rapprochement bancaire
          </p>
          
          <Link href="/signup" className="block text-center w-full py-3 rounded-[6px] bg-[var(--color-cachet)] text-white font-bold hover:-translate-y-[1px] shadow-sm hover:shadow transition-all">
            Choisir
          </Link>
        </motion.div>
        
        {/* Complet */}
        <motion.div {...fadeInUp} transition={{ delay: 0.3 }} className="border border-[var(--color-rule)] p-8 rounded-[2px] flex flex-col bg-[var(--color-paper)]">
          <h3 className="text-xl font-bold font-[var(--font-bricolage)] text-[var(--color-ink)] mb-2 uppercase tracking-wide">Complet</h3>
          <div className="font-mono text-2xl font-bold text-[var(--color-ink)] mb-1">24 000 MAD/an</div>
          <div className="font-mono text-xs text-[var(--color-ink-soft)] mb-8">à partir de 2 400 MAD/an après subvention</div>
          
          <div className="text-sm text-[var(--color-ink-soft)] mb-8 font-medium">12 Utilisateurs</div>
          
          <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-8 flex-grow">
            + comptabilité complète, multi-site, support prioritaire
          </p>
          
          <Link href="/company/contact" className="block text-center w-full py-3 rounded-[6px] text-[var(--color-ink)] border border-[var(--color-rule)] font-semibold hover:bg-[var(--color-paper-deep)] hover:-translate-y-[1px] transition-all">
            Nous contacter
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
