let runtimeConfig = null;

export async function loadApiConfig() {
  if (runtimeConfig) return runtimeConfig;

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    runtimeConfig = {
      apiBaseUrl: envUrl.replace(/\/$/, ''),
      syncIntervalMs: Number(import.meta.env.VITE_SYNC_INTERVAL_MS || 5000),
      documentLockTtlMinutes: Number(import.meta.env.VITE_DOCUMENT_LOCK_TTL_MINUTES || 15),
    };
    return runtimeConfig;
  }

  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      runtimeConfig = {
        apiBaseUrl: (json.apiBaseUrl || '').replace(/\/$/, ''),
        syncIntervalMs: json.syncIntervalMs || 5000,
        documentLockTtlMinutes: json.documentLockTtlMinutes || 15,
      };
      return runtimeConfig;
    }
  } catch {
    // ignore — local dev may use .env only
  }

  runtimeConfig = {
    apiBaseUrl: '/api',
    syncIntervalMs: 5000,
    documentLockTtlMinutes: 15,
  };
  return runtimeConfig;
}

export function getApiConfig() {
  return runtimeConfig;
}
