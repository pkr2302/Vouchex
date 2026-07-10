import { useCallback, useEffect, useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
import DashboardFinancialCharts from './DashboardFinancialCharts';
import {
  InvoicesReceivablesPanel,
  ExpenseBreakdownCorePanel,
  ProfitLossPanel,
  SalesTrajectoryPanel,
} from './DashboardCoreCharts';
import {
  DASHBOARD_PANEL_IDS,
  loadDashboardPanelOrder,
  saveDashboardPanelOrder,
  buildInvoicesReceivablesTracks,
  buildExpenseBreakdown,
  buildProfitLossComparison,
  buildSalesTrajectoryFiltered,
  isDateInPeriod,
  DASHBOARD_REFERENCE_DATE,
} from '../utils/dashboardMetrics';

const PANEL_META = {
  'invoices-receivables': { title: 'Invoices & Receivables', subtitle: 'Unpaid pipeline & paid collections' },
  'expense-breakdown': { title: 'Expense Breakdown', subtitle: 'Category split for selected period' },
  'profit-loss': { title: 'Profit & Loss', subtitle: 'Income vs spending comparison' },
  'sales-trajectory': { title: 'Sales Trajectory', subtitle: 'Sales performance over time' },
  'financial-analytics': { title: 'Financial Analytics', subtitle: 'Advanced chart selector' },
};

export default function DashboardDraggableLayout({
  userId,
  metrics,
  invoices,
  receipts,
  creditNotes = [],
  expenses,
  payments,
  bankAccounts,
  cashLedgers,
  filterPeriod,
  customStartDate,
  customEndDate,
}) {
  const [order, setOrder] = useState(() => loadDashboardPanelOrder(userId));
  const [movableId, setMovableId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    setOrder(loadDashboardPanelOrder(userId));
  }, [userId]);

  const chartData = useMemo(() => {
    const inPeriod = (d) => isDateInPeriod(d, filterPeriod, DASHBOARD_REFERENCE_DATE, customStartDate, customEndDate);
    return {
      receivables: buildInvoicesReceivablesTracks({
        invoices,
        receipts,
        creditNotes,
        filterPeriod,
        customStartDate,
        customEndDate,
        bankAccounts,
        cashLedgers,
      }),
      expenses: buildExpenseBreakdown(expenses, inPeriod),
      profitLoss: buildProfitLossComparison(metrics),
      sales: buildSalesTrajectoryFiltered({
        invoices,
        filterPeriod,
        customStartDate,
        customEndDate,
      }),
    };
  }, [invoices, receipts, creditNotes, expenses, metrics, filterPeriod, customStartDate, customEndDate, bankAccounts, cashLedgers]);

  const persistOrder = useCallback(
    (next) => {
      setOrder(next);
      saveDashboardPanelOrder(userId, next);
    },
    [userId]
  );

  const handleDrop = (targetId) => {
    if (!movableId || movableId === targetId) return;
    const from = order.indexOf(movableId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, movableId);
    persistOrder(next);
    setMovableId(null);
    setDragOverId(null);
  };

  const renderPanelBody = (id) => {
    switch (id) {
      case 'invoices-receivables':
        return <InvoicesReceivablesPanel data={chartData.receivables} />;
      case 'expense-breakdown':
        return <ExpenseBreakdownCorePanel data={chartData.expenses} />;
      case 'profit-loss':
        return <ProfitLossPanel data={chartData.profitLoss} />;
      case 'sales-trajectory':
        return <SalesTrajectoryPanel data={chartData.sales} />;
      case 'financial-analytics':
        return (
          <DashboardFinancialCharts
            embedded
            metrics={metrics}
            invoices={invoices}
            expenses={expenses}
            filterPeriod={filterPeriod}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        );
      default:
        return null;
    }
  };

  const sortedIds = order.filter((id) => DASHBOARD_PANEL_IDS.includes(id));

  return (
    <>
      <p className="dashboard-layout-hint">Double-click any chart panel to unlock drag — layout is saved for your account.</p>
      <div className="dashboard-panels-grid">
        {sortedIds.map((id) => {
          const meta = PANEL_META[id];
          const isMovable = movableId === id;
          const isDropTarget = dragOverId === id && movableId && movableId !== id;
          return (
            <article
              key={id}
              className={`dash-panel${isMovable ? ' dash-panel--movable' : ''}${isDropTarget ? ' dash-panel--drop-target' : ''}${id === 'financial-analytics' ? ' dash-panel--wide' : ''}`}
              draggable={isMovable}
              onDoubleClick={() => setMovableId((prev) => (prev === id ? null : id))}
              onDragStart={(e) => {
                if (!isMovable) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', id);
              }}
              onDragOver={(e) => {
                if (!movableId) return;
                e.preventDefault();
                setDragOverId(id);
              }}
              onDragLeave={() => setDragOverId((prev) => (prev === id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(id);
              }}
              onDragEnd={() => {
                setDragOverId(null);
                setMovableId(null);
              }}
            >
              <div className="dash-panel__header">
                <div>
                  <h3 className="dash-panel__title">{meta.title}</h3>
                  <p className="dash-panel__subtitle">{meta.subtitle}</p>
                </div>
                {isMovable && (
                  <span className="dash-panel__grip" title="Drag to reorder">
                    <GripVertical size={16} />
                  </span>
                )}
              </div>
              <div className="dash-panel__body" key={`${id}-${filterPeriod}-${customStartDate}-${customEndDate}`}>
                {renderPanelBody(id)}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
