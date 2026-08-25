import Link from "next/link";
import { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] font-sans selection:bg-[#f06e53] selection:text-white text-gray-200 overflow-x-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12 max-w-7xl mx-auto w-full sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f06e53] to-[#fdbf50] flex items-center justify-center shadow-[0_0_15px_rgba(240,110,83,0.4)]">
            <span className="text-white font-bold text-lg leading-none">N</span>
          </div>
          <Link href="/" className="font-bold text-xl tracking-tight text-white">Nexa<span className="font-light text-gray-400">ERP</span></Link>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="bg-white hover:bg-gray-200 text-black px-5 py-2.5 rounded-full text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95">
            Start free trial
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="pt-20 pb-10 px-6 border-t border-white/10 mt-auto bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f06e53] to-[#fdbf50] flex items-center justify-center shadow-[0_0_10px_rgba(240,110,83,0.3)]">
                <span className="text-white font-bold text-sm leading-none">N</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-white">Nexa<span className="font-light text-gray-500">ERP</span></span>
            </div>
            <p className="text-sm text-gray-400 mb-6 max-w-sm">The modern, high-performance operating system for growing businesses. Built for speed, clarity, and scale.</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link href="/product/finance" className="hover:text-white transition-colors">Finance</Link></li>
              <li><Link href="/product/inventory" className="hover:text-white transition-colors">Inventory</Link></li>
              <li><Link href="/product/sales" className="hover:text-white transition-colors">Sales</Link></li>
              <li><Link href="/product/hr" className="hover:text-white transition-colors">HR & Payroll</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link href="/company/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/company/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/company/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/company/partners" className="hover:text-white transition-colors">Partners</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/legal/security" className="hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 NexaERP Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
            <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
