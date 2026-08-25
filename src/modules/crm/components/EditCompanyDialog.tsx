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
import { updateCompany } from "../services/company.service";
import { PencilSquareIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface EditCompanyDialogProps {
  company: any;
}

export function EditCompanyDialog({ company }: EditCompanyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(company.name || "");
  const [type, setType] = useState(company.type || "Customer");
  const [ICE, setICE] = useState(company.ICE || "");
  const [IF, setIF] = useState(company.IF || "");
  const [RC, setRC] = useState(company.RC || "");
  const [city, setCity] = useState(company.city || "Casablanca");
  const [address, setAddress] = useState(company.address || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      await updateCompany(company.id, {
        name,
        type,
        ICE: ICE || undefined,
        IF: IF || undefined,
        RC: RC || undefined,
        city: city || undefined,
        address: address || undefined,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80 h-7 px-2">
            <PencilSquareIcon className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-primary" />
            Edit Company (Société)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="compName">Company Name (Raison Sociale) *</Label>
            <Input
              id="compName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compType">Relationship Type</Label>
            <Select value={type} onValueChange={(v) => setType(v || "Customer")}>
              <SelectTrigger id="compType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer">Customer (Client)</SelectItem>
                <SelectItem value="Supplier">Supplier (Fournisseur)</SelectItem>
                <SelectItem value="Prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="compICE">ICE (15 Digits)</Label>
              <Input
                id="compICE"
                value={ICE}
                onChange={(e) => setICE(e.target.value)}
                maxLength={15}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compIF">IF (Fiscal ID)</Label>
              <Input
                id="compIF"
                value={IF}
                onChange={(e) => setIF(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="compRC">RC (Registre Commerce)</Label>
              <Input
                id="compRC"
                value={RC}
                onChange={(e) => setRC(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compCity">City</Label>
              <Input
                id="compCity"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compAddress">Address</Label>
            <Input
              id="compAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
