"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/auth/actions";
import { motion } from "framer-motion";

import { use } from "react";

export default function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = use(props.searchParams);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505]/0 to-transparent rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f06e53] to-[#fdbf50] flex items-center justify-center shadow-[0_0_15px_rgba(240,110,83,0.3)]">
                  <span className="text-white font-bold text-xl leading-none">N</span>
                </div>
              </Link>
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
              <p className="text-gray-400 text-sm">Sign in to your workspace.</p>
            </div>

            {searchParams?.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {searchParams.error}
              </div>
            )}
            
            <form action={login} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="name@company.com"
                  className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f06e53]/50 focus:border-[#f06e53]/50 transition-all"
                  required 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
                  <Link href="#" className="text-xs text-[#f06e53] hover:text-[#fdbf50] transition-colors">Forgot password?</Link>
                </div>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#f06e53]/50 focus:border-[#f06e53]/50 transition-all"
                  required 
                />
              </div>
              <button type="submit" className="w-full h-12 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] mt-4">
                Sign In
              </button>
            </form>
            
            <div className="mt-8 text-center text-sm text-gray-400">
              Don't have an account? <Link href="/signup" className="text-white hover:text-[#f06e53] font-medium transition-colors">Start your free trial</Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
