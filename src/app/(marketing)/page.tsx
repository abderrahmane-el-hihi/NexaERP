"use client";

import Link from "next/link";
import { motion, type MotionProps } from "framer-motion";
import { 
  CheckCircleIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  CubeIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

const fadeInUp: MotionProps = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 }
};

const staggerContainer: MotionProps = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: "-50px" },
  transition: { staggerChildren: 0.15 }
};

// Sleek Dark Mode UI Abstraction
const AbstractDashboard = () => (
  <div className="relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col group ring-1 ring-white/5">
    {/* Header */}
    <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-black/40 backdrop-blur-md">
      <div className="flex gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-700 group-hover:bg-red-500 transition-colors"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-700 group-hover:bg-yellow-500 transition-colors"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-700 group-hover:bg-green-500 transition-colors"></div>
      </div>
      <div className="flex gap-3">
        <div className="w-20 h-3 bg-white/5 rounded-full"></div>
        <div className="w-5 h-5 bg-gradient-to-tr from-[#f06e53] to-[#fdbf50] rounded-full"></div>
      </div>
    </div>
    {/* Body */}
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/4 border-r border-white/5 p-4 space-y-4 bg-[#0a0a0a]">
        <div className="w-full h-5 bg-white/10 rounded-md"></div>
        <div className="w-3/4 h-3 bg-white/5 rounded-md"></div>
        <div className="w-5/6 h-3 bg-white/5 rounded-md"></div>
        <div className="w-4/5 h-3 bg-white/5 rounded-md"></div>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900/40 via-[#050505] to-[#050505]">
        <div className="flex justify-between items-center">
          <div className="w-1/3 h-6 bg-white/10 rounded-md"></div>
          <div className="w-1/5 h-6 bg-[#f06e53]/80 rounded-md shadow-[0_0_15px_rgba(240,110,83,0.3)]"></div>
        </div>
        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col justify-between hover:bg-white/10 transition-colors">
            <div className="w-1/2 h-2 bg-indigo-400/50 rounded-full"></div>
            <div className="w-3/4 h-5 bg-white/90 rounded-md"></div>
          </div>
          <div className="h-20 bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col justify-between hover:bg-white/10 transition-colors">
            <div className="w-1/2 h-2 bg-emerald-400/50 rounded-full"></div>
            <div className="w-3/4 h-5 bg-white/90 rounded-md"></div>
          </div>
          <div className="h-20 bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col justify-between hover:bg-white/10 transition-colors">
            <div className="w-1/2 h-2 bg-orange-400/50 rounded-full"></div>
            <div className="w-3/4 h-5 bg-white/90 rounded-md"></div>
          </div>
        </div>
        {/* Chart Area */}
        <div className="flex-1 border border-white/5 rounded-xl bg-white/[0.02] p-4 flex items-end gap-2 relative overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:1rem_1rem]"></div>
          {[40, 60, 45, 90, 65, 100, 80].map((height, i) => (
            <motion.div 
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 1.5, delay: i * 0.1, ease: "easeOut" }}
              className="flex-1 bg-gradient-to-t from-[#f06e53]/80 to-[#fdbf50] rounded-t-sm relative z-10"
              style={{ filter: "drop-shadow(0 0 8px rgba(240,110,83,0.3))" }}
            ></motion.div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default function MarketingLandingPage() {
  return (
    <div className="relative">
      {/* Global Background Glow */}
      <div className="absolute top-0 inset-x-0 h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505] -z-20 pointer-events-none"></div>
      
      {/* HERO SECTION */}
      <section className="pt-24 pb-24 px-6 md:pt-32 md:pb-32 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div 
            className="max-w-2xl relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium text-xs mb-8 backdrop-blur-md">
              <SparklesIcon className="w-4 h-4 text-[#fdbf50]" />
              The operating system for modern business
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
              Stop running on <br className="hidden md:block"/> spreadsheets.
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-lg font-light">
              NexaERP connects your accounting, inventory, sales, and HR into one impossibly fast platform. Built for growing teams who demand precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup" className="bg-white hover:bg-gray-200 text-black px-8 py-4 rounded-full text-base font-bold transition-transform hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                Start building
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link href="/company/contact" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full text-base font-bold transition-all text-center backdrop-blur-sm">
                Book a demo
              </Link>
            </div>
          </motion.div>

          <motion.div 
            className="relative lg:ml-auto w-full z-10 perspective-1000"
            initial={{ opacity: 0, rotateX: 10, y: 40 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#f06e53]/20 to-indigo-500/20 rounded-[2rem] transform rotate-3 scale-105 -z-10 blur-3xl"></div>
            <AbstractDashboard />
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS (Minimal Nodes) */}
      <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto relative border-t border-white/5">
        <motion.div className="text-center mb-24" {...fadeInUp}>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Clarity through connection</h2>
          <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto">A modular architecture that breaks down data silos instantly.</p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-3 gap-8 relative"
          {...staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Connecting line */}
          <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent -z-10"></div>

          {[
            { 
              step: "01",
              title: "Onboard", 
              desc: "Import master data seamlessly. Skip the months-long implementation and costly consultants.",
              icon: <BoltIcon className="w-8 h-8 text-white" />
            },
            { 
              step: "02",
              title: "Connect", 
              desc: "Every module talks. A sale depletes stock and writes to the ledger in a single transaction.",
              icon: <ArrowsRightLeftIcon className="w-8 h-8 text-white" />
            },
            { 
              step: "03",
              title: "Scale", 
              desc: "Make decisions on live data. Monitor cash flow, valuations, and departmental costs in real time.",
              icon: <ChartBarIcon className="w-8 h-8 text-white" />
            }
          ].map((item, i) => (
            <motion.div key={i} {...fadeInUp} className="relative group">
              <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-xl flex items-center justify-center relative group-hover:border-white/30 transition-colors z-10">
                <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {item.icon}
                <div className="absolute -top-3 -right-3 bg-[#f06e53] text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg shadow-[#f06e53]/30">
                  {item.step}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4 text-center">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed text-center font-light">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CORE MODULES (Bento Grid) */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div className="mb-16" {...fadeInUp}>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Enterprise capabilities.<br/>Startup speed.</h2>
          <p className="text-lg text-gray-400 font-light max-w-2xl">Everything you need to run operations, engineered into a single codebase.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 auto-rows-[250px]">
          {/* Finance (Large) */}
          <motion.div 
            className="md:col-span-2 bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 hover:border-white/15 transition-colors relative overflow-hidden group"
            {...fadeInUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <BanknotesIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Financial Accounting</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-md font-light">Keep your books flawless automatically. Real-time trial balances, automated journal entries, and multi-currency ledgers that close books faster.</p>
              </div>
            </div>
          </motion.div>

          {/* Sales (Small) */}
          <motion.div 
            className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 hover:border-white/15 transition-colors relative overflow-hidden group"
            {...fadeInUp} initial="initial" whileInView="whileInView" viewport={{ once: true }} transition={{ delay: 0.1 }}
          >
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl translate-y-1/2 translate-x-1/4 group-hover:bg-orange-500/20 transition-colors"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <CreditCardIcon className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Sales & Invoicing</h3>
                <p className="text-gray-400 text-sm font-light">Convert quotes to orders and issue branded invoices instantly.</p>
              </div>
            </div>
          </motion.div>

          {/* Inventory (Small) */}
          <motion.div 
            className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 hover:border-white/15 transition-colors relative overflow-hidden group"
            {...fadeInUp} initial="initial" whileInView="whileInView" viewport={{ once: true }} transition={{ delay: 0.2 }}
          >
             <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/4 -translate-x-1/4 group-hover:bg-emerald-500/20 transition-colors"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <CubeIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Inventory Ops</h3>
                <p className="text-gray-400 text-sm font-light">Track multi-warehouse levels, lots, and automated reorder points.</p>
              </div>
            </div>
          </motion.div>

          {/* HR (Large) */}
          <motion.div 
            className="md:col-span-2 bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 hover:border-white/15 transition-colors relative overflow-hidden group"
            {...fadeInUp} initial="initial" whileInView="whileInView" viewport={{ once: true }} transition={{ delay: 0.3 }}
          >
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 group-hover:bg-blue-500/20 transition-colors"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <UserGroupIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">HR & Payroll</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-md font-light">Manage your team simply. Centralize employee records, track time off, and automate standard payroll runs directly into your financials.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 relative border-t border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Transparent pricing</h2>
            <p className="text-lg text-gray-400 font-light">Start for free, upgrade when you need more power.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            {/* Starter */}
            <motion.div className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5" {...fadeInUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-sm text-gray-500 mb-6 font-light">For small teams getting started.</p>
              <div className="text-4xl font-bold text-white mb-6">$49<span className="text-lg font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-8 text-sm text-gray-400 font-light">
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-gray-600 shrink-0"/> Up to 5 users</li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-gray-600 shrink-0"/> Core Finance (GL, AP, AR)</li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-gray-600 shrink-0"/> Basic Inventory</li>
              </ul>
              <Link href="/signup" className="block text-center w-full py-3 rounded-full border border-white/10 text-white font-bold hover:bg-white/5 transition-colors">Start Trial</Link>
            </motion.div>

            {/* Growth (Highlighted) */}
            <motion.div className="bg-[#111111] rounded-3xl p-8 relative transform md:-translate-y-4 border border-white/20 shadow-[0_0_40px_rgba(240,110,83,0.15)]" {...fadeInUp} initial="initial" whileInView="whileInView" viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#f06e53] to-[#fdbf50] text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">Most Popular</div>
              <h3 className="text-xl font-bold text-white mb-2">Growth</h3>
              <p className="text-sm text-gray-400 mb-6 font-light">For growing operations.</p>
              <div className="text-4xl font-bold text-white mb-6">$149<span className="text-lg font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-8 text-sm text-gray-300 font-light">
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-[#f06e53] shrink-0"/> Up to 25 users</li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-[#f06e53] shrink-0"/> Multi-warehouse & Lots</li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-[#f06e53] shrink-0"/> Approval Workflows</li>
              </ul>
              <Link href="/signup" className="block text-center w-full py-3 rounded-full bg-white text-black hover:bg-gray-200 font-bold transition-colors shadow-lg shadow-white/10">Start Trial</Link>
            </motion.div>

            {/* Business */}
            <motion.div className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5" {...fadeInUp} initial="initial" whileInView="whileInView" viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <h3 className="text-xl font-bold text-white mb-2">Business</h3>
              <p className="text-sm text-gray-500 mb-6 font-light">For established companies.</p>
              <div className="text-4xl font-bold text-white mb-6">$399<span className="text-lg font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-8 text-sm text-gray-400 font-light">
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-gray-600 shrink-0"/> Unlimited users</li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-gray-600 shrink-0"/> HR & Payroll processing</li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-gray-600 shrink-0"/> Full API Access</li>
              </ul>
              <Link href="/company/contact" className="block text-center w-full py-3 rounded-full border border-white/10 text-white font-bold hover:bg-white/5 transition-colors">Contact Sales</Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 relative border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#050505] -z-10"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-8 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Ready to build?</h2>
          <p className="text-xl text-gray-400 mb-12 font-light">Join the next generation of businesses running their operations on NexaERP.</p>
          <Link href="/signup" className="inline-block bg-white text-black px-12 py-5 rounded-full text-lg font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform hover:scale-105 active:scale-95">
            Start your free trial
          </Link>
        </div>
      </section>
    </div>
  );
}