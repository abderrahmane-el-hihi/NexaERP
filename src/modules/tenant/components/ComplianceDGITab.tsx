"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentCheckIcon, ShieldExclamationIcon, CheckCircleIcon, ArrowTopRightOnSquareIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface ComplianceDGITabProps {
  tenant: any;
}

export function ComplianceDGITab({ tenant }: ComplianceDGITabProps) {
  const extra = tenant.enabledModules || {};
  const currentWave = extra.dgiWave || "Wave3";

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DocumentCheckIcon className="h-6 w-6 text-emerald-700" />
              <h2 className="text-lg font-bold text-emerald-950">
                Morocco DGI Electronic Invoicing Mandate (Article 145 CGI)
              </h2>
            </div>
            <p className="text-sm text-emerald-900/80 max-w-3xl leading-relaxed">
              NexaERP is natively engineered for the Moroccan government clearance model.
              All invoices generate compliant structured data ready for electronic submission to the
              DGI <strong>Simpl-TVA</strong> platform.
            </p>
          </div>
          <Badge className="bg-emerald-700 text-white font-mono">
            Compliance Ready
          </Badge>
        </div>
      </div>

      {/* 3 Waves Status Cards */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-base">Regulatory Rollout Waves &amp; Eligibility</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Wave 1 */}
          <div className={`p-4 rounded-xl border ${currentWave === "Wave1" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-muted/20"}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm">Wave 1 — Jan 2026</span>
              {currentWave === "Wave1" && <Badge variant="default">Your Wave</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mb-2">Large Companies (CA &gt; 200M MAD) and public-sector suppliers.</p>
            <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">Active Mandate</span>
          </div>

          {/* Wave 2 */}
          <div className={`p-4 rounded-xl border ${currentWave === "Wave2" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-muted/20"}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm">Wave 2 — Jul 2026</span>
              {currentWave === "Wave2" && <Badge variant="default">Your Wave</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mb-2">Mid-sized Enterprises (CA 10M MAD to 200M MAD).</p>
            <span className="text-[11px] font-mono font-medium text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">Pre-Rollout</span>
          </div>

          {/* Wave 3 */}
          <div className={`p-4 rounded-xl border ${currentWave === "Wave3" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-muted/20"}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm">Wave 3 — Jan 2027</span>
              {currentWave === "Wave3" && <Badge variant="default">Your Wave</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mb-2">SMEs &amp; Micro-enterprises (TPE / PME with CA &lt; 10M MAD).</p>
            <span className="text-[11px] font-mono font-medium text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded">Target Wave (MVP)</span>
          </div>
        </div>
      </div>

      {/* Compliance Architecture Checklist */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-base">In-Engine Compliance Invariants</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Gapless Sequential Numbering</p>
              <p className="text-xs text-muted-foreground">
                Invoice numbers are allocated atomically inside database transactions per fiscal year (e.g. <code>FA-2026-00001</code>).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Post-Finalization Immutability</p>
              <p className="text-xs text-muted-foreground">
                Finalized invoices cannot be modified. Legal corrections require an automated Credit Note (Avoir).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Structured UBL 2.1 &amp; CII Payload</p>
              <p className="text-xs text-muted-foreground">
                Invoice data is stored with structured XML tags compatible with DGI Simpl-TVA clearance ingestion.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 border rounded-lg bg-slate-50/50">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">MOWAKABA Transition Program</p>
              <p className="text-xs text-muted-foreground">
                TPEs in Morocco can obtain up to 90% government subsidy through Maroc PME for NexaERP deployment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
