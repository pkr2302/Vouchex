import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { showApiError } from '../utils/apiErrors';

const AUTH_TYPES = [
  { value: 'bearer', label: 'Bearer token / API secret' },
  { value: 'basic', label: 'Username & password' },
  { value: 'api_key', label: 'API key + client id' },
  { value: 'none', label: 'No auth (custom gateway)' },
];

const EMPTY_CHANNEL = {
  api_url: '',
  auth_type: 'bearer',
  client_id: '',
  client_secret: '',
  username: '',
  password: '',
};

export default function GstComplianceSettingsPanel() {
  const { companyDetails, saveGstComplianceSettings, currentUser, activeCompany } = useSimulator();
  const gc = companyDetails.gst_compliance || {};
  const [einvoiceEnabled, setEinvoiceEnabled] = useState(!!gc.einvoice_enabled);
  const [ewaybillEnabled, setEwaybillEnabled] = useState(!!gc.ewaybill_enabled);
  const [apiMode, setApiMode] = useState(gc.api_mode || 'sandbox');
  const [providerLabel, setProviderLabel] = useState(gc.provider_label || '');
  const [einvoice, setEinvoice] = useState({ ...EMPTY_CHANNEL, ...(gc.einvoice || {}), client_secret: '', password: '' });
  const [ewaybill, setEwaybill] = useState({ ...EMPTY_CHANNEL, ...(gc.ewaybill || {}), client_secret: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const hydratedForCompanyRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const hydrateFrom = useCallback((source) => {
    const next = source || {};
    setEinvoiceEnabled(!!next.einvoice_enabled);
    setEwaybillEnabled(!!next.ewaybill_enabled);
    setApiMode(next.api_mode || 'sandbox');
    setProviderLabel(next.provider_label || '');
    setEinvoice({ ...EMPTY_CHANNEL, ...(next.einvoice || {}), client_secret: '', password: '' });
    setEwaybill({ ...EMPTY_CHANNEL, ...(next.ewaybill || {}), client_secret: '', password: '' });
  }, []);

  const markDirty = () => setIsDirty(true);

  useEffect(() => {
    const companyId = activeCompany?.id;
    if (companyId == null) return;

    if (hydratedForCompanyRef.current !== companyId) {
      hydratedForCompanyRef.current = companyId;
      setIsDirty(false);
      hydrateFrom(companyDetails.gst_compliance);
      return;
    }

    if (!isDirty) {
      hydrateFrom(companyDetails.gst_compliance);
    }
  }, [activeCompany?.id, companyDetails.gst_compliance, hydrateFrom, isDirty]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return alert('Only administrators can update GST compliance settings.');
    setSaving(true);
    try {
      const saved = await saveGstComplianceSettings({
        einvoice_enabled: einvoiceEnabled,
        ewaybill_enabled: ewaybillEnabled,
        api_mode: apiMode,
        provider_label: providerLabel.trim(),
        einvoice: {
          api_url: einvoice.api_url.trim(),
          auth_type: einvoice.auth_type,
          client_id: einvoice.client_id.trim(),
          client_secret: einvoice.client_secret.trim(),
          username: einvoice.username.trim(),
          password: einvoice.password.trim(),
        },
        ewaybill: {
          api_url: ewaybill.api_url.trim(),
          auth_type: ewaybill.auth_type,
          client_id: ewaybill.client_id.trim(),
          client_secret: ewaybill.client_secret.trim(),
          username: ewaybill.username.trim(),
          password: ewaybill.password.trim(),
        },
      });
      setIsDirty(false);
      if (saved) hydrateFrom(saved);
      alert('GST compliance settings saved for this company.');
    } catch (err) {
      showApiError('Saving GST compliance settings', err);
    } finally {
      setSaving(false);
    }
  };

  const renderChannel = (label, channel, setChannel, enabled, hasSecretFlags) => (
    <div className={`gst-settings-channel${enabled ? '' : ' gst-settings-channel--disabled'}`}>
      <h4>{label}</h4>
      <div className="form-grid-2">
        <div className="form-group">
          <label>API base URL</label>
          <input
            className="form-input"
            placeholder="https://your-gsp-or-gateway.example.com"
            value={channel.api_url}
            onChange={(e) => {
              markDirty();
              setChannel({ ...channel, api_url: e.target.value });
            }}
            disabled={!enabled || !isAdmin}
          />
          <p className="form-hint">Leave blank to use built-in sandbox (no live IRN/EWB). Each company uses its own API account.</p>
        </div>
        <div className="form-group">
          <label>Auth type</label>
          <select
            className="form-input"
            value={channel.auth_type}
            onChange={(e) => {
              markDirty();
              setChannel({ ...channel, auth_type: e.target.value });
            }}
            disabled={!enabled || !isAdmin}
          >
            {AUTH_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Client ID / API user</label>
          <input
            className="form-input"
            value={channel.client_id}
            onChange={(e) => {
              markDirty();
              setChannel({ ...channel, client_id: e.target.value });
            }}
            disabled={!enabled || !isAdmin}
          />
        </div>
        <div className="form-group">
          <label>Client secret / token {hasSecretFlags?.has_client_secret ? '(saved — leave blank to keep)' : ''}</label>
          <input
            type="password"
            className="form-input"
            value={channel.client_secret}
            onChange={(e) => {
              markDirty();
              setChannel({ ...channel, client_secret: e.target.value });
            }}
            disabled={!enabled || !isAdmin}
          />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Username {channel.auth_type === 'basic' ? '*' : ''}</label>
          <input
            className="form-input"
            value={channel.username}
            onChange={(e) => {
              markDirty();
              setChannel({ ...channel, username: e.target.value });
            }}
            disabled={!enabled || !isAdmin}
          />
        </div>
        <div className="form-group">
          <label>Password {hasSecretFlags?.has_password ? '(saved — leave blank to keep)' : ''}</label>
          <input
            type="password"
            className="form-input"
            value={channel.password}
            onChange={(e) => {
              markDirty();
              setChannel({ ...channel, password: e.target.value });
            }}
            disabled={!enabled || !isAdmin}
          />
        </div>
      </div>
    </div>
  );

  return (
    <form className="table-card gst-settings-panel" onSubmit={handleSave}>
      <h3>GST Compliance — E-Invoice &amp; E-Way Bill</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Off by default. Enable only for companies that need IRN or e-way bills. API credentials belong to this company — any third-party API cost is borne by them, not VouchEx.
        {isDirty && (
          <span style={{ display: 'block', marginTop: 8, color: 'var(--warning, #b45309)' }}>
            You have unsaved changes — click &quot;Save GST compliance settings&quot; below to keep them.
          </span>
        )}
      </p>

      <div className="gst-settings-toggles">
        <label className="gst-settings-toggle">
          <input
            type="checkbox"
            checked={einvoiceEnabled}
            onChange={(e) => {
              markDirty();
              setEinvoiceEnabled(e.target.checked);
            }}
            disabled={!isAdmin}
          />
          <span>Enable e-Invoice (IRN) for this company</span>
        </label>
        <label className="gst-settings-toggle">
          <input
            type="checkbox"
            checked={ewaybillEnabled}
            onChange={(e) => {
              markDirty();
              setEwaybillEnabled(e.target.checked);
            }}
            disabled={!isAdmin}
          />
          <span>Enable e-Way Bill for this company</span>
        </label>
      </div>

      <div className="form-grid-2" style={{ marginTop: 16 }}>
        <div className="form-group">
          <label>API mode</label>
          <select
            className="form-input"
            value={apiMode}
            onChange={(e) => {
              markDirty();
              setApiMode(e.target.value);
            }}
            disabled={!isAdmin}
          >
            <option value="sandbox">Sandbox / demo (no external API URL needed)</option>
            <option value="production">Production (uses API URLs below)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Provider label (optional)</label>
          <input
            className="form-input"
            placeholder="e.g. NIC direct, ClearTax, Masters India"
            value={providerLabel}
            onChange={(e) => {
              markDirty();
              setProviderLabel(e.target.value);
            }}
            disabled={!isAdmin}
          />
        </div>
      </div>

      {renderChannel('E-Invoice API connection', einvoice, setEinvoice, einvoiceEnabled, gc.einvoice)}
      {renderChannel('E-Way Bill API connection', ewaybill, setEwaybill, ewaybillEnabled, gc.ewaybill)}

      {isAdmin && (
        <div className="btn-row" style={{ marginTop: 20 }}>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save GST compliance settings'}</button>
        </div>
      )}
    </form>
  );
}
