import { FileSpreadsheet } from 'lucide-react';

export default function MobileTaxSummaryBlock({ title, subtitle, stats = [] }) {
  return (
    <div className="mobile-gstr-summary mobile-tax-summary-block">
      <div className="mobile-gstr-summary__head">
        <div>
          <h4 className="mobile-gstr-summary__title">{title}</h4>
          {subtitle && <p className="mobile-gstr-summary__sub">{subtitle}</p>}
        </div>
        <FileSpreadsheet size={22} className="mobile-gstr-summary__icon" aria-hidden="true" />
      </div>
      {stats.length > 0 && (
        <div className="mobile-gstr-summary__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="mobile-gstr-summary__stat">
              <span className="mobile-gstr-summary__label">{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
