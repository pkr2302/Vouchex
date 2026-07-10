import { apiDownload, apiRequest, apiUpload } from './apiClient';

export const portalApi = {
  getPublicConfig: () => apiRequest('/public/config'),

  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),

  register: (payload) =>
    apiRequest('/auth/register', { method: 'POST', body: payload }),

  googleAuth: (idToken, intent = 'login') =>
    apiRequest('/auth/google', { method: 'POST', body: { id_token: idToken, intent } }),

  setPassword: (payload) =>
    apiRequest('/auth/set-password', { method: 'POST', body: payload }),

  onboardingStatus: () => apiRequest('/onboarding/status'),

  onboardingCreateCompany: (payload) =>
    apiRequest('/onboarding/company', { method: 'POST', body: payload }),

  onboardingSaveDetails: (payload) =>
    apiRequest('/onboarding/company-details', { method: 'PUT', body: payload }),

  subscriptionPlans: () => apiRequest('/subscription/plans'),

  subscriptionStatus: () => apiRequest('/subscription/status'),

  submitSubscriptionPayment: (payload) =>
    apiRequest('/subscription/payment', { method: 'POST', body: payload }),

  listPendingSubscriptionPayments: () => apiRequest('/subscription/payments/pending'),

  approveSubscriptionPayment: (id) =>
    apiRequest(`/subscription/payments/${id}/approve`, { method: 'POST' }),

  rejectSubscriptionPayment: (id, notes) =>
    apiRequest(`/subscription/payments/${id}/reject`, { method: 'POST', body: { notes } }),

  me: () => apiRequest('/auth/me'),

  logout: (inactivity = false) =>
    apiRequest('/auth/logout', { method: 'POST', body: { inactivity } }),

  bootstrap: () => apiRequest('/portal/bootstrap'),

  fetchReferenceRate: (currency, date) => {
    const params = new URLSearchParams({ currency });
    if (date) params.set('date', date);
    return apiRequest(`/portal/reference-rate?${params.toString()}`);
  },

  syncChanges: (since) =>
    apiRequest(`/sync/changes${since ? `?since=${encodeURIComponent(since)}` : ''}`),

  checkLock: (documentType, documentKey) =>
    apiRequest(`/locks/check?document_type=${encodeURIComponent(documentType)}&document_key=${encodeURIComponent(documentKey)}`),

  acquireLock: (documentType, documentKey) =>
    apiRequest('/locks/acquire', {
      method: 'POST',
      body: { document_type: documentType, document_key: documentKey },
    }),

  releaseLock: (lockId) => apiRequest(`/locks/${lockId}`, { method: 'DELETE' }),

  createCustomer: (payload) => apiRequest('/customers', { method: 'POST', body: payload }),
  updateCustomer: (id, payload) => apiRequest(`/customers/${id}`, { method: 'PUT', body: payload }),
  deleteCustomer: (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),
  updateVendor: (id, payload) => apiRequest(`/vendors/${id}`, { method: 'PUT', body: payload }),
  deleteVendor: (id) => apiRequest(`/vendors/${id}`, { method: 'DELETE' }),
  updateInvoice: (id, invoice, items) =>
    apiRequest(`/invoices/${id}`, { method: 'PUT', body: { invoice, items } }),
  deleteInvoice: (id) => apiRequest(`/invoices/${id}`, { method: 'DELETE' }),
  updateExpense: (id, payload) => apiRequest(`/expenses/${id}`, { method: 'PUT', body: payload }),
  deleteExpense: (id) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
  deleteReceipt: (id) => apiRequest(`/receipts/${id}`, { method: 'DELETE' }),
  updateReceipt: (id, payload) => apiRequest(`/receipts/${id}`, { method: 'PUT', body: payload }),
  deletePayment: (id) => apiRequest(`/payments/${id}`, { method: 'DELETE' }),
  updatePayment: (id, payload) => apiRequest(`/payments/${id}`, { method: 'PUT', body: payload }),
  deleteCreditNote: (id) => apiRequest(`/credit-notes/${id}`, { method: 'DELETE' }),
  deleteDebitNote: (id) => apiRequest(`/debit-notes/${id}`, { method: 'DELETE' }),
  createInvoice: (invoice, items, advanceAdjustments) =>
    apiRequest('/invoices', {
      method: 'POST',
      body: {
        invoice,
        items,
        ...(advanceAdjustments?.length ? { advance_adjustments: advanceAdjustments } : {}),
      },
    }),
  createAdvanceAdjustments: (payload) =>
    apiRequest('/advance-adjustments', { method: 'POST', body: payload }),
  createReceipt: (payload) => apiRequest('/receipts', { method: 'POST', body: payload }),
  createCurrencyConversion: (payload) =>
    apiRequest('/currency-conversions', { method: 'POST', body: payload }),
  createExpense: (payload) => apiRequest('/expenses', { method: 'POST', body: payload }),
  createPayment: (payload) => apiRequest('/payments', { method: 'POST', body: payload }),
  createVendor: (payload) => apiRequest('/vendors', { method: 'POST', body: payload }),
  createInventory: (payload) => apiRequest('/inventory', { method: 'POST', body: payload }),
  updateInventory: (id, payload) => apiRequest(`/inventory/${id}`, { method: 'PUT', body: payload }),
  deleteInventory: (id) => apiRequest(`/inventory/${id}`, { method: 'DELETE' }),
  createCreditNote: (credit_note, items) =>
    apiRequest('/credit-notes', { method: 'POST', body: { credit_note, items } }),
  updateCreditNote: (id, credit_note, items) =>
    apiRequest(`/credit-notes/${id}`, { method: 'PUT', body: { credit_note, items } }),
  createDebitNote: (debit_note, items) =>
    apiRequest('/debit-notes', { method: 'POST', body: { debit_note, items } }),
  updateDebitNote: (id, debit_note, items) =>
    apiRequest(`/debit-notes/${id}`, { method: 'PUT', body: { debit_note, items } }),
  createUser: (payload) => apiRequest('/settings/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => apiRequest(`/settings/users/${id}`, { method: 'PUT', body: payload }),
  deleteUser: (id) => apiRequest(`/settings/users/${id}`, { method: 'DELETE' }),
  createExpenseHead: (payload) =>
    apiRequest('/settings/expense-heads', { method: 'POST', body: payload }),
  updateExpenseHead: (id, payload) =>
    apiRequest(`/settings/expense-heads/${id}`, { method: 'PUT', body: payload }),
  deleteExpenseHead: (id) => apiRequest(`/settings/expense-heads/${id}`, { method: 'DELETE' }),
  createBankLedger: (payload) =>
    apiRequest('/settings/bank-ledgers', { method: 'POST', body: payload }),
  updateBankLedger: (id, payload) =>
    apiRequest(`/settings/bank-ledgers/${id}`, { method: 'PUT', body: payload }),
  deleteBankLedger: (id) => apiRequest(`/settings/bank-ledgers/${id}`, { method: 'DELETE' }),
  createCashLedger: (payload) =>
    apiRequest('/settings/cash-ledgers', { method: 'POST', body: payload }),
  updateCashLedger: (id, payload) =>
    apiRequest(`/settings/cash-ledgers/${id}`, { method: 'PUT', body: payload }),
  deleteCashLedger: (id) => apiRequest(`/settings/cash-ledgers/${id}`, { method: 'DELETE' }),
  updateCompany: (payload) =>
    apiRequest('/settings/company', { method: 'PUT', body: payload }),

  updateGstComplianceSettings: (payload) =>
    apiRequest('/gst-compliance/settings', { method: 'PUT', body: payload }),

  generateEinvoice: (invoiceId, payload) =>
    apiRequest(`/invoices/${invoiceId}/einvoice/generate`, { method: 'POST', body: payload }),

  cancelEinvoice: (invoiceId, payload) =>
    apiRequest(`/invoices/${invoiceId}/einvoice/cancel`, { method: 'POST', body: payload }),

  generateEwayBill: (invoiceId, payload) =>
    apiRequest(`/invoices/${invoiceId}/ewaybill/generate`, { method: 'POST', body: payload }),

  listEwayBills: () => apiRequest('/eway-bills'),

  updateGstComplianceSettings: (payload) =>
    apiRequest('/gst-compliance/settings', { method: 'PUT', body: payload }),

  generateEinvoice: (invoiceId, payload) =>
    apiRequest(`/invoices/${invoiceId}/einvoice/generate`, { method: 'POST', body: payload }),

  cancelEinvoice: (invoiceId, payload) =>
    apiRequest(`/invoices/${invoiceId}/einvoice/cancel`, { method: 'POST', body: payload }),

  generateEwayBill: (invoiceId, payload) =>
    apiRequest(`/invoices/${invoiceId}/ewaybill/generate`, { method: 'POST', body: payload }),

  listEwayBills: () => apiRequest('/eway-bills'),

  uploadCompanyLogo: (file) => {
    const form = new FormData();
    form.append('logo', file, file.name || 'company-logo.png');
    return apiUpload('/settings/company/logo', form);
  },

  listCompanies: () => apiRequest('/companies'),
  createCompany: (payload) => apiRequest('/companies', { method: 'POST', body: payload }),
  updateCompanyMeta: (id, payload) => apiRequest(`/companies/${id}`, { method: 'PUT', body: payload }),
  deleteCompany: (id) => apiRequest(`/companies/${id}`, { method: 'DELETE' }),

  createCalendarReminder: (payload) =>
    apiRequest('/tax-calendar/reminders', { method: 'POST', body: payload }),
  updateCalendarReminder: (id, payload) =>
    apiRequest(`/tax-calendar/reminders/${id}`, { method: 'PUT', body: payload }),
  deleteCalendarReminder: (id) =>
    apiRequest(`/tax-calendar/reminders/${id}`, { method: 'DELETE' }),
  acknowledgeCalendarPopup: (id) =>
    apiRequest(`/tax-calendar/reminders/${id}/acknowledge-popup`, { method: 'POST' }),

  createConsumption: (payload) => apiRequest('/consumptions', { method: 'POST', body: payload }),
  deleteConsumption: (id) => apiRequest(`/consumptions/${id}`, { method: 'DELETE' }),
  acknowledgeCalendarPopup: (id) =>
    apiRequest(`/tax-calendar/reminders/${id}/acknowledge-popup`, { method: 'POST' }),

  createConsumption: (payload) => apiRequest('/consumptions', { method: 'POST', body: payload }),
  deleteConsumption: (id) => apiRequest(`/consumptions/${id}`, { method: 'DELETE' }),

  downloadCompanyBackup: () => apiDownload('/admin/backups/download'),

  restoreCompanyBackup: (file) => {
    const form = new FormData();
    form.append('backup', file, file.name || 'backup.json');
    form.append('confirm', 'RESTORE');
    return apiUpload('/admin/backups/restore', form);
  },

  getBackupEmailStatus: () => apiRequest('/admin/backups/email-status'),
  sendBackupEmailNow: () => apiRequest('/admin/backups/send-email', { method: 'POST' }),

  getSystemHealth: () => apiRequest('/system/health'),
  clearSystemCache: () => apiRequest('/system/clear-cache', { method: 'POST' }),
  optimizeSystem: () => apiRequest('/system/optimize', { method: 'POST' }),
  runSystemMigrations: () => apiRequest('/system/migrate', { method: 'POST' }),
  updatePortalInactivityTimeout: (inactivity_timeout) =>
    apiRequest('/system/inactivity-timeout', { method: 'PUT', body: { inactivity_timeout } }),

  glTrialBalance: (query = '') => apiRequest(`/gl/trial-balance${query}`),
  glProfitAndLoss: (query = '') => apiRequest(`/gl/profit-and-loss${query}`),
  glBalanceSheet: (query = '') => apiRequest(`/gl/balance-sheet${query}`),
  glBackfill: () => apiRequest('/gl/backfill', { method: 'POST' }),
  glOperationalReports: (query = '') => apiRequest(`/gl/operational-reports${query}`),
  glLedgerStatement: (query = '') => apiRequest(`/gl/ledger-statement${query}`),
  glNotesToAccounts: (query = '') => apiRequest(`/gl/notes-to-accounts${query}`),

  glDayBook: (query = '') => apiRequest(`/gl/day-book${query}`),
  glSalesRegister: (query = '') => apiRequest(`/gl/sales-register${query}`),
  glPurchaseRegister: (query = '') => apiRequest(`/gl/purchase-register${query}`),
  glLedgerAccounts: () => apiRequest('/gl/ledger-accounts'),
  glGuidedJournals: (query = '') => apiRequest(`/gl/guided-journals${query}`),
  glGuidedManualJournal: (body) => apiRequest('/gl/guided/manual-journal', { method: 'POST', body }),
  glGuidedBankCashTransfer: (body) => apiRequest('/gl/guided/bank-cash-transfer', { method: 'POST', body }),
  glGuidedCapitalIntroduction: (body) => apiRequest('/gl/guided/capital-introduction', { method: 'POST', body }),
  glGuidedOwnerWithdrawal: (body) => apiRequest('/gl/guided/owner-withdrawal', { method: 'POST', body }),
  glGuidedLoanReceived: (body) => apiRequest('/gl/guided/loan-received', { method: 'POST', body }),
  glGuidedLoanRepayment: (body) => apiRequest('/gl/guided/loan-repayment', { method: 'POST', body }),
  glGuidedDepreciation: (body) => apiRequest('/gl/guided/depreciation', { method: 'POST', body }),
  glGuidedStatutoryPayment: (body) => apiRequest('/gl/guided/statutory-payment', { method: 'POST', body }),

  coaSubtypes: () => apiRequest('/coa/subtypes'),
  coaChart: () => apiRequest('/coa/chart'),
  createCoaAccount: (body) => apiRequest('/coa/accounts', { method: 'POST', body }),
  updateCoaAccount: (id, body) => apiRequest(`/coa/accounts/${id}`, { method: 'PUT', body }),
  deleteCoaAccount: (id) => apiRequest(`/coa/accounts/${id}`, { method: 'DELETE' }),
  coaReportGroups: () => apiRequest('/coa/report-groups'),
  createReportGroup: (body) => apiRequest('/coa/report-groups', { method: 'POST', body }),
  updateReportGroup: (id, body) => apiRequest(`/coa/report-groups/${id}`, { method: 'PUT', body }),
  deleteReportGroup: (id) => apiRequest(`/coa/report-groups/${id}`, { method: 'DELETE' }),
  loadReportGroupTemplate: (template) =>
    apiRequest('/coa/report-groups/load-template', { method: 'POST', body: { template } }),
  assignCoaReportGroups: (assignments) =>
    apiRequest('/coa/report-groups/assign', { method: 'POST', body: { assignments } }),
  autoMapCoaReportGroups: () => apiRequest('/coa/report-groups/auto-map', { method: 'POST' }),
};
