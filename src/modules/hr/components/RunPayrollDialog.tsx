"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { runMonthlyPayroll } from "../services/payroll.service";
import { CalculatorIcon, PlayIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export function RunPayrollDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const [period, setPeriod] = useState(`${currentYear}-${currentMonth}`);

  function handleRun(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      await runMonthlyPayroll(period);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <PlayIcon className="h-4 w-4 mr-2" />
            Run Monthly Payroll (Traitement Paie)
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalculatorIcon className="h-5 w-5 text-emerald-600" />
            Execute Moroccan Payroll Run
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleRun} className="space-y-4 mt-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1 text-emerald-950">
            <p className="font-semibold">Automatic Calculations Included:</p>
            <ul className="list-disc list-inside space-y-0.5 text-emerald-900">
              <li>CNSS Employee Deduction: 4.48% (capped at 6,000 DH)</li>
              <li>AMO Mandatory Medical: 2.26% (uncapped)</li>
              <li>Frais Professionnels: 35% standard tax deduction</li>
              <li>Progressive Income Tax (Barème IGR Maroc)</li>
              <li>Auto-posts balanced General Ledger entry (6171 / 4432 / 4441 / 4452)</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payrollPeriod">Payroll Period (YYYY-MM) *</Label>
            <Input
              id="payrollPeriod"
              type="month"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? "Calculating & Posting..." : "Generate Payslips & Post to GL"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
