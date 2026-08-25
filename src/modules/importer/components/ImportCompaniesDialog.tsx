"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importCompaniesFromCSV, type CSVImportResult } from "../services/csv-importer.service";
import { ArrowUpTrayIcon, BuildingOffice2Icon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

const SAMPLE_CSV = `Name,Type,ICE,IF,RC,City,Phone,Email
Safi Ciments SA,Supplier,001889977000033,40129988,998877,Safi,+212524621122,contact@saficiments.ma
Maghreb Industrie SARL,Customer,002998811000044,55443322,443322,Casablanca,+212522998877,commandes@maghreb-ind.ma`;

export function ImportCompaniesDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [result, setResult] = useState<CSVImportResult | null>(null);

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText.trim()) return;

    startTransition(async () => {
      const res = await importCompaniesFromCSV(csvText);
      setResult(res);
      if (res.importedCount > 0) {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger
        render={
          <Button variant="outline" className="border-border">
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-primary" />
            Moroccan Companies CSV Importer (Clients &amp; Fournisseurs)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleImport} className="space-y-4 mt-2">
          <p className="text-xs text-muted-foreground">
            Bulk import customers and vendors. Supported headers:{" "}
            <code className="font-mono bg-muted px-1 py-0.5 rounded">Name, Type, ICE, IF, RC, City, Phone, Email</code>.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="csvData">CSV Content</Label>
            <textarea
              id="csvData"
              rows={8}
              required
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {result && (
            <div
              className={`p-3 rounded-lg text-xs space-y-1 ${
                result.importedCount > 0
                  ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                  : "bg-red-50 text-red-950 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {result.importedCount > 0 ? (
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ExclamationCircleIcon className="h-4 w-4 text-red-600" />
                )}
                Imported {result.importedCount} of {result.totalRows} companies successfully.
              </div>
              {result.errors.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-red-800 pt-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Importing Data..." : "Run Bulk Import"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
