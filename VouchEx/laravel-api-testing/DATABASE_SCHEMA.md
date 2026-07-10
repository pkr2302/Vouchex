# VouchEx Database Schema

## Architecture: Option B (Single MySQL Database, Multi-Company)

All companies share **one** MySQL database. Every business table includes `company_id` for strict data isolation.

### Tenant isolation rules

| Layer | How it works |
|-------|----------------|
| **Database** | `company_id` column on all tenant tables |
| **Unique numbers** | Invoice/receipt/expense numbers unique **per company**, not globally |
| **Document locks** | Scoped by `company_id` — Company A lock never blocks Company B |
| **Sync events** | Scoped by `company_id` for real-time updates within same company |
| **Users** | `super_admin` has `company_id = null`; all others tied to one company |
| **Laravel models** | `BelongsToCompany` trait auto-filters queries when tenant context is set |

---

## Tables (27 migrations)

### Core platform

| Table | Purpose |
|-------|---------|
| `companies` | Each registered company (unlimited on Option B) |
| `users` | Login accounts — email unique portal-wide |
| `company_settings` | One settings row per company (GSTIN, bank, logo, locks) |
| `personal_access_tokens` | Sanctum API auth tokens |
| `sessions` | Laravel session storage |

### Accounting masters (all have `company_id`)

| Table | Purpose |
|-------|---------|
| `customers` | Customer master ledger |
| `vendors` | Vendor master ledger |
| `inventories` | Products & services with stock |
| `expense_heads` | Chart of accounts — expense types |
| `bank_ledgers` | Bank account names |
| `cash_ledgers` | Cash ledger names |

### Transactions (all have `company_id`)

| Table | Purpose |
|-------|---------|
| `invoices` + `invoice_items` | Sales invoices |
| `receipts` | Customer collections |
| `expenses` + `expense_line_items` | Purchase expenses |
| `payments` | Vendor disbursements |
| `credit_notes` + `credit_note_items` | Sales returns |
| `debit_notes` + `debit_note_items` | Purchase returns |
| `ecrs_logs` | ITC reversal compliance log |

### System (company-scoped where applicable)

| Table | Purpose |
|-------|---------|
| `document_locks` | Soft lock when user edits same document (same company only) |
| `sync_events` | Real-time change feed per company |
| `audit_logs` | Admin audit trail |
| `login_logs` | Login history |
| `cron_reminder_logs` | Recurring expense reminder logs |

---

## Default seed logins

| Email | Password | Role | Company |
|-------|----------|------|---------|
| `admin@vouchex.com` | `user123` | Super Admin | None (manages all) |
| `admin@company.com` | `user123` | Admin | VouchEx Demo Company |
| `rohit.sharma@company.com` | `user123` | User | VouchEx Demo Company |
| `sneha.patel@company.com` | `user123` | User | VouchEx Demo Company |

**Change all passwords before going live.**

---

## cPanel database name suggestion

- Database: `kuhuorgi_vouchex`
- User: `kuhuorgi_vouchex_user`
- Uses **1 of 5** MySQL database slots on your Baby plan

---

## Migration files location

```
laravel-api/database/migrations/
  2026_06_01_000001_create_companies_table.php
  ... through ...
  2026_06_01_000027_create_sessions_table.php
```

Run on server after Laravel install:

```bash
php artisan migrate --seed --force
```
