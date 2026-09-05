"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { SparklesIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, HandRaisedIcon } from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

const COMPANY_PAGES: Record<string, { title: string, content: string, icon: ComponentType<{ className?: string }>, color: string, glow: string }> = {
  about: {
    title: "About Us",
    content: "NexaERP was founded with a simple mission: to build the connected business platform that growing companies deserve. We believe you shouldn't need a million-dollar enterprise budget to get software that actually works together.",
    icon: SparklesIcon,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    glow: "bg-indigo-500/20"
  },
  careers: {
    title: "Careers",
    content: "Join our growing team. We are always looking for passionate engineers, designers, and customer success advocates who want to help small businesses thrive. Check our open positions or send a general application.",
    icon: BriefcaseIcon,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    glow: "bg-emerald-500/20"
  },
  contact: {
    title: "Contact Us",
    content: "Have a question or need to get in touch? Reach out to our support team at support@nexaerp.com, or give our sales team a call. We're here to help you get the most out of your business.",
    icon: ChatBubbleLeftRightIcon,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    glow: "bg-blue-500/20"
  },
  partners: {
    title: "Partners",
    content: "Become a NexaERP certified partner and help your clients implement the perfect system for their growing business. We offer competitive revenue sharing and dedicated partner support resources.",
    icon: HandRaisedIcon,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    glow: "bg-orange-500/20"
  }
};

export default function CompanyPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const data = COMPANY_PAGES[params.slug];

  if (!data) return notFound();
  
  const Icon = data.icon;

  return (
    <div className="py-32 px-6 max-w-4xl mx-auto min-h-[80vh] relative">
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-96 ${data.glow} rounded-full blur-[100px] opacity-50 -z-10 pointer-events-none`}></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-white mb-12 inline-flex items-center gap-2 transition-colors">
          &larr; Back to Home
        </Link>
        
        <div className="flex flex-col md:flex-row gap-16">
          <div className="md:w-1/3 shrink-0">
            <div className={`w-20 h-20 rounded-2xl ${data.color} border flex items-center justify-center mb-8 backdrop-blur-md`}>
              <Icon className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">{data.title}</h1>
          </div>
          
          <div className="md:w-2/3">
            <div className="prose prose-lg prose-invert text-gray-400 max-w-none">
              <p className="leading-relaxed text-xl font-light">{data.content}</p>
            </div>
            
            <div className="mt-16 p-8 bg-[#0a0a0a] rounded-3xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none"></div>
              <div className="relative z-10">
                <h3 className="font-bold text-white text-lg mb-1">Want to learn more?</h3>
                <p className="text-sm text-gray-500">Create a free account to explore the platform.</p>
              </div>
              <Link href="/signup" className="relative z-10 shrink-0 inline-block text-black bg-white px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg">
                Get started for free
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
