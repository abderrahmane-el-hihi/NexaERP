
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full max-w-[1120px] mx-auto px-6 py-8 flex items-center justify-between border-b border-[var(--color-rule)] mb-8">
      <div className="flex items-center gap-3">
        {/* Simple geometric mark, no gradients */}
        <div className="w-8 h-8 rounded-[2px] bg-[var(--color-ink)] flex items-center justify-center">
          <span className="text-[var(--color-paper)] font-bold text-lg leading-none font-[var(--font-bricolage)]">N</span>
        </div>
        <Link href="/" className="font-bold text-xl tracking-tight text-[var(--color-ink)] font-[var(--font-bricolage)]">
          Nexa<span className="font-normal">ERP</span>
        </Link>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide">
        <Link href="#fonctions" className="hover:text-[var(--color-ink)] transition-colors">Fonctions</Link>
        <Link href="#tarifs" className="hover:text-[var(--color-ink)] transition-colors">Tarifs</Link>
      </div>
      
      <div className="flex items-center gap-4">
        <Link href="/login" className="hidden md:block text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-cachet)] transition-colors">
          Connexion
        </Link>
        <Link href="/signup" className="px-4 py-2 rounded-[6px] border border-[var(--color-ink)] text-[var(--color-ink)] font-bold text-sm hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] transition-all">
          Commencer
        </Link>
      </div>
    </header>
  );
}

