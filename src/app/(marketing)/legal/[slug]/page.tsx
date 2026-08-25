"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { DocumentCheckIcon, ShieldCheckIcon, ScaleIcon } from "@heroicons/react/24/outline";

const LEGAL_PAGES: Record<string, { title: string, updated: string, icon: any }> = {
  privacy: {
    title: "Privacy Policy",
    updated: "August 1, 2026",
    icon: ShieldCheckIcon
  },
  terms: {
    title: "Terms of Service",
    updated: "August 1, 2026",
    icon: ScaleIcon
  },
  security: {
    title: "Security Overview",
    updated: "August 1, 2026",
    icon: DocumentCheckIcon
  }
};

export default function LegalPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const data = LEGAL_PAGES[params.slug];

  if (!data) return notFound();
  
  const Icon = data.icon;

  return (
    <div className="py-32 px-6 max-w-3xl mx-auto min-h-[80vh] relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-64 bg-gray-500/10 rounded-full blur-[80px] opacity-50 -z-10 pointer-events-none"></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-white mb-12 inline-flex items-center gap-2 transition-colors">
          &larr; Back to Home
        </Link>
        
        <div className="flex items-center gap-6 mb-12 pb-8 border-b border-white/10">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 backdrop-blur-md">
            <Icon className="w-10 h-10 text-gray-300" />
          </div>
          <div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight">{data.title}</h1>
            <p className="text-sm text-gray-500 mt-3 uppercase tracking-widest font-semibold">Last Updated: {data.updated}</p>
          </div>
        </div>
        
        <div className="prose prose-lg prose-invert text-gray-400 max-w-none font-light">
          <p>
            This is a placeholder for the full {data.title}. In a production environment, this page would contain the legally binding text, definitions, user obligations, liability limitations, and data processing agreements required for operating a SaaS platform.
          </p>
          <p>
            We take your privacy and data security seriously. For specific legal inquiries, please contact our legal department at legal@nexaerp.com.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
