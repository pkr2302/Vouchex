import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { loadApiConfig } from '../services/apiConfig';
import { getStoredToken, setStoredToken, getActiveCompanyId, setActiveCompanyId } from '../services/apiClient';
import { portalApi } from '../services/portalApi';
import { toAmount, normalizePortalBootstrapData } from '../utils/formatMoney';
import { formatApiError, showApiError } from '../utils/apiErrors';

const SimulatorContext = createContext();

export const useSimulator = () => useContext(SimulatorContext);

const EMPTY_COMPANY = {
  name: '',
  gstin: '',
  pan: '',
  state: '',
  address: '',
  city: '',
  pincode: '',
  country: '',
  email: '',
  phone: '',
  currency: 'INR (₹)',
  bank_name: '',
  bank_account: '',
  bank_account_holder: '',
  bank_ifsc: '',
  bank_branch: '',
  upi_id: '',
  logo: '',
  logo_layout: 'auto',
  accounting_framework: 'AS',
  gst_compliance: {
    einvoice_enabled: false,
    ewaybill_enabled: false,
    api_mode: 'sandbox',
    provider_label: '',
    einvoice: {},
    ewaybill: {},
  },
};

export const SimulatorProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [advanceAdjustments, setAdvanceAdjustments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [creditNoteItems, setCreditNoteItems] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [debitNoteItems, setDebitNoteItems] = useState([]);
  const [ewayBills, setEwayBills] = useState([]);
  const [ecrsLogs, setEcrsLogs] = useState([]);
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cashLedgers, setCashLedgers] = useState([]);
  const [coaRecords, setCoaRecords] = useState({
    expense_heads: [],
    banks: [],
    cash: [],
  });
  const [coaChart, setCoaChart] = useState([]);
  const [reportGroups, setReportGroups] = useState([]);
  const [coaSubtypes, setCoaSubtypes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [cronReminderLogs, setCronReminderLogs] = useState([]);
  const [calendarReminders, setCalendarReminders] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [currencyConversions, setCurrencyConversions] = useState([]);
  const [companyDetails, setCompanyDetailsState] = useState(EMPTY_COMPANY);
  const [isFinancialYearLocked, setIsFinancialYearLocked] = useState(false);
  const [lockedMonths, setLockedMonths] = useState([]);
  const [inactivityTimeout, setInactivityTimeout] = useState(900);
  const [rcmLedgerBalance, setRcmLedgerBalance] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState([
    {
      id: 1,
      timestamp: new Date().toISOString(),
      type: 'system',
      message: 'VouchEx Portal API client initialized.',
      code: 'Awaiting Laravel MySQL connection via Sanctum token auth.',
    },
  ]);
  const [currentUser, setCurrentUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [publicConfig, setPublicConfig] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [apiReady, setApiReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [customOptions, setCustomOptions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vouchex_custom_options') || '{}');
    } catch {
      return {};
    }
  });
  const lastSyncRef = useRef(null);
  const pollRef = useRef(null);

  const persistCustomOptions = useCallback((next) => {
    try {
      const serialized = JSON.stringify(next);
      if (serialized.length > 200000) {
        console.warn('custom_options too large; skipping server sync');
        return;
      }
      setCustomOptions(next);
      localStorage.setItem('vouchex_custom_options', serialized);
      portalApi.updateCompany({ custom_options: next }).catch(() => {});
    } catch {
      // ignore quota / serialization errors
    }
  }, []);

  const getOptionsFor = useCallback(
    (key, base = []) => {
      const extra = customOptions[key] || [];
      return [...new Set([...base, ...extra])];
    },
    [customOptions]
  );

  const addCustomOption = useCallback(
    (key, value) => {
      if (!value) return;
      const next = { ...customOptions, [key]: [...new Set([...(customOptions[key] || []), value])] };
      persistCustomOptions(next);
    },
    [customOptions, persistCustomOptions]
  );

  const addConsoleLog = useCallback((type, message, code) => {
    const timestamp = new Date().toISOString();
    setConsoleLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), timestamp, type, message, code },
    ]);
  }, []);

  const resolveCompanyContext = useCallback((user, companyList) => {
    setCompanies(companyList || []);
    if (!user || !companyList?.length) {
      if (!companyList?.length) {
        setActiveCompany(null);
        setActiveCompanyId(null);
      }
      return null;
    }

    if (user.role !== 'super_admin' && user.role !== 'group_admin') {
      const co = companyList[0];
      setActiveCompany(co);
      setActiveCompanyId(co.id);
      return co;
    }

    const savedId = getActiveCompanyId();
    const match = companyList.find((c) => String(c.id) === String(savedId));
    const chosen = match || companyList[0];
    setActiveCompany(chosen);
    setActiveCompanyId(chosen.id);
    return chosen;
  }, []);

  const applyBootstrap = useCallback((data) => {
    const normalized = normalizePortalBootstrapData(data);
    setCustomers(normalized.customers || []);
    setVendors(normalized.vendors || []);
    setInvoices(normalized.invoices || []);
    setInvoiceItems(normalized.invoiceItems || []);
    setInventory(normalized.inventory || []);
    setReceipts(normalized.receipts || []);
    setAdvanceAdjustments(normalized.advanceAdjustments || []);
    setExpenses(normalized.expenses || []);
    setPayments(normalized.payments || []);
    setCreditNotes(normalized.creditNotes || []);
    setCreditNoteItems(normalized.creditNoteItems || []);
    setDebitNotes(normalized.debitNotes || []);
    setDebitNoteItems(normalized.debitNoteItems || []);
    setEwayBills(normalized.ewayBills || []);
    setEcrsLogs(normalized.ecrsLogs || []);
    setExpenseHeads(normalized.expenseHeads || []);
    setBankAccounts(normalized.bankAccounts || []);
    setCashLedgers(normalized.cashLedgers || []);
    setCoaRecords(
      normalized.coaRecords || {
        expense_heads: [],
        banks: [],
        cash: [],
      }
    );
    setCoaChart(normalized.coaChart || []);
    setReportGroups(normalized.reportGroups || []);
    setCoaSubtypes(normalized.coaSubtypes || []);
    setAuditLogs(normalized.auditLogs || []);
    setLoginLogs(normalized.loginLogs || []);
    setUsers(normalized.users || []);
    setCronReminderLogs(normalized.cronReminderLogs || []);
    setCalendarReminders(normalized.calendarReminders || []);
    setConsumptions(normalized.consumptions || []);
    setCurrencyConversions(normalized.currencyConversions || []);
    setCompanyDetailsState(normalized.companyDetails || EMPTY_COMPANY);
    setIsFinancialYearLocked(!!normalized.isFinancialYearLocked);
    setLockedMonths(normalized.lockedMonths || []);
    setInactivityTimeout(normalized.inactivityTimeout ?? 900);
    setRcmLedgerBalance(normalized.rcmLedgerBalance ?? 0);
    if (normalized.customOptions && typeof normalized.customOptions === 'object') {
      setCustomOptions(normalized.customOptions);
      localStorage.setItem('vouchex_custom_options', JSON.stringify(normalized.customOptions));
    }
    lastSyncRef.current = new Date().toISOString();
  }, []);

  const refreshCompaniesList = useCallback(async () => {
    const list = await portalApi.listCompanies();
    const next = list.companies || [];
    setCompanies(next);
    setActiveCompany((prev) => {
      if (!prev?.id) return prev;
      const match = next.find((c) => String(c.id) === String(prev.id));
      return match ? { ...prev, ...match } : prev;
    });
    return next;
  }, []);

  const refreshPortalData = useCallback(async () => {
    if (!getStoredToken()) return;
    setDataLoading(true);
    try {
      const data = await portalApi.bootstrap();
      if (!data || typeof data !== 'object' || !Array.isArray(data.customers)) {
        throw new Error('Portal bootstrap returned an invalid or empty payload. The server may be missing a migration or PHP file.');
      }
      applyBootstrap(data);
      await refreshCompaniesList().catch(() => {});
      addConsoleLog('route', 'GET /api/portal/bootstrap', 'PortalDataController@bootstrap — MySQL snapshot loaded.');
    } catch (err) {
      const subscriptionBlocked =
        err?.status === 402 || err?.data?.type === 'subscription_required';
      if (subscriptionBlocked) {
        if (err?.data?.account) {
          setAccount(err.data.account);
        }
        addConsoleLog(
          'system',
          'Portal bootstrap skipped — subscription required.',
          'Show subscription page instead of error dialog.'
        );
        return;
      }
      addConsoleLog('system', `Bootstrap sync failed: ${err.message}`, 'Check laravel-api .env DB_* and CORS FRONTEND_URL.');
      showApiError('Loading portal data', err);
      throw err;
    } finally {
      setDataLoading(false);
    }
  }, [applyBootstrap, addConsoleLog, refreshCompaniesList]);

  const selectCompany = useCallback(async (company) => {
    if (!company?.id) return;
    setActiveCompany(company);
    setActiveCompanyId(company.id);
    await refreshPortalData();
  }, [refreshPortalData]);

  const createCompany = useCallback(async (payload) => {
    const res = await portalApi.createCompany(payload);
    await refreshCompaniesList();
    if (res.company) {
      await selectCompany(res.company);
    }
    return res;
  }, [selectCompany, refreshCompaniesList]);

  const deleteCompany = useCallback(async (companyId) => {
    await portalApi.deleteCompany(companyId);
    const next = await refreshCompaniesList();
    const currentId = getActiveCompanyId();
    if (String(currentId) === String(companyId)) {
      const fallback = next[0] || null;
      if (fallback) {
        await selectCompany(fallback);
      } else {
        setActiveCompany(null);
        setActiveCompanyId(null);
      }
    }
    addConsoleLog('route', `DELETE /api/companies/${companyId}`, 'Company and tenant data removed from MySQL.');
    return true;
  }, [refreshCompaniesList, selectCompany, addConsoleLog]);

  useEffect(() => {
    loadApiConfig().then(() => setApiReady(true));
    portalApi.getPublicConfig().then(setPublicConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!apiReady || !getStoredToken()) return undefined;
    portalApi.me()
      .then(async (res) => {
        const user = res.user || (res.id && res.email ? res : null);
        if (!user) {
          setStoredToken(null);
          return;
        }
        setCurrentUser(user);
        setAccount(res.account ?? null);
        setNeedsPassword(!!res.needs_password);
        resolveCompanyContext(user, res.companies || []);
        const needsSub =
          res.account?.needs_subscription === true
          || res.account?.has_portal_access === false;
        if (!needsSub) {
          await refreshPortalData();
        }
      })
      .catch(() => {
        setStoredToken(null);
      });
    return undefined;
  }, [apiReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!apiReady || !currentUser) return undefined;
    if (account?.needs_subscription || account?.has_portal_access === false) return undefined;

    const poll = async () => {
      try {
        const since = lastSyncRef.current;
        const changes = await portalApi.syncChanges(since);
        if (changes.has_changes) {
          await refreshPortalData();
          addConsoleLog(
            'system',
            `Live sync: refreshed collections [${(changes.collections || []).join(', ')}]`,
            `GET /api/sync/changes?since=${since || 'null'}`
          );
        }
      } catch {
        // silent poll failure
      }
    };

    poll();
    loadApiConfig().then((cfg) => {
      pollRef.current = setInterval(poll, cfg.syncIntervalMs || 5000);
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [apiReady, currentUser, account, refreshPortalData, addConsoleLog]);

  const applyAuthSession = (res) => {
    if (res.token) setStoredToken(res.token);
    if (res.user) setCurrentUser(res.user);
    setAccount(res.account ?? null);
    setNeedsPassword(!!res.needs_password);
    if (res.user) resolveCompanyContext(res.user, res.companies || []);
  };

  const refreshAccount = async () => {
    const res = await portalApi.me();
    const user = res.user || (res.id && res.email ? res : null);
    setCurrentUser(user);
    setAccount(res.account ?? null);
    setNeedsPassword(!!res.needs_password);
    if (user) resolveCompanyContext(user, res.companies || []);
    return { ...res, user };
  };

  const loginUser = async (email, password) => {
    try {
      const res = await portalApi.login(email, password);
      applyAuthSession(res);
      const companyList = res.companies || [];
      const canSwitch = res.user?.role === 'super_admin' || res.user?.role === 'group_admin';
      if (canSwitch && companyList.length > 0) {
        const savedId = getActiveCompanyId();
        const match = companyList.find((c) => String(c.id) === String(savedId));
        const chosen = match || companyList[0];
        setActiveCompanyId(chosen.id);
      }
      const needsSub =
        res.account?.needs_subscription === true
        || res.account?.has_portal_access === false;
      if (!needsSub) {
        try {
          await refreshPortalData();
        } catch (err) {
          addConsoleLog('system', `Bootstrap failed after login: ${err.message}`, 'You are logged in; API data sync pending.');
        }
      }
      addConsoleLog('route', `POST /api/auth/login [Role: ${res.user.role}]`, "Route::post('/api/auth/login', [AuthController::class, 'login']);");
      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, message: formatApiError(err, 'Signing in') };
    }
  };

  const registerUser = async (payload) => {
    const res = await portalApi.register(payload);
    applyAuthSession(res);
    return res;
  };

  const googleLogin = async (idToken, intent = 'login') => {
    const res = await portalApi.googleAuth(idToken, intent);
    applyAuthSession(res);
    return res;
  };

  const setUserPassword = async (payload) => {
    await portalApi.setPassword(payload);
    setNeedsPassword(false);
    await refreshAccount();
  };

  const skipSetPassword = async () => {
    setNeedsPassword(false);
    await refreshAccount();
  };

  const createOnboardingCompany = async (payload) => {
    const res = await portalApi.onboardingCreateCompany(payload);
    await refreshAccount();
    if (res.company) {
      await selectCompany(res.company);
    }
    return res;
  };

  const saveOnboardingDetails = async (payload) => {
    const res = await portalApi.onboardingSaveDetails(payload);
    await refreshAccount();
    await refreshPortalData();
    return res;
  };

  const loadSubscriptionStatus = async () => {
    const [plansRes, statusRes] = await Promise.all([
      portalApi.subscriptionPlans().catch(() => ({ plans: null, payment: null })),
      portalApi.subscriptionStatus().catch(() => ({ pending: null })),
    ]);
    return {
      plans: plansRes.plans,
      payment: plansRes.payment,
      pending: statusRes.pending_payment ?? statusRes.pending ?? null,
    };
  };

  const submitSubscriptionPayment = async (payload) => {
    const res = await portalApi.submitSubscriptionPayment(payload);
    await refreshAccount();
    return res;
  };

  const logoutUser = async (inactivity = false) => {
    if (!currentUser) return;
    try {
      await portalApi.logout(inactivity);
    } catch {
      // proceed with local logout
    }
    setStoredToken(null);
    setCurrentUser(null);
    setAccount(null);
    setNeedsPassword(false);
    setActiveCompany(null);
    setActiveCompanyId(null);
    addConsoleLog('route', 'POST /api/auth/logout', "Route::post('/api/auth/logout', [AuthController::class, 'logout']);");
  };

  const wrapMutation = (fn, { awaitRefresh = false } = {}) => async (...args) => {
    const result = await fn(...args);
    const refresh = refreshPortalData().catch(() => {});
    if (awaitRefresh) await refresh;
    return result;
  };

  const acquireDocumentLock = async (documentType, documentKey) => {
    const res = await portalApi.acquireLock(documentType, String(documentKey));
    if (!res.success) {
      const msg = res.message || `User ${res.lock?.user_name} is currently editing this document.`;
      throw new Error(msg);
    }
    return res.lock_id;
  };

  const releaseDocumentLock = async (lockId) => {
    if (!lockId) return;
    try {
      await portalApi.releaseLock(lockId);
    } catch {
      // ignore
    }
  };

  const checkDocumentLock = async (documentType, documentKey) => {
    const res = await portalApi.checkLock(documentType, String(documentKey));
    if (res.locked && res.lock?.user_id !== currentUser?.id) {
      throw new Error(`User ${res.lock.user_name} is currently editing this document.`);
    }
    return res;
  };

  const companyProfilePayload = (details) => ({
    name: details.name ?? '',
    gstin: details.gstin ?? '',
    pan: details.pan ?? '',
    state: details.state ?? '',
    address: details.address ?? '',
    city: details.city ?? '',
    pincode: details.pincode ?? '',
    country: details.country ?? '',
    email: details.email ?? '',
    phone: details.phone ?? '',
    currency: details.currency ?? 'INR (₹)',
    bank_name: details.bank_name ?? '',
    bank_account: details.bank_account ?? '',
    bank_account_holder: details.bank_account_holder ?? '',
    bank_ifsc: details.bank_ifsc ?? '',
    bank_branch: details.bank_branch ?? '',
    upi_id: details.upi_id ?? '',
    logo: details.logo ?? '',
    accounting_framework: details.accounting_framework ?? 'AS',
  });

  /** Local display only — does not call the API (avoids sync overwriting the form while typing). */
  const patchCompanyDetailsLocal = (updater) => {
    setCompanyDetailsState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const saveCompanyProfile = async (partial) => {
    let merged = EMPTY_COMPANY;
    setCompanyDetailsState((prev) => {
      merged = { ...prev, ...partial };
      return merged;
    });
    const payload = companyProfilePayload(merged);
    if (!Object.prototype.hasOwnProperty.call(partial, 'logo')) {
      delete payload.logo;
    }
    const res = await portalApi.updateCompany(payload);
    const saved = res?.companyDetails
      ? { ...merged, ...res.companyDetails }
      : merged;
    setCompanyDetailsState(saved);
    if (Object.prototype.hasOwnProperty.call(partial, 'name')) {
      await refreshCompaniesList();
    }
    addConsoleLog('route', 'PUT /api/settings/company', 'Company profile saved to MySQL.');
    return saved;
  };

  const uploadCompanyLogo = async (file) => {
    const res = await portalApi.uploadCompanyLogo(file);
    if (res?.companyDetails) {
      setCompanyDetailsState(res.companyDetails);
    } else if (res?.logo) {
      setCompanyDetailsState((prev) => ({ ...prev, logo: res.logo }));
    }
    addConsoleLog('route', 'POST /api/settings/company/logo', 'Logo file stored on server storage.');
    return res?.companyDetails?.logo || res?.logo;
  };

  const saveGstComplianceSettings = async (payload) => {
    const res = await portalApi.updateGstComplianceSettings(payload);
    const gc = res?.gst_compliance || res?.companyDetails?.gst_compliance;
    if (res?.companyDetails) {
      setCompanyDetailsState(res.companyDetails);
    } else if (gc) {
      setCompanyDetailsState((prev) => ({ ...prev, gst_compliance: gc }));
    }
    addConsoleLog('route', 'PUT /api/gst-compliance/settings', 'GST compliance settings saved.');
    return gc;
  };

  const generateEinvoice = async (invoiceId, options) => {
    const res = await portalApi.generateEinvoice(invoiceId, options);
    if (res?.invoice) {
      setInvoices((prev) =>
        prev.map((inv) => (Number(inv.id) === Number(invoiceId) ? { ...inv, ...res.invoice } : inv))
      );
    }
    addConsoleLog('route', `POST /api/invoices/${invoiceId}/einvoice/generate`, 'E-Invoice IRN request completed.');
    return res;
  };

  const cancelEinvoice = async (invoiceId, reason) => {
    const res = await portalApi.cancelEinvoice(invoiceId, { reason });
    if (res?.invoice) {
      setInvoices((prev) =>
        prev.map((inv) => (Number(inv.id) === Number(invoiceId) ? { ...inv, ...res.invoice } : inv))
      );
    }
    return res;
  };

  const generateEwayBill = async (invoiceId, options) => {
    const res = await portalApi.generateEwayBill(invoiceId, options);
    if (res?.eway_bill) {
      setEwayBills((prev) => [res.eway_bill, ...prev.filter((b) => Number(b.id) !== Number(res.eway_bill.id))]);
    }
    addConsoleLog('route', `POST /api/invoices/${invoiceId}/ewaybill/generate`, 'E-Way Bill request completed.');
    return res;
  };

  const deleteInvoice = wrapMutation(async (id) => {
    await portalApi.deleteInvoice(id);
    addConsoleLog('route', `DELETE /api/invoices/${id}`, 'Invoice and linked receipts removed.');
    return true;
  });

  const deleteReceipt = wrapMutation(async (id) => {
    await portalApi.deleteReceipt(id);
    return true;
  });

  const deleteExpense = wrapMutation(async (id) => {
    await portalApi.deleteExpense(id);
    return true;
  });

  const deletePayment = wrapMutation(async (id) => {
    await portalApi.deletePayment(id);
    return true;
  });

  const deleteCreditNote = wrapMutation(async (id) => {
    await portalApi.deleteCreditNote(id);
    return true;
  });

  const deleteDebitNote = wrapMutation(async (id) => {
    await portalApi.deleteDebitNote(id);
    return true;
  });

  const createCustomer = async (custData) => {
    const res = await portalApi.createCustomer(custData);
    setCustomers((prev) => {
      if (prev.some((c) => Number(c.id) === Number(res.customer.id))) return prev;
      return [...prev, res.customer];
    });
    addConsoleLog('route', 'POST /api/customers', "Route::post('/api/customers', [PortalMutationController::class, 'storeCustomer']);");
    refreshPortalData().catch(() => {});
    return res.customer;
  };

  const updateCustomer = wrapMutation(async (id, custData) => {
    const res = await portalApi.updateCustomer(id, custData);
    return res.customer;
  });

  const deleteCustomer = wrapMutation(async (id) => {
    await portalApi.deleteCustomer(id);
    return true;
  });

  const updateVendor = wrapMutation(async (id, data) => {
    const res = await portalApi.updateVendor(id, data);
    return res.vendor;
  });

  const deleteVendor = wrapMutation(async (id) => {
    await portalApi.deleteVendor(id);
    return true;
  });

  const updateInvoice = wrapMutation(async (id, invoice, items) => {
    const poTrimmed = String(invoice.po_number ?? '').trim();
    const payload = {
      ...invoice,
      po_number: poTrimmed && poTrimmed.toUpperCase() !== 'NIL' ? poTrimmed : null,
    };
    const res = await portalApi.updateInvoice(id, payload, items);
    return res.invoice;
  });

  const updateExpense = wrapMutation(async (id, data) => {
    const res = await portalApi.updateExpense(id, data);
    return res.expense;
  });

  const createInvoice = wrapMutation(async (invoiceData, itemsData, advanceAdjustmentRows = null) => {
    const items = (itemsData || []).map((item) => {
      const product = item.product_id
        ? (inventory || []).find((p) => Number(p.id) === Number(item.product_id))
        : null;
      const isService = product?.type === 'Service' || item.item_type === 'Service';
      const qtyNum = Number(item.quantity);
      const hasQty = Number.isFinite(qtyNum) && qtyNum > 0;
      const qty = isService && !hasQty ? 0 : hasQty ? qtyNum : 1;
      const rate = toAmount(item.rate);
      const lineTotal = toAmount(item.line_total ?? item.taxable ?? (hasQty || !isService ? qty * rate : rate));
      let description = String(item.description || '').trim();
      if (!description && product?.name) description = product.name;
      return {
        description: description || 'Item',
        item_detail: item.item_detail || '',
        quantity: qty,
        rate,
        line_total: lineTotal,
        product_id: item.product_id ? Number(item.product_id) : null,
        hsn_sac: item.hsn_sac || 'NIL',
      };
    });
    const poTrimmed = String(invoiceData.po_number ?? '').trim();
    const invoice = {
      ...invoiceData,
      customer_id: invoiceData.customer_id ? Number(invoiceData.customer_id) : null,
      due_date: invoiceData.due_date || null,
      po_number: poTrimmed && poTrimmed.toUpperCase() !== 'NIL' ? poTrimmed : null,
      gstin: (invoiceData.gstin || 'NIL').toString().trim().slice(0, 15) || 'NIL',
      subtotal: toAmount(invoiceData.subtotal),
      discount: toAmount(invoiceData.discount),
      tax_amount: toAmount(invoiceData.tax_amount),
      cgst: toAmount(invoiceData.cgst),
      sgst: toAmount(invoiceData.sgst),
      igst: toAmount(invoiceData.igst),
      payable_tax: toAmount(invoiceData.payable_tax),
      total_amount: toAmount(invoiceData.total_amount),
    };
    const res = await portalApi.createInvoice(invoice, items, advanceAdjustmentRows);
    addConsoleLog('route', 'POST /api/invoices', "Route::post('/api/invoices', [PortalMutationController::class, 'storeInvoice']);");
    return res.invoice;
  }, { awaitRefresh: true });

  const createAdvanceAdjustments = wrapMutation(async (payload) => {
    const res = await portalApi.createAdvanceAdjustments(payload);
    addConsoleLog('route', 'POST /api/advance-adjustments', 'Advance applied to invoice.');
    return res.adjustments;
  });

  const createReceipt = wrapMutation(async (receiptData) => {
    const res = await portalApi.createReceipt(receiptData);
    addConsoleLog('route', 'POST /api/receipts', 'Receipt stored in MySQL.');
    return res.receipt;
  }, { awaitRefresh: true });

  const updateReceipt = wrapMutation(async (id, receiptData) => {
    const res = await portalApi.updateReceipt(id, receiptData);
    addConsoleLog('route', `PUT /api/receipts/${id}`, 'Receipt updated.');
    return res.receipt;
  });

  const createExpense = wrapMutation(async (expData) => {
    const res = await portalApi.createExpense(expData);
    addConsoleLog('route', 'POST /api/expenses', "Route::post('/api/expenses', [PortalMutationController::class, 'storeExpense']);");
    return res.expense;
  });

  const createVendor = wrapMutation(async (vendorData) => {
    const res = await portalApi.createVendor(vendorData);
    addConsoleLog('route', 'POST /api/vendors', "Route::post('/api/vendors', ...);");
    return res.vendor;
  });

  const createExpenseHead = wrapMutation(async (payload) => {
    await portalApi.createExpenseHead(payload);
    addConsoleLog('route', 'POST /api/settings/expense-heads', 'Expense head persisted.');
  });

  const updateExpenseHead = wrapMutation(async (id, payload) => {
    await portalApi.updateExpenseHead(id, payload);
    addConsoleLog('route', `PUT /api/settings/expense-heads/${id}`, 'Expense head updated.');
  });

  const deleteExpenseHead = wrapMutation(async (id) => {
    await portalApi.deleteExpenseHead(id);
    addConsoleLog('route', `DELETE /api/settings/expense-heads/${id}`, 'Expense head removed.');
    return true;
  });

  const createPayment = wrapMutation(async (paymentData) => {
    const res = await portalApi.createPayment(paymentData);
    addConsoleLog('route', 'POST /api/payments', 'Payment stored in MySQL.');
    return res.payment;
  });

  const updatePayment = wrapMutation(async (id, paymentData) => {
    const res = await portalApi.updatePayment(id, paymentData);
    addConsoleLog('route', `PUT /api/payments/${id}`, 'Payment updated.');
    return res.payment;
  });

  const createCurrencyConversion = wrapMutation(async (payload) => {
    const res = await portalApi.createCurrencyConversion(payload);
    addConsoleLog('route', 'POST /api/currency-conversions', 'Forex conversion recorded.');
    return res.conversion;
  });

  const createInventoryItem = wrapMutation(async (invItem) => {
    const res = await portalApi.createInventory(invItem);
    addConsoleLog('route', 'POST /api/inventory', "Route::post('/api/inventory', ...);");
    return res.item;
  });

  const updateInventoryItem = wrapMutation(async (id, invItem) => {
    const res = await portalApi.updateInventory(id, invItem);
    addConsoleLog('route', `PUT /api/inventory/${id}`, 'Inventory master updated.');
    return res.item;
  });

  const deleteInventoryItem = wrapMutation(async (id) => {
    await portalApi.deleteInventory(id);
    addConsoleLog('route', `DELETE /api/inventory/${id}`, 'Inventory item removed.');
    return true;
  });

  const createCreditNote = wrapMutation(async (cnData, itemsData) => {
    const res = await portalApi.createCreditNote(cnData, itemsData);
    addConsoleLog('route', 'POST /api/credit-notes', "Route::post('/api/credit-notes', ...);");
    return res.credit_note;
  });

  const updateCreditNote = wrapMutation(async (id, cnData, itemsData) => {
    const res = await portalApi.updateCreditNote(id, cnData, itemsData);
    addConsoleLog('route', `PUT /api/credit-notes/${id}`, 'Credit note updated.');
    return res.credit_note;
  });

  const createDebitNote = wrapMutation(async (dnData, itemsData) => {
    const res = await portalApi.createDebitNote(dnData, itemsData);
    addConsoleLog('route', 'POST /api/debit-notes', "Route::post('/api/debit-notes', ...); + ECRS REVERSAL");
    return res.debit_note;
  });

  const updateDebitNote = wrapMutation(async (id, dnData, itemsData) => {
    const res = await portalApi.updateDebitNote(id, dnData, itemsData);
    addConsoleLog('route', `PUT /api/debit-notes/${id}`, 'Debit note updated.');
    return res.debit_note;
  });

  const createUser = wrapMutation(async (userData) => {
    const res = await portalApi.createUser({
      email: userData.email,
      name: userData.name,
      role: userData.role,
      password: userData.password || 'user123',
      company_id: userData.company_id ?? null,
      company_ids: userData.company_ids,
    });
    addConsoleLog('route', 'POST /api/settings/users', 'User credentials stored with bcrypt hash.');
    return res.user;
  });

  const updateUser = wrapMutation(async (userId, userData) => {
    const res = await portalApi.updateUser(userId, {
      ...userData,
      company_ids: userData.company_ids,
    });
    addConsoleLog('route', `PUT /api/settings/users/${userId}`, 'User profile updated.');
    return res.user;
  });

  const deleteUser = wrapMutation(async (userId) => {
    if (String(currentUser?.id) === String(userId)) {
      throw new Error('You cannot delete your own active administrator account.');
    }
    await portalApi.deleteUser(userId);
    addConsoleLog('route', `DELETE /api/settings/users/${userId}`, 'User removed from MySQL.');
    return true;
  });

  const createBankLedger = wrapMutation(async (payload) => {
    await portalApi.createBankLedger(payload);
    addConsoleLog('route', 'POST /api/settings/bank-ledgers', 'Bank ledger persisted.');
  });

  const updateBankLedger = wrapMutation(async (id, payload) => {
    await portalApi.updateBankLedger(id, payload);
    addConsoleLog('route', `PUT /api/settings/bank-ledgers/${id}`, 'Bank ledger updated.');
  });

  const deleteBankLedger = wrapMutation(async (id) => {
    await portalApi.deleteBankLedger(id);
    addConsoleLog('route', `DELETE /api/settings/bank-ledgers/${id}`, 'Bank ledger removed.');
    return true;
  });

  const createCashLedger = wrapMutation(async (payload) => {
    await portalApi.createCashLedger(payload);
    addConsoleLog('route', 'POST /api/settings/cash-ledgers', 'Cash ledger persisted.');
  });

  const updateCashLedger = wrapMutation(async (id, payload) => {
    await portalApi.updateCashLedger(id, payload);
    addConsoleLog('route', `PUT /api/settings/cash-ledgers/${id}`, 'Cash ledger updated.');
  });

  const deleteCashLedger = wrapMutation(async (id) => {
    await portalApi.deleteCashLedger(id);
    addConsoleLog('route', `DELETE /api/settings/cash-ledgers/${id}`, 'Cash ledger removed.');
    return true;
  });

  const createCoaAccount = wrapMutation(async (payload) => {
    await portalApi.createCoaAccount(payload);
    addConsoleLog('route', 'POST /api/coa/accounts', 'General ledger account created.');
  });

  const updateCoaAccount = wrapMutation(async (id, payload) => {
    await portalApi.updateCoaAccount(id, payload);
    addConsoleLog('route', `PUT /api/coa/accounts/${id}`, 'General ledger account updated.');
  });

  const deleteCoaAccount = wrapMutation(async (id) => {
    await portalApi.deleteCoaAccount(id);
    addConsoleLog('route', `DELETE /api/coa/accounts/${id}`, 'General ledger account removed.');
    return true;
  });

  const createReportGroup = wrapMutation(async (payload) => {
    await portalApi.createReportGroup(payload);
    addConsoleLog('route', 'POST /api/coa/report-groups', 'Report group created.');
  });

  const updateReportGroup = wrapMutation(async (id, payload) => {
    await portalApi.updateReportGroup(id, payload);
    addConsoleLog('route', `PUT /api/coa/report-groups/${id}`, 'Report group updated.');
  });

  const deleteReportGroup = wrapMutation(async (id) => {
    await portalApi.deleteReportGroup(id);
    addConsoleLog('route', `DELETE /api/coa/report-groups/${id}`, 'Report group removed.');
    return true;
  });

  const loadReportGroupTemplate = wrapMutation(async (template) => {
    const res = await portalApi.loadReportGroupTemplate(template);
    addConsoleLog('route', 'POST /api/coa/report-groups/load-template', `Loaded ${res.created} report groups.`);
    await refreshPortalData();
    return res;
  });

  const assignCoaReportGroups = wrapMutation(async (assignments) => {
    await portalApi.assignCoaReportGroups(assignments);
    addConsoleLog('route', 'POST /api/coa/report-groups/assign', 'GL accounts assigned to report groups.');
  });

  const autoMapCoaReportGroups = wrapMutation(async () => {
    const res = await portalApi.autoMapCoaReportGroups();
    addConsoleLog('route', 'POST /api/coa/report-groups/auto-map', `Auto-mapped ${res.auto_map?.updated ?? 0} ledger(s).`);
    await refreshPortalData();
    return res;
  });

  const createCalendarReminder = wrapMutation(async (payload) => {
    await portalApi.createCalendarReminder(payload);
    addConsoleLog('route', 'POST /api/tax-calendar/reminders', 'Tax calendar reminder saved; email queued on server.');
    await refreshPortalData();
  });

  const updateCalendarReminder = wrapMutation(async (id, payload) => {
    await portalApi.updateCalendarReminder(id, payload);
    addConsoleLog('route', `PUT /api/tax-calendar/reminders/${id}`, 'Tax calendar reminder updated.');
    await refreshPortalData();
  });

  const deleteCalendarReminder = wrapMutation(async (id) => {
    await portalApi.deleteCalendarReminder(id);
    addConsoleLog('route', `DELETE /api/tax-calendar/reminders/${id}`, 'Tax calendar reminder deleted.');
    await refreshPortalData();
    return true;
  });

  const markCalendarPopupShown = wrapMutation(async (id) => {
    const now = new Date().toISOString();
    setCalendarReminders((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, popup_shown_at: now } : r))
    );
    await portalApi.acknowledgeCalendarPopup(id);
  });

  const createConsumption = wrapMutation(async (payload) => {
    await portalApi.createConsumption(payload);
    addConsoleLog('route', 'POST /api/consumptions', 'Consumption recorded.');
    await refreshPortalData();
  });

  const deleteConsumption = wrapMutation(async (id) => {
    await portalApi.deleteConsumption(id);
    addConsoleLog('route', `DELETE /api/consumptions/${id}`, 'Consumption deleted.');
    await refreshPortalData();
    return true;
  });

  const runCronJobScheduler = () => {
    const activeRecurring = expenses.filter((exp) => exp.is_recurring && exp.reminders_opt_in);
    if (activeRecurring.length === 0) {
      addConsoleLog('system', 'Cron Scheduler executed: 0 recurring ledgers eligible.', 'php artisan schedule:run');
      return { count: 0, logs: [] };
    }
    const newLogs = [];
    activeRecurring.forEach((exp) => {
      const nextDue = exp.due_date;
      const nextDueDateObj = new Date(nextDue);
      const oneDayPrior = new Date(nextDueDateObj);
      oneDayPrior.setDate(nextDueDateObj.getDate() - 1);
      newLogs.push(
        {
          id: Date.now() + Math.random(),
          expense_number: exp.expense_number,
          vendor_name: exp.vendor_name,
          due_date: nextDue,
          scheduled_date: oneDayPrior.toISOString().split('T')[0],
          type: '1-Day Pre-Due Warning',
          recipient: companyDetails.email,
          status: 'Sent Successfully',
          timestamp: new Date().toISOString(),
        },
        {
          id: Date.now() + Math.random(),
          expense_number: exp.expense_number,
          vendor_name: exp.vendor_name,
          due_date: nextDue,
          scheduled_date: nextDue,
          type: 'Due Date Action Alert',
          recipient: companyDetails.email,
          status: 'Sent Successfully',
          timestamp: new Date().toISOString(),
        }
      );
    });
    setCronReminderLogs((prev) => [...newLogs, ...prev]);
    addConsoleLog('system', `Cron Scheduler: ${newLogs.length} alerts queued (mail via Laravel schedule on server).`, 'php artisan schedule:run');
    return { count: activeRecurring.length, logs: newLogs };
  };

  const persistSettings = (patch) => {
    portalApi.updateCompany(patch).then(() => refreshPortalData()).catch(() => {});
  };

  const setIsFinancialYearLockedWrapped = (val) => {
    setIsFinancialYearLocked(val);
    persistSettings({ is_financial_year_locked: val });
  };

  const setLockedMonthsWrapped = (val) => {
    setLockedMonths(val);
    persistSettings({ locked_months: val });
  };

  const setInactivityTimeoutWrapped = (val) => {
    setInactivityTimeout(val);
  };

  const setRcmLedgerBalanceWrapped = (val) => {
    setRcmLedgerBalance(val);
    persistSettings({ rcm_ledger_balance: val });
  };

  return (
    <SimulatorContext.Provider
      value={{
        users,
        deleteUser,
        customers,
        invoices,
        invoiceItems,
        inventory,
        receipts,
        advanceAdjustments,
        expenses,
        payments,
        companyDetails,
        loginLogs,
        auditLogs,
        consoleLogs,
        currentUser,
        account,
        needsPassword,
        publicConfig,
        companies,
        activeCompany,
        selectCompany,
        createCompany,
        deleteCompany,
        refreshCompaniesList,
        loginUser,
        registerUser,
        googleLogin,
        setUserPassword,
        skipSetPassword,
        refreshAccount,
        createOnboardingCompany,
        saveOnboardingDetails,
        submitSubscriptionPayment,
        loadSubscriptionStatus,
        logoutUser,
        createInvoice,
        createAdvanceAdjustments,
        createCustomer,
        createReceipt,
        updateReceipt,
        createExpense,
        createPayment,
        updatePayment,
        createInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        createUser,
        updateUser,
        addConsoleLog,
        expenseHeads,
        createExpenseHead,
        updateExpenseHead,
        deleteExpenseHead,
        coaRecords,
        coaChart,
        reportGroups,
        coaSubtypes,
        createCoaAccount,
        updateCoaAccount,
        deleteCoaAccount,
        createReportGroup,
        updateReportGroup,
        deleteReportGroup,
        loadReportGroupTemplate,
        assignCoaReportGroups,
        autoMapCoaReportGroups,
        vendors,
        createVendor,
        cronReminderLogs,
        calendarReminders,
        createCalendarReminder,
        updateCalendarReminder,
        deleteCalendarReminder,
        markCalendarPopupShown,
        consumptions,
        currencyConversions,
        createCurrencyConversion,
        createConsumption,
        deleteConsumption,
        runCronJobScheduler,
        patchCompanyDetailsLocal,
        saveCompanyProfile,
        uploadCompanyLogo,
        saveGstComplianceSettings,
        generateEinvoice,
        cancelEinvoice,
        generateEwayBill,
        ewayBills,
        isFinancialYearLocked,
        setIsFinancialYearLocked: setIsFinancialYearLockedWrapped,
        lockedMonths,
        setLockedMonths: setLockedMonthsWrapped,
        inactivityTimeout,
        setInactivityTimeout: setInactivityTimeoutWrapped,
        bankAccounts,
        createBankLedger,
        updateBankLedger,
        deleteBankLedger,
        cashLedgers,
        createCashLedger,
        updateCashLedger,
        deleteCashLedger,
        rcmLedgerBalance,
        setRcmLedgerBalance: setRcmLedgerBalanceWrapped,
        ecrsLogs,
        setEcrsLogs,
        creditNotes,
        setCreditNotes,
        creditNoteItems,
        setCreditNoteItems,
        debitNotes,
        setDebitNotes,
        debitNoteItems,
        setDebitNoteItems,
        createCreditNote,
        updateCreditNote,
        createDebitNote,
        updateDebitNote,
        acquireDocumentLock,
        releaseDocumentLock,
        checkDocumentLock,
        refreshPortalData,
        dataLoading,
        apiReady,
        customOptions,
        getOptionsFor,
        addCustomOption,
        persistCustomOptions,
        updateCustomer,
        deleteCustomer,
        updateVendor,
        deleteVendor,
        updateInvoice,
        updateExpense,
        deleteInvoice,
        deleteReceipt,
        deleteExpense,
        deletePayment,
        deleteCreditNote,
        deleteDebitNote,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};
