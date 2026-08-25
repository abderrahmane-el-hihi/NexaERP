
import {
  LedgerTable,
  LedgerTableHeader,
  LedgerTableBody,
  LedgerTableFooter,
  LedgerTableRow,
  LedgerTableHead,
  LedgerTableCell,
} from "@/components/ui/ledger-table";
import { BalanceMark } from "@/components/ui/balance-mark";
import { getDashboardData } from "@/modules/dashboard/services/dashboard.service";
import { getDictionary } from "@/i18n/i18n.service";

// Simple formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const dict = await getDictionary();
  const d = dict.dashboard;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {d.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {d.subtitle}
          </p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <BalanceMark /> <span className="text-muted-foreground">{d.reconciled}</span>
          </div>
        </div>
      </div>

      {/* Assets */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
          {d.assets}
        </h2>
        <LedgerTable>
          <LedgerTableHeader>
            <LedgerTableRow>
              <LedgerTableHead className="w-[120px]">{d.account}</LedgerTableHead>
              <LedgerTableHead>{d.description}</LedgerTableHead>
              <LedgerTableHead className="w-[120px]">{d.status}</LedgerTableHead>
              <LedgerTableHead isNumeric className="w-[200px]">
                {d.balance}
              </LedgerTableHead>
            </LedgerTableRow>
          </LedgerTableHeader>
          <LedgerTableBody>
            {data.assets.length === 0 ? (
              <LedgerTableRow>
                <LedgerTableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  {d.noAssets}
                </LedgerTableCell>
              </LedgerTableRow>
            ) : (
              data.assets.map((acc) => (
                <LedgerTableRow key={acc.id}>
                  <LedgerTableCell>{acc.code}</LedgerTableCell>
                  <LedgerTableCell>{acc.name}</LedgerTableCell>
                  <LedgerTableCell>
                    {acc.balance > 0 && <BalanceMark />}
                  </LedgerTableCell>
                  <LedgerTableCell isNumeric>{formatCurrency(acc.balance)}</LedgerTableCell>
                </LedgerTableRow>
              ))
            )}
          </LedgerTableBody>
          <LedgerTableFooter>
            <LedgerTableRow>
              <LedgerTableCell colSpan={3} className="text-right">
                {d.totalAssets}
              </LedgerTableCell>
              <LedgerTableCell isNumeric>{formatCurrency(data.totalAssets)}</LedgerTableCell>
            </LedgerTableRow>
          </LedgerTableFooter>
        </LedgerTable>
      </div>

      {/* Liabilities */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
          {d.liabilities}
        </h2>
        <LedgerTable>
          <LedgerTableHeader>
            <LedgerTableRow>
              <LedgerTableHead className="w-[120px]">{d.account}</LedgerTableHead>
              <LedgerTableHead>{d.description}</LedgerTableHead>
              <LedgerTableHead className="w-[120px]">{d.status}</LedgerTableHead>
              <LedgerTableHead isNumeric className="w-[200px]">
                {d.balance}
              </LedgerTableHead>
            </LedgerTableRow>
          </LedgerTableHeader>
          <LedgerTableBody>
            {data.liabilities.length === 0 ? (
              <LedgerTableRow>
                <LedgerTableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  {d.noLiabilities}
                </LedgerTableCell>
              </LedgerTableRow>
            ) : (
              data.liabilities.map((acc) => (
                <LedgerTableRow key={acc.id}>
                  <LedgerTableCell>{acc.code}</LedgerTableCell>
                  <LedgerTableCell>{acc.name}</LedgerTableCell>
                  <LedgerTableCell></LedgerTableCell>
                  <LedgerTableCell isNumeric className={acc.balance < 0 ? "text-[var(--destructive)]" : ""}>
                    {formatCurrency(acc.balance)}
                  </LedgerTableCell>
                </LedgerTableRow>
              ))
            )}
          </LedgerTableBody>
          <LedgerTableFooter>
            <LedgerTableRow>
              <LedgerTableCell colSpan={3} className="text-right">
                {d.totalLiabilities}
              </LedgerTableCell>
              <LedgerTableCell isNumeric className={data.totalLiabilities < 0 ? "text-[var(--destructive)]" : ""}>
                {formatCurrency(data.totalLiabilities)}
              </LedgerTableCell>
            </LedgerTableRow>
          </LedgerTableFooter>
        </LedgerTable>
      </div>
      
      {/* Revenue */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
          {d.revenue}
        </h2>
        <LedgerTable>
          <LedgerTableHeader>
            <LedgerTableRow>
              <LedgerTableHead className="w-[120px]">{d.account}</LedgerTableHead>
              <LedgerTableHead>{d.description}</LedgerTableHead>
              <LedgerTableHead className="w-[120px]">{d.status}</LedgerTableHead>
              <LedgerTableHead isNumeric className="w-[200px]">
                {d.balance} {/* Changed from Credit since dictionary uses balance */}
              </LedgerTableHead>
            </LedgerTableRow>
          </LedgerTableHeader>
          <LedgerTableBody>
            {data.revenue.length === 0 ? (
              <LedgerTableRow>
                <LedgerTableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  {d.noRevenue}
                </LedgerTableCell>
              </LedgerTableRow>
            ) : (
              data.revenue.map((acc) => (
                <LedgerTableRow key={acc.id}>
                  <LedgerTableCell>{acc.code}</LedgerTableCell>
                  <LedgerTableCell>{acc.name}</LedgerTableCell>
                  <LedgerTableCell></LedgerTableCell>
                  <LedgerTableCell isNumeric>{formatCurrency(acc.balance)}</LedgerTableCell>
                </LedgerTableRow>
              ))
            )}
          </LedgerTableBody>
          <LedgerTableFooter>
            <LedgerTableRow>
              <LedgerTableCell colSpan={3} className="text-right">
                {d.totalRevenue}
              </LedgerTableCell>
              <LedgerTableCell isNumeric>{formatCurrency(data.totalRevenue)}</LedgerTableCell>
            </LedgerTableRow>
          </LedgerTableFooter>
        </LedgerTable>
      </div>

    </div>
  );
}
