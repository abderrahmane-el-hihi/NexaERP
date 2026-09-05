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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEmployee } from "../services/payroll.service";
import { UserPlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export function NewEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    cin: "",
    cnssNumber: "",
    email: "",
    phone: "",
    department: "Commercial",
    jobTitle: "",
    contractType: "CDI",
    baseSalary: 10000,
  });

  function handleChange(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.jobTitle) return;

    startTransition(async () => {
      await createEmployee({
        ...form,
        baseSalary: Number(form.baseSalary),
      });
      setOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        cin: "",
        cnssNumber: "",
        email: "",
        phone: "",
        department: "Commercial",
        jobTitle: "",
        contractType: "CDI",
        baseSalary: 10000,
      });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            New Employee Profile (Collaborateur)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                required
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="e.g. Mehdi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                required
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="e.g. Tazi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cin">CIN (Moroccan ID)</Label>
              <Input
                id="cin"
                value={form.cin}
                onChange={(e) => handleChange("cin", e.target.value)}
                placeholder="e.g. BE123456"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnss">CNSS Number</Label>
              <Input
                id="cnss"
                value={form.cnssNumber}
                onChange={(e) => handleChange("cnssNumber", e.target.value)}
                placeholder="e.g. 198765432"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                required
                value={form.jobTitle}
                onChange={(e) => handleChange("jobTitle", e.target.value)}
                placeholder="e.g. Commercial Senior"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Select
                value={form.department}
                onValueChange={(v) => handleChange("department", v || "Commercial")}
              >
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direction">Direction</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Finance">Finance &amp; Compta</SelectItem>
                  <SelectItem value="Logistique">Logistique &amp; Stock</SelectItem>
                  <SelectItem value="Technique">Technique / IT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contractType">Contract Type</Label>
              <Select
                value={form.contractType}
                onValueChange={(v) => handleChange("contractType", v || "CDI")}
              >
                <SelectTrigger id="contractType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="Anapec">Contrat ANAPEC</SelectItem>
                  <SelectItem value="Stage">Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="baseSalary">Base Gross Salary (Brut MAD) *</Label>
              <Input
                id="baseSalary"
                type="number"
                required
                value={form.baseSalary}
                onChange={(e) => handleChange("baseSalary", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Save Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
