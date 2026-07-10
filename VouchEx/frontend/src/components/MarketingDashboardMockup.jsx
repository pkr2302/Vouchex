import React from 'react';
import {
  BarChart3,
  FileText,
  IndianRupee,
  Receipt,
  TrendingUp,
} from 'lucide-react';

export default function MarketingDashboardMockup() {
  return (
    <div className="mkt-mockup-wrap" aria-hidden>
      <div className="mkt-mockup-glow" />
      <div className="mkt-mockup-frame">
        <div className="mkt-mockup-bar">
          <span className="mkt-mockup-dot mkt-mockup-dot--r" />
          <span className="mkt-mockup-dot mkt-mockup-dot--y" />
          <span className="mkt-mockup-dot mkt-mockup-dot--g" />
          <span className="mkt-mockup-bar-title">VouchEx Portal — Dashboard</span>
        </div>
        <div className="mkt-mockup-body">
          <aside className="mkt-mockup-sidebar">
            {['Dashboard', 'Sales', 'GST', 'Reports'].map((l) => (
              <span key={l} className={l === 'Dashboard' ? 'active' : ''}>{l}</span>
            ))}
          </aside>
          <div className="mkt-mockup-main">
            <div className="mkt-mockup-kpis">
              <div className="mkt-mockup-kpi">
                <Receipt size={16} />
                <div>
                  <small>Invoices (MTD)</small>
                  <strong>₹12.4L</strong>
                </div>
              </div>
              <div className="mkt-mockup-kpi">
                <TrendingUp size={16} />
                <div>
                  <small>Receivables</small>
                  <strong>₹3.2L</strong>
                </div>
              </div>
              <div className="mkt-mockup-kpi">
                <IndianRupee size={16} />
                <div>
                  <small>GST Payable</small>
                  <strong>₹48K</strong>
                </div>
              </div>
            </div>
            <div className="mkt-mockup-grid">
              <div className="mkt-mockup-panel">
                <h4><BarChart3 size={14} /> Sales trend</h4>
                <div className="mkt-mockup-chart">
                  {[40, 55, 48, 72, 65, 88, 78].map((h, i) => (
                    <div key={i} className="mkt-mockup-bar-col" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="mkt-mockup-panel">
                <h4><FileText size={14} /> Recent transactions</h4>
                <ul className="mkt-mockup-list">
                  <li><span>INV-2026-041</span><span>₹24,500</span></li>
                  <li><span>RCPT-1182</span><span>₹1,10,000</span></li>
                  <li><span>EXP-883</span><span>₹8,200</span></li>
                  <li><span>GSTR-1 draft</span><span className="ok">Ready</span></li>
                </ul>
              </div>
            </div>
            <div className="mkt-mockup-pl">
              <span>P&amp;L snapshot (Q1)</span>
              <div className="mkt-mockup-pl-row"><span>Revenue</span><strong>₹38.6L</strong></div>
              <div className="mkt-mockup-pl-row"><span>Expenses</span><strong>₹21.1L</strong></div>
              <div className="mkt-mockup-pl-row mkt-mockup-pl-row--profit"><span>Net profit</span><strong>₹17.5L</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
