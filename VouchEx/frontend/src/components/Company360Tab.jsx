import React, { useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import DashboardKpiGrid from './DashboardKpiGrid';
import DashboardTimeFilter from './DashboardTimeFilter';
import DashboardDraggableLayout from './DashboardDraggableLayout';
import DashboardQuickActions from './DashboardQuickActions';
import MobileAdaptiveSection from './mobile/MobileAdaptiveSection';
import { computeDashboardMetrics } from '../utils/dashboardMetrics';

export default function Company360Tab({ setActiveTab }) {
  const { invoices, receipts, expenses, payments, bankAccounts, cashLedgers, creditNotes, debitNotes, currentUser } = useSimulator();
  const [filterPeriod, setFilterPeriod] = useState('Last Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const metrics = React.useMemo(
    () =>
      computeDashboardMetrics({
        invoices,
        receipts,
        creditNotes,
        debitNotes,
        expenses,
        payments,
        filterPeriod,
        customStartDate,
        customEndDate,
      }),
    [invoices, receipts, creditNotes, debitNotes, expenses, payments, filterPeriod, customStartDate, customEndDate]
  );

  return (
    <div className="dashboard-tab company-360-tab">
      <DashboardQuickActions setActiveTab={setActiveTab} />
      <DashboardTimeFilter
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />
      <DashboardKpiGrid metrics={metrics} />
      <MobileAdaptiveSection title="View analytics" subtitle="Charts & financial breakdown" defaultOpenMobile={false}>
        <DashboardDraggableLayout
          userId={currentUser?.id}
          metrics={metrics}
          invoices={invoices}
          receipts={receipts}
          creditNotes={creditNotes}
          expenses={expenses}
          payments={payments}
          bankAccounts={bankAccounts}
          cashLedgers={cashLedgers}
          filterPeriod={filterPeriod}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
        />
      </MobileAdaptiveSection>
    </div>
  );
}
