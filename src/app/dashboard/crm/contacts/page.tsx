import { UsersIcon } from "@heroicons/react/24/outline";
import { getContacts } from "@/modules/crm/services/contact.service";
import { getCompanies } from "@/modules/crm/services/company.service";
import { AddContactDialog } from "@/modules/crm/components/AddContactDialog";
import { EditContactDialog } from "@/modules/crm/components/EditContactDialog";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    getContacts(),
    getCompanies(),
  ]);

  const companyList = companies.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-primary" />
            Contacts Master (CRM)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Individuals and business representatives across client and supplier organizations.
          </p>
        </div>
        <AddContactDialog companies={companyList} />
      </div>

      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Job Title</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <UsersIcon className="h-10 w-10 opacity-20" />
                      <p className="font-medium">No contacts registered yet</p>
                      <p className="text-xs">Add contacts linked to your companies.</p>
                      <div className="mt-2">
                        <AddContactDialog companies={companyList} />
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-semibold text-foreground">{c.firstName} {c.lastName}</td>
                    <td className="px-5 py-3 text-foreground">{c.company?.name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{c.jobTitle || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{c.email || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs font-mono">{c.phone || c.whatsapp || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <EditContactDialog contact={c} companies={companyList} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
