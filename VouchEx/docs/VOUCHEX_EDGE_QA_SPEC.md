# VouchEx — Minute-Level Edge QA Specification

**Version:** 2026-06-01  
**Purpose:** End-to-end edge testing of every portal feature, field, validation, export, and cross-module side effect.  
**Audience:** Human QA, or an AI agent with browser + API access to a running VouchEx instance.

---

## How to use this document (for AI agents)

1. **Read §0 Environment** and confirm pre-requisites before any test.
2. Execute tests **in order within each module** (later tests may depend on data created earlier).
3. For each test case, record: `TEST-ID | PASS/FAIL/BLOCKED | Actual result | Screenshot/log ref`.
4. On **FAIL**, log a defect using the template in §12.
5. **Edge cases are mandatory** — do not skip rows marked `EDGE` or `CRITICAL`.
6. After each module, run the module **regression mini-smoke** listed at module end.
7. Cross-module tests in §11 must run last.

**Execution modes:**

| Mode | What it covers | Limitations |
|------|----------------|-------------|
| **A — Code/static audit** | Validation rules, ID coercion, dead UI, export logic | Cannot catch visual/layout bugs |
| **B — API-only** | POST/PUT/DELETE with edge payloads via `/api/*` | Skips UI-only validation |
| **C — Browser E2E** | Full user journey, modals, PDF preview, exports download | Needs live URL + login |
| **D — Production smoke** | Read-only checks on deployed site | No destructive tests |

**Recommended:** Run A + C on staging. Run D on production.

---

## §0 Environment & test data setup

### Pre-requisites

- [ ] Migrations applied through `2026_06_11_000035` (forex `invoice_id` on conversions)
- [ ] Frontend build deployed (`public/index.html` + latest hashed JS/CSS)
- [ ] Test company with GSTIN (15 chars, valid format) for GSTR tests
- [ ] At least 2 users: `admin` role + regular `user` role
- [ ] Bank ledger: `HDFC Current A/c`
- [ ] Cash ledger: `Petty Cash`
- [ ] Expense head: `Office Expenses`

### Seed test entities (create if missing)

| Entity | Suggested data | Used in tests |
|--------|----------------|---------------|
| Customer A | GST Registered, Gujarat, INR, Net 30 | B2B invoice, receipts |
| Customer B | Unregistered, Gujarat, INR | B2CS path |
| Customer C | Overseas, USD currency | FC invoice + receipt + forex |
| Vendor A | GST Registered | Purchase + payment |
| Product P1 | HSN, qty tracked, stock 100 | Invoice stock deduction |
| Service S1 | SAC, no qty required | Service invoice line |

### Roles matrix

| Feature | super_admin | admin | user |
|---------|-------------|-------|------|
| Company switch | ✓ | — | — |
| User mgmt | ✓ | ✓ | — |
| FY lock toggle | ✓ | ✓ | — |
| GST compliance settings | ✓ | ✓ | — |
| Create invoice | ✓ | ✓ | ✓ |
| Backup restore | ✓ | — | — |

---

## §1 Authentication & session

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| AUTH-01 | CRITICAL | Login with valid email/password | Dashboard loads, company name in header | — |
| AUTH-02 | CRITICAL | Login wrong password | Structured error modal (not blank alert) | — |
| AUTH-03 | EDGE | Login empty fields | Client validation, no API call | — |
| AUTH-04 | EDGE | Logout → back button | Should not show protected data without re-login | — |
| AUTH-05 | EDGE | Session timeout (if configured) | Redirect to login with message | — |
| AUTH-06 | EDGE | Regular user opens Settings → User mgmt | Tab hidden or read-only | — |

---

## §2 Dashboard & Company 360°

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| DASH-01 | HIGH | Open Dashboard | KPIs render without NaN/undefined | — |
| DASH-02 | HIGH | Click attention item | Navigates to correct tab | — |
| DASH-03 | EDGE | Compliance calendar → add reminder | Saves, appears on dashboard | Title + email required |
| DASH-04 | EDGE | Delete calendar reminder | Removed from list | — |
| C360-01 | HIGH | Company 360 time filter | Charts update per filter | Empty period → no crash |
| C360-02 | EDGE | Drag/reorder charts | Layout persists or resets gracefully | — |

---

## §3 Settings

### 3.1 Company profile

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| SET-01 | CRITICAL | Save Legal name + Trade name | Both persist after refresh | Trade on PDF/header; Legal on GSTR export |
| SET-02 | HIGH | Upload company logo | Logo on PDF header | Large file → compress or error |
| SET-03 | EDGE | Non-admin edits company profile | Blocked or limited to custom options | — |
| SET-04 | EDGE | FY lock ON → try save profile | Blocked with lock message | — |

### 3.2 Users, companies, system

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| SET-10 | HIGH | Create user with company email | User can login | Duplicate email rejected |
| SET-11 | EDGE | Admin deletes own account | Blocked | — |
| SET-12 | CRITICAL | super_admin: backup download | File downloads | — |
| SET-13 | CRITICAL | super_admin: restore backup | Double confirm; data restored | Wrong file → clear error |
| SET-14 | EDGE | System health → migrate | Runs or shows permission error clearly | — |
| SET-15 | EDGE | Clear cache | Success or permission message (not silent fail) | — |

### 3.3 GST compliance settings

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| GST-SET-01 | HIGH | Enable e-invoice sandbox | Invoice registry shows Generate E-Invoice | — |
| GST-SET-02 | HIGH | Enable e-way bill | E-way button appears | — |
| GST-SET-03 | EDGE | Save with invalid credentials | Structured error, settings not corrupted | — |

---

## §4 Chart of Accounts

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| COA-01 | CRITICAL | Add bank ledger with opening balance | Appears in receipt/payment deposit dropdowns | — |
| COA-02 | CRITICAL | Add cash ledger | Appears when payment mode = Cash | — |
| COA-03 | HIGH | Edit ledger name | Name updates in dropdowns | Receipts using old name: check propagation |
| COA-04 | CRITICAL | Delete ledger **in use** by receipt | 422 with clear message | — |
| COA-05 | EDGE | Delete unused ledger | Success | — |
| COA-06 | EDGE | Duplicate ledger name | Rejected | — |
| COA-07 | EDGE | Account code empty | Should save (UI marks Req but JS may not enforce) | **Verify** |

---

## §5 Customer Master

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| CUST-01 | CRITICAL | Create GST Registered customer | GSTIN 15 char required | Invalid GSTIN blocked |
| CUST-02 | HIGH | Payment terms: Net 30 | Saves; invoice due date = issue + 30 | — |
| CUST-03 | HIGH | Payment terms: Add manually Net 7 | Saves as "Net 7"; due date +7 days | Non-integer (7.5) rejected |
| CUST-04 | EDGE | Edit payment terms → list shows updated value | Persists in registry column | **Regression target** |
| CUST-05 | EDGE | Overseas customer + USD currency | FC flows work downstream | — |
| CUST-06 | EDGE | Inline add customer from invoice form | Full modal, white background, customer selected after save | — |
| CUST-07 | EDGE | Delete customer with invoices | Behavior documented (block or cascade) | — |

---

## §6 Vendor Master

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| VEND-01 | CRITICAL | Create vendor with GSTIN | Saves | Unregistered: GSTIN disabled |
| VEND-02 | HIGH | Party ledger modal | Shows vendor transactions | — |
| VEND-03 | EDGE | Inline vendor from expense form | Works like customer inline | — |

---

## §7 Inventory

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| INV-01 | CRITICAL | Create product with HSN, SKU, rate | Saves | — |
| INV-02 | HIGH | Create service (no qty on invoice) | Qty optional on invoice line | — |
| INV-03 | EDGE | Delete product referenced on invoice | Blocked with message | — |
| INV-04 | EDGE | Inline add inventory from invoice | Modal works | — |

---

## §8 Sales Invoices

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| SAL-01 | CRITICAL | Raise B2B INR invoice | Saves; number from series (e.g. 0004/2026-27) | — |
| SAL-02 | CRITICAL | **Invoice number series** | After 0003/2026-27 next suggests 0004/2026-27 | Mixed formats: dominant series wins |
| SAL-03 | CRITICAL | Receipt against invoice → Settled Invoice column | Shows invoice number, not "ADVANCE RECEIPT" | — |
| SAL-04 | HIGH | B2C > ₹50k | Billing address required | — |
| SAL-05 | HIGH | Export POS + treatment + FC | Conversion rate required if GST payable | LUT/zero-rated: rate optional |
| SAL-06 | HIGH | Select customer → due date auto | Updates when issue date changes until user edits due date | — |
| SAL-07 | HIGH | Edit existing invoice | All fields load correctly | — |
| SAL-08 | EDGE | Duplicate invoice number | 422 with suggested next number in same series | — |
| SAL-09 | EDGE | Discount on invoice | Totals recalc CGST/SGST/IGST correctly | — |
| SAL-10 | EDGE | Cancel/delete invoice with receipt | Receipt handling documented | — |
| SAL-11 | HIGH | Email invoice | Gmail/Outlook opens with body (no `buildInvoiceEmailBody is not defined`) | — |
| SAL-12 | HIGH | PDF preview | Trade name in header; amounts in document currency | — |
| SAL-13 | EDGE | E-invoice generate (if enabled) | Modal; buyer pincode required | — |
| SAL-14 | EDGE | E-way bill (if enabled) | Vehicle no if road transport | — |
| SAL-15 | EDGE | FY lock blocks new invoice | Alert shown | — |
| SAL-16 | EDGE | Credit limit exceeded | Confirm override or block | — |
| SAL-17 | EDGE | Re-click Sales tab while form open | Form closes (tab toggle behavior) | — |

---

## §9 Sales Return (Credit Notes)

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| CN-01 | CRITICAL | Credit note linked to invoice | Qty/rate cannot exceed original | — |
| CN-02 | HIGH | Export credit note PDF | Original invoice ref shown | — |
| CN-03 | EDGE | Prior FY time-bar | Confirm dialog | — |
| CN-04 | EDGE | Stock increases on product lines | Inventory qty increases | — |

---

## §10 Receipts

### 10.1 Registry — standard / advance / bulk

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| REC-01 | CRITICAL | Standard INR receipt with TDS | Invoice → Partially Paid/Paid; settled column correct | — |
| REC-02 | CRITICAL | **FC receipt (no TDS)** | Saves without 422; TDS=0 sent | **Was broken — verify fix** |
| REC-03 | HIGH | FC receipt: TDS/discount fields hidden | Not shown for non-INR | — |
| REC-04 | HIGH | Allocation > outstanding | Client validation error | — |
| REC-05 | HIGH | Advance receipt | Settled = "ADVANCE RECEIPT" | — |
| REC-06 | HIGH | Bulk receipt multi-invoice | Each allocation ≤ pending | — |
| REC-07 | HIGH | Filter by customer + date | Outstanding list + registry filter correctly | **Regression target** |
| REC-08 | EDGE | Outstanding dropdown amount | Correct FC/INR formatting | Uses `sameId` not `===` |
| REC-09 | EDGE | Delete receipt | Invoice status recalculates | — |
| REC-10 | EDGE | Receipt PDF voucher | UTR, amounts in receipt currency | — |

### 10.2 Receipt dashboard & ageing

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| REC-20 | HIGH | Dashboard sub-tab | Totals match registry | — |
| REC-21 | **EDGE** | Ageing analysis | Brackets sum to total outstanding | **Uses hardcoded date 2026-05-23 — verify vs real today** |
| REC-22 | HIGH | Export CSV/Excel | Columns include settled invoice | — |

### 10.3 Forex Conversion

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| FX-01 | CRITICAL | Tab labeled **Forex Conversion** | Not "FX Conversion" | — |
| FX-02 | CRITICAL | FC invoice appears after FC receipt | Listed with currency + remaining FC | — |
| FX-03 | CRITICAL | Click Convert → auto-fill | Currency, amount, from-ledger pre-filled **editable** | — |
| FX-04 | CRITICAL | Partial conversion | Remaining balance stays in list | — |
| FX-05 | CRITICAL | Full conversion | Invoice removed from pending list | — |
| FX-06 | HIGH | From ledger = FC receipt deposit account | Auto-selected | User can change |
| FX-07 | HIGH | To ledger = any bank/cash | User selects INR destination | — |
| FX-08 | EDGE | Convert amount > remaining | Blocked with message | — |
| FX-09 | EDGE | Migration 000035 not run | API error clear (missing column) | — |
| FX-10 | EDGE | No FC receipt yet | Empty state message shown | — |

---

## §11 Purchase, Expenses, Payments

### 11.1 Purchase / Expense bills

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| EXP-01 | CRITICAL | Create purchase bill (line items mode) | Saves with expense number | — |
| EXP-02 | HIGH | Duplicate vendor + invoice number | Frontend warns/blocks | — |
| EXP-03 | HIGH | Mark Paid on create | Auto payment voucher created | — |
| EXP-04 | HIGH | TDS on expense | Field visible (even FC bills) | — |
| EXP-05 | EDGE | OCR scan upload | Simulated autofill (no crash) | — |
| EXP-06 | EDGE | Purchase vs Expense tab filter | Each shows only its record type | — |
| EXP-07 | **EDGE** | Cron logs panel | **No UI navigation exists — dead code** | Document or remove |
| EXP-08 | EDGE | Export country if POS Out of India | Required | — |

### 11.2 Payments

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| PAY-01 | CRITICAL | Settle bill (INR) with TDS | Expense status updates; settled expense shown in registry | — |
| PAY-02 | CRITICAL | FC payment: TDS hidden | Saves with tds=0 | **Verify no 422** |
| PAY-03 | HIGH | Advance payment | Registry shows ADVANCE PAYMENT | — |
| PAY-04 | HIGH | paid + TDS > outstanding | Validation error | — |
| PAY-05 | HIGH | Filter registry | Data matches filters | **Regression target** |
| PAY-06 | EDGE | Email payment voucher | Opens compose with trade name | — |
| PAY-07 | **EDGE** | Ageing brackets | Uses hardcoded 2026-05-23 | Same bug class as REC-21 |

### 11.3 Purchase Return (Debit Notes)

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| DN-01 | CRITICAL | Debit note vs purchase bill | Qty caps enforced | — |
| DN-02 | EDGE | Stock decreases | Inventory updated | — |

---

## §12 Consumption

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| CON-01 | HIGH | Record consumption | Stock decreases | — |
| CON-02 | EDGE | Qty > stock | Blocked or warned | — |
| CON-03 | EDGE | Delete consumption | Stock restored | — |

---

## §13 Taxation

| ID | Priority | Steps | Expected | Edge |
|----|----------|-------|----------|------|
| TAX-01 | CRITICAL | Date filter start/end + Apply | On-screen summary AND exports scoped to range | — |
| TAX-02 | CRITICAL | GSTR-1 JSON export | Valid JSON; uploads to GST offline tool workflow | Not raw XLSX to portal |
| TAX-03 | CRITICAL | B2B section | Only invoices with **valid 15-char GSTIN** | NIL GSTIN → B2CS/B2CL |
| TAX-04 | HIGH | GSTR-1 Excel export | Dates DD-MM-YYYY; **Legal name** in headers | — |
| TAX-05 | HIGH | TDS sub-tab | Matches receipts/payments with TDS | — |
| TAX-06 | EDGE | Export with no GSTIN on company | Clear error | — |
| TAX-07 | EDGE | Cancelled invoices | Excluded from exports | — |
| TAX-08 | EDGE | B2CL inter-state > 2.5L | Routed correctly | — |

---

## §14 Cross-module integration tests

| ID | Priority | Flow | Verify |
|----|----------|------|--------|
| X-01 | CRITICAL | Customer → Invoice → Receipt → Invoice Paid | Status + settled column + dashboard |
| X-02 | CRITICAL | FC: Invoice USD → Receipt USD → Forex partial → Forex full | Pending list balances |
| X-03 | CRITICAL | Vendor → Purchase → Payment | Outstanding + expense status |
| X-04 | HIGH | Invoice product → stock down → Credit note → stock up | Quantities |
| X-05 | HIGH | COA bank → receipt deposit → dashboard bank balance | `computeBankCashBalances` |
| X-06 | HIGH | FY lock ON | All mutations blocked consistently |
| X-07 | EDGE | Multi-user: user A edits customer, user B on invoice form | Sync/bootstrap refresh behavior |
| X-08 | EDGE | Document lock API (if used) | Concurrent edit handling |

---

## §15 Error handling & UX

| ID | Priority | Steps | Expected |
|----|----------|-------|----------|
| ERR-01 | CRITICAL | Trigger 422 validation | Modal: What/Problem/Why/What to do/Reference |
| ERR-02 | HIGH | Modal size ~80% screen | Not full-screen overlay |
| ERR-03 | EDGE | 500 server error | Actionable message (check laravel.log) |
| ERR-04 | EDGE | Network offline | Graceful failure |

---

## §16 Phase 1 — Static audit results (already executed)

**Executed:** Code review + build verification on workspace (2026-06-01).  
**Not executed:** Live browser E2E (requires your deployed URL + credentials).  
**Not executed:** PHP/Laravel runtime tests (PHP not available in local agent environment).

### Confirmed defects / risks (fix or verify in browser)

| # | Severity | Area | Finding | File(s) |
|---|----------|------|---------|---------|
| D-01 | **HIGH** | Receipt/Payment ageing | Ageing uses **hardcoded `2026-05-23`** instead of today — brackets wrong in production | `App.jsx` ~3736, 6683; `dashboardMetrics.js` |
| D-02 | **HIGH** | All date defaults | Forms default to `2026-05-23` not current date | `App.jsx` multiple |
| D-03 | **MEDIUM** | Receipt outstanding dropdown | Uses `r.invoice_id === inv.id` strict equality — can show **full invoice total as outstanding** when API returns string IDs | `App.jsx` ~4622 |
| D-04 | **MEDIUM** | Dashboard metrics | Same strict `===` on `invoice_id` / `expense_id` | `dashboardMetrics.js` ~114, 127 |
| D-05 | **MEDIUM** | Payment FC TDS | UI sets `tdsDeducted` to `''` for non-INR (save uses `toAmount` so likely OK, but inconsistent with receipt fix) | `App.jsx` ~6633-6637 |
| D-06 | **LOW** | Backend payment validation | `tds_deducted` still `'numeric'` not `nullable` — empty string from any client would 422 | `PortalMutationController.php` ~456 |
| D-07 | **LOW** | Dead UI | `ExpenseTab` cron-logs panel unreachable (no nav button) | `App.jsx` ExpenseTab |
| D-08 | **LOW** | Dead UI | `IncomeTab` internal sub-tabs (customers, credit notes) not routed from sidebar | `App.jsx` IncomeTab |
| D-09 | **INFO** | No automated tests | Zero `*.test.*` / `*.spec.*` files in repo | — |
| D-10 | **INFO** | Reference rate | Static RBI snapshot dated 2026-05-23 | `referenceRateClient.js` |

### Verified OK (static/build)

| Check | Result |
|-------|--------|
| Frontend production build | **PASS** (`npm run build` succeeded) |
| FC receipt TDS fix | **PASS** — sends numeric 0, backend `numericOrZero` |
| Invoice series logic | **PASS** — `nextNumberInSeries` scans all numbers (0003→0004) |
| Forex queue helper | **PASS** — partial conversion math in `buildForexConversionQueue` |
| GSTR B2B GSTIN rule | **PASS** — `isB2bInvoice` requires valid GSTIN |
| Trade vs legal name split | **PASS** — utilities exist and used in exports/PDF |

---

## §17 Defect log template

```markdown
### DEF-XXX — [Short title]
- **Test ID:** SAL-02
- **Severity:** Critical / High / Medium / Low
- **Environment:** Staging / Production / Local
- **Steps to reproduce:**
  1. ...
- **Expected:**
- **Actual:**
- **Evidence:** screenshot / network HAR / API response
- **Suggested fix area:** file or module
- **Status:** Open / Fixed / Won't fix
```

---

## §18 AI agent prompt (copy-paste to run full E2E)

```
You are testing VouchEx accounting portal. Use VOUCHEX_EDGE_QA_SPEC.md as the single source of truth.

Environment:
- URL: [PASTE YOUR URL]
- Login: [EMAIL] / [PASSWORD]
- Company: [NAME]

Rules:
1. Execute every CRITICAL and EDGE test case; sample HIGH if time-limited.
2. Record PASS/FAIL/BLOCKED for each TEST-ID.
3. For FAIL, create a DEF-XXX entry in §17 format.
4. Test cross-module flows X-01 through X-06 minimum.
5. Do not skip Forex (§10.3) or GSTR (§13) — recent change areas.
6. After testing, deliver:
   - Summary table: module | pass | fail | blocked
   - Prioritized defect list with repro steps
   - Retest list for fixed items only

Start with AUTH-01, then follow module order §4→§13, then §14.
```

---

## §19 What full 100% minute testing requires

| Layer | Effort | Owner |
|-------|--------|-------|
| This spec (300+ checks) | 2–4 days manual | QA or AI with browser |
| Playwright automation | 1–2 weeks setup | Dev |
| GST portal upload verification | Manual per return period | Accountant + QA |
| PDF visual review | Manual per template | QA |
| Multi-browser (Chrome/Edge/Firefox) | +30% time | QA |
| Performance under 10k rows | Separate perf test | Dev |

---

*End of specification.*
