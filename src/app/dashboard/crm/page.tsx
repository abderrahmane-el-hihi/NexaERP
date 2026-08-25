import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { getOpportunities } from "@/modules/crm/services/opportunity.service";
import { getCompanies } from "@/modules/crm/services/company.service";
import { AddOpportunityDialog } from "@/modules/crm/components/AddOpportunityDialog";
import { OpportunityCard } from "@/modules/crm/components/OpportunityCard";

const STAGES = [
  { key: "New", label: "New Lead", color: "bg-slate-100 border-slate-200" },
  { key: "Qualified", label: "Qualified", color: "bg-blue-50 border-blue-200" },
  { key: "DevisSent", label: "Devis Sent", color: "bg-amber-50 border-amber-200" },
  { key: "Won", label: "Won ✓", color: "bg-green-50 border-green-200" },
  { key: "Lost", label: "Lost", color: "bg-red-50 border-red-200" },
];

export default async function CRMPage() {
  const [opportunities, companies] = await Promise.all([
    getOpportunities(),
    getCompanies(),
  ]);

  const oppsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.key] = opportunities.filter((o) => o.stage === stage.key);
    return acc;
  }, {} as Record<string, typeof opportunities>);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-6 w-6 text-primary" />
            Sales Pipeline
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your deals across every stage.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/crm/companies">
            <Button variant="outline" size="sm">Companies</Button>
          </Link>
          <Link href="/dashboard/crm/contacts">
            <Button variant="outline" size="sm">Contacts</Button>
          </Link>
          <AddOpportunityDialog companies={companies.map(c => ({ id: c.id, name: c.name }))} />
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageOpps = oppsByStage[stage.key] || [];
          return (
            <div
              key={stage.key}
              className={`flex flex-col rounded-xl border-2 ${stage.color} min-w-[240px] max-w-[280px] flex-shrink-0`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                <span className="font-medium text-sm">{stage.label}</span>
                <Badge variant="secondary" className="text-xs">{stageOpps.length}</Badge>
              </div>
              {/* Cards area */}
              <div className="flex-1 p-3 space-y-3 min-h-[400px]">
                {stageOpps.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground/50 text-xs flex-col gap-2 py-8">
                    <PlusIcon className="h-5 w-5 opacity-30" />
                    <span>No deals</span>
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <OpportunityCard key={opp.id} opp={opp} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
