import { loadApiConfig } from './apiConfig';
import { formatApiError } from '../utils/apiErrors';

const TOKEN_KEY = 'vouchex_auth_token';
const COMPANY_KEY = 'vouchex_active_company_id';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getActiveCompanyId() {
  return localStorage.getItem(COMPANY_KEY);
}

export function setActiveCompanyId(companyId) {
  if (companyId) localStorage.setItem(COMPANY_KEY, String(companyId));
  else localStorage.removeItem(COMPANY_KEY);
}

function buildApiError(data, status, path, method) {
  const err = new Error('');
  err.status = status;
  err.action = `${method || 'GET'} ${path}`;
  const payload = data && typeof data === 'object' ? data : {};
  err.data = {
    ...payload,
    action: `${method || 'GET'} ${path}`,
    message: payload.message || payload.error || `Request failed (${status})`,
    error: payload.error || payload.message || undefined,
  };
  err.message = formatApiError(err);
  return err;
}

export async function apiRequest(path, options = {}) {
  const config = await loadApiConfig();
  const base = config.apiBaseUrl;
  if (!base) {
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL or public/config.json.');
  }

  const method = options.method || 'GET';

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const companyId = getActiveCompanyId();
  if (companyId && !path.includes('/auth/login')) {
    headers['X-Company-Id'] = companyId;
  }

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      ...options,
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (networkErr) {
    const err = new Error('');
    err.status = 0;
    err.data = {
      message: 'Could not reach the server.',
      cause: networkErr.message || 'Network connection failed.',
      hint: 'Check your internet connection and confirm https://vouchex.kuhu.org.in is online.',
      action: `${method} ${path}`,
    };
    err.message = formatApiError(err, 'API request');
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      message: 'Server returned a non-JSON response.',
      error: text?.slice(0, 500) || '(empty response)',
      cause: 'The API may be misconfigured or returning an HTML error page.',
      hint: 'Check server logs or contact hosting support.',
    };
  }

  if (!res.ok) {
    throw buildApiError(data, res.status, path, method);
  }

  return data;
}

/** GET (or other) request that returns a downloadable blob (e.g. backup JSON). */
export async function apiDownload(path, options = {}) {
  const config = await loadApiConfig();
  const base = config.apiBaseUrl;
  if (!base) {
    throw new Error('API base URL is not configured.');
  }

  const method = options.method || 'GET';
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const companyId = getActiveCompanyId();
  if (companyId) headers['X-Company-Id'] = companyId;

  const res = await fetch(`${base}${path}`, { ...options, method, headers });
  if (!res.ok) {
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text?.slice(0, 500) || 'Download failed' };
    }
    throw buildApiError(data, res.status, path, method);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";\n]+)"?/i);
  const filename = match ? match[1].trim() : options.fallbackFilename || 'download.json';

  return { blob, filename };
}

export async function apiUpload(path, formData) {
  const config = await loadApiConfig();
  const base = config.apiBaseUrl;
  if (!base) {
    throw new Error('API base URL is not configured.');
  }

  const headers = { Accept: 'application/json' };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const companyId = getActiveCompanyId();
  if (companyId) headers['X-Company-Id'] = companyId;

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (networkErr) {
    const err = new Error('');
    err.status = 0;
    err.data = {
      message: 'Could not reach the server.',
      cause: networkErr.message || 'Network connection failed.',
      hint: 'Check your connection and try again.',
      action: `POST ${path}`,
    };
    err.message = formatApiError(err, 'File upload');
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      message: 'Upload failed — server returned an unexpected response.',
      error: text?.slice(0, 500) || '(empty)',
    };
  }

  if (!res.ok) {
    throw buildApiError(data, res.status, path, 'POST');
  }

  return data;
}

export { formatApiError } from '../utils/apiErrors';
export { showApiError } from '../utils/apiErrors';
