import { useState } from 'react';
import { Modal } from './portalShared';
import { showApiError } from '../utils/apiErrors';

export default function EwayBillGenerateModal({ open, invoice, onClose, onSuccess, generateEwayBill }) {
  const [transportMode, setTransportMode] = useState('Road');
  const [vehicleNo, setVehicleNo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [transporterGstin, setTransporterGstin] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [fromPincode, setFromPincode] = useState('');
  const [toPincode, setToPincode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await generateEwayBill(invoice.id, {
        transport_mode: transportMode,
        vehicle_no: vehicleNo.trim(),
        transporter_name: transporterName.trim(),
        transporter_gstin: transporterGstin.trim(),
        distance_km: distanceKm ? parseInt(distanceKm, 10) : 0,
        from_pincode: fromPincode.trim(),
        to_pincode: toPincode.trim(),
      });
      onSuccess?.(res);
      onClose();
      alert(`E-Way Bill generated${res.mode === 'sandbox' ? ' (sandbox demo)' : ''}.\nEWB No: ${res.eway_bill?.ewb_no}`);
    } catch (err) {
      showApiError('Generating e-Way Bill', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Generate e-Way Bill — ${invoice.invoice_number}`} variant="solid">
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Transport details are only required when you choose to raise an e-Way Bill for this invoice.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Transport mode *</label>
            <select className="form-input" value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
              <option value="Air">Air</option>
              <option value="Ship">Ship</option>
            </select>
          </div>
          <div className="form-group">
            <label>Vehicle number {transportMode === 'Road' ? '*' : ''}</label>
            <input className="form-input" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} required={transportMode === 'Road'} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>From pincode</label>
            <input className="form-input" placeholder="Company / dispatch pincode" value={fromPincode} onChange={(e) => setFromPincode(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To pincode *</label>
            <input className="form-input" value={toPincode} onChange={(e) => setToPincode(e.target.value)} required />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Distance (km)</label>
            <input type="number" className="form-input" min="0" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Transporter GSTIN</label>
            <input className="form-input" value={transporterGstin} onChange={(e) => setTransporterGstin(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Transporter name</label>
          <input className="form-input" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} />
        </div>
        <div className="btn-row">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Generating…' : 'Generate e-Way Bill'}</button>
        </div>
      </form>
    </Modal>
  );
}
