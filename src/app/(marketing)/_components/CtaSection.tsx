"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import CachetStamp from "./CachetStamp";

export default function CtaSection() {
  const fadeInUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.3 }
  };

  return (
    <section className="w-full relative overflow-hidden bg-[var(--color-paper-deep)] py-[clamp(6rem,12vw,10rem)] border-t border-[var(--color-rule)]">
      
      {/* Background Cachet Motif */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0 transform scale-[3]">
        <CachetStamp />
      </div>

      <div className="max-w-[1120px] mx-auto px-6 relative z-10 text-center flex flex-col items-center">
        <motion.div {...fadeInUp}>
          <h2 className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] font-[var(--font-bricolage)] font-bold tracking-[-0.03em] text-[var(--color-ink)] mb-6 max-w-2xl mx-auto">
            Votre facturation peut déjà être parfaitement structurée.
          </h2>
          
          <p className="text-[clamp(1.125rem,2vw,1.25rem)] leading-[1.65] text-[var(--color-ink-soft)] max-w-xl mx-auto mb-10">
            Trente minutes pour ouvrir votre compte et émettre votre première facture. Nous vous accompagnons pour la reprise de vos clients et de vos produits.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-4 rounded-[6px] bg-[var(--color-cachet)] text-white font-bold text-lg hover:-translate-y-[1px] shadow-sm hover:shadow transition-all w-full sm:w-auto">
              Commencer
            </Link>
            <Link href="/company/contact" className="px-8 py-4 rounded-[6px] text-[var(--color-ink)] border border-[var(--color-rule)] font-semibold text-lg hover:bg-[var(--color-paper)] hover:-translate-y-[1px] transition-all w-full sm:w-auto bg-[var(--color-paper-deep)]">
              Parler à quelqu&apos;un
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
