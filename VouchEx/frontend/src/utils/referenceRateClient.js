/** Snapshot used when API and live market fetch are both unavailable. */
const STATIC_RBI_SNAPSHOT = {
  updated_at: '2026-05-23',
  rates: {
    USD: 83.5,
    EUR: 90.25,
    GBP: 105.8,
    JPY: 0.56,
    AUD: 55.2,
    CAD: 60.85,
    CHF: 93.4,
    SGD: 62.1,
    HKD: 10.68,
    SAR: 22.25,
    CNY: 11.55,
    NZD: 51.3,
    SEK: 7.85,
    DKK: 12.1,
    NOK: 7.75,
    KWD: 272.5,
    BHD: 221.8,
  },
};

/** Fetch market INR rate via Frankfurter (browser-safe, no auth). */
export async function fetchMarketReferenceRate(currency, date) {
  const code = String(currency || '').toUpperCase();
  if (!code || code === 'INR') return null;

  const day = date || new Date().toISOString().slice(0, 10);
  const res = await fetch(`https://api.frankfurter.app/${day}?from=${encodeURIComponent(code)}&to=INR`);
  if (!res.ok) return null;

  const data = await res.json();
  const rate = data?.rates?.INR;
  if (!rate || Number(rate) <= 0) return null;

  return {
    currency: code,
    rate: Number(rate),
    rate_date: data.date || day,
    source: 'ecb_market',
    label: code,
    available: true,
    note: 'Market reference rate (ECB). Verify against RBI reference rate for GST filing.',
  };
}

/** Last-resort cached RBI snapshot bundled with the app. */
export function staticReferenceRate(currency) {
  const code = String(currency || '').toUpperCase();
  const rate = STATIC_RBI_SNAPSHOT.rates[code];
  if (!rate || Number(rate) <= 0) return null;

  return {
    currency: code,
    rate: Number(rate),
    rate_date: STATIC_RBI_SNAPSHOT.updated_at,
    source: 'rbi_cached',
    label: code,
    available: true,
    note: 'Cached RBI snapshot (server rate lookup unavailable).',
  };
}

/** Try portal API, then market API, then bundled snapshot. */
export async function resolveReferenceRate(currency, date, fetchFromPortal) {
  try {
    const res = await fetchFromPortal(currency, date);
    const ref = res?.reference;
    if (ref?.available && ref.rate != null) return ref;
    if (ref && !ref.available) {
      const market = await fetchMarketReferenceRate(currency, date);
      if (market) return market;
      const cached = staticReferenceRate(currency);
      if (cached) return cached;
      return ref;
    }
    if (ref?.rate != null) return ref;
  } catch {
    /* fall through to client-side sources */
  }

  const market = await fetchMarketReferenceRate(currency, date);
  if (market) return market;

  const cached = staticReferenceRate(currency);
  if (cached) return cached;

  return null;
}
