/** Multi-line company address for invoices, vouchers, and previews. */
export function CompanyAddressBlock({ company, baseStyle }) {
  const style = {
    fontSize: '12px',
    margin: '2px 0 0 0',
    whiteSpace: 'pre-line',
    lineHeight: 1.45,
    ...baseStyle,
  };

  if (!company?.address && !company?.city) {
    return null;
  }

  const lines = [];
  if (company.address) {
    company.address
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => lines.push(line));
  }

  const cityLine = [company.city, company.state, company.pincode].filter(Boolean).join(', ');
  const lastLine = lines[lines.length - 1] || '';
  const cityInAddress =
    company.city &&
    lastLine.toLowerCase().includes(String(company.city).toLowerCase());

  if (cityLine && !cityInAddress) {
    lines.push(cityLine);
  }

  return (
    <>
      {lines.map((line, i) => (
        <p key={i} style={{ ...style, marginTop: i === 0 ? '4px' : '2px' }}>
          {line}
        </p>
      ))}
    </>
  );
}
