import { FileText, ChevronRight } from 'lucide-react';
import { MOBILE_RECORD_GROUPS } from '../../utils/mobileAppConfig';
import { formatINR } from '../../utils/formatMoney';

function todaySummary({ invoices, receipts, expenses, payments }) {
  const today = new Date().toISOString().slice(0, 10);
  const salesToday = invoices
    .filter((i) => i.status !== 'Cancelled' && (i.issue_date || '').slice(0, 10) === today)
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const receiptToday = receipts
    .filter((r) => (r.payment_date || '').slice(0, 10) === today)
    .reduce((s, r) => s + parseFloat(r.amount_received || 0), 0);
  const expenseToday = expenses
    .filter((e) => (e.expense_date || '').slice(0, 10) === today)
    .reduce((s, e) => s + parseFloat(e.total_amount || 0), 0);
  const paymentToday = payments
    .filter((p) => (p.payment_date || '').slice(0, 10) === today)
    .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
  return { salesToday, receiptToday, expenseToday, paymentToday };
}

const GROUP_ICONS = {
  sales: '📤',
  buy: '📥',
  people: '👥',
  stock: '📦',
};

export default function MobileTransactionHome({ onNavigate, invoices, receipts, expenses, payments }) {
  const summary = todaySummary({ invoices, receipts, expenses, payments });
  const primaryInvoice = MOBILE_RECORD_GROUPS[0].items.find((i) => i.primary);

  const handleQuick = (item) => {
    onNavigate?.(item.tab, item.openForm ? { openForm: true } : undefined);
  };

  return (
    <div className="mobile-tx-home mobile-only">
      <section className="mobile-tx-home__hero">
        <p className="mobile-tx-home__greeting">Today&apos;s business</p>
        {primaryInvoice && (
          <button
            type="button"
            className="mobile-tx-home__cta"
            onClick={() => handleQuick(primaryInvoice)}
          >
            <FileText size={22} />
            <span>
              <strong>New invoice</strong>
              <small>Bill a customer in a few taps</small>
            </span>
            <ChevronRight size={20} />
          </button>
        )}
      </section>

      {MOBILE_RECORD_GROUPS.map((group) => (
        <section key={group.id} className="mobile-tx-home__group">
          <div className="mobile-tx-home__group-head">
            <span className="mobile-tx-home__group-icon" aria-hidden="true">{GROUP_ICONS[group.id]}</span>
            <div>
              <h3 className="mobile-tx-home__group-title">{group.title}</h3>
              <p className="mobile-tx-home__group-sub">{group.subtitle}</p>
            </div>
          </div>
          <div className={`mobile-tx-home__grid mobile-tx-home__grid--${group.items.length >= 4 ? 4 : group.items.length}`}>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mobile-tx-home__tile${item.primary ? ' mobile-tx-home__tile--primary' : ''}`}
                onClick={() => handleQuick(item)}
              >
                <span className="mobile-tx-home__tile-label">{item.label}</span>
                {!item.primary && <span className="mobile-tx-home__tile-desc">{item.desc}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="mobile-tx-home__today">
        <div className="mobile-tx-home__today-head">
          <h3>Today at a glance</h3>
          <span className="mobile-tx-home__today-sub">Your CA gets the full picture on desktop</span>
        </div>
        <div className="mobile-tx-home__stats">
          <article className="mobile-tx-home__stat mobile-tx-home__stat--in">
            <span>Sold today</span>
            <strong>₹{formatINR(summary.salesToday)}</strong>
          </article>
          <article className="mobile-tx-home__stat mobile-tx-home__stat--in">
            <span>Collected</span>
            <strong>₹{formatINR(summary.receiptToday)}</strong>
          </article>
          <article className="mobile-tx-home__stat mobile-tx-home__stat--out">
            <span>Spent</span>
            <strong>₹{formatINR(summary.expenseToday)}</strong>
          </article>
          <article className="mobile-tx-home__stat mobile-tx-home__stat--out">
            <span>Paid out</span>
            <strong>₹{formatINR(summary.paymentToday)}</strong>
          </article>
        </div>
      </section>
    </div>
  );
}
