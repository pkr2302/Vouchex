import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { portalApi } from '../services/portalApi';
import { dateOnly, formatINR, formatDateDDMMYYYY, sortRegistryNewestFirst } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { buildVendorLedger, vendorOutstanding } from '../utils/partyLedgerUtils';
import { PartyLedgerModal } from './PartyLedgerModal';
import { AgeingBucketsPanel } from './OperationalReportsPanel';
import MobileRegistryCards from './mobile/MobileRegistryCards';
import MobileRegistryCardActions from './mobile/MobileRegistryCardActions';
import MobileCardExpand from './mobile/MobileCardExpand';
import { useMobileBackHandler } from '../hooks/useMobileBackHandler';

export default function CreditorsTab() {
  const { vendors, expenses, payments, debitNotes } = useSimulator();
  const [subView, setSubView] = useState('listing');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ageing, setAgeing] = useState(null);
  const [ageingLoading, setAgeingLoading] = useState(false);

  useMobileBackHandler(!!selectedVendor, () => {
    setSelectedVendor(null);
    return true;
  });

  useMobileBackHandler(ledgerModalOpen, () => {
    setLedgerModalOpen(false);
    return true;
  });

  const rows = useMemo(() => {
    return vendors
      .map((vendor) => {
        const vendExpenses = expenses.filter((exp) => {
          if (String(exp.vendor_id) !== String(vendor.id)) return false;
          const day = dateOnly(exp.expense_date);
          if (fromDate && day < fromDate) return false;
          if (toDate && day > toDate) return false;
          return true;
        });
        const billed = vendExpenses.reduce((s, exp) => s + parseFloat(exp.total_amount || 0), 0);
        const outstanding = vendorOutstanding(vendor, expenses, payments, debitNotes);
        const paid = Math.max(0, billed - outstanding);
        const lastBill = vendExpenses.map((e) => e.expense_date).sort().reverse()[0];

        return {
          vendor,
          billed,
          paid,
          outstanding,
          billCount: vendExpenses.length,
          lastBill,
        };
      })
      .filter((row) => {
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!row.vendor.name?.toLowerCase().includes(q)) return false;
        }
        if (fromDate || toDate) return row.billCount > 0 || row.outstanding > 0.009;
        return true;
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [vendors, expenses, payments, debitNotes, fromDate, toDate, search]);

  const loadAgeing = useCallback(async () => {
    setAgeingLoading(true);
    try {
      const qs = toDate ? `?as_of=${encodeURIComponent(toDate)}` : '';
      const res = await portalApi.glOperationalReports(qs);
      setAgeing(res.payables_ageing);
    } catch (err) {
      showApiError('Loading creditors ageing', err);
    } finally {
      setAgeingLoading(false);
    }
  }, [toDate]);

  useEffect(() => {
    if (subView === 'ageing') loadAgeing();
  }, [subView, loadAgeing]);

  const ledgerRows = selectedVendor
    ? buildVendorLedger(selectedVendor, expenses, payments, debitNotes)
    : [];

  const partyBills = selectedVendor
    ? sortRegistryNewestFirst(
        expenses.filter((exp) => String(exp.vendor_id) === String(selectedVendor.id)),
        'expense_date'
      )
    : [];

  return (
    <div className="dashboard-tab">
      <div className="table-header-row" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="chart-title">Creditors</h2>
          <p className="mobile-page-desc" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Vendors you owe — outstanding from bills minus payments and debit notes.
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
          <label>From date (bill date)</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>To date / Ageing as-of</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Search vendor</label>
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
                  <th>Vendor</th>
                  <th>State</th>
                  <th style={{ textAlign: 'right' }}>Billed</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th>Last bill</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.vendor.id}>
                    <td style={{ fontWeight: 600 }}>{row.vendor.name}</td>
                    <td>{row.vendor.state || row.vendor.billing_state || '—'}</td>
                    <td style={{ textAlign: 'right' }}>₹{formatINR(row.billed)}</td>
                    <td style={{ textAlign: 'right' }}>₹{formatINR(row.paid)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: row.outstanding > 0 ? 'var(--accent-amber)' : 'var(--accent-teal)' }}>
                      ₹{formatINR(row.outstanding)}
                    </td>
                    <td>{row.lastBill || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setSelectedVendor(row.vendor); setLedgerModalOpen(false); }}>
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No creditors match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <MobileRegistryCards
            items={rows}
            emptyLabel="No creditors match your filters."
            renderCard={(row) => {
              const days = row.lastBill
                ? Math.max(0, Math.floor((Date.now() - new Date(row.lastBill).getTime()) / 86400000))
                : null;
              const isClear = row.outstanding <= 0.009;
              const isOverdue = !isClear && days != null && days > 30;
              const badgeClass = isClear ? 'clear' : isOverdue ? 'overdue' : 'due';
              const badgeLabel = isClear ? 'Clear' : isOverdue ? 'Overdue' : 'Due';
              return (
                <>
                  <div className="mobile-registry-card__head">
                    <div>
                      <div className="mobile-registry-card__title">{row.vendor.name}</div>
                      <div className="mobile-registry-card__meta">{row.vendor.state || row.vendor.billing_state || '—'}</div>
                    </div>
                    <div className="mobile-registry-card__amount">₹{formatINR(row.outstanding)}</div>
                  </div>
                  <div className="mobile-registry-card__row">
                    <span>Status</span>
                    <span className={`mobile-registry-card__badge mobile-registry-card__badge--${badgeClass}`}>{badgeLabel}</span>
                  </div>
                  <MobileCardExpand label="More details">
                    <div className="mobile-registry-card__row"><span>Billed</span><span>₹{formatINR(row.billed)}</span></div>
                    <div className="mobile-registry-card__row"><span>Paid</span><span>₹{formatINR(row.paid)}</span></div>
                    {days != null && !isClear && (
                      <div className="mobile-registry-card__row"><span>Age</span><span>{days} days</span></div>
                    )}
                  </MobileCardExpand>
                  <div className="mobile-registry-card__actions">
                    <MobileRegistryCardActions
                      onView={() => { setSelectedVendor(row.vendor); setLedgerModalOpen(false); }}
                      viewLabel="View"
                      viewTitle="View creditor details"
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
          <AgeingBucketsPanel title="Payables Ageing (Creditors)" data={ageing} partyLabel="Vendor" />
        )
      )}

      {selectedVendor && (
        <>
          <div className="table-card" style={{ marginTop: 16 }}>
            <div className="table-header-row">
              <h3 className="chart-title" style={{ margin: 0 }}>{selectedVendor.name}</h3>
              <button type="button" className="btn-secondary" onClick={() => setSelectedVendor(null)}>Back to list</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>GSTIN</span><div>{selectedVendor.gstin || '—'}</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phone</span><div>{selectedVendor.phone || '—'}</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Terms</span><div>{selectedVendor.payment_terms || '—'}</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Opening balance</span><div>₹{formatINR(selectedVendor.opening_balance || 0)}</div></div>
            </div>

            <h4 style={{ marginBottom: 8 }}>Bills / expenses</h4>
            <div className="premium-table-wrapper" style={{ marginBottom: 16 }}>
              <table className="premium-table">
                <thead>
                  <tr><th>Bill</th><th>Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
                </thead>
                <tbody>
                  {partyBills.map((exp) => (
                    <tr key={exp.id}>
                      <td>{exp.expense_number || exp.invoice_number}</td>
                      <td>{exp.expense_date}</td>
                      <td>{exp.payment_status}</td>
                      <td style={{ textAlign: 'right' }}>₹{formatINR(exp.total_amount)}</td>
                    </tr>
                  ))}
                  {partyBills.length === 0 && (
                    <tr><td colSpan={4} className="empty-state">No bills for this vendor.</td></tr>
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
                  {ledgerRows.map((row, idx) => (
                    <tr key={`${row.reference}-${idx}`}>
                      <td>{formatDateDDMMYYYY(row.date)}</td>
                      <td>{row.description}</td>
                      <td>{row.reference}</td>
                      <td style={{ textAlign: 'right' }}>{row.debit > 0 ? `₹${formatINR(row.debit)}` : '—'}</td>
                      <td style={{ textAlign: 'right' }}>{row.credit > 0 ? `₹${formatINR(row.credit)}` : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{formatINR(row.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <PartyLedgerModal
            open={ledgerModalOpen}
            party={selectedVendor}
            partyType="vendor"
            ledgerRows={ledgerRows}
            onClose={() => setLedgerModalOpen(false)}
          />
        </>
      )}
    </div>
  );
}
