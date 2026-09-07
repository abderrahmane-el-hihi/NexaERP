"use client";
import { motion } from "framer-motion";

export default function TrustSection() {
  const fadeInUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.3 }
  };

  return (
    <section className="w-full bg-[var(--color-paper-deep)] py-[clamp(5rem,10vw,8rem)] border-t border-[var(--color-rule)]">
      <div className="max-w-[1120px] mx-auto px-6">
        <motion.div {...fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-rule)]">
          
          <div className="pt-8 sm:pt-0 sm:pl-8 first:pt-0 first:pl-0">
            <h4 className="font-bold text-[var(--color-ink)] mb-3">Édité au Maroc.</h4>
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Plan comptable marocain, factures en français, support en français.
            </p>
          </div>
          
          <div className="pt-8 sm:pt-0 sm:pl-8">
            <h4 className="font-bold text-[var(--color-ink)] mb-3">Vos données sont à vous.</h4>
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Export complet, à tout moment, sans demander.
            </p>
          </div>
          
          <div className="pt-8 sm:pt-0 sm:pl-8">
            <h4 className="font-bold text-[var(--color-ink)] mb-3">On l&apos;utilise pour nos propres factures.</h4>
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Nos clients sont facturés avec NexaERP.
            </p>
          </div>
          
          <div className="pt-8 sm:pt-0 sm:pl-8">
            <h4 className="font-bold text-[var(--color-ink)] mb-3">Quelqu&apos;un répond.</h4>
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              05 22 00 00 00 · WhatsApp
            </p>
          </div>
          
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="mt-16 pt-8 border-t border-[var(--color-rule)]">
          <p className="font-mono text-xs text-[var(--color-ink-soft)] text-center">
            ICE 000000000000000 · IF 00000000 · RC 000000
          </p>
        </motion.div>
      </div>
    </section>
  );
}
