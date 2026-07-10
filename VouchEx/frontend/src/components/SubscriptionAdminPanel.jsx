import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { portalApi } from '../services/portalApi';
import { showApiError } from '../utils/apiErrors';

export default function SubscriptionAdminPanel() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalApi.listPendingSubscriptionPayments();
      setPayments(res.payments || []);
    } catch (err) {
      showApiError('Loading subscription payments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    if (!confirm('Approve this payment and activate the subscription?')) return;
    setActingId(id);
    try {
      await portalApi.approveSubscriptionPayment(id);
      await load();
    } catch (err) {
      showApiError('Approving payment', err);
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    const notes = prompt('Rejection reason (optional):') ?? '';
    setActingId(id);
    try {
      await portalApi.rejectSubscriptionPayment(id, notes);
      await load();
    } catch (err) {
      showApiError('Rejecting payment', err);
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading pending payments…</p>;
  }

  if (!payments.length) {
    return (
      <div className="master-form">
        <h3 className="form-section-title">Subscription payments</h3>
        <p style={{ color: 'var(--text-secondary)' }}>No pending payment claims.</p>
      </div>
    );
  }

  return (
    <div className="master-form">
      <h3 className="form-section-title">Pending subscription payments</h3>
      <div className="table-card">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>User</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Submitted</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.company?.name || `#${p.company_id}`}</td>
                <td>
                  {p.user?.name}
                  <br />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.user?.email}</span>
                </td>
                <td>{p.plan}</td>
                <td>₹{p.amount}</td>
                <td>{p.payment_reference || '—'}</td>
                <td>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ marginRight: '8px', padding: '6px 10px', fontSize: '11px' }}
                    disabled={actingId === p.id}
                    onClick={() => approve(p.id)}
                  >
                    <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '11px', color: '#ef4444' }}
                    disabled={actingId === p.id}
                    onClick={() => reject(p.id)}
                  >
                    <XCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
