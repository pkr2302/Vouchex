import { useEffect, useMemo, useRef, useState } from 'react';
import { AmountInput, CurrencySelect, DynamicSelect } from './portalShared';
import AdvanceAdjustmentModal from './AdvanceAdjustmentModal';
import { RegistryRowActions } from './RegistryRowActions';
import MobileRegistryCards from './mobile/MobileRegistryCards';
import MobileRegistryCardActions from './mobile/MobileRegistryCardActions';
import MobileCardExpand from './mobile/MobileCardExpand';
import { dateOnly, formatDateDDMMYYYY, formatDocumentMoney, sameId, sortRegistryNewestFirst, toAmount } from '../utils/formatMoney';
import { portalTodayDateOnly } from '../utils/accountingHelpers';
import { invoiceOutstandingAmount } from '../utils/accountingHelpers';
import {
  advanceOriginalAmount,
  advanceReferenceLabel,
  advanceStatusLabel,
  canEditAdvanceReference,
  getCustomerAvailableAdvances,
  nextAdvanceReference,
} from '../utils/advanceHelpers';
import { showApiError } from '../utils/apiErrors';

export default function AdvanceReceiptPanel({
  customers,
  receipts,
  advanceAdjustments,
  invoices,
  creditNotes,
  bankAccounts,
  cashLedgers,
  isFinancialYearLocked,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  createAdvanceAdjustments,
  editingReceipt = null,
  onCancelEdit,
  onSaved,
  getReceiptShare,
  onViewReceipt,
  onEditAdvance,
}) {
  const [customerId, setCustomerId] = useState('');
  const [paymentDate, setPaymentDate] = useState(portalTodayDateOnly());
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank');
  const [depositTo, setDepositTo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [advanceReference, setAdvanceReference] = useState('');
  const [receiptCurrency, setReceiptCurrency] = useState('INR');
  const [transactionType, setTransactionType] = useState('new');
  const [adjustInvoiceId, setAdjustInvoiceId] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const advanceRefUserEditedRef = useRef(false);

  const receiptPaymentModeOptions = [
    ...bankAccounts.map((b) => `Bank: ${b}`),
    ...cashLedgers.map((c) => `Cash: ${c}`),
    'Bank',
    'Cash',
  ];

  const advanceRegistryRows = useMemo(
    () => sortRegistryNewestFirst(receipts.filter((r) => r.is_advance), 'payment_date'),
    [receipts]
  );

  useEffect(() => {
    if (bankAccounts.length > 0) {
      setDepositTo(bankAccounts[0]);
      setPaymentMode('Bank');
    } else if (cashLedgers.length > 0) {
      setDepositTo(cashLedgers[0]);
      setPaymentMode('Cash');
    }
  }, [bankAccounts, cashLedgers]);

  useEffect(() => {
    if (editingReceipt) {
      setCustomerId(editingReceipt.customer_id != null ? String(editingReceipt.customer_id) : '');
      setPaymentDate(dateOnly(editingReceipt.payment_date) || portalTodayDateOnly());
      setAmountReceived(String(editingReceipt.amount_received ?? ''));
      setPaymentMode(editingReceipt.payment_mode || 'Bank');
      setDepositTo(editingReceipt.deposit_to || '');
      setReferenceNo(editingReceipt.reference_no && editingReceipt.reference_no !== 'NIL' ? editingReceipt.reference_no : '');
      setUtrNumber(editingReceipt.utr_number || '');
      setChequeNumber(editingReceipt.cheque_number || '');
      setBankReference(editingReceipt.bank_reference || '');
      setCustomerReference(editingReceipt.customer_reference || '');
      setAdvanceReference(editingReceipt.advance_reference || '');
      setReceiptCurrency(editingReceipt.currency || 'INR');
      setTransactionType('new');
      advanceRefUserEditedRef.current = true;
      return;
    }
    advanceRefUserEditedRef.current = false;
    setAdvanceReference(nextAdvanceReference(paymentDate, receipts));
  }, [editingReceipt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingReceipt || advanceRefUserEditedRef.current) return;
    setAdvanceReference(nextAdvanceReference(paymentDate, receipts));
  }, [paymentDate, editingReceipt]); // eslint-disable-line react-hooks/exhaustive-deps

  const customerOutstandingInvoices = useMemo(() => {
    if (!customerId) return [];
    return invoices
      .filter((inv) => sameId(inv.customer_id, customerId) && inv.status !== 'Cancelled')
      .map((inv) => ({
        ...inv,
        outstanding: invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments),
      }))
      .filter((inv) => inv.outstanding > 0.009);
  }, [customerId, invoices, receipts, creditNotes, advanceAdjustments]);

  const customerAdvances = useMemo(
    () => getCustomerAvailableAdvances(customerId, receipts, advanceAdjustments),
    [customerId, receipts, advanceAdjustments]
  );

  const resetForm = () => {
    setCustomerId('');
    setAmountReceived('');
    setReferenceNo('');
    setUtrNumber('');
    setChequeNumber('');
    setBankReference('');
    setCustomerReference('');
    setTransactionType('new');
    setAdjustInvoiceId('');
    advanceRefUserEditedRef.current = false;
    setAdvanceReference(nextAdvanceReference(portalTodayDateOnly(), receipts));
    onCancelEdit?.();
  };

  const saveNewAdvance = async () => {
    if (isFinancialYearLocked) {
      alert('SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.');
      return;
    }
    if (!customerId) {
      alert('Customer is mandatory.');
      return;
    }
    if (!advanceReference.trim()) {
      alert('Advance Reference Number is mandatory.');
      return;
    }
    if (toAmount(amountReceived) <= 0) {
      alert('Amount must be positive.');
      return;
    }
    const client = customers.find((c) => sameId(c.id, customerId));
    const payload = {
      customer_id: parseInt(customerId, 10),
      customer_name: client?.name || 'Customer',
      payment_date: dateOnly(paymentDate),
      amount_received: toAmount(amountReceived),
      tds_deducted: 0,
      discount_allowed: 0,
      currency: receiptCurrency || 'INR',
      payment_mode: paymentMode,
      deposit_to: depositTo,
      reference_no: referenceNo || 'NIL',
      utr_number: utrNumber || null,
      cheque_number: chequeNumber || null,
      bank_reference: bankReference || null,
      customer_reference: customerReference || null,
      advance_reference: advanceReference.trim(),
      is_advance: true,
    };
    try {
      if (editingReceipt) {
        await updateReceipt(editingReceipt.id, payload);
      } else {
        await createReceipt(payload);
      }
      resetForm();
      onSaved?.();
    } catch (err) {
      showApiError(editingReceipt ? 'Updating advance receipt' : 'Saving advance receipt', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (transactionType === 'adjust') {
      if (!customerId) {
        alert('Select customer first.');
        return;
      }
      if (!adjustInvoiceId) {
        alert('Select invoice to adjust against.');
        return;
      }
      setShowAdjustModal(true);
      return;
    }
    await saveNewAdvance();
  };

  const handleAdjustConfirm = async (rows) => {
    try {
      await createAdvanceAdjustments({
        invoice_id: parseInt(adjustInvoiceId, 10),
        adjustment_date: dateOnly(paymentDate),
        adjustments: rows,
      });
      setShowAdjustModal(false);
      resetForm();
      onSaved?.();
    } catch (err) {
      showApiError('Applying advance adjustment', err);
    }
  };

  const handleDeleteAdvance = async (rec) => {
    if (!deleteReceipt) return;
    try {
      await deleteReceipt(rec.id);
    } catch (err) {
      showApiError('Deleting advance receipt', err);
    }
  };

  const refLocked = editingReceipt && !canEditAdvanceReference(editingReceipt, advanceAdjustments);
  const selectedInvoice = invoices.find((i) => sameId(i.id, adjustInvoiceId));
  const shareFor = (rec) => (getReceiptShare ? getReceiptShare(rec) : null);

  return (
    <>
      <form onSubmit={handleSubmit} className="master-form">
        <h3 className="form-section-title">
          {editingReceipt ? `Edit Advance Receipt — ${advanceReferenceLabel(editingReceipt)}` : 'Record Advance Receipt'}
        </h3>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
          Book customer collections received before invoicing. Advances can be applied when raising invoices or from this screen.
        </p>

        <div className="form-grid-3">
          <div className="form-group">
            <label>Customer *</label>
            <select className="form-input" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAdjustInvoiceId(''); }} required>
              <option value="">— Select customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input type="date" className="form-input" value={dateOnly(paymentDate)} onChange={(e) => setPaymentDate(dateOnly(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Transaction Type *</label>
            <select className="form-input" value={transactionType} onChange={(e) => setTransactionType(e.target.value)} disabled={!!editingReceipt}>
              <option value="new">New Advance Receipt</option>
              <option value="adjust">Adjust Existing Advance to Invoice</option>
            </select>
          </div>
        </div>

        {transactionType === 'new' ? (
          <>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Advance Reference Number *</label>
                <input
                  type="text"
                  className="form-input"
                  value={advanceReference}
                  readOnly={refLocked}
                  style={refLocked ? { backgroundColor: 'var(--bg-primary)' } : undefined}
                  onChange={(e) => {
                    advanceRefUserEditedRef.current = true;
                    setAdvanceReference(e.target.value);
                  }}
                />
                {refLocked && <p className="form-hint">Locked after adjustments were made.</p>}
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <AmountInput noSpinner value={amountReceived} onChange={setAmountReceived} />
              </div>
              <CurrencySelect label="Currency" value={receiptCurrency} onChange={setReceiptCurrency} required />
            </div>
            <div className="form-grid-3">
              <DynamicSelect
                optionKey="receipt_payment_modes"
                label="Mode of Receipt"
                value={paymentMode}
                onChange={(v) => {
                  setPaymentMode(v);
                  if (v.includes('Bank:')) setDepositTo(v.replace('Bank: ', ''));
                  else if (v.includes('Cash:')) setDepositTo(v.replace('Cash: ', ''));
                }}
                required
                baseOptions={receiptPaymentModeOptions}
              />
              <div className="form-group">
                <label>Deposit To *</label>
                <select className="form-input" value={depositTo} onChange={(e) => setDepositTo(e.target.value)}>
                  {bankAccounts.map((b) => <option key={b} value={b}>{b}</option>)}
                  {cashLedgers.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Payment / Customer Reference</label>
                <input type="text" className="form-input" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              </div>
            </div>
            <div className="form-grid-4">
              <div className="form-group"><label>UTR Number</label><input type="text" className="form-input" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} /></div>
              <div className="form-group"><label>Cheque Number</label><input type="text" className="form-input" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} /></div>
              <div className="form-group"><label>Bank Reference</label><input type="text" className="form-input" value={bankReference} onChange={(e) => setBankReference(e.target.value)} /></div>
              <div className="form-group"><label>Customer Reference</label><input type="text" className="form-input" value={customerReference} onChange={(e) => setCustomerReference(e.target.value)} /></div>
            </div>
          </>
        ) : (
          <div className="form-grid-3" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label>Outstanding Invoice *</label>
              <select className="form-input" value={adjustInvoiceId} onChange={(e) => setAdjustInvoiceId(e.target.value)} disabled={!customerId}>
                <option value="">— Select invoice —</option>
                {customerOutstandingInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — Outstanding {formatDocumentMoney(inv.outstanding, inv.currency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Available advances</label>
              <input type="text" className="form-input" readOnly value={`${customerAdvances.length} advance(s) with balance`} style={{ backgroundColor: 'var(--bg-primary)' }} />
            </div>
          </div>
        )}

        <div className="btn-row">
          <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
          <button type="submit" className="btn-primary">
            {transactionType === 'adjust' ? 'Open Adjustment' : (editingReceipt ? 'Update Advance' : 'Save Advance Receipt')}
          </button>
        </div>
      </form>

      {!editingReceipt && (
        <>
          <div className="premium-table-wrapper desktop-only" style={{ marginTop: 24 }}>
            <h4 className="chart-title" style={{ marginBottom: 12 }}>Customer advance register</h4>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Advance Ref</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Original</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Voucher Actions</th>
                </tr>
              </thead>
              <tbody>
                {advanceRegistryRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace' }}>{advanceReferenceLabel(r)}</td>
                    <td>{r.customer_name}</td>
                    <td>{formatDateDDMMYYYY(r.payment_date)}</td>
                    <td style={{ textAlign: 'right' }}>{formatDocumentMoney(advanceOriginalAmount(r), r.currency)}</td>
                    <td>{advanceStatusLabel(r, advanceAdjustments)}</td>
                    <td className="registry-actions-cell">
                      <RegistryRowActions
                        onEdit={() => onEditAdvance?.(r)}
                        onView={() => onViewReceipt?.(r)}
                        viewTitle="View advance receipt"
                        share={shareFor(r)}
                        deleteLabel={`advance ${advanceReferenceLabel(r)}`}
                        onDelete={() => handleDeleteAdvance(r)}
                        deleteDisabled={isFinancialYearLocked}
                      />
                    </td>
                  </tr>
                ))}
                {advanceRegistryRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">No advance receipts recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <MobileRegistryCards
            className="mobile-only"
            items={advanceRegistryRows}
            emptyLabel="No advance receipts recorded yet."
            renderCard={(r) => (
              <>
                <div className="mobile-registry-card__head">
                  <div>
                    <div className="mobile-registry-card__title">{advanceReferenceLabel(r)}</div>
                    <div className="mobile-registry-card__meta">{r.customer_name}</div>
                  </div>
                  <div className="mobile-registry-card__amount">{formatDocumentMoney(advanceOriginalAmount(r), r.currency)}</div>
                </div>
                <div className="mobile-registry-card__row"><span>Date</span><span>{formatDateDDMMYYYY(r.payment_date)}</span></div>
                <div className="mobile-registry-card__row"><span>Status</span><span>{advanceStatusLabel(r, advanceAdjustments)}</span></div>
                <MobileCardExpand label="More details">
                  <div className="mobile-registry-card__row"><span>Voucher no.</span><span>{r.receipt_number || '—'}</span></div>
                  <div className="mobile-registry-card__row"><span>Mode</span><span>{r.payment_mode || '—'}</span></div>
                </MobileCardExpand>
                <div className="mobile-registry-card__actions">
                  <MobileRegistryCardActions
                    onView={() => onViewReceipt?.(r)}
                    viewTitle="View advance receipt"
                    onEdit={() => onEditAdvance?.(r)}
                    share={shareFor(r)}
                    deleteLabel={`advance ${advanceReferenceLabel(r)}`}
                    onDelete={() => handleDeleteAdvance(r)}
                    deleteDisabled={isFinancialYearLocked}
                  />
                </div>
              </>
            )}
          />
        </>
      )}

      <AdvanceAdjustmentModal
        open={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        onConfirm={handleAdjustConfirm}
        customerId={customerId}
        invoiceId={adjustInvoiceId}
        invoiceAmount={selectedInvoice?.total_amount}
        invoices={invoices}
        receipts={receipts}
        advanceAdjustments={advanceAdjustments}
        creditNotes={creditNotes}
        title="Adjust Existing Advance to Invoice"
        confirmLabel="Save Adjustment"
      />
    </>
  );
}
