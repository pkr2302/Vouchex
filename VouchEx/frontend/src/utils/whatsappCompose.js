/** Strip to digits; default India (+91) when 10-digit local mobile. */
export function normalizeWhatsAppPhone(raw, defaultCountryCode = '91') {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

/** Keep wa.me URLs within practical browser limits. */
export function whatsAppSafeText(text, maxLen = 1500) {
  const s = String(text || '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 48)}\n\n...(truncated — open portal for full details)`;
}

/**
 * Opens WhatsApp with prefilled message (app on mobile, Web/desktop app on laptop).
 * @param {{ phone?: string, text: string }} opts — phone optional; user picks contact if omitted
 */
export function openWhatsAppCompose({ phone, text }) {
  const safe = whatsAppSafeText(text);
  const params = new URLSearchParams({ text: safe });
  const normalized = normalizeWhatsAppPhone(phone);
  const base = normalized ? `https://wa.me/${normalized}` : 'https://wa.me/';
  window.open(`${base}?${params.toString()}`, '_blank', 'noopener,noreferrer');
}
