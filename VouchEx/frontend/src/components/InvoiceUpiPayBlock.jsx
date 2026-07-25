import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildUpiPayUri, normalizeUpiId } from '../utils/upiHelpers';
import { companyTradeName } from '../utils/companyDisplay';
import { toAmount } from '../utils/formatMoney';

/**
 * Invoice PDF UPI block: VPA text + scan-to-pay QR (amount-aware).
 */
export default function InvoiceUpiPayBlock({ upiId, company, invoiceNumber, amount, currency = 'INR' }) {
  const vpa = normalizeUpiId(upiId);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const payAmount = toAmount(amount);
  const uri = buildUpiPayUri({
    pa: vpa,
    pn: companyTradeName(company) || company?.name || '',
    am: currency === 'INR' ? payAmount : undefined,
    tn: invoiceNumber || '',
    cu: currency === 'INR' ? 'INR' : currency,
  });

  useEffect(() => {
    let cancelled = false;
    if (!uri || currency !== 'INR' || payAmount <= 0.009) {
      setQrDataUrl('');
      return undefined;
    }
    QRCode.toDataURL(uri, {
      width: 128,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [uri, currency, payAmount]);

  if (!vpa) return null;

  return (
    <div className="pdf-upi-block">
      <p className="pdf-upi-line">
        <strong>UPI ID:</strong> <span>{vpa}</span>
      </p>
      {qrDataUrl && (
        <div className="pdf-upi-qr">
          <img src={qrDataUrl} alt={`UPI QR for ${invoiceNumber || 'invoice'}`} width={112} height={112} />
          <p className="pdf-upi-qr-hint">Scan to pay</p>
        </div>
      )}
    </div>
  );
}
