
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[var(--color-paper)] pt-16 pb-8 border-t border-[var(--color-rule)]">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-[var(--color-ink)] flex items-center justify-center">
              <span className="text-[var(--color-paper)] font-bold text-lg leading-none font-[var(--font-bricolage)]">N</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-[var(--color-ink)] font-[var(--font-bricolage)]">
              Nexa<span className="font-normal">ERP</span>
            </span>
          </div>
          
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-[var(--color-ink-soft)]">
            <Link href="#fonctions" className="hover:text-[var(--color-ink)] transition-colors">Fonctions</Link>
            <Link href="#tarifs" className="hover:text-[var(--color-ink)] transition-colors">Tarifs</Link>
            <Link href="/login" className="hover:text-[var(--color-ink)] transition-colors">Connexion</Link>
            <Link href="/legal/terms" className="hover:text-[var(--color-ink)] transition-colors">CGU</Link>
            <Link href="/legal/privacy" className="hover:text-[var(--color-ink)] transition-colors">Confidentialit�</Link>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-8 border-t border-[var(--color-rule)] text-xs text-[var(--color-ink-soft)] font-mono">
          <p>ICE 000000000000000 � IF 00000000 � RC 000000</p>
          <p>Donn�es h�berg�es au Maroc. Conformit� CNDP garantie.</p>
        </div>
      </div>
    </footer>
  );
}

