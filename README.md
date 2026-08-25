# NexaERP - The Ledger

NexaERP is a modern, modular B2B Enterprise Resource Planning (ERP) platform tailored for Moroccan Small and Medium Enterprises (SMEs). Built with an absolute focus on accounting integrity ("The Ledger") and premium user experience.

## Tech Stack
- **Framework**: [Next.js 16.3](https://nextjs.org/) (App Router, Server Actions)
- **Database**: PostgreSQL (via Supabase local Docker)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: Tailwind CSS v4
- **Components**: [shadcn/ui](https://ui.shadcn.com/), Heroicons
- **Theming**: Dark/Light mode (`next-themes`)
- **i18n**: English & French support

## Features
- **Multi-Tenant Architecture**: Supports isolated workspaces (Tenants) per company with role-based access control.
- **Onboarding Wizard**: Frictionless signup process that provisions the workspace, initializes the Moroccan Chart of Accounts (Plan Comptable Marocain), and creates default warehouses.
- **Financial Ledger**: Real-time financial summary engine connecting Accounts Payable, Accounts Receivable, and General Ledger.
- **Purchasing Automation**: Full Procure-to-Pay workflow. Approving Goods Receipts instantly triggers automated Stock Movements and updates Stock Levels.
- **Print-Ready Documents**: Highly optimized, native browser printing for A4 professional Invoices with automated calculations.
- **Internationalization**: Seamless translation system via cookies for English and French users.
- **Dark Mode**: Premium "Midnight Ledger" aesthetic natively supported.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker (for local Supabase/PostgreSQL)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abderrahmane-el-hihi/NexaERP.git
   cd NexaERP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   Ensure your local Supabase Docker instance is running. The default connection string is `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
   Push the schema to the database:
   ```bash
   npx prisma db push
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema Highlights
- `Tenant`: Represents a company/workspace.
- `User` & `TenantMembership`: Multi-tenant user mapping.
- `Account` & `JournalEntry`: The core double-entry accounting ledger.
- `Product`, `StockLevel`, `StockMovement`: Inventory tracking.
- `SalesOrder`, `PurchaseOrder`, `Invoice`: Core operational documents.

## License
Proprietary - All rights reserved.
