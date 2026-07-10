import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { portalApi } from '../services/portalApi';
import { dateOnly, formatINR, sortRegistryNewestFirst } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { buildCustomerLedger, customerOutstanding } from '../utils/partyLedgerUtils';
import { PartyLedgerModal } from './PartyLedgerModal';
import { AgeingBucketsPanel } from './OperationalReportsPanel';
import { formatDateDDMMYYYY } from '../utils/formatMoney';
import MobileRegistryCards from './mobile/MobileRegistryCards';
import MobileRegistryCardActions from './mobile/MobileRegistryCardActions';
import MobileCardExpand from './mobile/MobileCardExpand';
import { useMobileBackHandler } from '../hooks/useMobileBackHandler';

export default function DebtorsTab() {
  const { customers, invoices, receipts, creditNotes } = useSimulator();
  const [subView, setSubView] = useState('listing');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ageing, setAgeing] = useState(null);
  const [ageingLoading, setAgeingLoading] = useState(false);

  useMobileBackHandler(!!selectedCustomer, () => {
    setSelectedCustomer(null);
    return true;
  });

  useMobileBackHandler(ledgerModalOpen, () => {
    setLedgerModalOpen(false);
    return true;
  });

  const rows = useMemo(() => {
    return customers
      .map((cust) => {
        const custInvoices = invoices.filter((inv) => {
          if (inv.status === 'Cancelled') return false;
          if (String(inv.customer_id) !== String(cust.id)) return false;
          const day = dateOnly(inv.issue_date);
          if (fromDate && day < fromDate) return false;
          if (toDate && day > toDate) return false;
          return true;
        });
        const invoiced = custInvoices.reduce((s, inv) => s + parseFloat(inv.total_amount || 0), 0);
        const outstanding = customerOutstanding(cust, invoices, receipts, creditNotes);
        const received = Math.max(0, invoiced - outstanding);
        const lastInvoice = custInvoices
          .map((inv) => inv.issue_date)
          .sort()
          .reverse()[0];

        return {
          customer: cust,
          invoiced,
          received,
          outstanding,
          invoiceCount: custInvoices.length,
          lastInvoice,
        };
      })
      .filter((row) => {
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!row.customer.name?.toLowerCase().includes(q)) return false;
        }
        if (fromDate || toDate) return row.invoiceCount > 0 || row.outstanding > 0.009;
        return true;
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [customers, invoices, receipts, creditNotes, fromDate, toDate, search]);

  const loadAgeing = useCallback(async () => {
    setAgeingLoading(true);
    try {
      const qs = toDate ? `?as_of=${encodeURIComponent(toDate)}` : '';
      const res = await portalApi.glOperationalReports(qs);
      setAgeing(res.receivables_ageing);
    } catch (err) {
      showApiError('Loading debtors ageing', err);
    } finally {
      setAgeingLoading(false);
    }
  }, [toDate]);

  useEffect(() => {
    if (subView === 'ageing') loadAgeing();
  }, [subView, loadAgeing]);

  const ledgerRows = selectedCustomer
    ? buildCustomerLedger(selectedCustomer, invoices, receipts, creditNotes)
    : [];

  const partyInvoices = selectedCustomer
    ? sortRegistryNewestFirst(
        invoices.filter((inv) => String(inv.customer_id) === String(selectedCustomer.id) && inv.status !== 'Cancelled'),
        'issue_date'
      )
    : [];

  return (
    <div className="dashboard-tab">
      <div className="table-header-row" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="chart-title">Debtors</h2>
          <p className="mobile-page-desc" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Customers who owe you money — outstanding from invoices minus receipts and credit notes.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={`sub-tab-btn ${subView === 'listing' ? 'active' : ''}`} onClick={() => setSubView('listing')}>
          Party Listing
        </button>
        <button type="button" className={`sub-tab-btn ${subView === 'ageing' ? 'active' : ''}`} onClick={() => setSubView('ageing')}>
          Ageing Analysis
        </button>
      </div>

      <div className="form-grid-4" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>From date (invoice date)</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>To date / Ageing as-of</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Search customer</label>
          <input type="search" className="form-input" placeholder="Name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {subView === 'ageing' && (
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn-primary" onClick={loadAgeing} disabled={ageingLoading}>
              {ageingLoading ? 'Loading…' : 'Refresh ageing'}
            </button>
          </div>
        )}
      </div>

      {subView === 'listing' && (
        <div className="table-card" style={{ padding: 0 }}>
          <div className="premium-table-wrapper desktop-only">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>State</th>
                  <th style={{ textAlign: 'right' }}>Invoiced</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th>Last invoice</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.customer.id}>
                    <td style={{ fontWeight: 600 }}>{row.customer.name}</td>
                    <td>{row.customer.billing_state || '—'}</td>
                    <td style={{ textAlign: 'right' }}>₹{formatINR(row.invoiced)}</td>
                    <td style={{ textAlign: 'right' }}>₹{formatINR(row.received)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: row.outstanding > 0 ? 'var(--accent-amber)' : 'var(--accent-teal)' }}>
                      ₹{formatINR(row.outstanding)}
                    </td>
                    <td>{row.lastInvoice || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setSelectedCustomer(row.customer); setLedgerModalOpen(false); }}>
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No debtors match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <MobileRegistryCards
            items={rows}
            emptyLabel="No debtors match your filters."
            renderCard={(row) => {
              const days = row.lastInvoice
                ? Math.max(0, Math.floor((Date.now() - new Date(row.lastInvoice).getTime()) / 86400000))
                : null;
              const isClear = row.outstanding <= 0.009;
              const isOverdue = !isClear && days != null && days > 30;
              const badgeClass = isClear ? 'clear' : isOverdue ? 'overdue' : 'due';
              const badgeLabel = isClear ? 'Clear' : isOverdue ? 'Overdue' : 'Due';
              return (
                <>
                  <div className="mobile-registry-card__head">
                    <div>
                      <div className="mobile-registry-card__title">{row.customer.name}</div>
                      <div className="mobile-registry-card__meta">{row.customer.billing_state || '—'}</div>
                    </div>
                    <div className="mobile-registry-card__amount">₹{formatINR(row.outstanding)}</div>
                  </div>
                  <div className="mobile-registry-card__row">
                    <span>Status</span>
                    <span className={`mobile-registry-card__badge mobile-registry-card__badge--${badgeClass}`}>{badgeLabel}</span>
                  </div>
                  <MobileCardExpand label="More details">
                    <div className="mobile-registry-card__row"><span>Invoiced</span><span>₹{formatINR(row.invoiced)}</span></div>
                    <div className="mobile-registry-card__row"><span>Received</span><span>₹{formatINR(row.received)}</span></div>
                    {days != null && !isClear && (
                      <div className="mobile-registry-card__row"><span>Age</span><span>{days} days</span></div>
                    )}
                  </MobileCardExpand>
                  <div className="mobile-registry-card__actions">
                    <MobileRegistryCardActions
                      onView={() => { setSelectedCustomer(row.customer); setLedgerModalOpen(false); }}
                      viewLabel="View"
                      viewTitle="View debtor details"
                    />
                  </div>
                </>
              );
            }}
          />
        </div>
      )}

      {subView === 'ageing' && (
        ageingLoading && !ageing ? (
          <p className="empty-state">Loading ageing…</p>
        ) : (
          <AgeingBucketsPanel title="Receivables Ageing (Debtors)" data={ageing} partyLabel="Customer" />
        )
      )}

      {selectedCustomer && (
        <>
          <div className="table-card" style={{ marginTop: 16 }}>
            <div className="table-header-row">
              <h3 className="chart-title" style={{ margin: 0 }}>{selectedCustomer.name}</h3>
              <button type="button" className="btn-secondary" onClick={() => setSelectedCustomer(null)}>Back to list</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>GSTIN</span><div>{selectedCustomer.gstin || '—'}</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phone</span><div>{selectedCustomer.phone || '—'}</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Terms</span><div>{selectedCustomer.payment_terms || '—'}</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Credit limit</span><div>{selectedCustomer.credit_limit > 0 ? `₹${formatINR(selectedCustomer.credit_limit)}` : 'Unlimited'}</div></div>
            </div>

            <h4 style={{ marginBottom: 8 }}>Open invoices</h4>
            <div className="premium-table-wrapper" style={{ marginBottom: 16 }}>
              <table className="premium-table">
                <thead>
                  <tr><th>Invoice</th><th>Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
                </thead>
                <tbody>
                  {partyInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.invoice_number}</td>
                      <td>{inv.issue_date}</td>
                      <td>{inv.status}</td>
                      <td style={{ textAlign: 'right' }}>₹{formatINR(inv.total_amount)}</td>
                    </tr>
                  ))}
                  {partyInvoices.length === 0 && (
                    <tr><td colSpan={4} className="empty-state">No invoices for this customer.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-header-row" style={{ marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>Party ledger</h4>
              <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={() => setLedgerModalOpen(true)}>
                Expand ledger
              </button>
            </div>
            <div className="premium-table-wrapper" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Description</th><th>Ref</th>
                    <th style={{ textAlign: 'right' }}>Debit</th>
                    <th style={{ textAlign: 'right' }}>Credit</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{entry.date}</td>
                      <td>{entry.description}</td>
                      <td>{entry.reference}</td>
                      <td style={{ textAlign: 'right' }}>{entry.debit ? `₹${formatINR(entry.debit)}` : '—'}</td>
                      <td style={{ textAlign: 'right' }}>{entry.credit ? `₹${formatINR(entry.credit)}` : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{formatINR(entry.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PartyLedgerModal
            open={ledgerModalOpen}
            onClose={() => setLedgerModalOpen(false)}
            party={selectedCustomer}
            rows={ledgerRows}
            isCustomer
          />
        </>
      )}
    </div>
  );
}
