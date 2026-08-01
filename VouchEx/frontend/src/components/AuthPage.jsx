import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { VouchExBrand } from './VouchExBrand';
import { formatApiError } from '../utils/apiErrors';

export default function AuthPage({
  mode: initialMode = 'login',
  publicConfig,
  onBack,
  onLogin,
  onRegister,
  onGoogleCredential,
}) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const googleBtnRef = useRef(null);
  const googleCredentialRef = useRef(onGoogleCredential);
  const gsiClientIdRef = useRef(null);

  useEffect(() => {
    googleCredentialRef.current = onGoogleCredential;
  }, [onGoogleCredential]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const clientId = publicConfig?.google_client_id;
    if (!clientId || !googleBtnRef.current || !onGoogleCredential) return undefined;

    let cancelled = false;

    const renderButton = () => {
      const idApi = window.google?.accounts?.id;
      if (cancelled || !idApi || !googleBtnRef.current) return;

      // initialize() must run once per client id; repeat calls make GSI drop earlier instances.
      if (gsiClientIdRef.current !== clientId) {
        idApi.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) return;
            setError('');
            setBusy(true);
            Promise.resolve(googleCredentialRef.current?.(response.credential))
              .catch((err) => setError(formatApiError(err, 'Google sign-in')))
              .finally(() => setBusy(false));
          },
        });
        gsiClientIdRef.current = clientId;
      }

      const buttonWidth = Math.min(320, Math.max(240, window.innerWidth - 56));
      googleBtnRef.current.innerHTML = '';
      idApi.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: buttonWidth,
        text: mode === 'register' ? 'signup_with' : 'signin_with',
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }

    const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
    let script = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', renderButton);

    return () => {
      cancelled = true;
      script.removeEventListener('load', renderButton);
    };
  }, [publicConfig?.google_client_id, mode, onGoogleCredential]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('Password confirmation does not match.');
        return;
      }
      setBusy(true);
      try {
        const res = await onRegister({ name: name.trim(), email, password, password_confirmation: passwordConfirm });
        if (!res.success) setError(res.message);
      } catch (err) {
        setError(err.message || 'Registration failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await onLogin(email, password);
      if (!res.success) setError(res.message);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-orb auth-orb--1" aria-hidden />
      <div className="auth-orb auth-orb--2" aria-hidden />
      <div className="auth-orb auth-orb--3" aria-hidden />
      <div className="auth-card">
        {onBack && (
          <button type="button" className="auth-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <div className="auth-logo">
          <VouchExBrand variant="auth" />
          <p className="auth-subtitle">
            {mode === 'register' ? 'Create your free trial account' : 'Sign in to your portal'}
          </p>
        </div>

        {error && (
          <div className="error-banner auth-error-banner">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>Full name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              placeholder={mode === 'register' ? 'Min. 8 characters' : 'Enter password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label>Confirm password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Repeat password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
          )}
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {publicConfig?.google_client_id && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <div className="auth-google-wrap" ref={googleBtnRef} />
          </>
        )}

        <p className="auth-switch">
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(''); }}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New to VouchEx?{' '}
              <button type="button" onClick={() => { setMode('register'); setError(''); }}>
                Start free trial
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
