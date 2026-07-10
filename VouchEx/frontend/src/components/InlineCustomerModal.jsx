import React, { useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { showApiError } from '../utils/apiErrors';
import { isValidPaymentTerms } from '../utils/formatMoney';
import {
  Modal,
  Req,
  Opt,
  DynamicSelect,
  CurrencySelect,
  PaymentTermsSelect,
  StatePlaceOfSupplySelect,
} from './portalShared';

const emptyForm = () => ({
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  category: 'Wholesaler',
  gstType: 'Registered - Regular',
  gstin: '',
  pan: '',
  currency: 'INR',
  billingAddress: '',
  billingCity: '',
  billingState: 'Gujarat',
  billingPincode: '',
  billingCountry: 'India',
  shippingSame: true,
  shippingAddress: '',
  shippingCity: '',
  shippingState: 'Gujarat',
  shippingPincode: '',
  shippingCountry: 'India',
  openingBalance: '0.00',
  openingBalanceDate: '2026-04-01',
  paymentTerms: 'Due on Receipt',
  creditLimit: '0.00',
});

/** Full customer master form in a modal (used from invoice / credit note screens). */
export function InlineCustomerModal({ open, onClose, onCreated }) {
  const { createCustomer, isFinancialYearLocked } = useSimulator();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleGstinChange = (val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    set('gstin', clean);
    if (clean.length >= 12) set('pan', clean.substring(2, 12));
  };

  const resetAndClose = () => {
    setForm(emptyForm());
    onClose?.();
  };

  const save = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) return alert('Period locked.');
    if (!form.name.trim()) return alert('Customer name is required.');
    if (!isValidPaymentTerms(form.paymentTerms)) {
      return alert('Enter valid payment terms (preset or Net N days).');
    }
    setSaving(true);
    try {
      const c = await createCustomer({
        name: form.name.trim(),
        contact_person: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        category: form.category,
        gst_type: form.gstType,
        gstin: form.gstin || 'NIL',
        pan: form.pan || '',
        currency: form.currency || 'INR',
        billing_address: form.billingAddress.trim() || '—',
        billing_city: form.billingCity.trim() || '—',
        billing_state: form.billingState,
        billing_pincode: form.billingPincode.trim() || '000000',
        billing_country: form.billingCountry.trim() || 'India',
        shipping_same: form.shippingSame,
        shipping_address: form.shippingSame ? form.billingAddress : form.shippingAddress,
        shipping_city: form.shippingSame ? form.billingCity : form.shippingCity,
        shipping_state: form.shippingSame ? form.billingState : form.shippingState,
        shipping_pincode: form.shippingSame ? form.billingPincode : form.shippingPincode,
        shipping_country: form.shippingSame ? form.billingCountry : form.shippingCountry,
        opening_balance: parseFloat(form.openingBalance) || 0,
        opening_balance_date: form.openingBalanceDate,
        payment_terms: form.paymentTerms,
        credit_limit: parseFloat(form.creditLimit) || 0,
      });
      onCreated?.(c);
      resetAndClose();
    } catch (err) {
      showApiError('Creating customer', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Add New Customer" onClose={resetAndClose} width={920}>
      <form onSubmit={save} className="master-form">
        <h4 className="form-section-title">Basic Information</h4>
        <div className="form-grid-3">
          <div className="form-group">
            <Req>Customer / Legal Entity Name</Req>
            <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <Opt>Contact Person</Opt>
            <input className="form-input" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
          </div>
          <div className="form-group">
            <Opt>Email</Opt>
            <input type="email" className="form-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="form-group">
            <Opt>Phone</Opt>
            <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <DynamicSelect
            optionKey="customer_categories"
            label="Category"
            value={form.category}
            onChange={(v) => set('category', v)}
            baseOptions={['Wholesaler', 'Retailer', 'VIP Account', 'Standard Corporate']}
          />
          <CurrencySelect label="Default currency" value={form.currency} onChange={(v) => set('currency', v)} />
        </div>

        <h4 className="form-section-title">Tax & Compliance</h4>
        <div className="form-grid-3">
          <div className="form-group">
            <Req>GST Registration Type</Req>
            <select className="form-input" value={form.gstType} onChange={(e) => set('gstType', e.target.value)}>
              <option>Registered - Regular</option>
              <option>Registered - Composition</option>
              <option>Unregistered (Consumer/B2C)</option>
              <option>SEZ (Special Economic Zone)</option>
              <option>Overseas (Export)</option>
            </select>
          </div>
          <div className="form-group">
            <Opt>GSTIN</Opt>
            <input
              className="form-input"
              maxLength={15}
              value={form.gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              disabled={['Unregistered (Consumer/B2C)', 'Overseas (Export)'].includes(form.gstType)}
            />
          </div>
          <div className="form-group">
            <Opt>PAN</Opt>
            <input className="form-input" maxLength={10} value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} />
          </div>
        </div>

        <h4 className="form-section-title">Billing Address</h4>
        <div className="form-group">
          <Req>Address</Req>
          <textarea className="form-input" rows={2} value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} />
        </div>
        <div className="form-grid-4">
          <div className="form-group"><Opt>City</Opt><input className="form-input" value={form.billingCity} onChange={(e) => set('billingCity', e.target.value)} /></div>
          <StatePlaceOfSupplySelect label="State" value={form.billingState} onChange={(v) => set('billingState', v)} />
          <div className="form-group"><Opt>Pincode</Opt><input className="form-input" value={form.billingPincode} onChange={(e) => set('billingPincode', e.target.value)} /></div>
          <div className="form-group"><Opt>Country</Opt><input className="form-input" value={form.billingCountry} onChange={(e) => set('billingCountry', e.target.value)} /></div>
        </div>

        <h4 className="form-section-title">Accounting</h4>
        <div className="form-grid-3">
          <div className="form-group">
            <Opt>Opening Balance</Opt>
            <input className="form-input" value={form.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} />
          </div>
          <div className="form-group">
            <Opt>Opening Balance Date</Opt>
            <input type="date" className="form-input" value={form.openingBalanceDate} onChange={(e) => set('openingBalanceDate', e.target.value)} />
          </div>
          <PaymentTermsSelect value={form.paymentTerms} onChange={(v) => set('paymentTerms', v)} />
        </div>
        <div className="form-group">
          <Opt>Credit Limit</Opt>
          <input className="form-input" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Customer'}</button>
          <button type="button" className="btn-secondary" onClick={resetAndClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
