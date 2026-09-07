"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActivationStatus } from "@/modules/tenant/services/activation.service";
import { skipDataImport } from "@/modules/tenant/services/activation.service";
import { purgeDemoData } from "@/modules/tenant/services/onboarding.service";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface ActivationChecklistProps {
  status: ActivationStatus;
}

export function ActivationChecklist({ status }: ActivationChecklistProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(!status.isComplete);
  const [isPurging, startPurgeTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();
  const [confirmPurge, setConfirmPurge] = useState(false);

  function handlePurgeDemo() {
    startPurgeTransition(async () => {
      await purgeDemoData(status.tenantId);
      setConfirmPurge(false);
      router.refresh();
    });
  }

  function handleSkipImport() {
    startSkipTransition(async () => {
      await skipDataImport(status.tenantId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper)] p-6 shadow-xs relative">
      {/* Top row: Title, progress and toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold font-[var(--font-bricolage)] text-[var(--color-ink)]">
              Guide d&apos;activation de l&apos;entreprise
            </h2>
            {status.isDemo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                <SparklesIcon className="w-3.5 h-3.5" />
                Mode Démo
              </span>
            )}
            {status.isComplete && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Entreprise Activée
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">
            {status.completedCount} sur {status.totalCount} étapes complétées ({status.percentage}%).
            Suivez ces jalons pour démarrer vos opérations en toute conformité.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-32 bg-[var(--color-paper-deep)] border border-[var(--color-rule)] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[var(--color-cachet)] h-full transition-all duration-500 rounded-full"
              style={{ width: `${status.percentage}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] flex items-center gap-1 px-2 py-1 rounded-[4px] border border-[var(--color-rule)] hover:bg-[var(--color-paper-deep)] transition-colors cursor-pointer"
          >
            {isOpen ? (
              <>
                Masquer <ChevronUpIcon className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Afficher <ChevronDownIcon className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Demo data management notice */}
      {status.isDemo && isOpen && (
        <div className="mt-4 p-3 rounded-[4px] bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div>
            <span className="font-bold">Données d&apos;essai initialisées :</span> Un client exemple,
            un service d&apos;exemple et un devis brouillon sont présents pour explorer les flux de
            vente.
          </div>
          <div>
            {confirmPurge ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-900">Confirmer la suppression ?</span>
                <button
                  type="button"
                  onClick={handlePurgeDemo}
                  disabled={isPurging}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-[3px] font-bold transition-colors cursor-pointer"
                >
                  {isPurging ? "Suppression..." : "Oui, purger"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmPurge(false)}
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[3px] font-medium transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmPurge(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 font-semibold rounded-[3px] transition-colors cursor-pointer"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Purger les données d&apos;essai
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checklist Grid */}
      {isOpen && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {status.milestones.map((m, idx) => (
            <div
              key={m.id}
              className={`p-3.5 rounded-[4px] border transition-all flex flex-col justify-between ${
                m.completed
                  ? "bg-[var(--color-paper)] border-[var(--color-rule)]"
                  : "bg-[var(--color-paper-deep)]/40 border-[var(--color-rule)] hover:border-[var(--color-cachet)]/50"
              }`}
            >
              <div>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {m.completed ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--color-rule)] flex items-center justify-center text-[10px] font-bold text-[var(--color-ink-soft)]">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-bold ${
                        m.completed
                          ? "text-[var(--color-ink)] line-through opacity-80"
                          : "text-[var(--color-ink)]"
                      }`}
                    >
                      {m.title}
                    </h3>
                    <p className="text-xs text-[var(--color-ink-soft)] mt-1 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--color-rule)]/60 flex items-center justify-between">
                <Link
                  href={m.href}
                  className="text-xs font-bold text-[var(--color-cachet)] hover:underline inline-flex items-center gap-1"
                >
                  {m.actionText}
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </Link>

                {m.id === "data_import" && !m.completed && (
                  <button
                    type="button"
                    onClick={handleSkipImport}
                    disabled={isSkipping}
                    className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] underline cursor-pointer"
                  >
                    {isSkipping ? "Mise à jour..." : "Passer l'import"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
