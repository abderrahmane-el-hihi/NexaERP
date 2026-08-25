import * as React from "react"
import { cn } from "@/lib/utils"

const LedgerTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto border border-border rounded-md bg-card">
    <table
      ref={ref}
      className={cn("w-full text-sm text-left border-collapse", className)}
      {...props}
    />
  </div>
))
LedgerTable.displayName = "LedgerTable"

const LedgerTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b border-border", className)} {...props} />
))
LedgerTableHeader.displayName = "LedgerTableHeader"

const LedgerTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
LedgerTableBody.displayName = "LedgerTableBody"

const LedgerTableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t-[3px] border-double border-foreground font-semibold",
      className
    )}
    {...props}
  />
))
LedgerTableFooter.displayName = "LedgerTableFooter"

const LedgerTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors duration-200 hover:bg-muted/60 even:bg-muted/30",
      className
    )}
    {...props}
  />
))
LedgerTableRow.displayName = "LedgerTableRow"

const LedgerTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }
>(({ className, isNumeric, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-semibold text-muted-foreground",
      isNumeric && "text-right",
      className
    )}
    {...props}
  />
))
LedgerTableHead.displayName = "LedgerTableHead"

const LedgerTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }
>(({ className, isNumeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle",
      isNumeric && "font-mono text-right tabular-nums",
      className
    )}
    {...props}
  />
))
LedgerTableCell.displayName = "LedgerTableCell"

export {
  LedgerTable,
  LedgerTableHeader,
  LedgerTableBody,
  LedgerTableFooter,
  LedgerTableHead,
  LedgerTableRow,
  LedgerTableCell,
}
