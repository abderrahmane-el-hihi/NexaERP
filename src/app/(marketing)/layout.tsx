import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ReactNode } from "react";
import "./marketing.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata = {
  title: "NexaERP — Facturation structurée & ERP pour PME marocaines",
  description: "La plateforme intégrée de facturation, stocks et gestion commerciale pour les entreprises marocaines.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${bricolage.variable} ${plexSans.variable} ${plexMono.variable} min-h-screen flex flex-col bg-[var(--color-paper)] text-[var(--color-ink)] font-sans antialiased`}
      style={{
        fontFamily: "var(--font-plex-sans), sans-serif",
      }}
    >
      <main className="flex-grow flex flex-col items-center w-full">
        {children}
      </main>
    </div>
  );
}
