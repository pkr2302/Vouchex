/** Trade / brand name — invoices, portal header, PDFs. */
export function companyTradeName(details) {
  if (!details) return '';
  return String(details.trade_name || details.name || '').trim();
}

/** Legal entity name — GST returns, tax filings, compliance exports. */
export function companyLegalName(details) {
  if (!details) return '';
  return String(details.name || details.trade_name || '').trim();
}
