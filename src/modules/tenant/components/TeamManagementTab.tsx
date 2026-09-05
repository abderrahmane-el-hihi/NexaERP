"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
} from "../services/tenant.service";
import { Role } from "@/generated/prisma/enums";
import { UsersIcon, UserPlusIcon, ShieldCheckIcon, TrashIcon, EnvelopeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import type { TenantSettingsData } from "@/modules/tenant/services/tenant.service";

interface TeamManagementTabProps {
  memberships: TenantSettingsData["memberships"];
}

const ROLE_DESCRIPTIONS: Record<string, { label: string; color: string; desc: string }> = {
  Owner: {
    label: "Owner / Dirigeant",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    desc: "Full company administration, billing, team & legal setup.",
  },
  Admin: {
    label: "Admin / Responsable",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    desc: "Manage all operations, documents, and team permissions.",
  },
  Sales: {
    label: "Sales / Commercial",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    desc: "CRM pipeline, contacts, devis quotes, and sales orders.",
  },
  Accountant: {
    label: "Accountant / Comptable",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "Invoices, payments, TVA declarations, general ledger & reports.",
  },
  Viewer: {
    label: "Viewer / Observateur",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    desc: "Read-only visibility on dashboards and activity.",
  },
};

export function TeamManagementTab({ memberships }: TeamManagementTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<{
    name: string;
    email: string;
    role: Role;
  }>({
    name: "",
    email: "",
    role: Role.Sales,
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.name) return;

    startTransition(async () => {
      await inviteTeamMember(inviteForm);
      setInviteOpen(false);
      setInviteForm({ name: "", email: "", role: Role.Sales });
      router.refresh();
    });
  }

  function handleRoleChange(membershipId: string, newRole: Role) {
    startTransition(async () => {
      await updateMemberRole(membershipId, newRole);
      router.refresh();
    });
  }

  function handleRemove(membershipId: string) {
    if (!confirm("Are you sure you want to revoke access for this team member?")) return;
    startTransition(async () => {
      await removeTeamMember(membershipId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header & Invite CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            Team Members & Roles (RBAC)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage who has access to your NexaERP workspace and control their functional permissions.
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <UserPlusIcon className="h-4 w-4 mr-1.5" />
                Invite Teammate
              </Button>
            }
          />

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleInvite} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="memberName">Full Name *</Label>
                <Input
                  id="memberName"
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="e.g. Youssef Benjelloun"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="memberEmail">Email Address *</Label>
                <Input
                  id="memberEmail"
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="youssef@company.ma"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="memberRole">Role & Permissions *</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) => setInviteForm({ ...inviteForm, role: (v as Role) || Role.Sales })}
                >
                  <SelectTrigger id="memberRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_DESCRIPTIONS).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        <div className="py-0.5">
                          <span className="font-semibold text-sm">{info.label}</span>
                          <p className="text-xs text-muted-foreground">{info.desc}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List Table */}
      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Assigned Role</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Access Scope</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {memberships.map((m) => {
              const roleInfo = ROLE_DESCRIPTIONS[m.role] || ROLE_DESCRIPTIONS.Viewer;

              return (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                        {m.user?.name?.charAt(0) || m.user?.email?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.user?.name || "Team Member"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <EnvelopeIcon className="h-3 w-3" /> {m.user?.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <Select
                      value={m.role}
                      onValueChange={(newRole) => handleRoleChange(m.id, newRole as Role)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Role.Owner}>Owner / Dirigeant</SelectItem>
                        <SelectItem value={Role.Admin}>Admin / Responsable</SelectItem>
                        <SelectItem value={Role.Sales}>Sales / Commercial</SelectItem>
                        <SelectItem value={Role.Accountant}>Accountant / Comptable</SelectItem>
                        <SelectItem value={Role.Viewer}>Viewer / Observateur</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-5 py-4 text-xs text-muted-foreground max-w-xs">
                    {roleInfo.desc}
                  </td>

                  <td className="px-5 py-4 text-right">
                    {m.role !== Role.Owner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemove(m.id)}
                        disabled={isPending}
                        title="Remove member"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 bg-muted/20 border rounded-xl space-y-1">
          <p className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-purple-600" /> Owner &amp; Admin
          </p>
          <p className="text-[11px] text-muted-foreground">
            Full governance, billing, fiscal config, and team membership management.
          </p>
        </div>
        <div className="p-4 bg-muted/20 border rounded-xl space-y-1">
          <p className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
            <CheckCircleIcon className="h-3.5 w-3.5 text-amber-600" /> Sales Team
          </p>
          <p className="text-[11px] text-muted-foreground">
            Designed for mobile/field reps to quote devis and track deals without seeing general accounting.
          </p>
        </div>
        <div className="p-4 bg-muted/20 border rounded-xl space-y-1">
          <p className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" /> External Accountant
          </p>
          <p className="text-[11px] text-muted-foreground">
            Dedicated portal for monthly TVA declarations, trial balance audits, and CSV export.
          </p>
        </div>
      </div>
    </div>
  );
}
