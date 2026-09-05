"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { BanknotesIcon, CubeIcon, CreditCardIcon, UserGroupIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

const PRODUCTS: Record<string, { title: string, subtitle: string, icon: ComponentType<{ className?: string }>, features: string[], color: string, glow: string }> = {
  finance: {
    title: "Financial Accounting",
    subtitle: "Keep your books flawless automatically.",
    icon: BanknotesIcon,
    features: ["General Ledger", "Accounts Payable", "Accounts Receivable", "Trial Balance", "Journal Entries"],
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    glow: "bg-indigo-500/20"
  },
  inventory: {
    title: "Inventory Ops",
    subtitle: "Never run out of stock unexpectedly.",
    icon: CubeIcon,
    features: ["Multi-warehouse", "Lot tracking", "Reorder points", "Purchase Orders", "Supplier Bills"],
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    glow: "bg-emerald-500/20"
  },
  sales: {
    title: "Sales & Invoicing",
    subtitle: "Get invoices out and paid faster.",
    icon: CreditCardIcon,
    features: ["Quotes to Orders", "Delivery Notes", "Branded Invoices", "Credit Notes", "Sales Analytics"],
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    glow: "bg-orange-500/20"
  },
  hr: {
    title: "HR & Payroll",
    subtitle: "Manage your team simply.",
    icon: UserGroupIcon,
    features: ["Employee Records", "Time Off", "Payroll Runs", "Payslip Generation", "Role Management"],
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    glow: "bg-blue-500/20"
  }
};

export default function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const data = PRODUCTS[params.slug];

  if (!data) return notFound();
  
  const Icon = data.icon;

  return (
    <div className="py-24 px-6 max-w-5xl mx-auto min-h-[80vh]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-white mb-12 inline-flex items-center gap-2 transition-colors">
          &larr; Back to Home
        </Link>
        
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1">
            <div className={`w-16 h-16 rounded-2xl ${data.color} border flex items-center justify-center mb-8 backdrop-blur-md shadow-lg`}>
              <Icon className="w-8 h-8" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">{data.title}</h1>
            <p className="text-xl text-gray-400 mb-10 font-light leading-relaxed">{data.subtitle}</p>
            <ul className="space-y-5 mb-12">
              {data.features.map((f, i) => (
                <li key={i} className="flex items-center gap-4 text-gray-300 font-medium">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="inline-block bg-white hover:bg-gray-200 text-black px-10 py-4 rounded-full text-base font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform hover:-translate-y-1">
              Start free trial
            </Link>
          </div>
          <div className="flex-1 w-full max-w-md perspective-1000">
            <motion.div 
              initial={{ rotateY: -15, rotateX: 10 }}
              animate={{ rotateY: 0, rotateX: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="w-full aspect-square rounded-[3rem] bg-[#0a0a0a] border border-white/10 relative overflow-hidden flex items-center justify-center p-10 shadow-2xl"
            >
              {/* Abstract decorative elements */}
              <div className={`absolute top-0 right-0 w-80 h-80 ${data.glow} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`}></div>
              <div className={`absolute bottom-0 left-0 w-80 h-80 ${data.glow} rounded-full blur-3xl translate-y-1/2 -translate-x-1/2`}></div>
              
              <div className="relative z-10 w-full h-full bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl flex flex-col p-6 ring-1 ring-white/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-12 h-12 rounded-xl ${data.color} border flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="h-6 w-32 bg-white/5 rounded-md"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 w-full bg-white/5 rounded-md"></div>
                  <div className="h-4 w-5/6 bg-white/5 rounded-md"></div>
                  <div className="h-4 w-4/6 bg-white/5 rounded-md"></div>
                </div>
                <div className="mt-auto pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                   <div className="h-20 bg-white/5 rounded-xl border border-white/5"></div>
                   <div className="h-20 bg-white/5 rounded-xl border border-white/5"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
