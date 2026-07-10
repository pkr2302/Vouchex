import React, { useState } from 'react';
import { AlertTriangle, Building2, ChevronRight } from 'lucide-react';
import { VouchExBrand } from './VouchExBrand';
import { INDIAN_STATES } from '../utils/gstUtils';

export default function OnboardingPage({ account, currentUser, onCreateCompany, onSaveDetails }) {
  const step = account?.onboarding_step || currentUser?.onboarding_step || 'company_create';

  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Gujarat');
  const [email, setEmail] = useState(currentUser?.email || '');

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!legalName.trim()) {
      setError('Legal company name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onCreateCompany({
        name: legalName.trim(),
        trade_name: tradeName.trim() || legalName.trim(),
        gstin: gstin.trim() || null,
        state,
        email: email.trim() || null,
      });
    } catch (err) {
      setError(err.message || 'Could not create company.');
    } finally {
      setBusy(false);
    }
  };

  const handleDetails = async (e) => {
    e.preventDefault();
    if (!legalName.trim()) {
      setError('Legal company name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSaveDetails({
        name: legalName.trim(),
        trade_name: tradeName.trim() || legalName.trim(),
        gstin: gstin.trim() || null,
        pan: pan.trim() || null,
        state,
        address: address.trim() || null,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        country: 'India',
        email: email.trim() || null,
        phone: phone.trim() || null,
        currency: 'INR (₹)',
      });
    } catch (err) {
      setError(err.message || 'Could not save company details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrapper onboarding-wrapper">
      <div className="auth-orb auth-orb--1" aria-hidden />
      <div className="auth-orb auth-orb--2" aria-hidden />
      <div className="auth-card onboarding-card">
        <div className="auth-logo">
          <VouchExBrand variant="auth" />
          <p className="auth-subtitle">Set up your company workspace</p>
        </div>

        <div className="onboarding-steps">
          <span className={step === 'company_create' ? 'active' : 'done'}>1. Company</span>
          <ChevronRight size={14} aria-hidden />
          <span className={step === 'company_details' ? 'active' : ''}>2. Details</span>
        </div>

        {error && (
          <div className="error-banner auth-error-banner">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {step === 'company_create' && (
          <form onSubmit={handleCreate} className="auth-form">
            <div className="onboarding-intro">
              <Building2 size={20} />
              <p>Create one company for your 30-day trial. Legal names must be unique on VouchEx.</p>
            </div>
            <div className="form-group">
              <label>Legal company name *</label>
              <input
                className="form-input"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="As registered with GST / MCA"
              />
            </div>
            <div className="form-group">
              <label>Trade / display name</label>
              <input
                className="form-input"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Shown on invoices (optional)"
              />
            </div>
            <div className="form-group">
              <label>GSTIN (optional)</label>
              <input className="form-input" value={gstin} onChange={(e) => setGstin(e.target.value)} maxLength={15} />
            </div>
            <div className="form-group">
              <label>State</label>
              <select className="form-input" value={state} onChange={(e) => setState(e.target.value)}>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Company email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? 'Creating…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'company_details' && (
          <form onSubmit={handleDetails} className="auth-form">
            <div className="form-group">
              <label>Legal company name *</label>
              <input className="form-input" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Trade name</label>
              <input className="form-input" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
            </div>
            <div className="form-grid-2 onboarding-grid">
              <div className="form-group">
                <label>GSTIN</label>
                <input className="form-input" value={gstin} onChange={(e) => setGstin(e.target.value)} maxLength={15} />
              </div>
              <div className="form-group">
                <label>PAN</label>
                <input className="form-input" value={pan} onChange={(e) => setPan(e.target.value)} maxLength={10} />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea className="form-input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="form-grid-2 onboarding-grid">
              <div className="form-group">
                <label>City</label>
                <input className="form-input" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input className="form-input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? 'Starting trial…' : 'Start 30-day trial'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
