"use client";
import { motion } from "framer-motion";

export default function ErpSection() {
  const fadeInUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.3 }
  };

  return (
    <section id="fonctions" className="w-full bg-[var(--color-paper-deep)] py-[clamp(5rem,10vw,8rem)] border-y border-[var(--color-rule)]">
      <div className="max-w-[1120px] mx-auto px-6">
        <motion.div {...fadeInUp} className="mb-12">
          {/* Section mark derived from rosette */}
          <div className="w-6 h-6 border-2 border-[var(--color-zellige)] mb-6 rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-[var(--color-zellige)]"></div>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-[var(--font-bricolage)] font-bold text-[var(--color-ink)]">
            Et c&apos;est un vrai ERP.
          </h2>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
            <h3 className="text-xl font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] mb-4">Stock</h3>
            <p className="text-[var(--color-ink-soft)] leading-relaxed">
              Ce que vous avez, ce que vous avez vendu, ce que ça vous a coûté.
            </p>
          </motion.div>
          
          <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
            <h3 className="text-xl font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] mb-4">Achats</h3>
            <p className="text-[var(--color-ink-soft)] leading-relaxed">
              Commandes, réceptions, factures fournisseurs qui se rapprochent toutes seules.
            </p>
          </motion.div>
          
          <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
            <h3 className="text-xl font-[var(--font-bricolage)] font-bold text-[var(--color-ink)] mb-4">Ce qu&apos;on vous doit</h3>
            <p className="text-[var(--color-ink-soft)] leading-relaxed">
              La liste de vos impayés, par ancienneté, avec les relances.
            </p>
          </motion.div>
        </div>
        
        <motion.div {...fadeInUp} transition={{ delay: 0.4 }} className="pt-8 border-t border-[var(--color-rule)]">
          <p className="text-lg font-medium text-[var(--color-ink)]">
            Comptabilité complète, plan comptable marocain, TVA prête à déclarer.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
