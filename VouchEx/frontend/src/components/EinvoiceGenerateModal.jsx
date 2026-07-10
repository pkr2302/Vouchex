import { useState } from 'react';
import { Modal } from './portalShared';
import { showApiError } from '../utils/apiErrors';

export default function EinvoiceGenerateModal({ open, invoice, onClose, onSuccess, generateEinvoice }) {
  const [buyerPincode, setBuyerPincode] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [dispatchPincode, setDispatchPincode] = useState('');
  const [supplyType, setSupplyType] = useState('B2B');
  const [busy, setBusy] = useState(false);

  if (!open || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await generateEinvoice(invoice.id, {
        buyer_pincode: buyerPincode.trim(),
        buyer_city: buyerCity.trim(),
        dispatch_pincode: dispatchPincode.trim(),
        supply_type: supplyType,
      });
      onSuccess?.(res);
      onClose();
      alert(`E-Invoice generated${res.mode === 'sandbox' ? ' (sandbox demo)' : ''}.\nIRN: ${res.irn || res.invoice?.irn}`);
    } catch (err) {
      showApiError('Generating e-Invoice', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Generate e-Invoice — ${invoice.invoice_number}`} variant="solid">
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        These fields are only needed when raising an e-Invoice. Normal invoices stay unchanged if you skip this.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Buyer pincode *</label>
            <input className="form-input" value={buyerPincode} onChange={(e) => setBuyerPincode(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Buyer city</label>
            <input className="form-input" value={buyerCity} onChange={(e) => setBuyerCity(e.target.value)} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Dispatch pincode (if different from company)</label>
            <input className="form-input" value={dispatchPincode} onChange={(e) => setDispatchPincode(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Supply type</label>
            <select className="form-input" value={supplyType} onChange={(e) => setSupplyType(e.target.value)}>
              <option value="B2B">B2B</option>
              <option value="SEZWP">SEZ with payment</option>
              <option value="SEZWOP">SEZ without payment</option>
              <option value="EXPWP">Export with payment</option>
              <option value="EXPWOP">Export without payment</option>
            </select>
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Generating…' : 'Generate IRN'}</button>
        </div>
      </form>
    </Modal>
  );
}
