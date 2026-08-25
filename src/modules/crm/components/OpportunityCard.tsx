"use client";

import { updateOpportunityStage } from "@/modules/crm/services/opportunity.service";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const STAGES = ["New", "Qualified", "DevisSent", "Won", "Lost"];

export function OpportunityCard({ opp }: { opp: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentIndex = STAGES.indexOf(opp.stage);
  
  function handleMove(direction: 1 | -1) {
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < STAGES.length) {
      startTransition(async () => {
        await updateOpportunityStage(opp.id, STAGES[nextIndex]);
        router.refresh();
      });
    }
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative group ${isPending ? 'opacity-50' : ''}`}>
      <div className="font-medium text-sm line-clamp-1 pr-6">{opp.title}</div>
      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
        {opp.company?.name}
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="font-semibold text-sm text-slate-700">
          {opp.estimatedValue ? new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(opp.estimatedValue) : "-"}
        </span>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        {currentIndex > 0 && (
          <button 
            onClick={() => handleMove(-1)}
            disabled={isPending}
            className="p-1 bg-white hover:bg-slate-100 rounded border shadow-sm"
            title="Move Left"
          >
            <ChevronLeftIcon className="h-3 w-3" />
          </button>
        )}
        {currentIndex < STAGES.length - 1 && (
          <button 
            onClick={() => handleMove(1)}
            disabled={isPending}
            className="p-1 bg-white hover:bg-slate-100 rounded border shadow-sm"
            title="Move Right"
          >
            <ChevronRightIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
