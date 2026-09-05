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
import { updateContact } from "../services/contact.service";
import { PencilSquareIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import type { ContactView } from "@/shared/view-types";

interface EditContactDialogProps {
  contact: ContactView;
  companies: Array<{ id: string; name: string }>;
}

export function EditContactDialog({ contact, companies }: EditContactDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState(contact.firstName || "");
  const [lastName, setLastName] = useState(contact.lastName || "");
  const [jobTitle, setJobTitle] = useState(contact.jobTitle || "");
  const [email, setEmail] = useState(contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [companyId, setCompanyId] = useState(contact.companyId || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    startTransition(async () => {
      await updateContact(contact.id, {
        firstName,
        lastName,
        jobTitle: jobTitle || undefined,
        email: email || undefined,
        phone: phone || undefined,
        companyId: companyId || undefined,
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
            <UsersIcon className="h-5 w-5 text-primary" />
            Edit Contact Details
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contFirstName">First Name *</Label>
              <Input
                id="contFirstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contLastName">Last Name *</Label>
              <Input
                id="contLastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contCompany">Company (Société affiliée)</Label>
            <Select value={companyId} onValueChange={(v) => setCompanyId(v || "")}>
              <SelectTrigger id="contCompany">
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

          <div className="space-y-1.5">
            <Label htmlFor="contTitle">Job Title</Label>
            <Input
              id="contTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Responsable Achats"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contEmail">Email</Label>
              <Input
                id="contEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contPhone">Phone / WhatsApp</Label>
              <Input
                id="contPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
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
