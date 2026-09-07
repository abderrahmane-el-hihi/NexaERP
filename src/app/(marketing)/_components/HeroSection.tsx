"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import CachetStamp, { stampAnimation } from "./CachetStamp";

export default function HeroSection() {
  const invoiceRise = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const lineStagger = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3, staggerChildren: 0.04 },
  };

  return (
    <section className="w-full max-w-[1120px] mx-auto px-6 py-20 flex flex-col md:flex-row gap-12 items-center justify-between">
      
      {/* Left Column: Copy & CTA */}
      <div className="flex-1 max-w-lg space-y-8">
        <div className="flex items-center gap-3 text-[var(--color-safran)] font-mono text-sm uppercase tracking-widest font-medium">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2L22 22H2L12 2Z"/></svg>
          Facturation Électronique — DGI
        </div>
        
        <h1 className="text-[clamp(2.75rem,6vw,5rem)] leading-[1.02] font-[var(--font-bricolage)] font-bold tracking-[-0.03em] text-[var(--color-ink)]">
          À partir de janvier,<br />
          une facture non validée<br />
          n&apos;est plus une facture.
        </h1>
        
        <p className="text-[clamp(1.125rem,2vw,1.25rem)] leading-[1.65] text-[var(--color-ink-soft)] max-w-md">
          NexaERP transmet vos factures à la plateforme de la DGI, récupère la validation, et vous prévient si quelque chose bloque.
        </p>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
          <Link href="/signup" className="px-6 py-3 rounded-[6px] bg-[var(--color-cachet)] text-white font-bold hover:-translate-y-[1px] shadow-sm hover:shadow transition-all">
            Voir une facture validée
          </Link>
          <Link href="/company/contact" className="px-6 py-3 rounded-[6px] text-[var(--color-ink)] border border-[var(--color-rule)] font-semibold hover:bg-[var(--color-paper-deep)] hover:-translate-y-[1px] transition-all">
            Parler à quelqu&apos;un
          </Link>
        </div>
        
        <p className="font-mono text-sm text-[var(--color-safran)] pt-4">J–117 avant l&apos;obligation</p>
      </div>

      {/* Right Column: Invoice Document */}
      <div className="flex-1 w-full max-w-[560px] relative">
        <motion.div 
          {...invoiceRise}
          className="w-full aspect-[1/1.4] bg-[var(--color-paper)] rounded-[2px] border border-[var(--color-rule)] shadow-[0_20px_40px_rgba(0,0,0,0.06)] p-8 flex flex-col font-mono text-[var(--color-ink)] text-sm"
        >
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="font-bold text-lg">FACTURE</div>
              <div className="text-[var(--color-ink-soft)]">FA-2027-00014</div>
            </div>
            <div className="text-right">
              <div className="font-bold">Client</div>
              <div className="text-[var(--color-ink-soft)]">ICE: 001234567890001</div>
            </div>
          </div>
          
          <div className="border-b border-[var(--color-rule)] mb-4"></div>
          
          <motion.div {...lineStagger} className="space-y-4 flex-grow">
            <motion.div className="flex justify-between"><span>Prestation de service</span><span>12 000,00</span></motion.div>
            <motion.div className="flex justify-between"><span>Frais de déplacement</span><span>2 400,00</span></motion.div>
          </motion.div>
          
          <div className="border-t-[3px] border-double border-[var(--color-ink)] pt-4 mt-auto">
            <div className="flex justify-between mb-2"><span>TVA 20%</span><span>2 880,00</span></div>
            <div className="flex justify-between font-bold text-lg"><span>Total MAD</span><span>17 280,00</span></div>
          </div>

          <motion.div {...stampAnimation} className="absolute bottom-16 right-8 opacity-90 z-10">
             <CachetStamp />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
