"use client";
import { motion, MotionProps } from "framer-motion";

export const stampAnimation: MotionProps = {
  initial: { opacity: 0, scale: 1.6, rotate: 0 },
  animate: { opacity: 0.9, scale: 1, rotate: -8 },
  transition: { type: "spring", stiffness: 200, damping: 15, delay: 0.9 },
};

export default function CachetStamp({ reference }: { reference?: string }) {
  // A generated SVG that looks like a rubber stamp with a slightly imperfect circle
  return (
    <div className="relative w-32 h-32 text-[var(--color-cachet)] pointer-events-none select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
        <path id="curve" d="M 50 10 A 40 40 0 1 1 49.9 10" fill="transparent" />
        <text className="font-bold text-[10px] tracking-widest uppercase">
          <textPath href="#curve" startOffset="50%" textAnchor="middle">
            Validée · DGI · Validée · DGI
          </textPath>
        </text>
        <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2 8 3" fill="transparent" className="opacity-80" />
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="3" strokeDasharray="10 2 20 3 5 4" fill="transparent" className="opacity-90" />
        <text x="50" y="52" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">
          {reference || "FA-2027-00014"}
        </text>
      </svg>
    </div>
  );
}
