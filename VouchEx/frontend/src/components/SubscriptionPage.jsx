import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard } from 'lucide-react';
import { VouchExBrand } from './VouchExBrand';

const UPI_QR_PATH = '/brand/upi-payment-qr.png';

function resolveQrUrl(paymentConfig) {
  const base = paymentConfig?.upi_qr_url?.startsWith('http')
    ? paymentConfig.upi_qr_url
    : paymentConfig?.upi_qr_url || UPI_QR_PATH;
  if (base.includes('?')) return base;
  return `${base}?v=20260615`;
}

const PLAN_ORDER = ['monthly', 'quarterly', 'yearly'];

export default function SubscriptionPage({
  plans,
  paymentConfig,
  pendingPayment,
  onSubmitPayment,
  onRefresh,
  onLogout,
  earlyUpgrade,
  onBack,
}) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const qrUrl = resolveQrUrl(paymentConfig);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const ref = reference.trim();
    if (!ref || ref.length < 6) {
      setError('Please enter your UPI transaction reference number (at least 6 characters).');
      return;
    }
    setBusy(true);
    try {
      await onSubmitPayment({
        plan: selectedPlan,
        payment_reference: ref,
        notes: notes.trim() || null,
      });
      setSuccess('Payment claim submitted. We will activate your plan after verification (usually within 24 hours).');
      setReference('');
      setNotes('');
      onRefresh?.();
    } catch (err) {
      setError(err.message || 'Could not submit payment claim.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrapper subscription-wrapper">
      <div className="auth-orb auth-orb--1" aria-hidden />
      <div className="auth-orb auth-orb--2" aria-hidden />
      <div className="auth-card subscription-card">
        <div className="auth-logo">
          <VouchExBrand variant="auth" />
          <p className="auth-subtitle">
            {earlyUpgrade
              ? 'Upgrade early and keep uninterrupted access'
              : 'Your free trial has ended — choose a plan to continue'}
          </p>
        </div>

        {pendingPayment?.status === 'pending' && (
          <div className="subscription-pending-banner">
            <CheckCircle2 size={18} />
            <div>
              <strong>Payment under review</strong>
              <p>
                Plan: {plans?.[pendingPayment.plan]?.label || pendingPayment.plan} · ₹
                {pendingPayment.amount} — submitted{' '}
                {pendingPayment.created_at ? new Date(pendingPayment.created_at).toLocaleDateString() : ''}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner auth-error-banner">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="success-banner auth-error-banner">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <div className="subscription-plans">
          {PLAN_ORDER.map((key) => {
            const plan = plans?.[key];
            if (!plan) return null;
            return (
              <button
                key={key}
                type="button"
                className={`subscription-plan ${selectedPlan === key ? 'active' : ''}`}
                onClick={() => setSelectedPlan(key)}
              >
                <span className="subscription-plan-label">{plan.label}</span>
                <span className="subscription-plan-price">₹{plan.amount}</span>
                <span className="subscription-plan-days">{plan.days} days access</span>
              </button>
            );
          })}
        </div>

        <div className="subscription-pay-block">
          <CreditCard size={18} />
          <div>
            <h3>Pay via UPI</h3>
            {paymentConfig?.upi_vpa && (
              <p>
                UPI ID: <strong>{paymentConfig.upi_vpa}</strong>
                {paymentConfig.upi_payee_name ? ` · ${paymentConfig.upi_payee_name}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="subscription-qr-wrap">
          <img src={qrUrl} alt="UPI QR code" className="subscription-qr" />
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>UPI transaction reference <span className="subscription-required">*</span></label>
            <input
              className="form-input"
              placeholder="e.g. 123456789012"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <input
              className="form-input"
              placeholder="Payment date, payer name, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={busy || pendingPayment?.status === 'pending'}>
            {busy ? 'Submitting…' : 'I have paid — submit for approval'}
          </button>
        </form>

        {paymentConfig?.support_email && (
          <p className="subscription-support">
            Questions? Email{' '}
            <a href={`mailto:${paymentConfig.support_email}`}>{paymentConfig.support_email}</a>
          </p>
        )}

        <div className="subscription-footer-actions">
          {onBack && (
            <button type="button" className="subscription-footer-btn" onClick={onBack}>
              Back to portal
            </button>
          )}

          {onLogout && (
            <button type="button" className="subscription-footer-btn subscription-footer-btn--muted" onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
