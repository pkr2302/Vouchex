import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { VouchExBrand } from './VouchExBrand';

export default function SetPasswordPage({ onSave, requirePassword = false }) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Password confirmation does not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave({ password, password_confirmation: passwordConfirm });
    } catch (err) {
      setError(err.message || 'Could not save password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-orb auth-orb--1" aria-hidden />
      <div className="auth-orb auth-orb--2" aria-hidden />
      <div className="auth-card">
        <div className="auth-logo">
          <VouchExBrand variant="auth" />
          <p className="auth-subtitle">
            {requirePassword
              ? 'Create a password for your VouchEx account before setting up your company.'
              : 'Set a password for email sign-in (optional but recommended)'}
          </p>
        </div>

        {error && (
          <div className="error-banner auth-error-banner">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              className="form-input"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              className="form-input"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Saving…' : requirePassword ? 'Continue' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
