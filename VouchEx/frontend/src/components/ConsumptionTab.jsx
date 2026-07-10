import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { formatDateDDMMYYYY, toAmount, nextDocumentNumber, sortRegistryNewestFirst, dateOnly } from '../utils/formatMoney';
import { portalTodayDateOnly } from '../utils/accountingHelpers';
import { showApiError } from '../utils/apiErrors';
import { Req } from './portalShared';

function weightedAvgCost(productId, expenses) {
  const rows = expenses.filter((e) => Number(e.product_id) === Number(productId) && toAmount(e.quantity_purchased) > 0);
  if (!rows.length) return 0;
  let totalQty = 0;
  let totalVal = 0;
  rows.forEach((e) => {
    const qty = toAmount(e.quantity_purchased);
    const unit = toAmount(e.amount) / qty;
    totalQty += qty;
    totalVal += unit * qty;
  });
  return totalQty > 0 ? totalVal / totalQty : 0;
}

export default function ConsumptionTab() {
  const {
    consumptions = [],
    createConsumption,
    deleteConsumption,
    inventory,
    expenseHeads,
    expenses,
    addConsoleLog,
  } = useSimulator();

  const [showForm, setShowForm] = useState(false);
  const [consumptionDate, setConsumptionDate] = useState(portalTodayDateOnly());
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expenseHead, setExpenseHead] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const products = inventory.filter((i) => i.type === 'Product');

  const unitCost = useMemo(() => {
    if (!productId) return 0;
    const item = products.find((p) => String(p.id) === String(productId));
    if (!item) return 0;
    const avg = weightedAvgCost(productId, expenses);
    return avg > 0 ? avg : toAmount(item.purchase_price ?? item.rate);
  }, [productId, products, expenses]);

  const totalValue = toAmount(quantity) * unitCost;

  const sortedConsumptions = useMemo(
    () => sortRegistryNewestFirst(consumptions, 'consumption_date'),
    [consumptions]
  );

  const onProductChange = (id) => {
    setProductId(id);
    const item = products.find((p) => String(p.id) === String(id));
    if (item?.default_expense_head) setExpenseHead(item.default_expense_head);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !quantity || toAmount(quantity) <= 0) {
      alert('Select a product and enter quantity.');
      return;
    }
    if (!expenseHead) {
      alert('Select an expense head for P&L mapping.');
      return;
    }
    setSaving(true);
    const num = nextDocumentNumber('CON', '2026', consumptions.map((c) => c.consumption_number));
    try {
      await createConsumption({
        consumption_number: num,
        consumption_date: consumptionDate,
        product_id: Number(productId),
        quantity: toAmount(quantity),
        unit_cost: unitCost,
        total_value: totalValue,
        expense_head: expenseHead,
        reference: reference.trim() || null,
      });
      addConsoleLog('route', 'POST /api/consumptions', `Consumption ${num} recorded.`);
      setShowForm(false);
      setProductId('');
      setQuantity('');
      setReference('');
    } catch (err) {
      showApiError('Recording consumption', err);
    }
    setSaving(false);
  };

  return (
    <div className="consumption-tab">
      <div className="table-header-row">
        <div>
          <h3 className="chart-title">Consumption Register</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Record inventory consumed in operations. Stock reduces and cost posts to the selected expense head.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Record Consumption
        </button>
      </div>

      {showForm && (
        <form className="master-form" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          <h4 className="form-section-title">New consumption entry</h4>
          <div className="form-grid-3">
            <div className="form-group">
              <Req>Date of consumption</Req>
              <input type="date" className="form-input" value={consumptionDate} onChange={(e) => setConsumptionDate(dateOnly(e.target.value))} />
            </div>
            <div className="form-group">
              <Req>Product / item</Req>
              <select className="form-input" value={productId} onChange={(e) => onProductChange(e.target.value)}>
                <option value="">Select from inventory</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || '—'})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <Req>Quantity</Req>
              <input type="number" step="0.001" min="0" className="form-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty consumed" />
            </div>
            <div className="form-group">
              <label>Unit cost (auto)</label>
              <input type="text" className="form-input" readOnly value={unitCost ? `₹${unitCost.toFixed(2)}` : '—'} />
            </div>
            <div className="form-group">
              <label>Total value (auto)</label>
              <input type="text" className="form-input" readOnly value={totalValue ? `₹${totalValue.toFixed(2)}` : '—'} />
            </div>
            <div className="form-group">
              <Req>Expense ledger mapping</Req>
              <select className="form-input" value={expenseHead} onChange={(e) => setExpenseHead(e.target.value)}>
                <option value="">Select expense head</option>
                {expenseHeads.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Reference / remarks</label>
              <input type="text" className="form-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Used for Crane #4 at Downtown project" />
            </div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className={`btn-primary ${saving ? 'btn-submitting' : ''}`} disabled={saving}>Save consumption</button>
          </div>
        </form>
      )}

      <div className="premium-table-wrapper">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Date</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit cost</th>
              <th>Total value</th>
              <th>Expense head</th>
              <th>Remarks</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedConsumptions.map((c) => {
              const prod = products.find((p) => Number(p.id) === Number(c.product_id));
              return (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace' }}>{c.consumption_number}</td>
                  <td>{formatDateDDMMYYYY(c.consumption_date)}</td>
                  <td><strong>{prod?.name || `#${c.product_id}`}</strong></td>
                  <td>{c.quantity}</td>
                  <td>₹{toAmount(c.unit_cost).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>₹{toAmount(c.total_value).toLocaleString()}</td>
                  <td>{c.expense_head}</td>
                  <td>{c.reference || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '4px 8px', color: 'var(--accent-red)' }}
                      onClick={async () => {
                        if (!window.confirm('Delete this consumption entry?')) return;
                        try {
                          await deleteConsumption(c.id);
                        } catch (err) {
                          showApiError('Deleting consumption', err);
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {consumptions.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-state">No consumption entries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
