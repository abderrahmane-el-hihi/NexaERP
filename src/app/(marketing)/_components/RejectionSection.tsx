"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RejectionSection() {
  const fadeInUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.3 }
  };

  return (
    <section className="w-full max-w-[1120px] mx-auto px-6 py-[clamp(5rem,10vw,8rem)] border-t border-[var(--color-rule)]">
      <motion.div {...fadeInUp} className="max-w-2xl">
        {/* Section mark derived from rosette */}
        <div className="w-6 h-6 border-2 border-[var(--color-terre)] mb-6 rotate-45 flex items-center justify-center">
          <div className="w-2 h-2 bg-[var(--color-terre)]"></div>
        </div>
        
        <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] mb-12">
          Quand ça bloque, vous savez pourquoi.
        </h2>
        
        <div className="bg-[var(--color-paper-deep)] p-8 rounded-[2px] border border-[var(--color-rule)] mb-8 font-mono text-sm relative">
          <div className="text-[var(--color-terre)] font-bold mb-4 flex items-center gap-2">
            <span>✕</span> Rejetée par le pré-contrôle
          </div>
          <div className="text-[var(--color-ink-soft)] mb-6">
            ICE_MISSING · champ : client.ICE
          </div>
          <div className="text-[var(--color-ink)] mb-8 max-w-md leading-relaxed">
            L&apos;ICE du client est absent.<br />
            Renseignez-le dans la fiche de MAROC PIÈCES AUTO SARL.
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-[var(--color-rule)] pt-4 mt-8 gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[var(--color-terre)] text-[var(--color-paper)] px-4 py-2 font-bold hover:opacity-90 rounded-[6px] transition-all text-sm"
              >
                Tester ce flux en démo &rarr;
              </Link>
              <span className="text-xs text-[var(--color-ink-soft)] italic">(Exemple de pré-contrôle)</span>
            </div>
            <div className="text-[var(--color-ink-soft)] text-xs">Facture n° FA-2027-00015 · conservée</div>
          </div>
        </div>
        
        <p className="text-[clamp(1.125rem,2vw,1.25rem)] leading-[1.65] text-[var(--color-ink)]">
          La facture garde son numéro. Une facture rejetée n&apos;a jamais été émise, elle est corrigée et renvoyée — sans trou dans votre numérotation.
        </p>
      </motion.div>
    </section>
  );
}
