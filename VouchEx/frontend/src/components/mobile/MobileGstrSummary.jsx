import { useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { formatINR, toAmount } from '../../utils/formatMoney';
import { bifurcateStoredTax, isIntraState } from '../../utils/gstUtils';

export default function MobileGstrSummary({ invoices = [], registeredState, summaryOnly = false, detailOpen, onToggleDetail }) {
  const stats = useMemo(() => {
    const active = invoices.filter((i) => i.status !== 'Cancelled');
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    active.forEach((inv) => {
      taxable += toAmount(inv.subtotal) - toAmount(inv.discount);
      const b = bifurcateStoredTax(inv, inv.place_of_supply, registeredState);
      if (isIntraState(inv.place_of_supply, registeredState)) {
        cgst += b.cgst;
        sgst += b.sgst;
      } else {
        igst += b.igst;
      }
    });
    return {
      count: active.length,
      taxable,
      gst: cgst + sgst + igst,
    };
  }, [invoices, registeredState]);

  return (
    <div className="mobile-gstr-summary">
      <div className="mobile-gstr-summary__head">
        <div>
          <h4 className="mobile-gstr-summary__title">GSTR-1</h4>
          <p className="mobile-gstr-summary__sub">Outward supply summary</p>
        </div>
        <FileSpreadsheet size={22} className="mobile-gstr-summary__icon" aria-hidden="true" />
      </div>
      <div className="mobile-gstr-summary__stats">
        <div className="mobile-gstr-summary__stat">
          <span className="mobile-gstr-summary__label">Invoices</span>
          <strong>{stats.count}</strong>
        </div>
        <div className="mobile-gstr-summary__stat">
          <span className="mobile-gstr-summary__label">Taxable value</span>
          <strong>₹{formatINR(stats.taxable)}</strong>
        </div>
        <div className="mobile-gstr-summary__stat">
          <span className="mobile-gstr-summary__label">GST</span>
          <strong>₹{formatINR(stats.gst)}</strong>
        </div>
      </div>
      {!summaryOnly && onToggleDetail && (
        <button
          type="button"
          className="mobile-gstr-summary__toggle btn-secondary"
          onClick={onToggleDetail}
          aria-expanded={detailOpen}
        >
          {detailOpen ? 'Hide detailed table' : 'View detailed table'}
        </button>
      )}
    </div>
  );
}
