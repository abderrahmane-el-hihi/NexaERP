"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportTenantData } from "../services/tenant.service";
import { ArrowDownTrayIcon, ShieldCheckIcon, CircleStackIcon, TableCellsIcon, LockClosedIcon } from "@heroicons/react/24/outline";

export function DataPrivacyTab() {
  const [isExporting, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const data = await exportTenantData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexa_erp_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-6">
      {/* CNDP & Privacy Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ShieldCheckIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Data Protection &amp; CNDP (Loi 09-08) Compliance</h2>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          In compliance with the Moroccan National Commission for Personal Data Protection (CNDP) and
          Loi 09-08, your business owns 100% of its data. Tenant data is strictly isolated using
          PostgreSQL Row-Level Security (RLS). You can download an uncompressed, complete portable backup
          at any time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-muted/20 border rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
              <LockClosedIcon className="h-4 w-4 text-emerald-600" />
              Tenant Isolation
            </div>
            <p className="text-[11px] text-muted-foreground">
              Multi-tenant database with strict per-tenant foreign key scoping and RLS defense-in-depth.
            </p>
          </div>

          <div className="p-4 bg-muted/20 border rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
              <CircleStackIcon className="h-4 w-4 text-blue-600" />
              Continuous ACID Logs
            </div>
            <p className="text-[11px] text-muted-foreground">
              Append-only audit ledger for stock movements, invoices, and journal balance entries.
            </p>
          </div>

          <div className="p-4 bg-muted/20 border rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
              <TableCellsIcon className="h-4 w-4 text-purple-600" />
              Portability Guarantee
            </div>
            <p className="text-[11px] text-muted-foreground">
              Zero vendor lock-in. Full JSON and tabular exports for your company and accountant.
            </p>
          </div>
        </div>
      </div>

      {/* Export Action Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base">Export Full Company CircleStackIcon</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Downloads all CRM contacts, opportunities, products, quotes, sales orders, invoices, stock, and ledger entries as a JSON file.
          </p>
        </div>

        <Button onClick={handleExport} disabled={isExporting} className="shrink-0">
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          {isExporting ? "Generating Export..." : "ArrowDownTrayIcon Data Backup (JSON)"}
        </Button>
      </div>
    </div>
  );
}
