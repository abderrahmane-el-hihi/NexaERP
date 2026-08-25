"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createOpportunity } from "@/modules/crm/services/opportunity.service";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
}

interface AddOpportunityDialogProps {
  companies: Company[];
}

const STAGES = ["New", "Qualified", "DevisSent", "Won", "Lost"];

export function AddOpportunityDialog({ companies }: AddOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    companyId: "",
    estimatedValue: "",
    stage: "New",
    expectedCloseDate: "",
  });

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.companyId) return;

    startTransition(async () => {
      // TODO: replace with real tenantId + ownerId from session
      await createOpportunity({
        title: form.title,
        companyId: form.companyId,
        ownerId: "demo-owner",
        estimatedValue: parseFloat(form.estimatedValue) || 0,
        stage: form.stage,
        expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate) : undefined,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          New Opportunity
        </Button>
      } />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Opportunity</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Deal Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Supply contract – 200 units Q3"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company">Company *</Label>
            <Select value={form.companyId} onValueChange={(v) => handleChange("companyId", v || "")}>
              <SelectTrigger id="company">
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stage">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => handleChange("stage", v || "")}>
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">Estimated Value (MAD)</Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedValue}
                onChange={(e) => handleChange("estimatedValue", e.target.value)}
                placeholder="50 000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="closeDate">Expected Close Date</Label>
            <Input
              id="closeDate"
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) => handleChange("expectedCloseDate", e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create Opportunity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
