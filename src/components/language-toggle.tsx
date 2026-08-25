"use client";

import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/i18n.service";
import { Locale } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";

export function LanguageToggle({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();

  const handleToggle = async () => {
    const nextLocale: Locale = currentLocale === "en" ? "fr" : "en";
    await setLocale(nextLocale);
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-9 px-0 border border-border bg-card hover:bg-muted font-bold text-xs uppercase"
      onClick={handleToggle}
    >
      {currentLocale}
    </Button>
  );
}
