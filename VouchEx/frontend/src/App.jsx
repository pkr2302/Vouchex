import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSimulator } from './context/SimulatorContext';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  TrendingDown,
  CreditCard,
  Package,
  Percent,
  Settings,
  User,
  LogOut,
  Plus,
  Search,
  Download,
  Mail,
  UserPlus,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
  Calendar,
  Eye,
  FileCheck,
  FileSpreadsheet,
  BookOpen,
  CalendarDays,
  Upload,
  FileJson,
  FileText,
  Sparkles,
} from 'lucide-react';
import { portalApi } from './services/portalApi';
import {
  emptyLineItem,
  aggregateLinesTax,
  calcLineTax,
  enrichLineFromProduct,
  formatItemDisplay,
  isGstRegisteredType,
  bifurcateStoredTax,
  resolveRegisteredState,
  isIntraState,
  isExportPlaceOfSupply,
  EXPORT_TREATMENT_OPTIONS,
  invoiceStoredTax,
  INDIAN_STATES,
  isServiceLine,
  lineHasDisplayQuantity,
  invoicePdfShowsQtyColumn,
  inventoryProduct,
} from './utils/gstUtils';
import { INVENTORY_UNIT_BASE_OPTIONS } from './data/inventoryUnits';
import { formatINR, sumField, toAmount, sameId, formatDateDDMMYYYY, nextDocumentNumber, sortRegistryNewestFirst, dateOnly, parseDateOnlyLocal, dueDateFromPaymentTerms, isBlankFieldValue, formatPartyAddressForDisplay, buildPartyAddressLine, isValidPaymentTerms, receiptSettledInvoiceLabel, paymentSettledExpenseLabel, paymentVoucherTypeLabel, formatPdfINR, formatDocumentMoney, formatPdfDocument, invoiceLineAmounts, buildForexConversionQueue } from './utils/formatMoney';
import { formatCurrencyLabel, getCurrencySymbol } from './utils/currencyData';
import { computeBankCashBalances } from './utils/ledgerBalances';
import { showApiError } from './utils/apiErrors';
import { RbiReferenceRateHint } from './components/RbiReferenceRateHint';
import {
  Req,
  Opt,
  DynamicSelect,
  StatePlaceOfSupplySelect,
  PlaceOfSupplyCountrySelect,
  CurrencySelect,
  InlineCustomerModal,
  InlineVendorModal,
  InlineInventoryModal,
  LineItemTaxRow,
  downloadExcelFromCsv,
  PdfOptionalLine,
  PaymentTermsSelect,
  AmountInput,
  TdsPercentAmountFields,
  SettlementModeToggle,
  SettlementBreakdown,
  Modal,
} from './components/portalShared';
import { TaxExportModal } from './components/TaxExportModal';
import { exportGstr1OfflineJson } from './utils/taxExport/gstr1JsonExport';
import { scopeTaxDataForPeriod } from './utils/taxPeriodData';
import { filterRecordsByDateRange } from './utils/taxExport/exportPeriod';
import { RecordDeleteButton } from './components/RecordDeleteButton';
import { ChartOfAccountsTab } from './components/ChartOfAccountsTab';
import SidebarNav, { TAB_TITLES } from './components/SidebarNav';
import HeaderClock from './components/HeaderClock';
import Company360Tab from './components/Company360Tab';
import FinancialStatementsTab from './components/FinancialStatementsTab';
import FinancialPeriodBar, { getDefaultAppliedPeriod } from './components/FinancialPeriodBar';
import DebtorsTab from './components/DebtorsTab';
import CreditorsTab from './components/CreditorsTab';
import CashBankTab from './components/CashBankTab';
import CompanyAccessPicker, { UserAccessPicker } from './components/CompanyAccessPicker';
import RegistersTab from './components/RegistersTab';
import GuidedActionsTab from './components/GuidedActionsTab';
import ComplianceCalendarPanel from './components/ComplianceCalendarPanel';
import TasksRemindersSidebar from './components/TasksRemindersSidebar';
import DueReminderPopup, { useDueReminderAlerts } from './components/DueReminderPopup';
import ConsumptionTab from './components/ConsumptionTab';
import AdvanceReceiptPanel from './components/AdvanceReceiptPanel';
import InvoiceAdvanceAdjustmentSection from './components/InvoiceAdvanceAdjustmentSection';
import {
  getCustomerAvailableAdvances,
  advanceStatusLabel,
  advanceReferenceLabel,
  advanceOriginalAmount,
  advanceAvailableBalance,
} from './utils/advanceHelpers';
import { invoiceNetReceivable } from './utils/advanceHelpers';
import { TaxCalendarTab } from './components/TaxCalendarTab';
import { VouchExBrand } from './components/VouchExBrand';
import MarketingPage from './components/MarketingPage';
import AuthPage from './components/AuthPage';
import OnboardingPage from './components/OnboardingPage';
import SubscriptionPage from './components/SubscriptionPage';
import SubscriptionAdminPanel from './components/SubscriptionAdminPanel';
import SetPasswordPage from './components/SetPasswordPage';
import TrialBanner from './components/TrialBanner';
import { isCompanyStaffAdmin, isGroupAdmin as userIsGroupAdmin, canSwitchCompanies, isPortalCompanyAdmin, roleDisplayLabel, resolveAuthPhase } from './utils/roleHelpers';
import SystemHealthPanel from './components/SystemHealthPanel';
import DashboardKpiGrid from './components/DashboardKpiGrid';
import CalendarReminderFormModal from './components/CalendarReminderFormModal';
import DashboardQuickActions from './components/DashboardQuickActions';
import DashboardAttentionPanel from './components/DashboardAttentionPanel';
import DashboardMiniKpiStrip from './components/DashboardMiniKpiStrip';
import DashboardComplianceStrip from './components/DashboardComplianceStrip';
import DashboardRecentActivity from './components/DashboardRecentActivity';
import GstComplianceSettingsPanel from './components/GstComplianceSettingsPanel';
import EinvoiceGenerateModal from './components/EinvoiceGenerateModal';
import EwayBillGenerateModal from './components/EwayBillGenerateModal';
import { computeDashboardBriefing } from './utils/dashboardBriefing';
import DashboardTimeFilter from './components/DashboardTimeFilter';
import DashboardDraggableLayout from './components/DashboardDraggableLayout';
import { computeDashboardMetrics } from './utils/dashboardMetrics';
import { PdfDocumentHeader, CompanyLogoPreview } from './components/PdfDocumentHeader';
import { PdfPrintModal } from './components/PdfPrintModal';
import PremiumFeatureModal from './components/PremiumFeatureModal';
import {
  portalToday,
  portalTodayDateOnly,
  invoiceOutstandingAmount,
  expenseOutstandingAmount,
  daysOverdue,
  receivableAgeingBucket,
  tdsBaseForSettlement,
  netCashFromSettlement,
  settlementFromComponents,
  receiptSettlementTotal,
  paymentSettlementTotal,
  invoiceSettledAmount,
  invoiceAdvanceAdjustedTotal,
  invoiceEffectiveTotal,
} from './utils/accountingHelpers';
import { buildCustomerLedger, buildVendorLedger } from './utils/partyLedgerUtils';
import { DocumentShareButtons, DocumentShareToolbar } from './components/DocumentShareButtons';
import { ExcelColumnFilter } from './components/ExcelColumnFilter';
import { useExcelTableState } from './hooks/useExcelTableState';
import { RegistryRowActions } from './components/RegistryRowActions';
import MobilePortalShell from './components/mobile/MobilePortalShell';
import { buildMobileNotifications, notificationCount } from './utils/mobileNotifications';
import MobileRecentStrip from './components/mobile/MobileRecentStrip';
import MobileRegistryCards from './components/mobile/MobileRegistryCards';
import MobileGstrSummary from './components/mobile/MobileGstrSummary';
import MobileRegistryCardActions from './components/mobile/MobileRegistryCardActions';
import MobileCardExpand from './components/mobile/MobileCardExpand';
import MobileAdaptiveSection from './components/mobile/MobileAdaptiveSection';
import MobileDetailGate from './components/mobile/MobileDetailGate';
import MobileTaxSummaryBlock from './components/mobile/MobileTaxSummaryBlock';
import MobileFormAccordionEnhancer from './components/mobile/MobileFormAccordionEnhancer';
import { usePortalFormIntent } from './hooks/usePortalFormIntent';
import { useMobileBackNavigation } from './hooks/useMobileBackNavigation';
import { useMobileBackHandler } from './hooks/useMobileBackHandler';
import { useIsMobile } from './hooks/useMediaQuery';
import { queuePortalFormIntent } from './utils/portalFormIntent';
import MobileTransactionHome from './components/mobile/MobileTransactionHome';
import MobileDesktopOnlyGate from './components/mobile/MobileDesktopOnlyGate';
import MobileSectionPills from './components/mobile/MobileSectionPills';
import MobileStepFormEnhancer from './components/mobile/MobileStepFormEnhancer';
import {
  MOBILE_HOME_TAB,
  hubForTab,
  MOBILE_HUBS,
  isMobileDesktopOnlyTab,
} from './utils/mobileAppConfig';
import MobileFilterShell, { countActiveFilters } from './components/mobile/MobileFilterShell';
import { MobileSettingsNav, MobileTaxationNav, MobileReceiptNav, MobilePaymentNav } from './components/mobile/MobileModuleNav';
import {
  buildInvoiceSharePayload,
  buildInvoicePdfFileName,
  buildReceiptSharePayload,
  buildCreditNoteSharePayload,
  buildDebitNoteSharePayload,
  buildPaymentSharePayload,
} from './utils/documentShare';

function App() {
  const {
    users,
    customers,
    invoices,
    invoiceItems,
    inventory,
    receipts,
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
    loginUser,
    registerUser,
    googleLogin,
    setUserPassword,
    skipSetPassword,
    createOnboardingCompany,
    saveOnboardingDetails,
    submitSubscriptionPayment,
    loadSubscriptionStatus,
    logoutUser,
    createInvoice,
    createCustomer,
    createReceipt,
    createExpense,
    createPayment,
    createInventoryItem,
    createUser,
    updateUser,
    deleteUser,
    addConsoleLog,
    cronReminderLogs,
    runCronJobScheduler,
    saveCompanyProfile,
    uploadCompanyLogo,
    patchCompanyDetailsLocal,
    isFinancialYearLocked,
    setIsFinancialYearLocked,
    lockedMonths,
    setLockedMonths,
    inactivityTimeout,
    setInactivityTimeout,
    bankAccounts,
    createBankLedger,
    cashLedgers,
    createCashLedger,
    rcmLedgerBalance,
    setRcmLedgerBalance,
    ecrsLogs,
    setEcrsLogs,
    companies,
    activeCompany,
    selectCompany,
    createCompany,
    calendarReminders,
    markCalendarPopupShown,
    creditNotes,
  } = useSimulator();

  const isPortalAdmin = isCompanyStaffAdmin(currentUser);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isGroupAdmin = userIsGroupAdmin(currentUser);
  const canSwitchCo = canSwitchCompanies(currentUser, companies);
  const [guestScreen, setGuestScreen] = useState('marketing');
  const [authMode, setAuthMode] = useState('login');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [subscriptionMeta, setSubscriptionMeta] = useState({ plans: null, payment: null, pending: null });
  const { current: dueAlert, dismissCurrent: dismissDueAlert } = useDueReminderAlerts(
    calendarReminders,
    currentUser,
    markCalendarPopupShown,
    activeCompany?.id
  );

  // --- STATE FOR CURRENT TAB & UI ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabReselectCount, setTabReselectCount] = useState({});
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isMobile = useIsMobile();
  const mobileHubId = isMobile ? hubForTab(activeTab) : null;
  const mobileHub = mobileHubId ? MOBILE_HUBS[mobileHubId] : null;

  useEffect(() => {
    if (isMobile && activeTab === 'dashboard') {
      setActiveTab(MOBILE_HOME_TAB);
    }
    if (!isMobile && activeTab === MOBILE_HOME_TAB) {
      setActiveTab('dashboard');
    }
  }, [isMobile]);

  const mobileNotifications = useMemo(
    () =>
      buildMobileNotifications({
        invoices,
        receipts,
        creditNotes,
        expenses,
        payments,
        inventory,
        calendarReminders,
        companyDetails,
        isFinancialYearLocked,
        account,
      }),
    [invoices, receipts, creditNotes, expenses, payments, inventory, calendarReminders, companyDetails, isFinancialYearLocked, account]
  );

  const mobileNotifCount = notificationCount(mobileNotifications);

  /** Re-clicking the active sidebar tab closes any open form on that tab. */
  const navigateTab = (tabId, options = {}) => {
    if (options?.openForm) {
      queuePortalFormIntent(tabId, options.openForm === true ? 'add' : options.openForm);
    }
    if (!options?.fromBack && tabId === activeTab) {
      setTabReselectCount((prev) => ({ ...prev, [tabId]: (prev[tabId] || 0) + 1 }));
    }
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  useMobileBackNavigation({
    activeTab,
    onNavigateTab: (tabId) => navigateTab(tabId, { fromBack: true }),
    overlays: {
      sidebarOpen,
      setSidebarOpen,
      searchOpen,
      setSearchOpen,
      reportsOpen,
      setReportsOpen,
      mobileDrawerOpen,
      setMobileDrawerOpen,
      notificationsOpen,
      setNotificationsOpen,
      settingsOpen,
      setSettingsOpen,
    },
  });

  const tabKey = (id) => `${id}-${tabReselectCount[id] || 0}`;

  // --- TAB TRANSITION & SKELETON LOADER TRIGGER ---
  useEffect(() => {
    setIsTabLoading(true);
    const timer = setTimeout(() => {
      setIsTabLoading(false);
    }, 150); // Blazing fast 150ms micro-transition for sleek feedback
    return () => clearTimeout(timer);
  }, [activeTab, tabReselectCount]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (sidebarOpen) {
      root.classList.add('nav-scroll-lock');
    } else {
      root.classList.remove('nav-scroll-lock');
    }
    return () => root.classList.remove('nav-scroll-lock');
  }, [sidebarOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // --- BUTTON SUBMIT SPINNER & DOUBLE-CLICK BLOCKER ---
  useEffect(() => {
    const handleButtonClick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      // Identify submit or save/generate buttons
      const isSubmit = btn.getAttribute('type') === 'submit' ||
                       btn.classList.contains('btn-primary') ||
                       /save|submit|generate|book|create/i.test(btn.innerText);

      // Ignore sub-tabs, menu toggles, or buttons that opt out
      if (isSubmit && !btn.classList.contains('btn-submitting') && !btn.classList.contains('sub-tab-btn') && !btn.classList.contains('mobile-menu-btn') && !btn.classList.contains('sidebar-backdrop') && !btn.classList.contains('sidebar-close-btn') && !btn.classList.contains('menu-link') && !btn.classList.contains('sidebar-group-heading') && !btn.hasAttribute('data-no-btn-spinner')) {
        btn.classList.add('btn-submitting');
        btn.style.pointerEvents = 'none';

        // Simulated fast DB processing under 200ms
        setTimeout(() => {
          btn.classList.remove('btn-submitting');
          btn.style.pointerEvents = '';
        }, 150);
      }
    };

    document.addEventListener('click', handleButtonClick);
    return () => document.removeEventListener('click', handleButtonClick);
  }, []);
  
  // --- AUTH FORMS STATE (legacy quick login in settings demo) ---
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const authPhase = resolveAuthPhase({ currentUser, account, needsPassword });

  useEffect(() => {
    if (authPhase !== 'subscription' && !showUpgrade) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await loadSubscriptionStatus();
        if (cancelled) return;
        setSubscriptionMeta({
          plans: publicConfig?.plans || res.plans,
          payment: publicConfig?.payment || res.payment,
          pending: res.pending ?? res.pending_payment ?? null,
        });
      } catch {
        if (!cancelled) {
          setSubscriptionMeta({
            plans: publicConfig?.plans,
            payment: publicConfig?.payment,
            pending: null,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authPhase, showUpgrade, loadSubscriptionStatus, publicConfig]);

  // --- INACTIVITY AUTO-LOGOUT ---
  const [isDemoLogoutMode, setIsDemoLogoutMode] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState(900); // 15 mins = 900s
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(60); // 1 min warning
  
  const activityTimeoutRef = useRef(null);
  const warningIntervalRef = useRef(null);

  // Handle user activity triggers
  const resetInactivityTimer = () => {
    if (!currentUser) return;
    
    // Reset timers
    const baseTime = isDemoLogoutMode ? 15 : inactivityTimeout; // 15s for demo, or settings-configured time
    setInactivityTimer(baseTime);
    setShowLogoutWarning(false);
    setWarningCountdown(isDemoLogoutMode ? 5 : 60);

    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);

    // Timeout before showing the warning modal
    const timeBeforeWarning = isDemoLogoutMode ? 10000 : Math.max(1000, (inactivityTimeout - 60) * 1000); // 10s (demo) or dynamic (production)
    activityTimeoutRef.current = setTimeout(() => {
      setShowLogoutWarning(true);
      // Start count down
      warningIntervalRef.current = setInterval(() => {
        setWarningCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(warningIntervalRef.current);
            logoutUser(true);
            setShowLogoutWarning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeBeforeWarning);
  };

  useEffect(() => {
    if (currentUser) {
      resetInactivityTimer();
      // Listeners for activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      const handleActivity = () => resetInactivityTimer();
      
      events.forEach(evt => window.addEventListener(evt, handleActivity));
      
      return () => {
        events.forEach(evt => window.removeEventListener(evt, handleActivity));
        if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
        if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
      };
    }
  }, [currentUser, isDemoLogoutMode]);

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError('Please enter user ID and password.');
      return;
    }
    const res = await loginUser(emailInput, passwordInput);
    if (res.success) {
      setLoginError('');
      setEmailInput('');
      setPasswordInput('');
      setActiveTab('dashboard');
    } else {
      setLoginError(res.message);
    }
  };

  // --- COMPONENT RENDER GUARDS ---
  if (!currentUser) {
    if (guestScreen === 'marketing') {
      return (
        <MarketingPage
          trialDays={publicConfig?.trial_days || 30}
          onStartTrial={() => { setAuthMode('register'); setGuestScreen('auth'); }}
          onSignIn={() => { setAuthMode('login'); setGuestScreen('auth'); }}
        />
      );
    }
    return (
      <AuthPage
        mode={authMode}
        publicConfig={publicConfig}
        onBack={() => setGuestScreen('marketing')}
        onLogin={loginUser}
        onRegister={registerUser}
        onGoogleCredential={async (credential) => {
          await googleLogin(credential, authMode === 'register' ? 'register' : 'login');
        }}
      />
    );
  }

  if (authPhase === 'set-password') {
    return (
      <SetPasswordPage
        onSave={setUserPassword}
        requirePassword={currentUser?.role === 'trial_owner'}
      />
    );
  }

  if (authPhase === 'onboarding') {
    return (
      <OnboardingPage
        account={account}
        currentUser={currentUser}
        onCreateCompany={createOnboardingCompany}
        onSaveDetails={saveOnboardingDetails}
      />
    );
  }

  if (authPhase === 'subscription' || showUpgrade) {
    return (
      <SubscriptionPage
        plans={subscriptionMeta.plans || publicConfig?.plans}
        paymentConfig={subscriptionMeta.payment || publicConfig?.payment}
        pendingPayment={subscriptionMeta.pending}
        onSubmitPayment={submitSubscriptionPayment}
        onRefresh={loadSubscriptionStatus}
        onLogout={() => { setShowUpgrade(false); logoutUser(false); }}
        earlyUpgrade={showUpgrade && authPhase === 'portal'}
        onBack={showUpgrade && authPhase === 'portal' ? () => setShowUpgrade(false) : undefined}
      />
    );
  }

  // --- SUB TAB STATES & MODALS STATE ---
  return (
    <div className={`app-layout${sidebarOpen ? ' app-layout--sidebar-open' : ''}`}>
      {/* 1. AUTO-LOGOUT INACTIVITY WARNING OVERLAY */}
      {showLogoutWarning && (
        <div className="logout-warning-overlay">
          <div className="logout-warning-card">
            <div className="logout-warning-icon">
              <AlertTriangle />
            </div>
            <h3>Security Inactivity Timeout</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              For security compliance, this portal automatically logs out due to inactivity.
            </p>
            <div className="logout-warning-timer">{warningCountdown}s</div>
            <button className="btn-primary" onClick={resetInactivityTimer}>
              Keep Session Alive
            </button>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. SIDEBAR NAVIGATION */}
      <div className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-logo">
          <VouchExBrand variant="sidebar" />
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
        <SidebarNav activeTab={activeTab} setActiveTab={navigateTab} />
        <div className="sidebar-footer">
          <div className="company-badge">
            <span>Enterprise Workspace:</span>
            <span className="company-badge-name" title={companyDetails.name}>
              {companyDetails.name.length > 20 ? companyDetails.name.substring(0, 18) + '...' : companyDetails.name}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(147, 197, 253, 0.95)' }}>GSTIN: {companyDetails.gstin}</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="main-content">
        {/* TOP HEADER */}
        <div className="header">
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label={isMobile ? (mobileDrawerOpen ? 'Close menu' : 'Open menu') : (sidebarOpen ? 'Close menu' : 'Open menu')}
            aria-expanded={isMobile ? mobileDrawerOpen : sidebarOpen}
            onClick={() => (isMobile ? setMobileDrawerOpen((o) => !o) : setSidebarOpen((open) => !open))}
          >
            <Menu size={22} />
          </button>
          <div className="page-title">
            <span className="desktop-only">{TAB_TITLES()[activeTab] || activeTab}</span>
            <VouchExBrand variant="mobile-header" />
            <span className="page-title-portal desktop-only">Portal</span>
            <span className="desktop-only"><HeaderClock /></span>
          </div>
          <div className="header-end">
            <div className="header-extras desktop-only">
              <TrialBanner account={account} onUpgrade={() => setShowUpgrade(true)} />
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="mobile-only mobile-header-icon-btn"
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={20} />
              </button>
              <button
                type="button"
                className="mobile-only mobile-header-icon-btn"
                aria-label="Settings"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings size={20} />
              </button>
              <button
                type="button"
                className="mobile-only mobile-header-notifications"
                aria-label={`Notifications${mobileNotifCount ? `, ${mobileNotifCount} alerts` : ''}`}
                onClick={() => setNotificationsOpen(true)}
              >
                <span className="mobile-header-notifications__icon" aria-hidden="true">🔔</span>
                {mobileNotifCount > 0 && (
                  <span className="mobile-header-notifications__badge">{mobileNotifCount > 9 ? '9+' : mobileNotifCount}</span>
                )}
              </button>
              {canSwitchCo && companies.length > 0 && (
                <select
                  className="form-input header-company-select desktop-only"
                  value={activeCompany?.id || ''}
                  onChange={(e) => {
                    const co = companies.find((c) => String(c.id) === e.target.value);
                    if (co) selectCompany(co);
                  }}
                  aria-label="Switch company"
                >
                  {companies.map((co) => (
                    <option key={co.id} value={co.id}>{co.name}</option>
                  ))}
                </select>
              )}
              <div className="user-profile">
                <div className="user-avatar">
                  {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="user-info">
                  <span className="user-name" title={currentUser.name}>{currentUser.name}</span>
                  <span className="user-role">{roleDisplayLabel(currentUser.role)}</span>
                </div>
              </div>
              <button className="logout-btn" onClick={() => logoutUser(false)} title="Log Out Session">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {isMobile && mobileHub && activeTab !== 'settings' && activeTab !== MOBILE_HOME_TAB && (
          <MobileSectionPills
            tabs={mobileHub.tabs}
            activeId={activeTab}
            onSelect={(tabId) => navigateTab(tabId)}
          />
        )}

        {/* TAB WORKSPACE ROUTER */}
        <div className={`tab-container${isTabLoading ? ' mobile-tab-loading' : ''}`} style={{ position: 'relative' }}>
          {isTabLoading && <div className="top-loading-bar" />}
          {isTabLoading ? (
            <SkeletonLoader tab={activeTab} />
          ) : (
            <>
              {isMobile && isMobileDesktopOnlyTab(activeTab) && (
                <MobileDesktopOnlyGate tabId={activeTab} onGoHome={navigateTab} />
              )}
              {isMobile && activeTab === MOBILE_HOME_TAB && (
                <MobileTransactionHome
                  onNavigate={navigateTab}
                  invoices={invoices}
                  receipts={receipts}
                  expenses={expenses}
                  payments={payments}
                />
              )}
              {(!isMobile || (!isMobileDesktopOnlyTab(activeTab) && activeTab !== MOBILE_HOME_TAB)) && (
              <>
              {activeTab === 'dashboard' && <DashboardTab key={tabKey('dashboard')} setActiveTab={setActiveTab} />}
              {activeTab === 'company-360' && <Company360Tab key={tabKey('company-360')} setActiveTab={setActiveTab} />}
              {activeTab === 'financials' && <FinancialStatementsTab key={tabKey('financials')} setActiveTab={setActiveTab} />}
              {activeTab === 'ledgers' && <RegistersTab key={tabKey('ledgers')} view="ledger" />}
              {activeTab === 'day-book' && <RegistersTab key={tabKey('day-book')} view="day-book" />}
              {activeTab === 'sales-register' && <RegistersTab key={tabKey('sales-register')} view="sales" />}
              {activeTab === 'purchase-register' && <RegistersTab key={tabKey('purchase-register')} view="purchase" />}
              {activeTab === 'misc-entries' && <GuidedActionsTab key={tabKey('misc-entries')} />}
              {activeTab === 'sales' && <IncomeTab key={tabKey('sales')} invoicesOnly />}
              {activeTab === 'customer-master' && <CustomerMasterSubTab key={tabKey('customer-master')} />}
              {activeTab === 'sales-return' && <CreditNotesSubTab key={tabKey('sales-return')} />}
              {activeTab === 'receipt' && <ReceiptTab key={tabKey('receipt')} />}
              {activeTab === 'debtors' && <DebtorsTab key={tabKey('debtors')} />}
              {activeTab === 'purchase' && <ExpenseTab key={tabKey('purchase')} recordTypeFilter="purchase" purchaseMode />}
              {activeTab === 'purchase-return' && <DebitNotesSubTab key={tabKey('purchase-return')} />}
              {activeTab === 'expense' && <ExpenseTab key={tabKey('expense')} recordTypeFilter="expense" />}
              {activeTab === 'vendor-master' && <ExpenseTab key={tabKey('vendor-master')} vendorMasterOnly />}
              {activeTab === 'payment' && <PaymentTab key={tabKey('payment')} />}
              {activeTab === 'creditors' && <CreditorsTab key={tabKey('creditors')} />}
              {activeTab === 'cash-bank' && <CashBankTab key={tabKey('cash-bank')} />}
              {activeTab === 'inventory' && <InventoryTab key={tabKey('inventory')} />}
              {activeTab === 'consumption' && <ConsumptionTab key={tabKey('consumption')} />}
              {activeTab === 'taxation' && <TaxationTab key={tabKey('taxation')} />}
              {activeTab === 'tax-calendar' && <TaxCalendarTab key={tabKey('tax-calendar')} />}
              {activeTab === 'coa' && <ChartOfAccountsTab key={tabKey('coa')} />}
              {activeTab === 'settings' && (
                <SettingsTab
                  key={tabKey('settings')}
                  isDemoLogoutMode={isDemoLogoutMode}
                  setIsDemoLogoutMode={setIsDemoLogoutMode}
                />
              )}
              </>
              )}
            </>
          )}
        </div>
      </div>
      <DueReminderPopup item={dueAlert} onDismiss={dismissDueAlert} />
      <MobileStepFormEnhancer activeTab={activeTab} />
      <MobilePortalShell
        activeTab={activeTab}
        navigateTab={navigateTab}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={setNotificationsOpen}
        notifications={mobileNotifications}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        drawerOpen={mobileDrawerOpen}
        setDrawerOpen={setMobileDrawerOpen}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        onOpenSettingsSection={() => navigateTab('settings')}
        userName={currentUser?.name}
      />
    </div>
  );
}

// ==========================================
// A. DASHBOARD TAB SCREEN
// ==========================================
function DashboardTab({ setActiveTab }) {
  const {
    calendarReminders,
    deleteCalendarReminder,
    currentUser,
    companyDetails,
    addConsoleLog,
    invoices,
    receipts,
    expenses,
    payments,
    inventory,
    creditNotes,
    debitNotes,
    advanceAdjustments,
    bankAccounts,
    cashLedgers,
    isFinancialYearLocked,
  } = useSimulator();
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarModalKind, setCalendarModalKind] = useState('reminder');
  const [calendarModalDate, setCalendarModalDate] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const briefing = React.useMemo(
    () =>
      computeDashboardBriefing({
        invoices,
        receipts,
        expenses,
        payments,
        inventory,
        creditNotes,
        debitNotes,
        advanceAdjustments,
        calendarReminders,
        companyDetails,
        isFinancialYearLocked,
        bankAccounts,
        cashLedgers,
      }),
    [
      invoices,
      receipts,
      expenses,
      payments,
      inventory,
      creditNotes,
      debitNotes,
      advanceAdjustments,
      calendarReminders,
      companyDetails,
      isFinancialYearLocked,
      bankAccounts,
      cashLedgers,
    ]
  );

  const openTaskModal = (dateStr) => {
    setEditRow(null);
    setCalendarModalKind('task');
    setCalendarModalDate(dateStr || null);
    setCalendarModalOpen(true);
  };

  const openReminderModal = (dateStr) => {
    setEditRow(null);
    setCalendarModalKind('reminder');
    setCalendarModalDate(dateStr || null);
    setCalendarModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditRow(row);
    setCalendarModalKind(row.kind);
    setCalendarModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try {
      await deleteCalendarReminder(row.id);
      addConsoleLog('route', `DELETE /api/tax-calendar/reminders/${row.id}`, 'Removed from dashboard list.');
    } catch (err) {
      showApiError('Deleting entry', err);
    }
  };

  return (
    <div className="dashboard-tab dashboard-tab--compliance">
      <DashboardQuickActions setActiveTab={setActiveTab} />
      <DashboardAttentionPanel items={briefing.attention} onNavigate={setActiveTab} />

      <div className="dashboard-mid-row">
        <DashboardMiniKpiStrip kpis={briefing.miniKpis} onOpen360={() => setActiveTab('company-360')} />
        <div className="desktop-only">
          <DashboardComplianceStrip
            compliance={briefing.compliance}
            gstReadiness={briefing.gstReadiness}
            onNavigate={setActiveTab}
          />
        </div>
      </div>

      <MobileAdaptiveSection title="View more" subtitle="Activity, compliance, calendar & tasks" defaultOpenMobile={false}>
        <MobileRecentStrip onNavigate={setActiveTab} />
        <div className="mobile-only">
          <DashboardComplianceStrip
            compliance={briefing.compliance}
            gstReadiness={briefing.gstReadiness}
            onNavigate={setActiveTab}
          />
        </div>
        <div className="dashboard-compliance-layout">
          <ComplianceCalendarPanel
            calendarReminders={calendarReminders}
            onAddTask={openTaskModal}
            onAddReminder={openReminderModal}
          />
          <TasksRemindersSidebar
            calendarReminders={calendarReminders}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
        <div className="dashboard-recent-section">
          <DashboardRecentActivity events={briefing.recentActivity} onNavigate={setActiveTab} />
        </div>
      </MobileAdaptiveSection>

      <CalendarReminderFormModal
        open={calendarModalOpen}
        initialKind={calendarModalKind}
        initialDate={calendarModalDate}
        editRow={editRow}
        onClose={() => {
          setCalendarModalOpen(false);
          setEditRow(null);
          setCalendarModalDate(null);
        }}
      />
    </div>
  );
}

// ==========================================
// B. INCOME TAB SCREEN
// ==========================================
function IncomeTab({ invoicesOnly = false }) {
  const { loadSubscriptionStatus } = useSimulator();
  const [subTab, setSubTab] = useState('invoices');
  const [showLogoPaywall, setShowLogoPaywall] = useState(false);

  if (invoicesOnly) {
    return <SalesInvoicesSubTab />;
  }

  return (
    <div>
      <PremiumFeatureModal
        open={showLogoPaywall}
        title="Company logo — paid plans"
        message="Upload a custom logo on invoices and PDFs with any paid subscription. Your trial includes full accounting features without logo branding."
        onClose={() => setShowLogoPaywall(false)}
        onUpgrade={() => {
          setShowLogoPaywall(false);
          loadSubscriptionStatus().catch(() => {});
        }}
      />
      <div className="tab-nav-sub">
        <button
          className={`sub-tab-btn ${subTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setSubTab('invoices')}
        >
          Sales Invoices & Billing
        </button>
        <button
          className={`sub-tab-btn ${subTab === 'customers' ? 'active' : ''}`}
          onClick={() => setSubTab('customers')}
        >
          Customer Ledger Master
        </button>
        <button
          className={`sub-tab-btn ${subTab === 'credit_notes' ? 'active' : ''}`}
          onClick={() => setSubTab('credit_notes')}
        >
          Issue Credit Note (Sales Return) 📒
        </button>
      </div>

      {subTab === 'invoices' && <SalesInvoicesSubTab />}
      {subTab === 'customers' && <CustomerMasterSubTab />}
      {subTab === 'credit_notes' && <CreditNotesSubTab />}
    </div>
  );
}

// --- SUB-TAB: SALES INVOICES ---
function SalesInvoicesSubTab() {
  const {
    invoices,
    invoiceItems,
    customers,
    inventory,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    receipts,
    advanceAdjustments,
    creditNotes,
    companyDetails,
    isFinancialYearLocked,
    addConsoleLog,
    currentUser,
    generateEinvoice,
    cancelEinvoice,
    generateEwayBill,
    ewayBills,
  } = useSimulator();
  const registeredState = resolveRegisteredState(companyDetails);
  const gstCompliance = companyDetails.gst_compliance || {};
  const einvoiceEnabled = !!gstCompliance.einvoice_enabled;
  const ewaybillEnabled = !!gstCompliance.ewaybill_enabled;
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInlineCustomer, setShowInlineCustomer] = useState(false);
  const [showInlineInventory, setShowInlineInventory] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [applyAdvanceOnInvoice, setApplyAdvanceOnInvoice] = useState(false);
  const [invoiceAdvanceRows, setInvoiceAdvanceRows] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');
  const [excelSort, setExcelSort] = useState(null);
  const [excelFilters, setExcelFilters] = useState({});
  const invoiceFormRef = useRef(null);
  const skipCustomerAutofillRef = useRef(false);
  const lastAutofilledCustomerIdRef = useRef('');
  const dueDateUserEditedRef = useRef(false);
  const invoiceNumberUserEditedRef = useRef(false);
  const lastInvoiceAutoYearRef = useRef('');
  const [invoiceType, setInvoiceType] = useState('B2B');
  const [uploadedInvoiceFile, setUploadedInvoiceFile] = useState(null);
  const invoiceFileRef = useRef(null);
  
  // Form Values
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(portalTodayDateOnly());
  const invoiceYear = (issueDate || `${new Date().getFullYear()}`).slice(0, 4);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState(
    () => nextDocumentNumber('INV', invoiceYear, invoices.map((i) => i.invoice_number))
  );
  const [dueDate, setDueDate] = useState('2026-06-07');
  const [poNumber, setPoNumber] = useState('');
  
  // Addresses and Legal
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [clientTaxId, setClientTaxId] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState(registeredState || 'Gujarat');
  const [exportCountry, setExportCountry] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [conversionRate, setConversionRate] = useState('1.00');
  const [exportTreatment, setExportTreatment] = useState('');
  const [printPlaceOfSupplyOnPdf, setPrintPlaceOfSupplyOnPdf] = useState(true);

  // Items State
  const [lineItems, setLineItems] = useState([emptyLineItem()]);

  const docMoney = (value) => formatDocumentMoney(value, currency);
  const curSym = getCurrencySymbol(currency);

  useEffect(() => {
    if (!selectedCustomerId && !editingInvoiceId && registeredState) {
      setPlaceOfSupply(registeredState);
    }
  }, [registeredState, selectedCustomerId, editingInvoiceId]);

  useEffect(() => {
    if (isExportPlaceOfSupply(placeOfSupply)) {
      setInvoiceType('Export');
    } else if (!editingInvoiceId) {
      setExportTreatment('');
    }
  }, [placeOfSupply, editingInvoiceId]);

  useEffect(() => {
    setLineItems((prev) =>
      prev.map((line) => {
        const t = calcLineTax(line, placeOfSupply, registeredState, inventory, exportTreatment);
        return { ...line, ...t, line_total: t.taxable };
      })
    );
  }, [placeOfSupply, registeredState, exportTreatment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Discounts
  const [discountValue, setDiscountValue] = useState('');

  // Scanner Emulation
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrFeed, setOcrFeed] = useState('');
  const [scanError, setScanError] = useState('');

  // Invoice Actions Modals
  const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState(null);
  const [einvoiceModalInvoice, setEinvoiceModalInvoice] = useState(null);
  const [ewayModalInvoice, setEwayModalInvoice] = useState(null);

  const ewayForInvoice = (invoiceId) =>
    (ewayBills || []).find((b) => Number(b.invoice_id) === Number(invoiceId) && b.status === 'active');

  const applyCustomerAutofill = (client, issueDateStr) => {
    if (!client) return;
    const billLine = buildPartyAddressLine({
      address: client.billing_address,
      city: client.billing_city,
      state: client.billing_state,
      pincode: client.billing_pincode,
    });
    const shipLine = client.shipping_same
      ? billLine
      : buildPartyAddressLine({
          address: client.shipping_address,
          city: client.shipping_city,
          state: client.shipping_state,
          pincode: client.shipping_pincode,
        });
    setBillingAddress(billLine);
    setShippingAddress(shipLine);
    setClientTaxId(client.gstin);
    setPlaceOfSupply(client.billing_state);
    setCurrency(client.currency || 'INR');
    if (!dueDateUserEditedRef.current) {
      setDueDate(dueDateFromPaymentTerms(issueDateStr || issueDate, client.payment_terms));
    }
  };

  // Autofill customer master fields only when the selected customer changes — not on live sync refresh.
  useEffect(() => {
    if (skipCustomerAutofillRef.current) {
      skipCustomerAutofillRef.current = false;
      lastAutofilledCustomerIdRef.current = selectedCustomerId;
      return;
    }
    if (!selectedCustomerId) {
      lastAutofilledCustomerIdRef.current = '';
      return;
    }
    if (selectedCustomerId === lastAutofilledCustomerIdRef.current) return;
    lastAutofilledCustomerIdRef.current = selectedCustomerId;
    dueDateUserEditedRef.current = false;
    const client = customers.find((c) => sameId(c.id, selectedCustomerId));
    applyCustomerAutofill(client, issueDate);
  }, [selectedCustomerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate due date when issue date changes — only until user edits due date manually.
  useEffect(() => {
    if (!selectedCustomerId || skipCustomerAutofillRef.current || dueDateUserEditedRef.current) return;
    const client = customers.find((c) => sameId(c.id, selectedCustomerId));
    if (!client?.payment_terms) return;
    setDueDate(dueDateFromPaymentTerms(issueDate, client.payment_terms));
  }, [issueDate, selectedCustomerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = aggregateLinesTax(lineItems, discountValue, placeOfSupply, registeredState, inventory, exportTreatment);
  const { subtotal, postDiscount, cgst, sgst, igst, tax_amount: taxAmount, payable_tax: payableTax, total_amount: totalAmount } = totals;
  const fcConversionRequired = currency !== 'INR' && payableTax > 0.009;

  const customerAvailableAdvances = useMemo(
    () =>
      !editingInvoiceId && selectedCustomerId
        ? getCustomerAvailableAdvances(selectedCustomerId, receipts, advanceAdjustments)
        : [],
    [editingInvoiceId, selectedCustomerId, receipts, advanceAdjustments]
  );

  const customerAdvanceKey = customerAvailableAdvances
    .map((row) => `${row.receipt.id}:${row.availableBalance}`)
    .join('|');

  useEffect(() => {
    setApplyAdvanceOnInvoice(false);
    setInvoiceAdvanceRows(
      customerAvailableAdvances.map(({ receipt, availableBalance }) => ({
        advance_receipt_id: receipt.id,
        advance_reference: advanceReferenceLabel(receipt),
        payment_date: receipt.payment_date,
        original_amount: advanceOriginalAmount(receipt),
        available_balance: availableBalance,
        adjustment_amount: '',
        selected: false,
      }))
    );
  }, [selectedCustomerId, customerAdvanceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currency === 'INR') setConversionRate('1.00');
  }, [currency]);

  useEffect(() => {
    if (!showAddForm || editingInvoiceId) {
      if (!showAddForm) {
        invoiceNumberUserEditedRef.current = false;
        lastInvoiceAutoYearRef.current = '';
      }
      return;
    }
    if (invoiceNumberUserEditedRef.current) return;
    const year = (issueDate || '').slice(0, 4);
    if (lastInvoiceAutoYearRef.current === year) return;
    lastInvoiceAutoYearRef.current = year;
    setInvoiceNumberInput(
      nextDocumentNumber('INV', year, invoices.map((i) => i.invoice_number))
    );
  }, [showAddForm, editingInvoiceId, issueDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRegistryInvoices = useMemo(() => {
    const base = sortRegistryNewestFirst(
      invoices.filter((inv) => {
        if (filterStartDate && inv.issue_date < filterStartDate) return false;
        if (filterEndDate && inv.issue_date > filterEndDate) return false;
        if (registrySearch.trim()) {
          const q = registrySearch.trim().toLowerCase();
          const hay = `${inv.invoice_number || ''} ${inv.customer_name || ''} ${inv.gstin || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
      'issue_date'
    );

    const enriched = base.map((inv) => {
      const taxB = invoiceStoredTax(inv, inv.place_of_supply, registeredState);
      const invGross = invoiceEffectiveTotal(inv, creditNotes);
      const taxTotal = toAmount(taxB.cgst) + toAmount(taxB.sgst) + toAmount(taxB.igst);
      return {
        inv,
        document: inv.invoice_number || '',
        client: inv.customer_name || '',
        settlement: invGross,
        settlementLabel: formatDocumentMoney(invGross, inv.currency || 'INR'),
        tax: taxTotal,
        taxLabel: formatDocumentMoney(taxTotal, inv.currency || 'INR'),
        status: inv.status || '',
      };
    });

    // Filter uses display labels for money; sort uses numeric fields
    const getFilterValue = (row, key) => {
      if (key === 'settlement') return row.settlementLabel;
      if (key === 'tax') return row.taxLabel;
      return row[key];
    };
    const getSortValue = (row, key) => {
      if (key === 'settlement') return row.settlement;
      if (key === 'tax') return row.tax;
      return row[key];
    };

    let next = enriched;
    Object.entries(excelFilters).forEach(([key, selected]) => {
      if (!(selected instanceof Set)) return;
      next = next.filter((row) => {
        const raw = getFilterValue(row, key);
        const token = raw == null || raw === '' ? '(Blank)' : String(raw);
        return selected.has(token);
      });
    });

    if (excelSort?.key) {
      const dir = excelSort.dir === 'desc' ? -1 : 1;
      const key = excelSort.key;
      next = [...next].sort((a, b) => {
        const va = getSortValue(a, key);
        const vb = getSortValue(b, key);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
    }

    return next.map((row) => row.inv);
  }, [
    invoices,
    filterStartDate,
    filterEndDate,
    registrySearch,
    excelSort,
    excelFilters,
    registeredState,
    creditNotes,
  ]);

  const excelColumnValues = useMemo(() => {
    const base = invoices.filter((inv) => {
      if (filterStartDate && inv.issue_date < filterStartDate) return false;
      if (filterEndDate && inv.issue_date > filterEndDate) return false;
      if (registrySearch.trim()) {
        const q = registrySearch.trim().toLowerCase();
        const hay = `${inv.invoice_number || ''} ${inv.customer_name || ''} ${inv.gstin || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return {
      document: base.map((inv) => inv.invoice_number || ''),
      client: base.map((inv) => inv.customer_name || ''),
      settlement: base.map((inv) => {
        const gross = invoiceEffectiveTotal(inv, creditNotes);
        return formatDocumentMoney(gross, inv.currency || 'INR');
      }),
      tax: base.map((inv) => {
        const taxB = invoiceStoredTax(inv, inv.place_of_supply, registeredState);
        const taxTotal = toAmount(taxB.cgst) + toAmount(taxB.sgst) + toAmount(taxB.igst);
        return formatDocumentMoney(taxTotal, inv.currency || 'INR');
      }),
      status: base.map((inv) => inv.status || ''),
    };
  }, [
    invoices,
    filterStartDate,
    filterEndDate,
    registrySearch,
    creditNotes,
    registeredState,
  ]);

  const setExcelFilterFor = (key, nextSet) => {
    setExcelFilters((prev) => {
      const copy = { ...prev };
      if (nextSet == null) delete copy[key];
      else copy[key] = nextSet;
      return copy;
    });
  };

  const openEditInvoice = (inv) => {
    const pos = inv.place_of_supply || registeredState || 'Gujarat';
    const items = invoiceItems.filter((it) => Number(it.invoice_id) === Number(inv.id));
    skipCustomerAutofillRef.current = true;
    lastAutofilledCustomerIdRef.current = inv.customer_id != null ? String(inv.customer_id) : '';
    setEditingInvoiceId(inv.id);
    setShowAddForm(true);
    invoiceNumberUserEditedRef.current = true;
    setInvoiceType(inv.invoice_type || 'B2B');
    setInvoiceNumberInput(inv.invoice_number || '');
    setSelectedCustomerId(inv.customer_id != null ? String(inv.customer_id) : '');
    setIssueDate(dateOnly(inv.issue_date) || '');
    setDueDate(dateOnly(inv.due_date) || '');
    dueDateUserEditedRef.current = true;
    setPoNumber(inv.po_number && inv.po_number !== 'NIL' ? inv.po_number : '');
    setBillingAddress(inv.billing_address || '');
    setShippingAddress(inv.shipping_address || '');
    setClientTaxId(inv.gstin || '');
    setPlaceOfSupply(pos === 'Overseas' ? 'Out of India' : pos);
    setExportCountry(inv.export_country || '');
    setExportTreatment(inv.export_treatment || '');
    setPrintPlaceOfSupplyOnPdf(inv.print_place_of_supply_on_pdf !== false);
    setCurrency(inv.currency || 'INR');
    setConversionRate(String(inv.conversion_rate ?? '1.00'));
    setDiscountValue(toAmount(inv.discount));
    setLineItems(
      items.length > 0
        ? items.map((it) => {
            const prod = inventoryProduct(inventory, it.product_id);
            const isSvc = prod?.type === 'Service';
            const q = parseFloat(it.quantity);
            const hasQty = Number.isFinite(q) && q > 0;
            const base = {
              product_id: it.product_id ? String(it.product_id) : '',
              item_type: prod?.type || 'Product',
              description: it.description || '',
              item_detail: it.item_detail || '',
              quantity: isSvc && !hasQty ? '' : (it.quantity ?? 1),
              rate: toAmount(it.unit_price),
              line_total: toAmount(it.line_total),
              hsn_sac: it.hsn_sac || '',
              tax_rate_override: it.tax_rate_override ?? it.tax_rate ?? '',
              supply_mechanism: it.supply_mechanism || 'FCM',
            };
            const t = calcLineTax(base, pos, registeredState, inventory, inv.export_treatment || '');
            return { ...base, ...t, line_total: t.taxable };
          })
        : [emptyLineItem()]
    );
    setTimeout(() => {
      invoiceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const resetInvoiceForm = () => {
    setShowAddForm(false);
    setEditingInvoiceId(null);
    setLineItems([emptyLineItem()]);
    setSelectedCustomerId('');
    dueDateUserEditedRef.current = false;
    setUploadedInvoiceFile(null);
    invoiceNumberUserEditedRef.current = false;
    lastInvoiceAutoYearRef.current = (issueDate || '').slice(0, 4);
    setInvoiceNumberInput(nextDocumentNumber('INV', issueDate.slice(0, 4), invoices.map((i) => i.invoice_number)));
    setPlaceOfSupply(registeredState || 'Gujarat');
    setExportCountry('');
    setExportTreatment('');
    setPrintPlaceOfSupplyOnPdf(true);
    setCurrency('INR');
    setConversionRate('1.00');
    setApplyAdvanceOnInvoice(false);
    setInvoiceAdvanceRows([]);
  };

  usePortalFormIntent('sales', () => {
    setEditingInvoiceId(null);
    dueDateUserEditedRef.current = false;
    invoiceNumberUserEditedRef.current = false;
    lastInvoiceAutoYearRef.current = (issueDate || '').slice(0, 4);
    setInvoiceNumberInput(
      nextDocumentNumber('INV', issueDate.slice(0, 4), invoices.map((i) => i.invoice_number))
    );
    setShowAddForm(true);
  });

  useMobileBackHandler(showAddForm, () => {
    resetInvoiceForm();
    return true;
  });

  const getInvoiceShare = (inv) => {
    const customer = customers.find((c) => Number(c.id) === Number(inv.customer_id));
    const items = invoiceItems.filter((it) => Number(it.invoice_id) === Number(inv.id));
    return buildInvoiceSharePayload(inv, {
      company: companyDetails,
      customer,
      lineItems: items,
      fromEmail: currentUser?.email,
    });
  };

  // 3. Line item mutations
  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'product_id' && value !== '') {
      const matched = inventory.find((p) => Number(p.id) === Number(value));
      if (matched) {
        updated[index] = enrichLineFromProduct(updated[index], matched, registeredState, placeOfSupply, inventory, exportTreatment);
      }
    } else {
      if (field === 'product_id' && value === '') {
        updated[index].item_type = 'Product';
      }
      const t = calcLineTax(updated[index], placeOfSupply, registeredState, inventory, exportTreatment);
      updated[index] = { ...updated[index], ...t, line_total: t.taxable };
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, emptyLineItem()]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, idx) => idx !== index));
    }
  };

  // 4. Emulate Invoice Scanning Logic
  const triggerInvoiceScan = () => {
    if (!uploadedInvoiceFile) {
      alert("Validation Warning: No file uploaded yet. Please click the scanner zone to upload a document first!");
      return;
    }
    setIsScanning(true);
    setScanProgress(0);
    setOcrFeed(`Locating invoice document headers from file: ${uploadedInvoiceFile.name}...\n`);
    setScanError('');
    
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          const randomOutcome = Math.random();
          if (randomOutcome > 0.95) {
            setScanError(`OCR SCANNING ERROR: Unable to parse structured billing fields from: ${uploadedInvoiceFile.name}. Document resolution low.`);
          } else {
            setSelectedCustomerId('1'); // Tata Motors
            const ocrLine = enrichLineFromProduct(
              { ...emptyLineItem(), product_id: '1', description: 'Premium Engine Lubricant Oil', quantity: 120, rate: 500, hsn_sac: '2710', tax_rate_override: 18 },
              inventory.find((p) => p.id === 1),
              registeredState,
              placeOfSupply
            );
            setLineItems([ocrLine.quantity ? ocrLine : { ...emptyLineItem(), product_id: '1', description: 'Premium Engine Lubricant Oil', quantity: 120, rate: 500, hsn_sac: '2710', tax_rate_override: 18, ...calcLineTax({ quantity: 120, rate: 500, tax_rate_override: 18, supply_mechanism: 'FCM' }, placeOfSupply, registeredState), line_total: 60000 }]);
            setPoNumber('SCAN-OCR-9922');
            addConsoleLog('system', 'OCR Engine Parsed document values successfully', `OCR Results: { file: "${uploadedInvoiceFile.name}", client: "Tata Motors", items: [{ desc: "Lub Oil", qty: 120, rate: 500 }] }`);
          }
          return 100;
        }
        
        if (prev === 20) setOcrFeed(f => f + `Binarizing ${uploadedInvoiceFile.name} document pixels...\n`);
        if (prev === 40) setOcrFeed(f => f + 'Detecting boundaries and structural layouts...\n');
        if (prev === 60) setOcrFeed(f => f + 'Reading client tax identifiers and sequential serial codes...\n');
        if (prev === 85) setOcrFeed(f => f + 'Comparing line item amounts against inventory databases...\n');

        return prev + 5;
      });
    }, 150);
  };

  // 5. Submit Save Invoice
  const handleSaveInvoice = async (e) => {
    e?.preventDefault?.();
    if (invoiceSaving) return;

    try {
      if (isFinancialYearLocked) {
        alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
        return;
      }
    
      // Strict validations
      if (!invoiceNumberInput) { alert('Invoice Number is strictly mandatory.'); return; }
      if (!issueDate) { alert('Issue date is strictly mandatory.'); return; }
      if (!selectedCustomerId) { alert('Customer Name must be selected.'); return; }
      if (!placeOfSupply) { alert('Place of Supply is strictly mandatory.'); return; }
      if (isExportPlaceOfSupply(placeOfSupply) && !exportCountry.trim()) {
        alert('Validation Failure: Select the destination country for Out of India supply.');
        return;
      }
      if (isExportPlaceOfSupply(placeOfSupply) && !exportTreatment) {
        alert('Validation Failure: Select export supply treatment (LUT / Bond / IGST paid, etc.) for Out of India invoices.');
        return;
      }

      if (fcConversionRequired && (!conversionRate || parseFloat(conversionRate) <= 0)) {
        alert('Validation Failure: Conversion rate to INR is mandatory when GST is payable on a foreign currency invoice.');
        return;
      }

      const isItemsValid = lineItems.every((it) => {
        if (!it.description || parseFloat(it.rate) <= 0) return false;
        if (isServiceLine(it, inventory)) return true;
        const qty = parseFloat(it.quantity);
        return Number.isFinite(qty) && qty > 0;
      });
      if (!isItemsValid) {
        alert('Strict Validation Failure: Description and rate are mandatory. Quantity is required for product lines; optional for service items.');
        return;
      }

      const selectedClient = customers.find((c) => sameId(c.id, selectedCustomerId));
      const gstRequired = selectedClient && isGstRegisteredType(selectedClient.gst_type);
      if (gstRequired && (!clientTaxId || clientTaxId === 'NIL')) {
        alert('Validation Failure: GSTIN is mandatory for registered customers.');
        return;
      }
      if (invoiceType === 'B2B') {
        if (gstRequired && (!clientTaxId || clientTaxId === 'NIL')) {
          alert('Validation Failure: For B2B Invoices, a valid Client Tax ID (GSTIN) is strictly mandatory.');
          return;
        }
        if (!billingAddress) {
          alert('Validation Failure: For B2B Invoices, Billing Address is strictly mandatory.');
          return;
        }
      } else if (invoiceType === 'B2C') {
        if (totalAmount > 50000 && !billingAddress) {
          alert('Validation Failure: For B2C Invoices crossing ₹50,000, Billing Address is legally mandatory.');
          return;
        }
      } else if (invoiceType === 'Export') {
        if (!billingAddress || !shippingAddress) {
          alert('Validation Failure: For Export Invoices, both Billing and Shipping Addresses are strictly mandatory.');
          return;
        }
        if (currency === 'INR') {
          alert('Validation Warning: Export transactions typically use foreign currencies. Please verify customer settings.');
        }
      }

      if (selectedClient && selectedClient.credit_limit > 0) {
        if (totalAmount > selectedClient.credit_limit) {
          const confirmSave = window.confirm(
            `CREDIT LIMIT WARNING!\nThis invoice value (${docMoney(totalAmount)}) pushes the customer beyond their defined Credit Limit of ${formatDocumentMoney(selectedClient.credit_limit, currency)}.\nDo you want to override and save?`
          );
          if (!confirmSave) return;
        }
      }

      const invoicePayload = {
        invoice_number: invoiceNumberInput,
        invoice_type: invoiceType,
        customer_id: parseInt(selectedCustomerId, 10),
        customer_name: selectedClient ? selectedClient.name : 'Unknown Client',
        issue_date: dateOnly(issueDate),
        due_date: dateOnly(dueDate) || null,
        po_number: poNumber.trim() || null,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        place_of_supply: placeOfSupply,
        export_country: isExportPlaceOfSupply(placeOfSupply) ? exportCountry.trim() : null,
        export_treatment: isExportPlaceOfSupply(placeOfSupply) ? exportTreatment : null,
        print_place_of_supply_on_pdf: printPlaceOfSupplyOnPdf,
        currency: currency || 'INR',
        conversion_rate: currency === 'INR' ? 1 : (parseFloat(conversionRate) || 1),
        gstin: clientTaxId,
        subtotal,
        discount: discountValue,
        tax_amount: taxAmount,
        cgst,
        sgst,
        igst,
        payable_tax: payableTax,
        total_amount: totalAmount,
        status: 'Unpaid',
      };

      const linePayload = lineItems;

      let advanceRows = null;
      if (!editingInvoiceId && customerAvailableAdvances.length > 0 && applyAdvanceOnInvoice) {
        const selected = invoiceAdvanceRows.filter(
          (row) => row.selected && toAmount(row.adjustment_amount) > 0.009
        );
        if (!selected.length) {
          alert(
            'Select at least one advance and enter an adjustment amount, or choose not to apply advance.'
          );
          return;
        }
        let pending = toAmount(totalAmount);
        for (const row of selected) {
          const amt = toAmount(row.adjustment_amount);
          const rec = receipts.find((r) => sameId(r.id, row.advance_receipt_id));
          const avail = advanceAvailableBalance(rec, advanceAdjustments);
          const cap = Math.min(avail, pending);
          if (amt > cap + 0.02) {
            alert(`Adjustment for ${row.advance_reference} cannot exceed ${formatDocumentMoney(cap, currency)}.`);
            return;
          }
          pending = Math.max(0, pending - amt);
        }
        advanceRows = selected.map((row) => ({
          advance_receipt_id: row.advance_receipt_id,
          adjustment_amount: toAmount(row.adjustment_amount),
        }));
      }

      setInvoiceSaving(true);
      if (editingInvoiceId) {
        await updateInvoice(editingInvoiceId, invoicePayload, linePayload);
      } else {
        await createInvoice(invoicePayload, linePayload, advanceRows);
      }
      resetInvoiceForm();
    } catch (err) {
      showApiError('Saving sales invoice', err);
    } finally {
      setInvoiceSaving(false);
    }
  };

  const handleDownloadInvoices = (format = 'csv') => {
    let csvContent = "Invoice No,Customer,GSTIN,Place of Supply,Subtotal (₹),CGST (₹),SGST (₹),IGST (₹),Total Amount (₹),Status\n";
    filteredRegistryInvoices.forEach((inv) => {
      const b = bifurcateStoredTax(inv, inv.place_of_supply, registeredState);
      csvContent += `"${inv.invoice_number}","${inv.customer_name}","${inv.gstin}","${inv.place_of_supply}",${toAmount(inv.subtotal).toFixed(2)},${b.cgst.toFixed(2)},${b.sgst.toFixed(2)},${b.igst.toFixed(2)},${toAmount(inv.total_amount).toFixed(2)},"${inv.status}"\n`;
    });
    
    const reportType = "sales_invoice_registry";
    if (format === 'csv') {
      const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `vouchex_${reportType}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'SALES INVOICES', `vouchex_${reportType}.xls`);
    }
    
    addConsoleLog('event', `GET /api/invoices/download?format=${format}`, `Exported Sales Invoice Registry as ${format.toUpperCase()} spreadsheet.`);
  };

  return (
    <div>
      {!showAddForm && (
        <div className="table-header-row">
          <h3>Sales Registry</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingInvoiceId(null);
                dueDateUserEditedRef.current = false;
                invoiceNumberUserEditedRef.current = false;
                lastInvoiceAutoYearRef.current = (issueDate || '').slice(0, 4);
                setInvoiceNumberInput(
                  nextDocumentNumber('INV', issueDate.slice(0, 4), invoices.map((i) => i.invoice_number))
                );
                setShowAddForm(true);
              }}
            >
              Raise New Invoice
            </button>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => handleDownloadInvoices('csv')}
            >
              <Download size={14} /> Export CSV 📥
            </button>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => handleDownloadInvoices('excel')}
            >
              <FileSpreadsheet size={14} /> Export Excel 📊
            </button>
          </div>
        </div>
      )}

      <InlineCustomerModal
        open={showInlineCustomer}
        onClose={() => setShowInlineCustomer(false)}
        onCreated={(c) => { setSelectedCustomerId(String(c.id)); setShowInlineCustomer(false); }}
      />
      <InlineInventoryModal
        open={showInlineInventory}
        onClose={() => setShowInlineInventory(false)}
        onCreated={() => setShowInlineInventory(false)}
      />

      {showAddForm ? (
        <form ref={invoiceFormRef} onSubmit={handleSaveInvoice} noValidate className="master-form billing-sheet billing-sheet--wonder">
          <div className="billing-sheet__toolbar">
            <div className="billing-sheet__heading">
              <span className="billing-sheet__mark" aria-hidden="true" />
              <div>
                <p className="billing-sheet__kicker">Sales ledger</p>
                <h3 className="billing-sheet__title">
                  {editingInvoiceId ? 'Edit invoice' : 'New sales invoice'}
                </h3>
              </div>
              <span className="billing-sheet__doc-badge" title="Invoice number">
                {invoiceNumberInput || '—'}
              </span>
            </div>
            <div className="billing-sheet__toolbar-actions">
              <input
                type="file"
                ref={invoiceFileRef}
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedInvoiceFile(e.target.files[0]);
                    setScanError('');
                  }
                }}
              />
              <button
                type="button"
                className={`billing-sheet__scan-btn${uploadedInvoiceFile ? ' is-ready' : ''}`}
                onClick={() => (uploadedInvoiceFile && !isScanning ? triggerInvoiceScan() : invoiceFileRef.current.click())}
                title={uploadedInvoiceFile ? uploadedInvoiceFile.name : 'Upload invoice to auto-fill'}
              >
                <Sparkles size={13} />
                {isScanning ? `${scanProgress}%` : uploadedInvoiceFile ? 'Run OCR' : 'AI Scan'}
              </button>
              {uploadedInvoiceFile && !isScanning && (
                <button
                  type="button"
                  className="billing-sheet__scan-clear"
                  onClick={() => { setUploadedInvoiceFile(null); setScanError(''); if (invoiceFileRef.current) invoiceFileRef.current.value = ''; }}
                >
                  ×
                </button>
              )}
              <button type="button" className="btn-secondary billing-sheet__back" onClick={resetInvoiceForm}>
                ← Registry
              </button>
            </div>
          </div>
          {isScanning && (
            <div className="billing-sheet__scan-progress">
              <div className="scanner-progress-bar">
                <div className="scanner-progress-fill" style={{ width: `${scanProgress}%` }}></div>
              </div>
              <pre className="scanner-ocr-text"><code>{ocrFeed}</code></pre>
            </div>
          )}
          {scanError && <span className="billing-sheet__scan-error">{scanError}</span>}

          <div className="billing-sheet__ledger-head">
            <div className="billing-sheet__row billing-sheet__row--id">
              <div className="form-group">
                <label>Category</label>
                <select className="form-input" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                  <option value="B2B">B2B</option>
                  <option value="B2C">B2C</option>
                  <option value="Export">Export</option>
                  <option value="Exempt">Exempt / Nil</option>
                </select>
              </div>
              <div className="form-group">
                <label>Invoice No.</label>
                <input
                  type="text"
                  className="form-input"
                  value={invoiceNumberInput}
                  onChange={(e) => {
                    invoiceNumberUserEditedRef.current = true;
                    setInvoiceNumberInput(e.target.value);
                  }}
                />
              </div>
              <div className="form-group billing-sheet__customer-group">
                <Req>Customer</Req>
                <div className="billing-sheet__customer">
                  <select
                    className="form-input"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Choose client…</option>
                    {customers.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.name} ({c.gst_type})</option>
                    ))}
                  </select>
                  <button type="button" className="btn-secondary-sm" onClick={() => setShowInlineCustomer(true)}>+ New</button>
                </div>
              </div>
              <div className="form-group">
                <Req>Issue</Req>
                <input type="date" className="form-input" value={dateOnly(issueDate)} onChange={(e) => setIssueDate(dateOnly(e.target.value))} />
              </div>
              <div className="form-group">
                <Opt>Due</Opt>
                <input
                  type="date"
                  className="form-input"
                  value={dateOnly(dueDate)}
                  onChange={(e) => {
                    dueDateUserEditedRef.current = true;
                    setDueDate(dateOnly(e.target.value));
                  }}
                />
              </div>
              <div className="form-group">
                <Opt>PO</Opt>
                <input type="text" className="form-input" placeholder="PO-XXXX" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
              </div>
            </div>

            <div className="billing-sheet__row billing-sheet__row--meta">
              <div className="billing-sheet__pos">
                <PlaceOfSupplyCountrySelect
                  placeOfSupply={placeOfSupply}
                  exportCountry={exportCountry}
                  onPlaceChange={setPlaceOfSupply}
                  onExportCountryChange={setExportCountry}
                  onSuggestCurrency={setCurrency}
                />
              </div>
              <CurrencySelect label="Currency" value={currency} onChange={setCurrency} required />
              <div className="form-group">
                {customers.find((c) => sameId(c.id, selectedCustomerId)) && isGstRegisteredType(customers.find((c) => sameId(c.id, selectedCustomerId)).gst_type) ? (
                  <Req>GSTIN</Req>
                ) : (
                  <Opt>GSTIN</Opt>
                )}
                <input
                  type="text"
                  className="form-input"
                  placeholder="24AAAAC1234F1Z8"
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value)}
                />
              </div>
              <div className="form-group billing-sheet__check-wrap">
                <label className="billing-sheet__check">
                  <input
                    type="checkbox"
                    checked={printPlaceOfSupplyOnPdf}
                    onChange={(e) => setPrintPlaceOfSupplyOnPdf(e.target.checked)}
                  />
                  Print POS
                </label>
              </div>
              <div className="form-group billing-sheet__addr-field">
                <label>Billing</label>
                <input
                  type="text"
                  className="form-input"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Street, city, state, PIN"
                />
              </div>
              <div className="form-group billing-sheet__addr-field">
                <label>Shipping</label>
                <input
                  type="text"
                  className="form-input"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Street, city, state, PIN"
                />
              </div>
            </div>

            {currency !== 'INR' && (
              <div className="billing-sheet__row billing-sheet__row--2">
                <div className="form-group">
                  {fcConversionRequired ? <Req>Conversion rate to INR</Req> : <Opt>Conversion rate to INR</Opt>}
                  <input
                    type="number"
                    min="0"
                    step="0.000001"
                    className="form-input"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(e.target.value)}
                    placeholder="e.g. 83.50"
                  />
                  <RbiReferenceRateHint currency={currency} date={issueDate} onUseRate={setConversionRate} />
                </div>
              </div>
            )}

            {isExportPlaceOfSupply(placeOfSupply) && (
              <div className="billing-sheet__row billing-sheet__row--2">
                <div className="form-group">
                  <Req>Export GST treatment</Req>
                  <select className="form-input" value={exportTreatment} onChange={(e) => setExportTreatment(e.target.value)}>
                    <option value="">Select LUT / Bond / IGST…</option>
                    {EXPORT_TREATMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {exportCountry && (
                  <div className="form-group">
                    <label>Destination</label>
                    <input type="text" className="form-input" value={exportCountry} readOnly />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="billing-sheet__workspace">
            <div className="billing-sheet__items-pane">
              <div className="billing-sheet__items-head">
                <h4 className="billing-sheet__section">Line items</h4>
                <div className="billing-sheet__items-tools">
                  <button type="button" className="btn-secondary-sm" onClick={() => setShowInlineInventory(true)}>+ Item master</button>
                  <button type="button" className="btn-secondary-sm billing-sheet__add-inline" onClick={addLineItem}>
                    <Plus size={13} /> Add row
                  </button>
                </div>
              </div>
              <div className="invoice-items-scroll">
                <table className="invoice-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Description</th>
                      <th>HSN/SAC</th>
                      <th>Qty</th>
                      <th>Rate ({curSym})</th>
                      <th>GST %</th>
                      <th>Supply</th>
                      <th>Tax ({curSym})</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <LineItemTaxRow
                        key={idx}
                        line={item}
                        index={idx}
                        onChange={handleLineItemChange}
                        onRemove={removeLineItem}
                        canRemove={lineItems.length > 1}
                        placeOfSupply={placeOfSupply}
                        companyState={registeredState}
                        inventory={inventory}
                        documentCurrency={currency}
                        dense
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="billing-sheet__settle">
              <p className="billing-sheet__settle-label">Settlement</p>
              <div className="billing-sheet__settle-total">
                <span>Total due</span>
                <strong style={{ color: 'var(--accent-teal)' }}>{docMoney(totalAmount)}</strong>
                <em>{currency}</em>
              </div>
              <div className="invoice-calculations billing-sheet__totals">
                <div className="calc-row">
                  <span>Subtotal</span>
                  <span className="calc-val">{docMoney(subtotal)}</span>
                </div>
                <div className="calc-row">
                  <span>Discount</span>
                  <AmountInput
                    className="form-input"
                    style={{ width: '84px', padding: '3px 5px', textAlign: 'right' }}
                    value={discountValue}
                    onChange={setDiscountValue}
                  />
                </div>
                <div className="calc-row">
                  <span>CGST</span>
                  <span className="calc-val">{docMoney(cgst)}</span>
                </div>
                <div className="calc-row">
                  <span>SGST</span>
                  <span className="calc-val">{docMoney(sgst)}</span>
                </div>
                <div className="calc-row">
                  <span>IGST</span>
                  <span className="calc-val" style={{ color: 'var(--accent-amber)' }}>{docMoney(igst)}</span>
                </div>
                <div className="calc-row calc-row--muted">
                  <span>Payable GST</span>
                  <span>{docMoney(payableTax)}</span>
                </div>
              </div>
              {!editingInvoiceId && (
                <InvoiceAdvanceAdjustmentSection
                  availableAdvances={customerAvailableAdvances}
                  applyAdvance={applyAdvanceOnInvoice}
                  onApplyAdvanceChange={setApplyAdvanceOnInvoice}
                  rows={invoiceAdvanceRows}
                  onRowsChange={setInvoiceAdvanceRows}
                  invoiceAmount={totalAmount}
                  currency={currency}
                />
              )}
              <div className="billing-sheet__actions">
                <button type="button" className="btn-secondary" onClick={resetInvoiceForm}>Cancel</button>
                <button
                  type="button"
                  className={`btn-primary billing-sheet__generate${invoiceSaving ? ' btn-submitting' : ''}`}
                  data-no-btn-spinner
                  disabled={invoiceSaving}
                  onClick={handleSaveInvoice}
                >
                  {editingInvoiceId ? 'Update' : 'Generate'}
                </button>
              </div>
            </aside>
          </div>
        </form>
      ) : (
        <>
        <MobileFilterShell
          activeCount={countActiveFilters([filterStartDate, filterEndDate, registrySearch])}
          title="Invoice filters"
        >
        <div className="registry-filter-bar form-grid-4" style={{ marginTop: 16, marginBottom: 12 }}>
          <div className="form-group">
            <Opt>From Date</Opt>
            <input type="date" className="form-input" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <Opt>To Date</Opt>
            <input type="date" className="form-input" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <Opt>Search registry</Opt>
            <input type="text" className="form-input" placeholder="Invoice no, customer..." value={registrySearch} onChange={(e) => setRegistrySearch(e.target.value)} />
          </div>
        </div>
        </MobileFilterShell>
        <div className="premium-table-wrapper desktop-only sales-ledger-wrap" style={{ marginTop: '20px' }}>
          <table className="premium-table sales-ledger">
            <thead>
              <tr>
                <ExcelColumnFilter
                  label="Document"
                  columnKey="document"
                  className="sales-ledger__col-doc"
                  values={excelColumnValues.document}
                  sort={excelSort}
                  onSort={setExcelSort}
                  selected={excelFilters.document || null}
                  onFilter={(s) => setExcelFilterFor('document', s)}
                />
                <ExcelColumnFilter
                  label="Client"
                  columnKey="client"
                  className="sales-ledger__col-client"
                  values={excelColumnValues.client}
                  sort={excelSort}
                  onSort={setExcelSort}
                  selected={excelFilters.client || null}
                  onFilter={(s) => setExcelFilterFor('client', s)}
                />
                <ExcelColumnFilter
                  label="Settlement"
                  columnKey="settlement"
                  className="sales-ledger__col-money"
                  values={excelColumnValues.settlement}
                  sort={excelSort}
                  onSort={setExcelSort}
                  selected={excelFilters.settlement || null}
                  onFilter={(s) => setExcelFilterFor('settlement', s)}
                  valueType="number"
                />
                <ExcelColumnFilter
                  label="Tax"
                  columnKey="tax"
                  className="sales-ledger__col-tax"
                  title="CGST / SGST / IGST"
                  values={excelColumnValues.tax}
                  sort={excelSort}
                  onSort={setExcelSort}
                  selected={excelFilters.tax || null}
                  onFilter={(s) => setExcelFilterFor('tax', s)}
                  valueType="number"
                />
                <ExcelColumnFilter
                  label="Status"
                  columnKey="status"
                  className="sales-ledger__col-status"
                  values={excelColumnValues.status}
                  sort={excelSort}
                  onSort={setExcelSort}
                  selected={excelFilters.status || null}
                  onFilter={(s) => setExcelFilterFor('status', s)}
                />
                {(einvoiceEnabled || ewaybillEnabled) && <th className="sales-ledger__col-gst">GST</th>}
                <th className="sales-ledger__col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistryInvoices.map((inv) => {
                const taxB = invoiceStoredTax(inv, inv.place_of_supply, registeredState);
                const invCur = inv.currency || 'INR';
                const invGross = invoiceEffectiveTotal(inv, creditNotes);
                const invAdvanceAdj = invoiceAdvanceAdjustedTotal(inv.id, advanceAdjustments);
                const invNetRecv = Math.max(0, invGross - invAdvanceAdj);
                const invCashRec = invoiceSettledAmount(receipts, inv.id);
                const invOutstanding = invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments);
                return (
                <tr key={inv.id}>
                  <td className="sales-ledger__col-doc">
                    <div className="sales-ledger__inv">{inv.invoice_number}</div>
                    <div className="sales-ledger__meta">
                      <span className="sales-ledger__type">{inv.invoice_type}</span>
                      <span>{formatDateDDMMYYYY(inv.issue_date)}</span>
                      {inv.due_date ? <span>Due {formatDateDDMMYYYY(inv.due_date)}</span> : null}
                    </div>
                  </td>
                  <td className="sales-ledger__col-client">
                    <div className="sales-ledger__client" title={inv.customer_name}>{inv.customer_name}</div>
                    <div className="sales-ledger__meta">
                      {inv.place_of_supply ? <span>{inv.place_of_supply}</span> : null}
                      <span>{invCur}</span>
                    </div>
                  </td>
                  <td className="sales-ledger__col-money">
                    <div className="sales-ledger__settle">
                      <div className="sales-ledger__settle-main">
                        <div className="sales-ledger__settle-item">
                          <span className="sales-ledger__lbl">Total</span>
                          <strong>{formatDocumentMoney(invGross, invCur)}</strong>
                        </div>
                        <div className="sales-ledger__settle-item">
                          <span className="sales-ledger__lbl">Outstanding</span>
                          <strong className={invOutstanding > 0 ? 'is-due' : 'is-clear'}>
                            {formatDocumentMoney(invOutstanding, invCur)}
                          </strong>
                        </div>
                      </div>
                      <div className="sales-ledger__settle-sub">
                        <span>Adv {formatDocumentMoney(invAdvanceAdj, invCur)}</span>
                        <span className="sales-ledger__dot">·</span>
                        <span>Recd {formatDocumentMoney(invCashRec, invCur)}</span>
                        <span className="sales-ledger__dot">·</span>
                        <span>Net {formatDocumentMoney(invNetRecv, invCur)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="sales-ledger__col-tax">
                    <div className="sales-ledger__tax">
                      <div><span>CGST</span><span>{formatDocumentMoney(taxB.cgst, invCur)}</span></div>
                      <div><span>SGST</span><span>{formatDocumentMoney(taxB.sgst, invCur)}</span></div>
                      <div><span>IGST</span><span>{formatDocumentMoney(taxB.igst, invCur)}</span></div>
                    </div>
                  </td>
                  <td className="sales-ledger__col-status">
                    <span className={`status-badge ${inv.status.toLowerCase().replace(' ', '-')}`}>
                      {inv.status}
                    </span>
                  </td>
                  {(einvoiceEnabled || ewaybillEnabled) && (
                    <td className="sales-ledger__col-gst">
                      {einvoiceEnabled && (
                        <div className="sales-ledger__gst-line">
                          IRN{' '}
                          {inv.einvoice_status === 'generated' && inv.irn
                            ? <span title={inv.irn}>{inv.irn.slice(0, 10)}…</span>
                            : <span className="gst-badge gst-badge--muted">{inv.einvoice_status || 'none'}</span>}
                        </div>
                      )}
                      {ewaybillEnabled && (
                        <div className="sales-ledger__gst-line">
                          EWB {ewayForInvoice(inv.id)?.ewb_no || '—'}
                        </div>
                      )}
                    </td>
                  )}
                  <td className="sales-ledger__col-actions registry-actions-cell">
                    <RegistryRowActions
                      onEdit={() => openEditInvoice(inv)}
                      onView={() => setSelectedInvoiceForPDF(inv)}
                      share={getInvoiceShare(inv)}
                      deleteLabel={`invoice ${inv.invoice_number}`}
                      onDelete={() => deleteInvoice(inv.id)}
                      deleteDisabled={isFinancialYearLocked}
                    />
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        <MobileRegistryCards
          items={filteredRegistryInvoices}
          emptyLabel="No invoices match your filters."
          renderCard={(inv) => {
            const taxB = invoiceStoredTax(inv, inv.place_of_supply, registeredState);
            const invCur = inv.currency || 'INR';
            return (
              <>
                <div className="mobile-registry-card__head">
                  <div>
                    <div className="mobile-registry-card__title">{inv.invoice_number}</div>
                    <div className="mobile-registry-card__meta">{inv.customer_name}</div>
                  </div>
                  <div className="mobile-registry-card__amount">{formatDocumentMoney(inv.total_amount, invCur)}</div>
                </div>
                <div className="mobile-registry-card__row">
                  <span>Date</span>
                  <span>{formatDateDDMMYYYY(inv.issue_date)}</span>
                </div>
                <div className="mobile-registry-card__row">
                  <span>Status</span>
                  <span className={`status-badge ${inv.status.toLowerCase().replace(' ', '-')}`}>{inv.status}</span>
                </div>
                <MobileCardExpand label="More details">
                  <div className="mobile-registry-card__row"><span>Type</span><span>{inv.invoice_type}</span></div>
                  <div className="mobile-registry-card__row"><span>Due</span><span>{formatDateDDMMYYYY(inv.due_date)}</span></div>
                </MobileCardExpand>
                <div className="mobile-registry-card__actions">
                  <MobileRegistryCardActions
                    onView={() => setSelectedInvoiceForPDF(inv)}
                    viewTitle="View invoice PDF"
                    onEdit={() => openEditInvoice(inv)}
                    share={getInvoiceShare(inv)}
                    deleteLabel={`invoice ${inv.invoice_number}`}
                    onDelete={() => deleteInvoice(inv.id)}
                    deleteDisabled={isFinancialYearLocked}
                    moreItems={[
                      einvoiceEnabled && inv.einvoice_status !== 'generated' && inv.status !== 'Cancelled' && {
                        label: 'E-Invoice',
                        onClick: () => setEinvoiceModalInvoice(inv),
                      },
                      ewaybillEnabled && !ewayForInvoice(inv.id) && inv.status !== 'Cancelled' && {
                        label: 'E-Way Bill',
                        onClick: () => setEwayModalInvoice(inv),
                      },
                    ].filter(Boolean)}
                  />
                </div>
              </>
            );
          }}
        />
        </>
      )}

      <EinvoiceGenerateModal
        open={!!einvoiceModalInvoice}
        invoice={einvoiceModalInvoice}
        onClose={() => setEinvoiceModalInvoice(null)}
        generateEinvoice={generateEinvoice}
      />
      <EwayBillGenerateModal
        open={!!ewayModalInvoice}
        invoice={ewayModalInvoice}
        onClose={() => setEwayModalInvoice(null)}
        generateEwayBill={generateEwayBill}
      />

      {/* HIGH-FIDELITY PRINT PREVIEW MODAL */}
      {selectedInvoiceForPDF && (() => {
        const inv = selectedInvoiceForPDF;
        const pdfLineItems = invoiceItems.filter((item) => sameId(item.invoice_id, inv.id));
        const showQty = invoicePdfShowsQtyColumn(pdfLineItems, inventory);
        const pdfCur = inv.currency || 'INR';
        const pdfSym = getCurrencySymbol(pdfCur);
        const pdfFmt = (v) => formatPdfDocument(v, pdfCur);
        const showPosOnPdf = inv.print_place_of_supply_on_pdf !== false;
        const pdfTax = invoiceStoredTax(inv, inv.place_of_supply, registeredState);
        const invGross = invoiceEffectiveTotal(inv, creditNotes);
        const pdfAdvanceAdj = invoiceAdvanceAdjustedTotal(inv.id, advanceAdjustments);
        const pdfNetRecv = Math.max(0, invGross - pdfAdvanceAdj);
        const pdfCashRec = invoiceSettledAmount(receipts, inv.id);
        const pdfOutstanding = invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments);
        const itemsAmountTotal = pdfLineItems.reduce(
          (sum, item) => sum + invoiceLineAmounts(item).subtotal,
          0
        );
        const pdfBillingAddress = formatPartyAddressForDisplay(inv.billing_address);

        return (
        <PdfPrintModal
          onClose={() => setSelectedInvoiceForPDF(null)}
          screenTitle="Sales Invoice Document"
          maxWidth={960}
          downloadFileName={buildInvoicePdfFileName(inv, {
            amount: invoiceEffectiveTotal(inv, creditNotes),
          })}
          toolbarExtra={
            <DocumentShareToolbar
              share={buildInvoiceSharePayload(inv, {
                company: companyDetails,
                customer: customers.find((c) => sameId(c.id, inv.customer_id)),
                lineItems: pdfLineItems,
                fromEmail: currentUser?.email,
              })}
            />
          }
        >
          <div className="pdf-print-page pdf-invoice-page">
            <div className="pdf-invoice-title-bar">
              <h1 className="pdf-document-title">Tax Invoice</h1>
            </div>

            <PdfDocumentHeader
              company={companyDetails}
              rightContent={
                <div className="pdf-invoice-meta-block">
                  <p className="pdf-invoice-meta-number">Invoice No: {inv.invoice_number}</p>
                  <p className="pdf-invoice-meta-line"><strong>Issue Date:</strong> {formatDateDDMMYYYY(inv.issue_date)}</p>
                  <PdfOptionalLine
                    label="Due Date:"
                    value={formatDateDDMMYYYY(inv.due_date)}
                    style={{ fontSize: '12px', margin: '0 0 2px 0' }}
                  />
                  {inv.einvoice_status === 'generated' && inv.irn && (
                    <p className="pdf-invoice-meta-irn">
                      <strong>IRN:</strong> {inv.irn}
                    </p>
                  )}
                </div>
              }
            />

            <div className="pdf-invoice-parties">
              <div className="pdf-invoice-party">
                <h4 className="pdf-invoice-party-label">Billed To</h4>
                <strong className="pdf-invoice-party-name">{inv.customer_name}</strong>
                {pdfBillingAddress ? (
                  <p className="pdf-invoice-party-address">{pdfBillingAddress}</p>
                ) : null}
                {!isBlankFieldValue(inv.gstin) && (
                  <p className="pdf-invoice-party-gstin">GSTIN: {inv.gstin}</p>
                )}
              </div>
              <div className="pdf-invoice-party pdf-invoice-party--meta">
                <PdfOptionalLine
                  label="PO Reference:"
                  value={inv.po_number}
                  style={{ fontSize: '12px', margin: '0 0 4px 0' }}
                />
                {showPosOnPdf && (
                  <p className="pdf-invoice-meta-line"><strong>Place of Supply:</strong> {inv.place_of_supply}</p>
                )}
                {inv.export_country && (
                  <p className="pdf-invoice-meta-line"><strong>Destination:</strong> {inv.export_country}</p>
                )}
                <p className="pdf-invoice-meta-line"><strong>Currency:</strong> {formatCurrencyLabel(inv.currency || 'INR')}</p>
              </div>
            </div>

            <table className="pdf-meta-table pdf-invoice-items-table">
              <thead>
                <tr>
                  <th className="pdf-col-desc">Item Description</th>
                  <th>HSN/SAC</th>
                  {showQty && <th className="pdf-col-num">Qty</th>}
                  <th className="pdf-col-num">Rate ({pdfSym})</th>
                  <th className="pdf-col-num">Amount ({pdfSym})</th>
                </tr>
              </thead>
              <tbody>
                {pdfLineItems.length === 0 ? (
                  <tr>
                    <td colSpan={showQty ? 5 : 4} className="pdf-invoice-empty-items">
                      No line items found for this invoice.
                    </td>
                  </tr>
                ) : (
                  <>
                    {pdfLineItems.map((item, idx) => {
                      const { subtotal } = invoiceLineAmounts(item);
                      const lineForQty = { product_id: item.product_id, quantity: item.quantity };
                      const showLineQty = lineHasDisplayQuantity(lineForQty, inventory);
                      return (
                        <tr key={idx}>
                          <td>{formatItemDisplay(item.description, item.item_detail)}</td>
                          <td>{item.hsn_sac}</td>
                          {showQty && (
                            <td className="pdf-col-num">
                              {showLineQty
                                ? formatINR(item.quantity, Number(item.quantity) % 1 === 0 ? 0 : 2)
                                : ''}
                            </td>
                          )}
                          <td className="pdf-col-num">{pdfFmt(item.unit_price)}</td>
                          <td className="pdf-col-num">{pdfFmt(subtotal)}</td>
                        </tr>
                      );
                    })}
                    <tr className="pdf-items-total-row">
                      <td colSpan={showQty ? 4 : 3} className="pdf-items-total-spacer" />
                      <td className="pdf-col-num pdf-items-total-amount">
                        {pdfFmt(itemsAmountTotal)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            <div className="pdf-invoice-footer-grid">
              <div className="pdf-payment-box">
                <h4 className="pdf-payment-box-title">Payment Details</h4>
                <PdfOptionalLine
                  label="A/C Holder:"
                  value={companyDetails.bank_account_holder}
                  style={{ margin: '3px 0' }}
                />
                <PdfOptionalLine
                  label="Account No.:"
                  value={companyDetails.bank_account}
                  style={{ margin: '3px 0' }}
                />
                <PdfOptionalLine
                  label="Bank Name:"
                  value={companyDetails.bank_name}
                  style={{ margin: '3px 0' }}
                />
                <PdfOptionalLine
                  label="IFSC:"
                  value={companyDetails.bank_ifsc}
                  style={{ margin: '3px 0' }}
                />
                <PdfOptionalLine
                  label="Branch:"
                  value={companyDetails.bank_branch}
                  style={{ margin: '3px 0' }}
                />
                {!isBlankFieldValue(companyDetails.upi_id) && (
                  <p className="pdf-upi-line">
                    <strong>UPI ID:</strong> <span>{companyDetails.upi_id}</span>
                  </p>
                )}
              </div>
              <div className="pdf-totals-box">
                <div className="pdf-totals-row">
                  <span>Subtotal</span>
                  <span>{pdfFmt(inv.subtotal)}</span>
                </div>
                {inv.discount > 0 && (
                  <div className="pdf-totals-row pdf-totals-row--discount">
                    <span>Discounts</span>
                    <span>-{pdfFmt(inv.discount)}</span>
                  </div>
                )}
                <div className="pdf-totals-row"><span>CGST</span><span>{pdfFmt(pdfTax.cgst)}</span></div>
                <div className="pdf-totals-row"><span>SGST</span><span>{pdfFmt(pdfTax.sgst)}</span></div>
                <div className="pdf-totals-row"><span>IGST</span><span>{pdfFmt(pdfTax.igst)}</span></div>
                <div className="pdf-grand-total pdf-totals-grand">
                  <span>Grand Total ({pdfCur})</span>
                  <span>{pdfFmt(inv.total_amount)}</span>
                </div>
                {(pdfAdvanceAdj > 0.009 || pdfCashRec > 0.009) && (
                  <>
                    <div className="pdf-totals-row pdf-totals-row--credit">
                      <span>Advance Adjusted</span>
                      <span>-{pdfFmt(pdfAdvanceAdj)}</span>
                    </div>
                    <div className="pdf-totals-row pdf-totals-row--strong">
                      <span>Net Receivable</span>
                      <span>{pdfFmt(pdfNetRecv)}</span>
                    </div>
                    <div className="pdf-totals-row">
                      <span>Receipt Received</span>
                      <span>{pdfFmt(pdfCashRec)}</span>
                    </div>
                    <div className="pdf-totals-row pdf-totals-row--outstanding">
                      <span>Outstanding Balance</span>
                      <span>{pdfFmt(pdfOutstanding)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <p className="pdf-invoice-thanks">Thank you for your business.</p>
          </div>
        </PdfPrintModal>
        );
      })()}
    </div>
  );
}

// --- SUB-TAB: CUSTOMER MASTER ---
function CustomerMasterSubTab() {
  const { customers, createCustomer, updateCustomer, deleteCustomer, isFinancialYearLocked, invoices, receipts, companyDetails, creditNotes, advanceAdjustments } = useSimulator();
  const registeredState = resolveRegisteredState(companyDetails);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);
  const [selectedLedgerPDF, setSelectedLedgerPDF] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const getCustomerLedger = (cust) => buildCustomerLedger(cust, invoices, receipts, creditNotes, advanceAdjustments);

  const handleDownloadLedgerReport = (party, _isCustomer = true, format = 'csv') => {
    if (!party) return;
    const ledgerData = getCustomerLedger(party);
    let csvContent = `Date,Description,Reference No.,Debit (Dr) (₹),Credit (Cr) (₹),Running Balance (₹)\n`;
    ledgerData.forEach((entry) => {
      csvContent += `"${entry.date}","${entry.description}","${entry.reference}",${entry.debit.toFixed(2)},${entry.credit.toFixed(2)},${entry.running_balance.toFixed(2)}\n`;
    });
    const reportType = `customer_${party.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ledger`;
    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${reportType}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'LEDGER STATEMENT', `vouchex_${reportType}.xls`);
    }
  };

  // Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Wholesaler');

  // Tax/GST
  const [gstType, setGstType] = useState('Registered - Regular');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  // Address
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('Gujarat');
  const [billingPincode, setBillingPincode] = useState('');
  const [billingCountry, setBillingCountry] = useState('India');
  const [shippingSame, setShippingSame] = useState(true);
  
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('Gujarat');
  const [shippingPincode, setShippingPincode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('India');

  // Accounting parameters
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [openingBalanceDate, setOpeningBalanceDate] = useState('2026-04-01');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [creditLimit, setCreditLimit] = useState('0.00');

  usePortalFormIntent('customer-master', () => {
    setEditingCustomerId(null);
    setShowAddForm(true);
  });

  useMobileBackHandler(showAddForm, () => {
    setShowAddForm(false);
    setEditingCustomerId(null);
    return true;
  });

  useMobileBackHandler(!!selectedLedgerCustomer, () => {
    setSelectedLedgerCustomer(null);
    return true;
  });

  // GSTIN 15 character extraction and validate
  const handleGstinChange = (val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setGstin(clean);
    
    // Auto-extract PAN from GSTIN (chars index 2 to 12)
    if (clean.length >= 12) {
      const panPart = clean.substring(2, 12);
      setPan(panPart);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (customerSaving) return;
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }

    // Validations
    if (!name) { alert('Customer legal entity name is strictly mandatory.'); return; }
    if (!gstType) { alert('GST registration classification dropdown is mandatory.'); return; }
    if (!billingAddress || !billingCity || !billingState || !billingPincode) {
      alert('Billing address suite details (Street, City, State, Pincode) are strictly mandatory.');
      return;
    }
    if (!isValidPaymentTerms(paymentTerms)) {
      alert('Please select payment terms, or enter whole number of days for custom Net terms (e.g. 0, 7, 30 — no decimals).');
      return;
    }

    const isGstRegistered = ['Registered - Regular', 'Registered - Composition', 'SEZ (Special Economic Zone)'].includes(gstType);
    if (isGstRegistered) {
      if (!gstin || gstin.length !== 15) {
        alert('Validation Failure: Tax registered customer type selected. GSTIN must be exactly 15 alphanumeric characters long.');
        return;
      }
    }

    const payload = {
      name,
      contact_person: contactPerson,
      email,
      phone,
      category,
      gst_type: gstType,
      gstin: isGstRegistered ? gstin : 'NIL',
      pan: isGstRegistered ? pan : 'NIL',
      currency,
      billing_address: billingAddress,
      billing_city: billingCity,
      billing_state: billingState,
      billing_pincode: billingPincode,
      billing_country: billingCountry,
      shipping_same: shippingSame,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_state: shippingState,
      shipping_pincode: shippingPincode,
      shipping_country: shippingCountry,
      opening_balance: openingBalance,
      opening_balance_date: openingBalanceDate,
      payment_terms: paymentTerms,
      credit_limit: creditLimit,
    };

    setCustomerSaving(true);
    try {
      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, payload);
      } else {
        await createCustomer(payload);
      }
    } catch (err) {
      showApiError('Saving customer', err);
      setCustomerSaving(false);
      return;
    }
    setCustomerSaving(false);

    // Clear
    setShowAddForm(false);
    setEditingCustomerId(null);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setBillingAddress('');
    setBillingCity('');
    setBillingPincode('');
    setOpeningBalance('0.00');
    setCreditLimit('0.00');
    setGstin('');
    setPan('');
    setPaymentTerms('Due on Receipt');
  };

  const openEditCustomer = (c) => {
    setEditingCustomerId(c.id);
    setShowAddForm(true);
    setName(c.name || '');
    setContactPerson(c.contact_person || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setCategory(c.category || 'Wholesaler');
    setGstType(c.gst_type || 'Registered - Regular');
    setGstin(c.gstin === 'NIL' ? '' : c.gstin || '');
    setPan(c.pan === 'NIL' ? '' : c.pan || '');
    setCurrency(c.currency || 'INR');
    setBillingAddress(c.billing_address || '');
    setBillingCity(c.billing_city || '');
    setBillingState(c.billing_state || 'Gujarat');
    setBillingPincode(c.billing_pincode || '');
    setBillingCountry(c.billing_country || 'India');
    setShippingSame(c.shipping_same !== false);
    setShippingAddress(c.shipping_address || '');
    setShippingCity(c.shipping_city || '');
    setShippingState(c.shipping_state || 'Gujarat');
    setShippingPincode(c.shipping_pincode || '');
    setShippingCountry(c.shipping_country || 'India');
    setOpeningBalance(String(c.opening_balance ?? '0.00'));
    setOpeningBalanceDate(dateOnly(c.opening_balance_date) || '2026-04-01');
    setPaymentTerms(c.payment_terms || 'Due on Receipt');
    setCreditLimit(String(c.credit_limit ?? '0.00'));
  };

  const handleDeleteCustomer = async (c) => {
    if (!window.confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
    try {
      await deleteCustomer(c.id);
    } catch (err) {
      showApiError('Deleting customer', err);
    }
  };

  return (
    <div>
      <div className="table-header-row">
        <h3>Customer Master Database</h3>
        {!showAddForm && (
          <button className="btn-primary" onClick={() => { setEditingCustomerId(null); setShowAddForm(true); }}>
            Add Customer Profile
          </button>
        )}
      </div>

      {showAddForm ? (
        <form onSubmit={handleSaveCustomer} className="master-form" style={{ marginBottom: '30px' }}>
          
          {/* SECTION 1: BASIC INFORMATION */}
          <h4 className="form-section-title">{editingCustomerId ? 'Edit Customer Profile' : '1. Basic Information & Contact Details'}</h4>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Customer / Legal Entity Name*</label>
              <input type="text" className="form-input" placeholder="e.g. Reliance Industries Ltd" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Contact Person (B2B Point of Contact)</label>
              <input type="text" className="form-input" placeholder="e.g. Amit Shah" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Primary Email Address</label>
              <input type="email" className="form-input" placeholder="billing@client.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Mobile / Phone Number</label>
              <input type="text" className="form-input" placeholder="+91 XXXX-XXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <DynamicSelect
              optionKey="customer_categories"
              label="Customer Category Classification"
              value={category}
              onChange={setCategory}
              baseOptions={['Wholesaler', 'Retailer', 'VIP Account', 'Standard Corporate']}
              manualPlaceholder="Enter category manually…"
            />
          </div>

          {/* SECTION 2: LEGAL AND TAX */}
          <h4 className="form-section-title">2. Legal & Tax Compliance</h4>
          <div className="form-grid-4">
            <div className="form-group">
              <label>GST Registration Category Type*</label>
              <select className="form-input" value={gstType} onChange={(e) => setGstType(e.target.value)}>
                <option>Registered - Regular</option>
                <option>Registered - Composition</option>
                <option>Unregistered (Consumer/B2C)</option>
                <option>SEZ (Special Economic Zone)</option>
                <option>Overseas (Export)</option>
              </select>
            </div>
            <div className="form-group">
              <label>GSTIN Tax Registration ID</label>
              <input
                type="text"
                className="form-input"
                maxLength="15"
                placeholder="15 Character GSTIN"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                disabled={['Unregistered (Consumer/B2C)', 'Overseas (Export)'].includes(gstType)}
              />
            </div>
            <div className="form-group">
              <label>Permanent Account Number (PAN)</label>
              <input
                type="text"
                className="form-input"
                maxLength="10"
                placeholder="Auto-extracted from GSTIN"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
              />
            </div>
            <CurrencySelect
              label="Active Currency"
              value={currency}
              onChange={setCurrency}
              optionKey="customer_currencies"
            />
          </div>

          {/* SECTION 3: ADDRESS DETAILS */}
          <h4 className="form-section-title">3. Billing & Shipping Address Details</h4>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Billing Street Address*</label>
              <input type="text" className="form-input" placeholder="Office suite, building, street" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
            </div>
            <div className="form-group">
              <label>City*</label>
              <input type="text" className="form-input" placeholder="e.g. Mumbai" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
            </div>
            <StatePlaceOfSupplySelect
              label="Billing / Place of Supply State*"
              value={billingState}
              onChange={setBillingState}
              required
            />
          </div>
          <div className="form-grid-2" style={{ marginBottom: '10px' }}>
            <div className="form-group">
              <label>Postal Pincode*</label>
              <input type="text" className="form-input" placeholder="e.g. 400001" value={billingPincode} onChange={(e) => setBillingPincode(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Country*</label>
              <input type="text" className="form-input" value={billingCountry} onChange={(e) => setBillingCountry(e.target.value)} />
            </div>
          </div>

          {/* Shipping checkbox */}
          <div
            className="checkbox-group"
            onClick={() => setShippingSame(!shippingSame)}
          >
            <div className={`checkbox-custom ${shippingSame ? 'checked' : ''}`}>
              {shippingSame && <CheckCircle2 className="checkbox-custom-tick" />}
            </div>
            <span className="checkbox-label">Shipping address is exactly identical to Billing Address</span>
          </div>

          {!shippingSame && (
            <div style={{ marginTop: '20px' }}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Shipping Street Address</label>
                  <input type="text" className="form-input" placeholder="Shipping destination street" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Shipping City</label>
                  <input type="text" className="form-input" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
                </div>
                <StatePlaceOfSupplySelect
                  label="Shipping State"
                  value={shippingState}
                  onChange={setShippingState}
                  required={false}
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Shipping Pincode</label>
                  <input type="text" className="form-input" value={shippingPincode} onChange={(e) => setShippingPincode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Shipping Country</label>
                  <input type="text" className="form-input" value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: ACCOUNTING DETAILS */}
          <h4 className="form-section-title">4. Accounting & Financial Parameters</h4>
          <div className="form-grid-4">
            <div className="form-group">
              <label>Ledger Opening Balance (₹)*</label>
              <input type="number" step="0.01" className="form-input" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
            </div>
            <div className="form-group">
              <label>As of Date*</label>
              <input type="date" className="form-input" value={dateOnly(openingBalanceDate)} onChange={(e) => setOpeningBalanceDate(e.target.value)} />
            </div>
            <PaymentTermsSelect
              label="Default Payment Terms Dropdown"
              value={paymentTerms}
              onChange={setPaymentTerms}
            />
            <div className="form-group">
              <label>Credit Limit Cap (₹)</label>
              <input type="number" step="0.01" className="form-input" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
            </div>
          </div>

          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => { setShowAddForm(false); setEditingCustomerId(null); }}>
              Cancel Profile
            </button>
            <button type="submit" className={`btn-primary ${customerSaving ? 'btn-submitting' : ''}`} disabled={customerSaving}>
              {editingCustomerId ? 'Update Customer Profile' : 'Register Customer Profile'}
            </button>
          </div>
        </form>
      ) : (
        <>
        <div className="premium-table-wrapper desktop-only" style={{ marginTop: '20px' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Customer Legal Name</th>
                <th>Category</th>
                <th>Registration Category</th>
                <th>GSTIN</th>
                <th>PAN</th>
                <th>State (Place of Supply)</th>
                <th>Opening Ledger Bal</th>
                <th>Credit Limit</th>
                <th>Terms</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                  <td>{c.category}</td>
                  <td>{c.gst_type}</td>
                  <td style={{ fontFamily: 'monospace' }}>{c.gstin}</td>
                  <td style={{ fontFamily: 'monospace' }}>{c.pan}</td>
                  <td>{c.billing_state}</td>
                  <td style={{ fontWeight: 'bold' }}>
                    ₹{c.opening_balance.toLocaleString()}
                  </td>
                  <td>{c.credit_limit > 0 ? `₹${c.credit_limit.toLocaleString()}` : 'Unlimited'}</td>
                  <td>{c.payment_terms}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => openEditCustomer(c)}>Edit</button>
                      <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--accent-red)' }} onClick={() => handleDeleteCustomer(c)}>Delete</button>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
                        onClick={() => setSelectedLedgerCustomer(c)}
                      >
                        View Party Ledger 📒
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MobileRegistryCards
          items={customers}
          emptyLabel="No customers registered yet."
          renderCard={(c) => (
            <>
              <div className="mobile-registry-card__head">
                <div>
                  <div className="mobile-registry-card__title">{c.name}</div>
                  <div className="mobile-registry-card__meta">{c.gst_type}</div>
                </div>
                <div className="mobile-registry-card__amount">₹{c.opening_balance.toLocaleString()}</div>
              </div>
              <div className="mobile-registry-card__row"><span>State</span><span>{c.billing_state || '—'}</span></div>
              <MobileCardExpand label="More details">
                <div className="mobile-registry-card__row"><span>GSTIN</span><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.gstin || '—'}</span></div>
                <div className="mobile-registry-card__row"><span>Terms</span><span>{c.payment_terms}</span></div>
                <div className="mobile-registry-card__row"><span>Email</span><span>{c.email || '—'}</span></div>
              </MobileCardExpand>
              <div className="mobile-registry-card__actions">
                <MobileRegistryCardActions
                  onView={() => setSelectedLedgerCustomer(c)}
                  viewLabel="Ledger"
                  viewTitle="View party ledger"
                  onEdit={() => openEditCustomer(c)}
                  extraItems={[
                    { label: 'Delete', onClick: () => handleDeleteCustomer(c), danger: true },
                  ]}
                />
              </div>
            </>
          )}
        />
        </>
      )}

      {/* CUSTOMER PARTY LEDGER VIEW OVERLAY */}
      {selectedLedgerCustomer && (() => {
        const ledgerData = getCustomerLedger(selectedLedgerCustomer);
        const totalDebit = ledgerData.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = ledgerData.reduce((sum, item) => sum + item.credit, 0);
        const currentOutstanding = ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].running_balance : 0;
        return (
          <div className="modal-overlay" onClick={() => setSelectedLedgerCustomer(null)}>
            <div className="pdf-preview-card" style={{ maxWidth: '950px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#111' }}>Party Ledger Account: {selectedLedgerCustomer.name}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-primary"
                    onClick={() => { setSelectedLedgerPDF(selectedLedgerCustomer); setSelectedLedgerCustomer(null); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> View Printable PDF 📄
                  </button>
                  <button
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleDownloadLedgerReport(selectedLedgerCustomer, true, 'csv')}
                  >
                    <Download size={14} /> Export CSV 📥
                  </button>
                  <button
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleDownloadLedgerReport(selectedLedgerCustomer, true, 'excel')}
                  >
                    <FileSpreadsheet size={14} /> Export Excel 📊
                  </button>
                  <button className="btn-secondary" onClick={() => setSelectedLedgerCustomer(null)}>
                    Close Ledger
                  </button>
                </div>
              </div>

              {/* LEDGER SUMMARY SUMMARY CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Opening Balance</span>
                  <h4 style={{ margin: '5px 0 0 0', color: '#0f172a' }}>₹{parseFloat(selectedLedgerCustomer.opening_balance || 0).toLocaleString()}</h4>
                </div>
                <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Total Debit (Sales)</span>
                  <h4 style={{ margin: '5px 0 0 0', color: '#0f172a' }}>₹{totalDebit.toLocaleString()}</h4>
                </div>
                <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Total Credit (Receipts)</span>
                  <h4 style={{ margin: '5px 0 0 0', color: '#0f172a' }}>₹{totalCredit.toLocaleString()}</h4>
                </div>
                <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase' }}>Net Outstanding</span>
                  <h4 style={{ margin: '5px 0 0 0', color: '#166534' }}>₹{currentOutstanding.toLocaleString()}</h4>
                </div>
              </div>

              {/* LEDGER DATA TABLE */}
              <div className="premium-table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Ref No.</th>
                      <th style={{ textAlign: 'right' }}>Debit (Dr - Invoiced)</th>
                      <th style={{ textAlign: 'right' }}>Credit (Cr - Received)</th>
                      <th style={{ textAlign: 'right' }}>Running Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{formatDateDDMMYYYY(row.date)}</td>
                        <td>{row.description}</td>
                        <td style={{ fontFamily: 'monospace' }}>{row.reference}</td>
                        <td style={{ textAlign: 'right', color: row.debit > 0 ? '#2563eb' : '#94a3b8' }}>
                          {row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', color: row.credit > 0 ? '#10b981' : '#94a3b8' }}>
                          {row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ₹{row.running_balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {ledgerData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty-state">No ledger entries for this customer.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HIGH-FIDELITY CUSTOMER LEDGER STATEMENT PRINT MODAL */}
      {selectedLedgerPDF && (() => {
        const ledgerData = getCustomerLedger(selectedLedgerPDF);
        return (
          <PdfPrintModal
            onClose={() => setSelectedLedgerPDF(null)}
            screenTitle="Ledger Account Statement"
            closeLabel="Close Statement"
          >
            <div className="pdf-print-page">
              <h1 className="pdf-document-title">Account Statement</h1>
              <PdfDocumentHeader
                company={companyDetails}
                rightContent={
                  <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Customer: {selectedLedgerPDF.name}</p>
                }
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                <div style={{ fontSize: '12px' }}>
                  <p><strong>Statement Period:</strong> Up to May 23, 2026</p>
                  <PdfOptionalLine label="GSTIN:" value={selectedLedgerPDF.gstin} />
                  <p><strong>Address:</strong> {selectedLedgerPDF.billing_address}, {selectedLedgerPDF.billing_city}</p>
                </div>
                <div style={{ fontSize: '12px', textAlign: 'right' }}>
                  <p><strong>Opening Balance:</strong> {formatPdfINR(selectedLedgerPDF.opening_balance || 0)}</p>
                  <p><strong>Net Balance Outstanding:</strong> <strong style={{ color: '#2563eb' }}>{formatPdfINR(currentOutstanding)}</strong></p>
                </div>
              </div>

              <table className="pdf-meta-table" style={{ marginTop: '20px', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Ref No.</th>
                    <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.map((row, idx) => (
                    <tr key={idx} style={{ fontSize: '11px' }}>
                      <td>{formatDateDDMMYYYY(row.date)}</td>
                      <td>{row.description}</td>
                      <td>{row.reference}</td>
                      <td style={{ textAlign: 'right' }}>{row.debit > 0 ? formatPdfINR(row.debit) : '-'}</td>
                      <td style={{ textAlign: 'right' }}>{row.credit > 0 ? formatPdfINR(row.credit) : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatPdfINR(row.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PdfPrintModal>
        );
      })()}

    </div>
  );
}

// --- SUB-TAB: CREDIT NOTES (SALES RETURNS) ---
function CreditNotesSubTab() {
  const {
    creditNotes, 
    creditNoteItems, 
    customers, 
    invoices, 
    invoiceItems, 
    createCreditNote,
    updateCreditNote,
    deleteCreditNote,
    companyDetails, 
    isFinancialYearLocked,
    currentUser,
  } = useSimulator();
  const registeredState = resolveRegisteredState(companyDetails);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInlineCustomer, setShowInlineCustomer] = useState(false);

  const [selectedCNForPDF, setSelectedCNForPDF] = useState(null);
  const [editingCreditNoteId, setEditingCreditNoteId] = useState(null);
  const skipCnInvoiceAutofillRef = useRef(false);
  const lastCnCustomerCurrencyRef = useRef('');
  const [creditNoteNumber, setCreditNoteNumber] = useState(`CN-2026-00${(creditNotes?.length || 0) + 1}`);

  const sortedCreditNotesBase = useMemo(
    () => sortRegistryNewestFirst(creditNotes, 'issue_date'),
    [creditNotes]
  );

  const creditNoteExcelGetters = useMemo(
    () => ({
      document: (cn) => cn.credit_note_number || '',
      party: (cn) => cn.customer_name || '',
      amount: (cn) => toAmount(cn.total_amount),
      reason: (cn) => cn.reason || '',
      date: (cn) => cn.issue_date || '',
    }),
    []
  );
  const creditNoteExcelFilterGetters = useMemo(
    () => ({
      ...creditNoteExcelGetters,
      amount: (cn) => `₹${toAmount(cn.total_amount).toLocaleString('en-IN')}`,
      date: (cn) => formatDateDDMMYYYY(cn.issue_date),
    }),
    [creditNoteExcelGetters]
  );
  const {
    excelSort: cnExcelSort,
    setExcelSort: setCnExcelSort,
    excelFilters: cnExcelFilters,
    setExcelFilterFor: setCnExcelFilterFor,
    columnValues: cnExcelValues,
    displayedRows: sortedCreditNotes,
  } = useExcelTableState(sortedCreditNotesBase, creditNoteExcelGetters, creditNoteExcelFilterGetters);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [reason, setReason] = useState('Sales Return');
  const [issueDate, setIssueDate] = useState('2026-05-25');
  const [lineItems, setLineItems] = useState([]);
  const [manualDesc, setManualDesc] = useState('Sales return adjustment');
  const [manualAmount, setManualAmount] = useState('');
  const [manualGstRate, setManualGstRate] = useState(18);
  const [manualHsn, setManualHsn] = useState('');
  const [discountValue, setDiscountValue] = useState('');

  const getCreditNoteShare = (cn) => {
    const customer = customers.find((c) => sameId(c.id, cn.customer_id));
    const items = creditNoteItems.filter((it) => sameId(it.credit_note_id, cn.id));
    return buildCreditNoteSharePayload(cn, {
      company: companyDetails,
      customer,
      lineItems: items,
      fromEmail: currentUser?.email,
    });
  };

  const openEditCreditNote = (cn) => {
    const items = creditNoteItems.filter((it) => sameId(it.credit_note_id, cn.id));
    skipCnInvoiceAutofillRef.current = true;
    setEditingCreditNoteId(cn.id);
    setShowAddForm(true);
    setCreditNoteNumber(cn.credit_note_number);
    setCustomerId(cn.customer_id != null ? String(cn.customer_id) : '');
    setInvoiceId(cn.original_invoice_id != null ? String(cn.original_invoice_id) : '');
    setReason(cn.reason || 'Sales Return');
    setIssueDate(dateOnly(cn.issue_date) || '');
    setDiscountValue(toAmount(cn.discount));
    setCnCurrency(cn.currency || 'INR');
    setCnConversionRate(String(cn.conversion_rate ?? '1.00'));
    if (items.length > 0) {
      setLineItems(items.map((item) => ({
        product_id: item.product_id ? String(item.product_id) : '',
        description: item.description,
        hsn_sac: item.hsn_sac,
        quantity: item.quantity,
        rate: toAmount(item.unit_price),
        line_total: toAmount(item.line_total),
        original_qty: item.quantity,
        original_rate: toAmount(item.unit_price),
        tax_rate_override: item.tax_rate_override ?? cn.tax_rate ?? 18,
      })));
      setManualAmount('');
    } else {
      setLineItems([]);
      setManualAmount(String(cn.subtotal ?? ''));
      setManualGstRate(cn.tax_rate ?? 18);
      setManualDesc(cn.reason || 'Sales return adjustment');
    }
  };

  const resetCreditNoteForm = () => {
    setEditingCreditNoteId(null);
    setShowAddForm(false);
    setCustomerId('');
    setInvoiceId('');
    setLineItems([]);
  };

  const customerInvoices = invoices.filter(
    (inv) => sameId(inv.customer_id, customerId) && inv.status !== 'Cancelled'
  );

  const [cnPlaceOfSupply, setCnPlaceOfSupply] = useState(registeredState || 'Gujarat');
  const [cnExportCountry, setCnExportCountry] = useState('');
  const [cnCurrency, setCnCurrency] = useState('INR');
  const [cnConversionRate, setCnConversionRate] = useState('1.00');

  const buildManualLineItems = () => {
    if (toAmount(manualAmount) <= 0) return [];
    const base = {
      description: manualDesc.trim() || 'Sales return adjustment',
      hsn_sac: manualHsn || '9997',
      quantity: 1,
      rate: toAmount(manualAmount),
      tax_rate_override: manualGstRate,
      supply_mechanism: 'FCM',
    };
    const t = calcLineTax(base, cnPlaceOfSupply, registeredState);
    return [{ ...base, ...t, line_total: t.taxable, original_qty: 1, original_rate: toAmount(manualAmount) }];
  };

  const effectiveLineItems = lineItems.length > 0 ? lineItems : buildManualLineItems();

  // Time-barred calculation: dated before April 1, 2025
  const isTimeBarred = () => {
    if (!invoiceId) return false;
    const origInvoice = invoices.find((inv) => sameId(inv.id, invoiceId));
    if (!origInvoice) return false;
    return new Date(origInvoice.issue_date) < new Date('2025-04-01');
  };

  // Auto-fill lines based on original invoice selection
  useEffect(() => {
    if (skipCnInvoiceAutofillRef.current) {
      skipCnInvoiceAutofillRef.current = false;
      return;
    }
    if (invoiceId) {
      const origInvoice = invoices.find((inv) => sameId(inv.id, invoiceId));
      if (origInvoice) {
        const matchedItems = invoiceItems.filter((item) => sameId(item.invoice_id, origInvoice.id));
        setLineItems(matchedItems.map(item => ({
          product_id: item.product_id ? item.product_id.toString() : '',
          description: item.description,
          hsn_sac: item.hsn_sac,
          quantity: item.quantity,
          rate: toAmount(item.unit_price),
          line_total: toAmount(item.line_total),
          original_qty: item.quantity,
          original_rate: toAmount(item.unit_price),
          tax_rate_override: item.tax_rate_override ?? item.tax_rate ?? 18,
        })));
        setDiscountValue(toAmount(origInvoice.discount));
        setCnPlaceOfSupply(origInvoice.place_of_supply === 'Overseas' ? 'Out of India' : (origInvoice.place_of_supply || registeredState || 'Gujarat'));
        setCnExportCountry(origInvoice.export_country || '');
        setCnCurrency(origInvoice.currency || 'INR');
        setCnConversionRate(String(origInvoice.conversion_rate ?? '1.00'));
      } else {
        setLineItems([]);
      }
    } else {
      setLineItems([]);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!customerId || invoiceId) return;
    if (customerId === lastCnCustomerCurrencyRef.current) return;
    lastCnCustomerCurrencyRef.current = customerId;
    const cust = customers.find((c) => sameId(c.id, customerId));
    if (cust?.currency) setCnCurrency(cust.currency);
  }, [customerId, invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLineQtyRateChange = (idx, field, val) => {
    const parsedVal = parseFloat(val || 0);
    const updated = [...lineItems];
    updated[idx][field] = parsedVal;

    if (field === 'quantity') {
      if (parsedVal > updated[idx].original_qty) {
        alert(`Strict Validation Warning: Return quantity cannot exceed original invoice quantity (${updated[idx].original_qty}).`);
        updated[idx].quantity = updated[idx].original_qty;
      }
    }
    if (field === 'rate') {
      if (parsedVal > updated[idx].original_rate) {
        alert(`Strict Validation Warning: Rate adjustment cannot exceed original invoice rate (₹${updated[idx].original_rate}).`);
        updated[idx].rate = updated[idx].original_rate;
      }
    }

    updated[idx].line_total = updated[idx].quantity * updated[idx].rate;
    const t = calcLineTax({ ...updated[idx], tax_rate_override: updated[idx].tax_rate_override || 18 }, cnPlaceOfSupply, registeredState);
    updated[idx] = { ...updated[idx], cgst: t.cgst, sgst: t.sgst, igst: t.igst };
    setLineItems(updated);
  };

  const cnTotals = aggregateLinesTax(
    effectiveLineItems.map((l) => ({ ...l, rate: l.rate, quantity: l.quantity, tax_rate_override: l.tax_rate_override || 18, supply_mechanism: 'FCM' })),
    discountValue,
    cnPlaceOfSupply,
    registeredState
  );
  const { subtotal, cgst, sgst, igst, tax_amount: taxAmount, total_amount: totalAmount } = cnTotals;

  const handleSaveCreditNote = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }

    if (!customerId) return alert('Select a customer.');
    if (!reason) return alert('Select reason for Credit Note issuance.');
    if (effectiveLineItems.length === 0 || totalAmount <= 0) {
      return alert('Enter return line items (link an invoice) or fill the manual credit amount section below.');
    }

    if (invoiceId && isTimeBarred()) {
      const confirmOverride = window.confirm(
        "STATUTORY COMPLIANCE WARNING:\nThis invoice belongs to a prior financial year where the November 30th filing deadline has already passed.\nAre you sure you want to proceed and override this CBIC time-barrier warning?"
      );
      if (!confirmOverride) return;
    }

    if (isExportPlaceOfSupply(cnPlaceOfSupply) && !cnExportCountry.trim()) {
      alert('Validation Failure: Select the destination country for Out of India supply.');
      return;
    }

    const origInvoice = invoiceId ? invoices.find((inv) => sameId(inv.id, invoiceId)) : null;

    try {
      const payload = {
        customer_id: parseInt(customerId, 10),
        customer_name: customers.find(c => sameId(c.id, customerId))?.name || 'Client',
        original_invoice_id: invoiceId || null,
        original_invoice_number: origInvoice?.invoice_number || '',
        original_invoice_date: dateOnly(origInvoice?.issue_date) || '',
        issue_date: dateOnly(issueDate),
        reason,
        subtotal,
        discount: discountValue,
        tax_amount: taxAmount,
        tax_rate: manualGstRate,
        cgst,
        sgst,
        igst,
        total_amount: totalAmount,
        currency: cnCurrency || 'INR',
        export_country: isExportPlaceOfSupply(cnPlaceOfSupply) ? cnExportCountry.trim() : null,
        conversion_rate: parseFloat(cnConversionRate) || 1,
      };
      if (editingCreditNoteId) {
        await updateCreditNote(editingCreditNoteId, payload, effectiveLineItems);
      } else {
        await createCreditNote({ ...payload, credit_note_number: creditNoteNumber }, effectiveLineItems);
      }
    } catch (err) {
      showApiError(editingCreditNoteId ? 'Updating credit note' : 'Saving credit note', err);
      return;
    }

    alert(editingCreditNoteId ? 'Credit note updated successfully.' : 'Success: Credit Note has been successfully issued! Client ledger adjusted and stock quantities reversed.');
    resetCreditNoteForm();
  };

  const handleDownloadCreditNotes = (format = 'csv') => {
    let csvContent = 'Credit Note No,Customer,Original Invoice,Date,Reason,Subtotal,CGST,SGST,IGST,Total\n';
    creditNotes.forEach((cn) => {
      const origInv = invoices.find((inv) => sameId(inv.id, cn.original_invoice_id));
      const cnPos = origInv?.place_of_supply || registeredState;
      const b = bifurcateStoredTax(cn, cnPos, registeredState);
      csvContent += `"${cn.credit_note_number}","${cn.customer_name}","${cn.original_invoice_number || ''}","${formatDateDDMMYYYY(cn.issue_date)}","${cn.reason}",${cn.subtotal},${b.cgst.toFixed(2)},${b.sgst.toFixed(2)},${b.igst.toFixed(2)},${cn.total_amount}\n`;
    });
    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = 'vouchex_credit_notes.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'CREDIT NOTES', 'vouchex_credit_notes.xls');
    }
  };

  return (
    <div>
      <div className="table-header-row">
        <h3>Credit Note Ledger registries (Sales Returns)</h3>
        {!showAddForm && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
              Issue Credit Note 📑
            </button>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadCreditNotes('csv')}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadCreditNotes('excel')}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        )}
      </div>

      <InlineCustomerModal open={showInlineCustomer} onClose={() => setShowInlineCustomer(false)} onCreated={(c) => { setCustomerId(String(c.id)); setShowInlineCustomer(false); }} />

      {showAddForm ? (
        <form onSubmit={handleSaveCreditNote} className="master-form" style={{ marginBottom: '30px' }}>
          <h3 className="form-section-title">Issue Statutory Credit Note</h3>
          
          <div className="form-grid-3">
            <div className="form-group">
              <Req>Credit Note Number</Req>
              <input type="text" className="form-input" value={creditNoteNumber} onChange={(e) => setCreditNoteNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <Req>Select Customer Profile</Req>
              <select className="form-input" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setInvoiceId(''); }}>
                <option value="">-- Click to choose client --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="button" className="btn-secondary-sm" style={{ marginTop: 8 }} onClick={() => setShowInlineCustomer(true)}>+ Add New Profile</button>
            </div>
            
            <div className="form-group">
              <Opt>Link Original Sales Invoice</Opt>
              <select className="form-input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} disabled={!customerId}>
                <option value="">-- Optional: linked sales invoice --</option>
                {customerInvoices.map(inv => (
                  <option key={inv.id} value={String(inv.id)}>{inv.invoice_number} (Total: ₹{formatINR(inv.total_amount)} - Date: {formatDateDDMMYYYY(inv.issue_date)})</option>
                ))}
              </select>
              {customerId && customerInvoices.length === 0 && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 6 }}>No sales invoices found for this customer.</p>
              )}
            </div>

            <div className="form-group">
              <Req>Filing Date of Note</Req>
              <input type="date" className="form-input" value={dateOnly(issueDate)} onChange={(e) => setIssueDate(dateOnly(e.target.value))} />
            </div>
          </div>

          {isTimeBarred() && (
            <div className="error-banner" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--accent-red)', color: 'var(--accent-red)', marginBottom: '16px' }}>
              <AlertTriangle size={16} />
              <span>
                <strong>CBIC TIME-BAR WARNING:</strong> The selected invoice was issued in a previous financial year (pre-April 2025) and has crossed the November 30th statutory amendment deadline under Section 34(2).
              </span>
            </div>
          )}

          <div className="form-grid-2">
            <DynamicSelect optionKey="credit_note_reasons" label="Statutory Reason for Issuance (GST Rule)" value={reason} onChange={setReason} required baseOptions={['Sales Return', 'Post-Sale Discount', 'Deficiency in Services', 'Correction in Invoice Value / Tax Rate']} manualPlaceholder="Enter statutory reason manually…" />
            <div className="form-group form-group-spaced">
              <Opt>Rebate Discount Adjustment (₹)</Opt>
              <AmountInput className="form-input" value={discountValue} onChange={setDiscountValue} />
            </div>
          </div>

          {lineItems.length === 0 && (
            <div style={{ marginTop: '20px' }}>
              <div className="form-section-title" style={{ margin: '10px 0' }}>Credit Note Amount (manual entry or after linking invoice)</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <Req>Return / adjustment description</Req>
                  <input type="text" className="form-input" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} />
                </div>
                <div className="form-group">
                  <Req>Taxable credit amount (₹)</Req>
                  <AmountInput step="0.01" min="0" className="form-input" value={manualAmount} onChange={setManualAmount} />
                </div>
                <div className="form-group">
                  <Req>GST rate (%)</Req>
                  <select className="form-input" value={manualGstRate} onChange={(e) => setManualGstRate(parseFloat(e.target.value))}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={18}>18%</option>
                    <option value={40}>40%</option>
                  </select>
                </div>
                <div className="form-group">
                  <Opt>HSN / SAC</Opt>
                  <input type="text" className="form-input" value={manualHsn} onChange={(e) => setManualHsn(e.target.value)} placeholder="e.g. 9997" />
                </div>
              </div>
            </div>
          )}

          {lineItems.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div className="form-section-title" style={{ margin: '10px 0' }}>Adjust Quantities or Rates Downwards</div>
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>HSN / SAC</th>
                    <th style={{ textAlign: 'right' }}>Orig Qty</th>
                    <th style={{ textAlign: 'right' }}>Orig Rate (₹)</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Return Qty</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Credit Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Line Total (₹)</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>IGST</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td><input type="text" className="form-input" value={item.description} disabled /></td>
                      <td><input type="text" className="form-input" value={item.hsn_sac} disabled /></td>
                      <td style={{ textAlign: 'right' }}>{item.original_qty}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.original_rate.toLocaleString()}</td>
                      <td>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ textAlign: 'right' }}
                          value={item.quantity} 
                          onChange={(e) => handleLineQtyRateChange(idx, 'quantity', e.target.value)} 
                          max={item.original_qty}
                          min="0"
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-input" 
                          style={{ textAlign: 'right' }}
                          value={item.rate} 
                          onChange={(e) => handleLineQtyRateChange(idx, 'rate', e.target.value)} 
                          max={item.original_rate}
                          min="0"
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{item.line_total.toLocaleString()}
                      </td>
                      <td style={{ fontSize: 11 }}>₹{(item.cgst || 0).toLocaleString()}</td>
                      <td style={{ fontSize: 11 }}>₹{(item.sgst || 0).toLocaleString()}</td>
                      <td style={{ fontSize: 11 }}>₹{(item.igst || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-calculations" style={{ marginTop: '20px' }}>
                <div className="calc-row">
                  <span>Gross Adjusted Subtotal:</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="calc-row"><span>CGST Refund:</span><span>₹{cgst.toLocaleString()}</span></div>
                <div className="calc-row"><span>SGST Refund:</span><span>₹{sgst.toLocaleString()}</span></div>
                <div className="calc-row"><span>IGST Refund:</span><span style={{ color: 'var(--accent-red)' }}>₹{igst.toLocaleString()}</span></div>
                <div className="calc-row grand-total">
                  <span>Total Net Refund Credit Value:</span>
                  <span className="calc-val" style={{ color: 'var(--accent-teal)' }}>
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
              Cancel Issuance
            </button>
            <button type="submit" className="btn-primary">
              Sign & Save Credit Note
            </button>
          </div>
        </form>
      ) : (
        <div className="premium-table-wrapper registry-ledger-wrap" style={{ marginTop: '20px' }}>
          <table className="premium-table registry-ledger">
            <thead>
              <tr>
                <ExcelColumnFilter
                  label="Document"
                  columnKey="document"
                  className="registry-ledger__doc"
                  values={cnExcelValues.document}
                  sort={cnExcelSort}
                  onSort={setCnExcelSort}
                  selected={cnExcelFilters.document || null}
                  onFilter={(s) => setCnExcelFilterFor('document', s)}
                />
                <ExcelColumnFilter
                  label="Client"
                  columnKey="party"
                  className="registry-ledger__party"
                  values={cnExcelValues.party}
                  sort={cnExcelSort}
                  onSort={setCnExcelSort}
                  selected={cnExcelFilters.party || null}
                  onFilter={(s) => setCnExcelFilterFor('party', s)}
                />
                <ExcelColumnFilter
                  label="Settlement"
                  columnKey="amount"
                  className="registry-ledger__settle"
                  values={cnExcelValues.amount}
                  sort={cnExcelSort}
                  onSort={setCnExcelSort}
                  selected={cnExcelFilters.amount || null}
                  onFilter={(s) => setCnExcelFilterFor('amount', s)}
                  valueType="number"
                />
                <ExcelColumnFilter
                  label="Reason"
                  columnKey="reason"
                  className="registry-ledger__meta"
                  values={cnExcelValues.reason}
                  sort={cnExcelSort}
                  onSort={setCnExcelSort}
                  selected={cnExcelFilters.reason || null}
                  onFilter={(s) => setCnExcelFilterFor('reason', s)}
                />
                <ExcelColumnFilter
                  label="Date"
                  columnKey="date"
                  className="registry-ledger__status"
                  values={cnExcelValues.date}
                  sort={cnExcelSort}
                  onSort={setCnExcelSort}
                  selected={cnExcelFilters.date || null}
                  onFilter={(s) => setCnExcelFilterFor('date', s)}
                />
                <th className="registry-ledger__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCreditNotes.map((cn) => {
                const origInv = invoices.find((inv) => sameId(inv.id, cn.original_invoice_id));
                const cnPos = cn.place_of_supply || origInv?.place_of_supply || registeredState;
                const cnTax = bifurcateStoredTax(cn, cnPos, registeredState);
                return (
                <tr key={cn.id}>
                  <td className="registry-ledger__doc">
                    <div className="registry-ledger__id">{cn.credit_note_number}</div>
                    <div className="registry-ledger__sub">
                      <span>{cn.original_invoice_number || '—'}</span>
                    </div>
                  </td>
                  <td className="registry-ledger__party">
                    <div className="registry-ledger__party-name">{cn.customer_name}</div>
                  </td>
                  <td className="registry-ledger__settle">
                    <div className="registry-ledger__amount is-in">
                      ₹{toAmount(cn.total_amount).toLocaleString('en-IN')}
                    </div>
                    <div className="registry-ledger__sub">
                      <span>Taxable ₹{toAmount(cn.subtotal).toLocaleString('en-IN')}</span>
                      {cnTax.igst > 0 ? (
                        <span>IGST ₹{cnTax.igst.toLocaleString('en-IN')}</span>
                      ) : (
                        <>
                          <span>CGST ₹{cnTax.cgst.toLocaleString('en-IN')}</span>
                          <span>SGST ₹{cnTax.sgst.toLocaleString('en-IN')}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="registry-ledger__meta">{cn.reason}</td>
                  <td className="registry-ledger__status">{formatDateDDMMYYYY(cn.issue_date)}</td>
                  <td className="registry-ledger__actions registry-actions-cell">
                    <RegistryRowActions
                      onEdit={() => openEditCreditNote(cn)}
                      onView={() => setSelectedCNForPDF(cn)}
                      viewTitle="View credit note PDF"
                      share={getCreditNoteShare(cn)}
                      deleteLabel={`credit note ${cn.credit_note_number}`}
                      onDelete={() => deleteCreditNote(cn.id)}
                      deleteDisabled={isFinancialYearLocked}
                    />
                  </td>
                </tr>
              );})}
              {sortedCreditNotes.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">No Credit Notes issued in outward sales accounts.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DYNAMIC CREDIT NOTE PDF PRINT MODAL */}
      {selectedCNForPDF && (() => {
        const matchedCNItems = creditNoteItems.filter(item => sameId(item.credit_note_id, selectedCNForPDF.id));
        return (
          <PdfPrintModal
            onClose={() => setSelectedCNForPDF(null)}
            screenTitle="Printable Credit Note Voucher"
            maxWidth={850}
            closeLabel="Close Note"
            toolbarExtra={
              <DocumentShareToolbar
                share={buildCreditNoteSharePayload(selectedCNForPDF, {
                  company: companyDetails,
                  customer: customers.find((c) => sameId(c.id, selectedCNForPDF.customer_id)),
                  lineItems: matchedCNItems,
                  fromEmail: currentUser?.email,
                })}
              />
            }
          >
            <div className="pdf-print-page">
              <h1 className="pdf-document-title">Credit Note</h1>
              <PdfDocumentHeader
                company={companyDetails}
                rightContent={
                  <>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>CN Number: {selectedCNForPDF.credit_note_number}</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Date: {formatDateDDMMYYYY(selectedCNForPDF.issue_date)}</p>
                  </>
                }
              />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '24px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>Issued To Customer:</span>
                    <h4 style={{ color: '#111', margin: '4px 0 0 0', fontSize: '15px' }}>{selectedCNForPDF.customer_name}</h4>
                    {!isBlankFieldValue(selectedCNForPDF.original_invoice_number) && (
                      <p style={{ margin: '4px 0 0 0' }}>Original Sales Invoice Ref: <strong>{selectedCNForPDF.original_invoice_number}</strong></p>
                    )}
                    <PdfOptionalLine
                      label="Original Invoice Date:"
                      value={formatDateDDMMYYYY(selectedCNForPDF.original_invoice_date)}
                      style={{ margin: '2px 0 0 0' }}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>Reason for Issuance:</span>
                    <h5 style={{ color: '#111', margin: '4px 0 0 0', fontSize: '13px' }}>{selectedCNForPDF.reason}</h5>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--accent-teal)', fontWeight: 'bold' }}>Status: Approved & Credited</p>
                  </div>
                </div>

                <table className="pdf-meta-table" style={{ width: '100%', marginTop: '30px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'left' }}>Item Description</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'left' }}>HSN / SAC</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Quantity</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Adjusted Rate (₹)</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Adjusted Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedCNItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.description}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', fontFamily: 'monospace' }}>{item.hsn_sac}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatPdfINR(item.unit_price)}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{formatPdfINR(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '30px' }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    <p><strong>Ledgers Impact:</strong></p>
                    <p>Debit Ledger: Sales Return / Revenue A/c</p>
                    <p>Credit Ledger: Customer Outstanding Accounts Receivable</p>
                    <p style={{ marginTop: '8px', fontStyle: 'italic' }}>*This Credit Note has been generated in accordance with GST statutory returns requirements under Section 34 of the CGST Act.</p>
                  </div>
                  <div style={{ textAlign: 'right', borderTop: '2px solid #333', paddingTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>Subtotal Value:</span>
                    <h5 style={{ margin: '2px 0 6px 0', fontSize: '14px', color: '#111' }}>{formatPdfINR(selectedCNForPDF.subtotal)}</h5>
                    
                    <span style={{ fontSize: '12px', color: '#666' }}>GST Refund Offset ({selectedCNForPDF.tax_rate}%):</span>
                    <h5 style={{ margin: '2px 0 6px 0', fontSize: '14px', color: '#b91c1c' }}>{formatPdfINR(selectedCNForPDF.tax_amount)}</h5>
                    
                    <span style={{ fontSize: '13px', color: '#333', fontWeight: 'bold' }}>Net Credited Value:</span>
                    <h3 style={{ margin: '4px 0', fontSize: '20px', color: '#10b981', fontWeight: 'bold' }}>
                      {formatPdfINR(selectedCNForPDF.total_amount)}
                    </h3>
                  </div>
                </div>
            </div>
          </PdfPrintModal>
        );
      })()}
    </div>
  );
}

// ==========================================
// B2. DEBIT NOTE SUB-TAB (Purchase Returns)
// ==========================================
function DebitNotesSubTab() {
  const {
    debitNotes, 
    debitNoteItems, 
    vendors, 
    expenses, 
    createDebitNote,
    updateDebitNote,
    deleteDebitNote,
    companyDetails, 
    isFinancialYearLocked,
    currentUser,
  } = useSimulator();
  const registeredState = resolveRegisteredState(companyDetails);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInlineVendor, setShowInlineVendor] = useState(false);
  const [selectedDNForPDF, setSelectedDNForPDF] = useState(null);
  const [editingDebitNoteId, setEditingDebitNoteId] = useState(null);
  const skipDnExpenseAutofillRef = useRef(false);
  const lastDnVendorCurrencyRef = useRef('');
  const [debitNoteNumber, setDebitNoteNumber] = useState(`DN-2026-00${(debitNotes?.length || 0) + 1}`);

  const sortedDebitNotesBase = useMemo(
    () => sortRegistryNewestFirst(debitNotes, 'issue_date'),
    [debitNotes]
  );

  const debitNoteExcelGetters = useMemo(
    () => ({
      document: (dn) => dn.debit_note_number || '',
      party: (dn) => dn.vendor_name || '',
      amount: (dn) => toAmount(dn.total_amount),
      reason: (dn) => dn.reason || '',
      date: (dn) => dn.issue_date || '',
    }),
    []
  );
  const debitNoteExcelFilterGetters = useMemo(
    () => ({
      ...debitNoteExcelGetters,
      amount: (dn) => `₹${toAmount(dn.total_amount).toLocaleString('en-IN')}`,
      date: (dn) => formatDateDDMMYYYY(dn.issue_date),
    }),
    [debitNoteExcelGetters]
  );
  const {
    excelSort: dnExcelSort,
    setExcelSort: setDnExcelSort,
    excelFilters: dnExcelFilters,
    setExcelFilterFor: setDnExcelFilterFor,
    columnValues: dnExcelValues,
    displayedRows: sortedDebitNotes,
  } = useExcelTableState(sortedDebitNotesBase, debitNoteExcelGetters, debitNoteExcelFilterGetters);

  // Form states
  const [vendorId, setVendorId] = useState('');
  const [expenseId, setExpenseId] = useState('');
  const [reason, setReason] = useState('Purchase Return');
  const [issueDate, setIssueDate] = useState('2026-05-25');
  const [lineItems, setLineItems] = useState([]);
  const [manualDesc, setManualDesc] = useState('Purchase return adjustment');
  const [manualAmount, setManualAmount] = useState('');
  const [manualGstRate, setManualGstRate] = useState(18);
  const [manualHsn, setManualHsn] = useState('');

  const getDebitNoteShare = (dn) => {
    const vendor = vendors.find((v) => sameId(v.id, dn.vendor_id));
    const items = debitNoteItems.filter((it) => sameId(it.debit_note_id, dn.id));
    return buildDebitNoteSharePayload(dn, {
      company: companyDetails,
      vendor,
      lineItems: items,
      fromEmail: currentUser?.email,
    });
  };

  const openEditDebitNote = (dn) => {
    const items = debitNoteItems.filter((it) => sameId(it.debit_note_id, dn.id));
    skipDnExpenseAutofillRef.current = true;
    setEditingDebitNoteId(dn.id);
    setShowAddForm(true);
    setDebitNoteNumber(dn.debit_note_number);
    setVendorId(dn.vendor_id != null ? String(dn.vendor_id) : '');
    setExpenseId(dn.original_expense_id != null ? String(dn.original_expense_id) : '');
    setReason(dn.reason || 'Purchase Return');
    setIssueDate(dateOnly(dn.issue_date) || '');
    setDnCurrency(dn.currency || 'INR');
    setDnConversionRate(String(dn.conversion_rate ?? '1.00'));
    if (items.length > 0) {
      setLineItems(items.map((item) => ({
        product_id: item.product_id ? String(item.product_id) : '',
        description: item.description,
        hsn_sac: item.hsn_sac,
        quantity: item.quantity,
        rate: toAmount(item.unit_price),
        line_total: toAmount(item.line_total),
        original_qty: item.quantity,
        original_rate: toAmount(item.unit_price),
        tax_rate_override: item.tax_rate_override ?? dn.tax_rate ?? 18,
      })));
      setManualAmount('');
    } else {
      setLineItems([]);
      setManualAmount(String(dn.subtotal ?? ''));
      setManualGstRate(dn.tax_rate ?? 18);
      setManualDesc(dn.reason || 'Purchase return adjustment');
    }
  };

  const resetDebitNoteForm = () => {
    setEditingDebitNoteId(null);
    setShowAddForm(false);
    setVendorId('');
    setExpenseId('');
    setLineItems([]);
  };

  const vendorExpenses = expenses.filter((exp) => sameId(exp.vendor_id, vendorId));
  const [dnPlaceOfSupply, setDnPlaceOfSupply] = useState(registeredState || 'Gujarat');
  const [dnExportCountry, setDnExportCountry] = useState('');
  const [dnCurrency, setDnCurrency] = useState('INR');
  const [dnConversionRate, setDnConversionRate] = useState('1.00');

  const buildManualDebitLines = () => {
    if (toAmount(manualAmount) <= 0) return [];
    const base = {
      description: manualDesc.trim() || 'Purchase return adjustment',
      hsn_sac: manualHsn || '9997',
      quantity: 1,
      rate: toAmount(manualAmount),
      tax_rate_override: manualGstRate,
      supply_mechanism: 'FCM',
    };
    const t = calcLineTax(base, dnPlaceOfSupply, registeredState);
    return [{ ...base, ...t, line_total: t.taxable, original_qty: 1, original_rate: toAmount(manualAmount) }];
  };

  const effectiveDnLineItems = lineItems.length > 0 ? lineItems : buildManualDebitLines();

  // Time-barred calculation: dated before April 1, 2025
  const isTimeBarred = () => {
    if (!expenseId) return false;
    const origBill = expenses.find((exp) => sameId(exp.id, expenseId));
    if (!origBill) return false;
    return new Date(origBill.expense_date) < new Date('2025-04-01');
  };

  // Auto-fill lines based on original bill selection
  useEffect(() => {
    if (skipDnExpenseAutofillRef.current) {
      skipDnExpenseAutofillRef.current = false;
      return;
    }
    if (expenseId) {
      const origBill = expenses.find((exp) => sameId(exp.id, expenseId));
      if (origBill) {
        const qty = origBill.quantity_purchased || 1;
        const taxable = toAmount(origBill.amount);
        setLineItems([{
          product_id: origBill.product_id ? origBill.product_id.toString() : '',
          description: origBill.description || origBill.expense_head || 'Outward expense item',
          hsn_sac: origBill.hsn_sac || '9997',
          quantity: qty,
          rate: taxable / qty,
          line_total: taxable,
          original_qty: qty,
          original_rate: taxable / qty,
          tax_rate_override: origBill.tax_rate ?? 18,
        }]);
        setDnPlaceOfSupply(origBill.place_of_supply === 'Overseas' ? 'Out of India' : (origBill.place_of_supply || registeredState || 'Gujarat'));
        setDnExportCountry(origBill.export_country || '');
        setDnCurrency(origBill.currency || 'INR');
        setDnConversionRate(String(origBill.conversion_rate ?? '1.00'));
      } else {
        setLineItems([]);
      }
    } else {
      setLineItems([]);
    }
  }, [expenseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!vendorId || expenseId) return;
    if (vendorId === lastDnVendorCurrencyRef.current) return;
    lastDnVendorCurrencyRef.current = vendorId;
    const vendor = vendors.find((v) => sameId(v.id, vendorId));
    if (vendor?.currency) setDnCurrency(vendor.currency);
  }, [vendorId, expenseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLineQtyRateChange = (idx, field, val) => {
    const parsedVal = parseFloat(val || 0);
    const updated = [...lineItems];
    updated[idx][field] = parsedVal;

    if (field === 'quantity') {
      if (parsedVal > updated[idx].original_qty) {
        alert(`Strict Validation Warning: Return quantity cannot exceed original purchase quantity (${updated[idx].original_qty}).`);
        updated[idx].quantity = updated[idx].original_qty;
      }
    }
    if (field === 'rate') {
      if (parsedVal > updated[idx].original_rate) {
        alert(`Strict Validation Warning: Rate adjustment cannot exceed original purchase rate (₹${updated[idx].original_rate}).`);
        updated[idx].rate = updated[idx].original_rate;
      }
    }

    updated[idx].line_total = updated[idx].quantity * updated[idx].rate;
    const t = calcLineTax({ ...updated[idx], tax_rate_override: updated[idx].tax_rate_override || 18 }, dnPlaceOfSupply, registeredState);
    updated[idx] = { ...updated[idx], cgst: t.cgst, sgst: t.sgst, igst: t.igst };
    setLineItems(updated);
  };

  const dnTotals = aggregateLinesTax(
    effectiveDnLineItems.map((l) => ({ ...l, tax_rate_override: l.tax_rate_override || 18, supply_mechanism: 'FCM' })),
    0,
    dnPlaceOfSupply,
    registeredState
  );
  const { subtotal, cgst, sgst, igst, tax_amount: taxAmount, total_amount: totalAmount } = dnTotals;

  const handleSaveDebitNote = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }

    if (!vendorId) return alert('Select a vendor.');
    if (!reason) return alert('Select reason for Debit Note issuance.');
    if (effectiveDnLineItems.length === 0 || totalAmount <= 0) {
      return alert('Enter return line items (link a purchase bill) or fill the manual debit amount section below.');
    }

    if (expenseId && isTimeBarred()) {
      const confirmOverride = window.confirm(
        "STATUTORY COMPLIANCE WARNING:\nThis bill belongs to a prior financial year where the November 30th filing deadline has already passed.\nAre you sure you want to proceed and override this CBIC time-barrier warning?"
      );
      if (!confirmOverride) return;
    }

    if (isExportPlaceOfSupply(dnPlaceOfSupply) && !dnExportCountry.trim()) {
      alert('Validation Failure: Select the destination country for Out of India supply.');
      return;
    }

    const origBill = expenseId ? expenses.find((exp) => sameId(exp.id, expenseId)) : null;

    try {
      const payload = {
        vendor_id: vendorId,
        vendor_name: vendors.find(v => sameId(v.id, vendorId))?.name || 'Supplier',
        original_expense_id: expenseId || null,
        original_expense_number: origBill?.expense_number || '',
        original_expense_date: dateOnly(origBill?.expense_date) || '',
        issue_date: dateOnly(issueDate),
        reason,
        subtotal,
        tax_amount: taxAmount,
        tax_rate: manualGstRate,
        cgst,
        sgst,
        igst,
        total_amount: totalAmount,
        currency: dnCurrency || 'INR',
        export_country: isExportPlaceOfSupply(dnPlaceOfSupply) ? dnExportCountry.trim() : null,
        conversion_rate: parseFloat(dnConversionRate) || 1,
      };
      if (editingDebitNoteId) {
        await updateDebitNote(editingDebitNoteId, payload, effectiveDnLineItems);
      } else {
        await createDebitNote({ ...payload, debit_note_number: debitNoteNumber }, effectiveDnLineItems);
      }
    } catch (err) {
      showApiError(editingDebitNoteId ? 'Updating debit note' : 'Saving debit note', err);
      return;
    }

    alert(editingDebitNoteId ? 'Debit note updated successfully.' : 'Success: Debit Note has been successfully raised! Supplier ledger adjusted, ITC reversed, and stock quantities reversed.');
    resetDebitNoteForm();
  };

  const handleDownloadDebitNotes = (format = 'csv') => {
    let csvContent = 'Debit Note No,Vendor,Original Bill,Date,Reason,Subtotal,CGST,SGST,IGST,Total\n';
    debitNotes.forEach((dn) => {
      const origExp = expenses.find((exp) => sameId(exp.id, dn.original_expense_id));
      const dnPos = origExp?.place_of_supply || registeredState;
      const b = bifurcateStoredTax(dn, dnPos, registeredState);
      csvContent += `"${dn.debit_note_number}","${dn.vendor_name}","${dn.original_expense_number || ''}","${formatDateDDMMYYYY(dn.issue_date)}","${dn.reason}",${dn.subtotal},${b.cgst.toFixed(2)},${b.sgst.toFixed(2)},${b.igst.toFixed(2)},${dn.total_amount}\n`;
    });
    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = 'vouchex_debit_notes.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'DEBIT NOTES', 'vouchex_debit_notes.xls');
    }
  };

  return (
    <div>
      <div className="table-header-row">
        <h3>Debit Note Ledger registries (Purchase Returns)</h3>
        {!showAddForm && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
              Raise Debit Note 📑
            </button>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadDebitNotes('csv')}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadDebitNotes('excel')}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        )}
      </div>

      <InlineVendorModal open={showInlineVendor} onClose={() => setShowInlineVendor(false)} onCreated={(v) => { setVendorId(String(v.id)); setShowInlineVendor(false); }} />

      {showAddForm ? (
        <form onSubmit={handleSaveDebitNote} className="master-form" style={{ marginBottom: '30px' }}>
          <h3 className="form-section-title">Raise Statutory Debit Note</h3>
          
          <div className="form-grid-3">
            <div className="form-group">
              <Req>Debit Note Number</Req>
              <input type="text" className="form-input" value={debitNoteNumber} onChange={(e) => setDebitNoteNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <Req>Select Vendor Profile</Req>
              <select className="form-input" value={vendorId} onChange={(e) => { setVendorId(e.target.value); setExpenseId(''); }}>
                <option value="">-- Click to choose vendor --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <button type="button" className="btn-secondary-sm" style={{ marginTop: 8 }} onClick={() => setShowInlineVendor(true)}>+ Add New Profile</button>
            </div>
            
            <div className="form-group">
              <Opt>Link Original Purchase Bill</Opt>
              <select className="form-input" value={expenseId} onChange={(e) => setExpenseId(e.target.value)} disabled={!vendorId}>
                <option value="">-- Optional: linked vendor bill --</option>
                {vendorExpenses.map(exp => (
                  <option key={exp.id} value={String(exp.id)}>{exp.expense_number} ({exp.invoice_number || exp.description || 'Bill'}) (Total: ₹{formatINR(exp.total_amount)} - Date: {formatDateDDMMYYYY(exp.expense_date)})</option>
                ))}
              </select>
              {vendorId && vendorExpenses.length === 0 && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 6 }}>No purchase bills found for this vendor.</p>
              )}
            </div>

            <div className="form-group">
              <Req>Filing Date of Note</Req>
              <input type="date" className="form-input" value={dateOnly(issueDate)} onChange={(e) => setIssueDate(dateOnly(e.target.value))} />
            </div>
          </div>

          <div className="form-grid-3">
            <PlaceOfSupplyCountrySelect
              placeOfSupply={dnPlaceOfSupply}
              exportCountry={dnExportCountry}
              onPlaceChange={setDnPlaceOfSupply}
              onExportCountryChange={setDnExportCountry}
              onSuggestCurrency={setDnCurrency}
            />
            <CurrencySelect label="Debit note currency" value={dnCurrency} onChange={setDnCurrency} required optionKey="document_currencies" />
            <div className="form-group">
              <Opt>Conversion rate to INR</Opt>
              <input
                type="number"
                min="0"
                step="0.000001"
                className="form-input"
                value={dnConversionRate}
                onChange={(e) => setDnConversionRate(e.target.value)}
                placeholder="1.00"
              />
              <p className="form-hint">GST amounts are computed on line values in {formatCurrencyLabel(dnCurrency)}.</p>
            </div>
          </div>

          {isTimeBarred() && (
            <div className="error-banner" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--accent-red)', color: 'var(--accent-red)', marginBottom: '16px' }}>
              <AlertTriangle size={16} />
              <span>
                <strong>CBIC TIME-BAR WARNING:</strong> The selected purchase bill was issued in a previous financial year (pre-April 2025) and has crossed the November 30th statutory amendment deadline.
              </span>
            </div>
          )}

          <DynamicSelect optionKey="debit_note_reasons" label="Statutory Reason for Raising Note (GST Rule)" value={reason} onChange={setReason} required baseOptions={['Purchase Return', 'Post-Sale Discount', 'Deficiency in Services', 'Correction in Invoice Value / Tax Rate']} manualPlaceholder="Enter statutory reason manually…" />

          {lineItems.length === 0 && (
            <div style={{ marginTop: '20px' }}>
              <div className="form-section-title" style={{ margin: '10px 0' }}>Debit Note Amount (manual entry or after linking bill)</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <Req>Return / adjustment description</Req>
                  <input type="text" className="form-input" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} />
                </div>
                <div className="form-group">
                  <Req>Taxable debit amount (₹)</Req>
                  <AmountInput step="0.01" min="0" className="form-input" value={manualAmount} onChange={setManualAmount} />
                </div>
                <div className="form-group">
                  <Req>GST rate (%)</Req>
                  <select className="form-input" value={manualGstRate} onChange={(e) => setManualGstRate(parseFloat(e.target.value))}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={18}>18%</option>
                    <option value={40}>40%</option>
                  </select>
                </div>
                <div className="form-group">
                  <Opt>HSN / SAC</Opt>
                  <input type="text" className="form-input" value={manualHsn} onChange={(e) => setManualHsn(e.target.value)} placeholder="e.g. 9997" />
                </div>
              </div>
            </div>
          )}

          {lineItems.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div className="form-section-title" style={{ margin: '10px 0' }}>Adjust Quantities or Rates Downwards</div>
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>HSN / SAC</th>
                    <th style={{ textAlign: 'right' }}>Orig Qty</th>
                    <th style={{ textAlign: 'right' }}>Orig Rate (₹)</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Return Qty</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Debit Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Line Total (₹)</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>IGST</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td><input type="text" className="form-input" value={item.description} disabled /></td>
                      <td><input type="text" className="form-input" value={item.hsn_sac} disabled /></td>
                      <td style={{ textAlign: 'right' }}>{item.original_qty}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.original_rate.toLocaleString()}</td>
                      <td>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ textAlign: 'right' }}
                          value={item.quantity} 
                          onChange={(e) => handleLineQtyRateChange(idx, 'quantity', e.target.value)} 
                          max={item.original_qty}
                          min="0"
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-input" 
                          style={{ textAlign: 'right' }}
                          value={item.rate} 
                          onChange={(e) => handleLineQtyRateChange(idx, 'rate', e.target.value)} 
                          max={item.original_rate}
                          min="0"
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{item.line_total.toLocaleString()}
                      </td>
                      <td style={{ fontSize: 11 }}>₹{(item.cgst || 0).toLocaleString()}</td>
                      <td style={{ fontSize: 11 }}>₹{(item.sgst || 0).toLocaleString()}</td>
                      <td style={{ fontSize: 11 }}>₹{(item.igst || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-calculations" style={{ marginTop: '20px' }}>
                <div className="calc-row">
                  <span>Gross Adjusted Subtotal:</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="calc-row"><span>CGST Reversal:</span><span>₹{cgst.toLocaleString()}</span></div>
                <div className="calc-row"><span>SGST Reversal:</span><span>₹{sgst.toLocaleString()}</span></div>
                <div className="calc-row"><span>IGST Reversal:</span><span style={{ color: 'var(--accent-red)' }}>₹{igst.toLocaleString()}</span></div>
                <div className="calc-row grand-total">
                  <span>Total Net Debit Adjustment Value:</span>
                  <span className="calc-val" style={{ color: 'var(--accent-teal)' }}>
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
              Cancel Setup
            </button>
            <button type="submit" className="btn-primary">
              Sign & Save Debit Note
            </button>
          </div>
        </form>
      ) : (
        <div className="premium-table-wrapper registry-ledger-wrap" style={{ marginTop: '20px' }}>
          <table className="premium-table registry-ledger">
            <thead>
              <tr>
                <ExcelColumnFilter
                  label="Document"
                  columnKey="document"
                  className="registry-ledger__doc"
                  values={dnExcelValues.document}
                  sort={dnExcelSort}
                  onSort={setDnExcelSort}
                  selected={dnExcelFilters.document || null}
                  onFilter={(s) => setDnExcelFilterFor('document', s)}
                />
                <ExcelColumnFilter
                  label="Supplier"
                  columnKey="party"
                  className="registry-ledger__party"
                  values={dnExcelValues.party}
                  sort={dnExcelSort}
                  onSort={setDnExcelSort}
                  selected={dnExcelFilters.party || null}
                  onFilter={(s) => setDnExcelFilterFor('party', s)}
                />
                <ExcelColumnFilter
                  label="Settlement"
                  columnKey="amount"
                  className="registry-ledger__settle"
                  values={dnExcelValues.amount}
                  sort={dnExcelSort}
                  onSort={setDnExcelSort}
                  selected={dnExcelFilters.amount || null}
                  onFilter={(s) => setDnExcelFilterFor('amount', s)}
                  valueType="number"
                />
                <ExcelColumnFilter
                  label="Reason"
                  columnKey="reason"
                  className="registry-ledger__meta"
                  values={dnExcelValues.reason}
                  sort={dnExcelSort}
                  onSort={setDnExcelSort}
                  selected={dnExcelFilters.reason || null}
                  onFilter={(s) => setDnExcelFilterFor('reason', s)}
                />
                <ExcelColumnFilter
                  label="Date"
                  columnKey="date"
                  className="registry-ledger__status"
                  values={dnExcelValues.date}
                  sort={dnExcelSort}
                  onSort={setDnExcelSort}
                  selected={dnExcelFilters.date || null}
                  onFilter={(s) => setDnExcelFilterFor('date', s)}
                />
                <th className="registry-ledger__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDebitNotes.map((dn) => {
                const origExp = expenses.find((exp) => sameId(exp.id, dn.original_expense_id));
                const dnPos = dn.place_of_supply || origExp?.place_of_supply || registeredState;
                const dnTax = bifurcateStoredTax(dn, dnPos, registeredState);
                return (
                <tr key={dn.id}>
                  <td className="registry-ledger__doc">
                    <div className="registry-ledger__id">{dn.debit_note_number}</div>
                    <div className="registry-ledger__sub">
                      <span>{dn.original_expense_number || '—'}</span>
                    </div>
                  </td>
                  <td className="registry-ledger__party">
                    <div className="registry-ledger__party-name">{dn.vendor_name}</div>
                  </td>
                  <td className="registry-ledger__settle">
                    <div className="registry-ledger__amount is-out">
                      ₹{toAmount(dn.total_amount).toLocaleString('en-IN')}
                    </div>
                    <div className="registry-ledger__sub">
                      <span>Taxable ₹{toAmount(dn.subtotal).toLocaleString('en-IN')}</span>
                      {dnTax.igst > 0 ? (
                        <span>IGST ₹{dnTax.igst.toLocaleString('en-IN')}</span>
                      ) : (
                        <>
                          <span>CGST ₹{dnTax.cgst.toLocaleString('en-IN')}</span>
                          <span>SGST ₹{dnTax.sgst.toLocaleString('en-IN')}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="registry-ledger__meta">{dn.reason}</td>
                  <td className="registry-ledger__status">{formatDateDDMMYYYY(dn.issue_date)}</td>
                  <td className="registry-ledger__actions registry-actions-cell">
                    <RegistryRowActions
                      onEdit={() => openEditDebitNote(dn)}
                      onView={() => setSelectedDNForPDF(dn)}
                      viewTitle="View debit note PDF"
                      share={getDebitNoteShare(dn)}
                      deleteLabel={`debit note ${dn.debit_note_number}`}
                      onDelete={() => deleteDebitNote(dn.id)}
                      deleteDisabled={isFinancialYearLocked}
                    />
                  </td>
                </tr>
              );})}
              {sortedDebitNotes.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">No Debit Notes raised in purchase/expense accounts.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DYNAMIC DEBIT NOTE PDF PRINT MODAL */}
      {selectedDNForPDF && (() => {
        const matchedDNItems = debitNoteItems.filter(item => sameId(item.debit_note_id, selectedDNForPDF.id));
        return (
          <PdfPrintModal
            onClose={() => setSelectedDNForPDF(null)}
            screenTitle="Printable Debit Note Voucher"
            maxWidth={850}
            closeLabel="Close Note"
            toolbarExtra={
              <DocumentShareToolbar
                share={buildDebitNoteSharePayload(selectedDNForPDF, {
                  company: companyDetails,
                  vendor: vendors.find((v) => sameId(v.id, selectedDNForPDF.vendor_id)),
                  lineItems: matchedDNItems,
                  fromEmail: currentUser?.email,
                })}
              />
            }
          >
            <div className="pdf-print-page">
              <h1 className="pdf-document-title">Debit Note</h1>
              <PdfDocumentHeader
                company={companyDetails}
                rightContent={
                  <>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>DN Number: {selectedDNForPDF.debit_note_number}</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Date: {formatDateDDMMYYYY(selectedDNForPDF.issue_date)}</p>
                  </>
                }
              />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '24px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>Raised Against Vendor:</span>
                    <h4 style={{ color: '#111', margin: '4px 0 0 0', fontSize: '15px' }}>{selectedDNForPDF.vendor_name}</h4>
                    {!isBlankFieldValue(selectedDNForPDF.original_expense_number) && (
                      <p style={{ margin: '4px 0 0 0' }}>Original Purchase Bill Ref: <strong>{selectedDNForPDF.original_expense_number}</strong></p>
                    )}
                    <PdfOptionalLine
                      label="Original Bill Date:"
                      value={formatDateDDMMYYYY(selectedDNForPDF.original_expense_date)}
                      style={{ margin: '2px 0 0 0' }}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#666', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>Reason for Raising:</span>
                    <h5 style={{ color: '#111', margin: '4px 0 0 0', fontSize: '13px' }}>{selectedDNForPDF.reason}</h5>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--accent-red)', fontWeight: 'bold' }}>Status: Approved & Reversed</p>
                  </div>
                </div>

                <table className="pdf-meta-table" style={{ width: '100%', marginTop: '30px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'left' }}>Item Description</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'left' }}>HSN / SAC</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Quantity</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Adjusted Rate (₹)</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Adjusted Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedDNItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.description}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', fontFamily: 'monospace' }}>{item.hsn_sac}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{formatPdfINR(item.unit_price)}</td>
                        <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{formatPdfINR(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '30px' }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    <p><strong>Ledgers Impact:</strong></p>
                    <p>Debit Ledger: Vendor Outstanding Accounts Payable</p>
                    <p>Credit Ledger: Purchase Returns / Input CGST & SGST Credit Reversals</p>
                    <p style={{ marginTop: '8px', fontStyle: 'italic' }}>*This Debit Note has been raised in accordance with GST statutory returns requirements under Section 34 of the CGST Act.</p>
                  </div>
                  <div style={{ textAlign: 'right', borderTop: '2px solid #333', paddingTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>Subtotal Value:</span>
                    <h5 style={{ margin: '2px 0 6px 0', fontSize: '14px', color: '#111' }}>{formatPdfINR(selectedDNForPDF.subtotal)}</h5>
                    
                    <span style={{ fontSize: '12px', color: '#666' }}>GST ITC Reversal ({selectedDNForPDF.tax_rate}%):</span>
                    <h5 style={{ margin: '2px 0 6px 0', fontSize: '14px', color: '#b91c1c' }}>{formatPdfINR(selectedDNForPDF.tax_amount)}</h5>
                    
                    <span style={{ fontSize: '13px', color: '#333', fontWeight: 'bold' }}>Net Debit Value:</span>
                    <h3 style={{ margin: '4px 0', fontSize: '20px', color: '#1d4ed8', fontWeight: 'bold' }}>
                      {formatPdfINR(selectedDNForPDF.total_amount)}
                    </h3>
                  </div>
                </div>
            </div>
          </PdfPrintModal>
        );
      })()}
    </div>
  );
}

// ==========================================
// C. RECEIPT TAB SCREEN
// ==========================================
function ReceiptTab() {

  const { receipts, invoices, customers, createReceipt, updateReceipt, deleteReceipt, companyDetails, isFinancialYearLocked, bankAccounts, cashLedgers, addConsoleLog, creditNotes, payments, currencyConversions, createCurrencyConversion, currentUser, advanceAdjustments, createAdvanceAdjustments } = useSimulator();
  const receiptPaymentModeOptions = [
    ...bankAccounts.map((b) => `Bank: ${b}`),
    ...cashLedgers.map((c) => `Cash: ${c}`),
    'Bank',
    'Cash',
  ];
  
  // UI Sub-tabs inside Receipt Tab
  const [receiptSubTab, setReceiptSubTab] = useState('registry'); // record, advance, registry, dashboard, ageing, forex
  const [receiptFormMode, setReceiptFormMode] = useState('standard'); // standard, bulk
  const [editingAdvanceReceipt, setEditingAdvanceReceipt] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  usePortalFormIntent('receipt', () => {
    setEditingReceiptId(null);
    setEditingAdvanceReceipt(null);
    setReceiptSubTab('record');
    setReceiptFormMode('standard');
  });

  const receiptFormActive = receiptSubTab === 'record' || (receiptSubTab === 'advance' && !!editingAdvanceReceipt);
  useMobileBackHandler(receiptFormActive, () => {
    if (receiptSubTab === 'advance') {
      setEditingAdvanceReceipt(null);
      setReceiptSubTab('registry');
      return true;
    }
    resetReceiptForm();
    setReceiptSubTab('registry');
    return true;
  });

  // Standard Form states
  const [amountReceived, setAmountReceived] = useState('');
  const [amountReceivable, setAmountReceivable] = useState('');
  const [receiptSettleMode, setReceiptSettleMode] = useState('full'); // full | partial
  const [tdsDeducted, setTdsDeducted] = useState('');
  const [discountAllowed, setDiscountAllowed] = useState('');
  const [paymentDate, setPaymentDate] = useState(portalTodayDateOnly());
  const [paymentMode, setPaymentMode] = useState('Bank'); // Cash or Bank
  const [depositTo, setDepositTo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [receiptCurrency, setReceiptCurrency] = useState('INR');

  const [fxDate, setFxDate] = useState(portalTodayDateOnly());
  const [fxInvoiceId, setFxInvoiceId] = useState('');
  const [fxFromCurrency, setFxFromCurrency] = useState('');
  const [fxFromAmount, setFxFromAmount] = useState('');
  const [fxFromLedger, setFxFromLedger] = useState('');
  const [fxToLedger, setFxToLedger] = useState('');
  const [fxRate, setFxRate] = useState('');
  const [fxToInrAmount, setFxToInrAmount] = useState('');
  const [fxReference, setFxReference] = useState('');

  const getReceiptShare = (rec) => {
    const customer = customers.find((c) => sameId(c.id, rec.customer_id));
    return buildReceiptSharePayload(rec, {
      company: companyDetails,
      customer,
      invoices,
      fromEmail: currentUser?.email,
    });
  };

  const bankCashLedgers = [...bankAccounts, ...cashLedgers];
  const forexPendingInvoices = buildForexConversionQueue(invoices, receipts, currencyConversions);
  const selectedForexRow = forexPendingInvoices.find((row) => sameId(row.invoiceId, fxInvoiceId));
  const receiptCurSym = getCurrencySymbol(receiptCurrency);

  useEffect(() => {
    if (bankAccounts.length > 0) {
      setDepositTo(bankAccounts[0]);
      setPaymentMode('Bank');
    } else if (cashLedgers.length > 0) {
      setDepositTo(cashLedgers[0]);
      setPaymentMode('Cash');
    } else {
      setDepositTo('');
    }
  }, [bankAccounts, cashLedgers]);

  // Bulk Allocation Form states
  const [bulkTotalReceived, setBulkTotalReceived] = useState(0);
  const [bulkAllocations, setBulkAllocations] = useState([]); // Array of { invoice_id, invoice_number, amount_received, tds_deducted, discount_allowed, pending_balance }

  // PDF Voucher Preview
  const [selectedReceiptForPDF, setSelectedReceiptForPDF] = useState(null);
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const skipReceiptInvoiceAutofillRef = useRef(false);
  const receiptAutofillInvoiceRef = useRef(null);

  // Filters for Pending Invoices list
  const [filterCustomer, setFilterCustomer] = useState('');

  // Helper date parsing/matching logic
  const parseDate = (dStr) => new Date(dStr);
  const today = portalToday(); // Fixed current mock date

  // 1. Calculations for receipts dashboard
  const totalReceiptsVal = sumField(receipts, 'amount_received');

  const totalPendingReceivables = invoices
    .filter((inv) => inv.status !== 'Cancelled')
    .reduce((sum, inv) => sum + invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments), 0);

  const {
    bankBalance: receiptBankBalance,
    cashBalance: receiptCashBalance,
    hasBankLedgers: receiptHasBanks,
    hasCashLedgers: receiptHasCash,
  } = computeBankCashBalances(receipts, payments, bankAccounts, cashLedgers);

  // Customer-wise receipts summaries
  const customerReceiptsSummary = customers.map((cust) => {
    const totalRec = sumField(
      receipts.filter((r) => Number(r.customer_id) === Number(cust.id)),
      'amount_received'
    );
    const totalPending = invoices
      .filter((inv) => sameId(inv.customer_id, cust.id) && inv.status !== 'Cancelled')
      .reduce((sum, inv) => sum + invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments), 0);
    return { name: cust.name, received: totalRec, pending: totalPending };
  });

  // 2. Debtor Ageing Analysis computation (0-30, 31-60, 60-90, 90+ days)
  const calculateAgeing = () => {
    const ageing = { '0-30': 0, '31-60': 0, '60-90': 0, '90+': 0 };
    const refDay = portalTodayDateOnly();

    invoices.forEach((inv) => {
      if (!['Unpaid', 'Partially Paid'].includes(inv.status) || inv.status === 'Cancelled') return;
      const outstanding = invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments);
      if (outstanding <= 0) return;

      const dueRef = inv.due_date || inv.issue_date;
      const daysPast = daysOverdue(refDay, dueRef);
      if (daysPast < 0) {
        ageing['0-30'] += outstanding;
        return;
      }
      const bucket = receivableAgeingBucket(daysPast);
      ageing[bucket] += outstanding;
    });

    return ageing;
  };

  const ageingData = calculateAgeing();

  // 3. Outstanding invoice list with filter (by customer / date, outstanding balance)
  const pendingInvoices = invoices
    .filter((inv) => {
      if (inv.status === 'Cancelled') return false;
      if (filterCustomer && !sameId(inv.customer_id, filterCustomer)) return false;
      const issueDay = dateOnly(inv.issue_date);
      if (filterStartDate && issueDay < filterStartDate) return false;
      if (filterEndDate && issueDay > filterEndDate) return false;
      return true;
    })
    .map((inv) => ({
      ...inv,
      outstanding: invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments),
    }))
    .filter((inv) => inv.outstanding > 0.009);

  const filteredRegistryReceiptsBase = useMemo(
    () =>
      sortRegistryNewestFirst(
        receipts.filter((rec) => {
          if (filterCustomer && !sameId(rec.customer_id, filterCustomer)) return false;
          const payDay = dateOnly(rec.payment_date);
          if (filterStartDate && payDay < filterStartDate) return false;
          if (filterEndDate && payDay > filterEndDate) return false;
          return true;
        }),
        'payment_date'
      ),
    [receipts, filterCustomer, filterStartDate, filterEndDate]
  );

  const receiptExcelGetters = useMemo(
    () => ({
      document: (r) => r.receipt_number || '',
      party: (r) => r.customer_name || '',
      invoice: (r) => receiptSettledInvoiceLabel(r, invoices),
      date: (r) => r.payment_date || '',
      mode: (r) => r.payment_mode || '',
      amount: (r) => toAmount(r.amount_received),
    }),
    [invoices]
  );
  const receiptExcelFilterGetters = useMemo(
    () => ({
      ...receiptExcelGetters,
      date: (r) => formatDateDDMMYYYY(r.payment_date),
      amount: (r) => `₹${toAmount(r.amount_received).toLocaleString('en-IN')}`,
    }),
    [receiptExcelGetters]
  );
  const {
    excelSort: receiptExcelSort,
    setExcelSort: setReceiptExcelSort,
    excelFilters: receiptExcelFilters,
    setExcelFilterFor: setReceiptExcelFilterFor,
    columnValues: receiptExcelValues,
    displayedRows: filteredRegistryReceipts,
  } = useExcelTableState(filteredRegistryReceiptsBase, receiptExcelGetters, receiptExcelFilterGetters);

  // 4. Form options
  const filteredUnpaidInvoices = invoices.filter(
    (inv) => sameId(inv.customer_id, customerId) && ['Unpaid', 'Partially Paid'].includes(inv.status)
  );

  const getPendingAmount = () => {
    if (!invoiceId) return 0;
    const inv = invoices.find((i) => sameId(i.id, invoiceId));
    if (!inv) return 0;
    let outstanding = invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments);
    if (editingReceiptId) {
      const editing = receipts.find((r) => sameId(r.id, editingReceiptId));
      if (editing && sameId(editing.invoice_id, invoiceId)) {
        outstanding += receiptSettlementTotal(editing);
      }
    }
    return outstanding;
  };

  const openEditReceipt = (rec) => {
    if (rec.is_advance) {
      setEditingAdvanceReceipt(rec);
      setReceiptSubTab('advance');
      return;
    }
    skipReceiptInvoiceAutofillRef.current = true;
    setEditingReceiptId(rec.id);
    setReceiptSubTab('record');
    setReceiptFormMode('standard');
    setCustomerId(rec.customer_id != null ? String(rec.customer_id) : '');
    setInvoiceId(rec.invoice_id != null ? String(rec.invoice_id) : '');
    setPaymentDate(dateOnly(rec.payment_date) || portalTodayDateOnly());
    setPaymentMode(rec.payment_mode || 'Bank');
    setDepositTo(rec.deposit_to || '');
    setReferenceNo(rec.reference_no && rec.reference_no !== 'NIL' ? rec.reference_no : '');
    setReceiptCurrency(rec.currency || 'INR');
    setAmountReceivable(receiptSettlementTotal(rec));
    setTdsDeducted(rec.tds_deducted ?? '');
    setDiscountAllowed(rec.discount_allowed ?? '');
    setAmountReceived(rec.amount_received);
    // Detect partial vs full against current outstanding (+ this receipt's settlement).
    const inv = invoices.find((i) => sameId(i.id, rec.invoice_id));
    let outstanding = inv ? invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments) : 0;
    outstanding += receiptSettlementTotal(rec);
    const settled = receiptSettlementTotal(rec);
    setReceiptSettleMode(settled + 0.009 < outstanding ? 'partial' : 'full');
  };

  const resetReceiptForm = () => {
    setEditingReceiptId(null);
    setCustomerId('');
    setInvoiceId('');
    setReferenceNo('');
    setReceiptCurrency('INR');
    setAmountReceivable('');
    setAmountReceived('');
    setTdsDeducted('');
    setDiscountAllowed('');
    setReceiptSettleMode('full');
  };

  const applyReceiptSettleMode = (mode) => {
    setReceiptSettleMode(mode);
    if (!invoiceId) return;
    const pending = getPendingAmount();
    if (mode === 'full') {
      setAmountReceivable(pending > 0 ? pending : '');
      setTdsDeducted('');
      setDiscountAllowed('');
    } else if (Math.abs(toAmount(amountReceivable) - pending) < 0.02) {
      // Clear full autofill so user enters the partial amount intentionally.
      setAmountReceivable('');
      setAmountReceived('');
    }
  };

  const linkedReceiptInvoice = invoiceId
    ? invoices.find((i) => sameId(i.id, invoiceId))
    : null;
  const receiptTdsBase = linkedReceiptInvoice && toAmount(amountReceivable) > 0
    ? tdsBaseForSettlement(linkedReceiptInvoice, amountReceivable)
    : 0;
  const receiptNetCash = netCashFromSettlement(amountReceivable, tdsDeducted, discountAllowed);

  const applyForexInvoiceRow = (row) => {
    if (!row) return;
    setFxInvoiceId(String(row.invoiceId));
    setFxFromCurrency(row.currency);
    setFxFromAmount(String(row.remaining));
    setFxFromLedger(row.defaultFromLedger || bankCashLedgers[0] || '');
    setFxRate('');
    setFxToInrAmount('');
    setFxReference('');
    if (!fxToLedger && bankAccounts.length > 0) setFxToLedger(bankAccounts[0]);
  };

  useEffect(() => {
    if (!fxToLedger && bankAccounts.length > 0) setFxToLedger(bankAccounts[0]);
  }, [bankAccounts, fxToLedger]);

  useEffect(() => {
    const from = toAmount(fxFromAmount);
    const rate = toAmount(fxRate);
    if (from > 0 && rate > 0) setFxToInrAmount(Math.round(from * rate * 100) / 100);
  }, [fxFromAmount, fxRate]);

  useEffect(() => {
    if (receiptFormMode !== 'standard' || !invoiceId || editingReceiptId) return;
    if (receiptSettleMode !== 'full') return;
    setAmountReceivable(getPendingAmount());
  }, [invoiceId, receiptFormMode, editingReceiptId, receiptSettleMode]);

  useEffect(() => {
    if (skipReceiptInvoiceAutofillRef.current) {
      skipReceiptInvoiceAutofillRef.current = false;
      return;
    }
    if (receiptFormMode !== 'standard') return;

    const prevInvoice = receiptAutofillInvoiceRef.current;
    receiptAutofillInvoiceRef.current = invoiceId;
    if (prevInvoice === invoiceId && invoiceId) return;

    if (invoiceId && !editingReceiptId) {
      const inv = invoices.find((i) => sameId(i.id, invoiceId));
      const pending = getPendingAmount();
      setReceiptSettleMode('full');
      setAmountReceivable(pending);
      setTdsDeducted('');
      setDiscountAllowed('');
      setAmountReceived(pending);
      if (inv?.currency) setReceiptCurrency(inv.currency || 'INR');
    } else if (!invoiceId) {
      setAmountReceivable('');
      setAmountReceived('');
      setTdsDeducted('');
      setDiscountAllowed('');
      setReceiptSettleMode('full');
    }
  }, [invoiceId, receiptFormMode, editingReceiptId]);

  useEffect(() => {
    if (receiptFormMode !== 'standard' || !invoiceId) return;
    setAmountReceived(netCashFromSettlement(amountReceivable, tdsDeducted, discountAllowed));
  }, [amountReceivable, tdsDeducted, discountAllowed, receiptFormMode, invoiceId]);

  // Load bulk invoices on customer select
  useEffect(() => {
    if (receiptFormMode === 'bulk' && customerId) {
      const clientInvs = invoices.filter(
        (inv) => sameId(inv.customer_id, customerId) && ['Unpaid', 'Partially Paid'].includes(inv.status)
      ).map((inv) => {
        return {
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          amount_received: 0,
          tds_deducted: 0,
          discount_allowed: 0,
          pending_balance: invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments),
        };
      });
      setBulkAllocations(clientInvs);
      setBulkTotalReceived(0);
    }
  }, [customerId, receiptFormMode, invoices]);

  // Handle standard receipt save
  const handleSaveReceipt = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }
    if (!customerId) { alert('Select client company.'); return; }
    if (receiptFormMode === 'standard' && !invoiceId) { alert('Select outstanding invoice.'); return; }
    if (receiptFormMode === 'standard') {
      const pending = getPendingAmount();
      const receivable = toAmount(amountReceivable);
      const cash = toAmount(amountReceived);
      const tds = toAmount(tdsDeducted);
      const disc = toAmount(discountAllowed);
      if (receivable <= 0) { alert('Amount receivable must be positive.'); return; }
      if (receivable > pending + 0.009) {
        alert(`Amount receivable (${formatDocumentMoney(receivable, receiptCurrency)}) cannot exceed outstanding balance of ${formatDocumentMoney(pending, receiptCurrency)}.`);
        return;
      }
      if (Math.abs(settlementFromComponents(cash, tds, disc) - receivable) > 0.02) {
        alert(`Settlement mismatch: ${formatDocumentMoney(cash, receiptCurrency)} cash + ${formatDocumentMoney(tds, receiptCurrency)} TDS + ${formatDocumentMoney(disc, receiptCurrency)} discount must equal ${formatDocumentMoney(receivable, receiptCurrency)} receivable.`);
        return;
      }
      if (cash <= 0) { alert('Net amount received must be positive.'); return; }
    } else if (toAmount(amountReceived) <= 0) {
      alert('Received amount must be positive.');
      return;
    }

    const selectedClient = customers.find(c => c.id === parseInt(customerId));
    const receiptPayload = {
      payment_date: dateOnly(paymentDate),
      amount_received: toAmount(amountReceived),
      tds_deducted: toAmount(tdsDeducted),
      discount_allowed: toAmount(discountAllowed),
      currency: receiptCurrency || 'INR',
      payment_mode: paymentMode,
      deposit_to: depositTo,
      reference_no: referenceNo,
    };

    if (editingReceiptId) {
      try {
        await updateReceipt(editingReceiptId, receiptPayload);
      } catch (err) {
        showApiError('Updating receipt', err);
        return;
      }
      resetReceiptForm();
      setReceiptSubTab('registry');
      return;
    }
    
    if (receiptFormMode === 'standard') {
      const selectedInv = invoices.find(i => i.id === parseInt(invoiceId));
      try {
        await createReceipt({
          invoice_id: invoiceId,
          invoice_number: selectedInv ? selectedInv.invoice_number : '',
          customer_id: customerId,
          customer_name: selectedClient ? selectedClient.name : '',
          payment_date: dateOnly(paymentDate),
          amount_received: toAmount(amountReceived),
          tds_deducted: toAmount(tdsDeducted),
          discount_allowed: toAmount(discountAllowed),
          currency: receiptCurrency || 'INR',
          payment_mode: paymentMode,
          deposit_to: depositTo,
          reference_no: referenceNo,
          is_advance: false,
        });
      } catch (err) {
        showApiError('Saving receipt', err);
        return;
      }
    }

    resetReceiptForm();
    setReceiptSubTab('registry');
  };

  const handleSaveForexConversion = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert('SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.');
      return;
    }
    if (!fxInvoiceId) return alert('Select an invoice with foreign currency receipts pending conversion.');
    if (!fxFromLedger || !fxToLedger) return alert('Select source and destination ledgers.');
    if (toAmount(fxFromAmount) <= 0 || toAmount(fxToInrAmount) <= 0) return alert('Enter valid FC amount and INR amount.');
    if (toAmount(fxRate) <= 0) return alert('Enter a valid conversion rate.');

    try {
      await createCurrencyConversion({
        conversion_date: dateOnly(fxDate),
        invoice_id: parseInt(fxInvoiceId, 10),
        invoice_number: selectedForexRow?.invoiceNumber || '',
        from_currency: fxFromCurrency,
        from_amount: toAmount(fxFromAmount),
        to_amount: toAmount(fxToInrAmount),
        conversion_rate: toAmount(fxRate),
        from_ledger: fxFromLedger,
        to_ledger: fxToLedger,
        reference_no: fxReference || null,
      });
      alert('Forex conversion recorded successfully.');
      setFxInvoiceId('');
      setFxFromAmount('');
      setFxRate('');
      setFxToInrAmount('');
      setFxReference('');
    } catch (err) {
      showApiError('Saving forex conversion', err);
    }
  };

  // Handle bulk receipt allocations
  const handleBulkAllocationChange = (index, field, val) => {
    const updated = [...bulkAllocations];
    updated[index][field] = parseFloat(val || 0);
    setBulkAllocations(updated);

    // Dynamic sum total received
    const sum = updated.reduce((s, a) => s + a.amount_received, 0);
    setBulkTotalReceived(sum);
  };

  const handleSaveBulkReceipt = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }
    if (!customerId) { alert('Select customer profile first.'); return; }
    if (bulkTotalReceived <= 0) { alert('Total received amount must be positive.'); return; }

    // Validation allocations
    let hasError = false;
    bulkAllocations.forEach(alloc => {
      const sum = alloc.amount_received + alloc.tds_deducted + alloc.discount_allowed;
      if (sum > alloc.pending_balance) {
        alert(`Validation Failure: Allocations for INV-${alloc.invoice_number} (₹${sum}) cannot exceed pending outstanding balance of ₹${alloc.pending_balance}.`);
        hasError = true;
      }
    });

    if (hasError) return;

    const activeAllocations = bulkAllocations.filter(a => a.amount_received > 0 || a.tds_deducted > 0 || a.discount_allowed > 0);

    if (activeAllocations.length === 0) {
      alert('Please allocate at least some payment against pending invoices.');
      return;
    }

    try {
      await createReceipt({
        is_bulk: true,
        customer_id: customerId,
        customer_name: selectedClient ? selectedClient.name : '',
        payment_date: dateOnly(paymentDate),
        amount_received: bulkTotalReceived,
        payment_mode: paymentMode,
        deposit_to: depositTo,
        reference_no: referenceNo,
        allocations: activeAllocations,
      });
    } catch (err) {
      showApiError('Saving bulk receipt', err);
      return;
    }

    setReceiptSubTab('registry');
    setCustomerId('');
    setBulkAllocations([]);
    setBulkTotalReceived(0);
    setReferenceNo('');
  };

  const handleDownloadReceipts = (format = 'csv') => {
    let csvContent = "Receipt Voucher No.,Client Name,Settled Invoice,Voucher Date,Payment Mode,Deposited To,Cheque/UTR,TDS (₹),Discounts (₹),Amount Received (₹)\n";
    filteredRegistryReceipts.forEach(rec => {
      const settled = receiptSettledInvoiceLabel(rec, invoices);
      csvContent += `"${rec.receipt_number}","${rec.customer_name}","${settled}","${formatDateDDMMYYYY(rec.payment_date)}","${rec.payment_mode}","${rec.deposit_to || 'Bank'}",` +
        `"${rec.reference_no}",${parseFloat(rec.tds_deducted || 0).toFixed(2)},${parseFloat(rec.discount_allowed || 0).toFixed(2)},${rec.amount_received.toFixed(2)}\n`;
    });

    const reportType = "receipt_vouchers_registry";
    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${reportType}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'RECEIPTS', `vouchex_${reportType}.xls`);
    }

    addConsoleLog('event', `GET /api/receipts/download?format=${format}`, `Exported receipts list as ${format.toUpperCase()} spreadsheet.`);
  };

  return (
    <div>
      {/* RECEIPTS TABS HEADER */}
      <MobileReceiptNav
        active={receiptSubTab}
        onSelect={(tab) => {
          setReceiptSubTab(tab);
          if (tab === 'advance') setEditingAdvanceReceipt(null);
        }}
      />
      <div className="tab-nav-sub desktop-subtabs">
        <button className={`sub-tab-btn ${receiptSubTab === 'record' ? 'active' : ''}`} onClick={() => { setReceiptSubTab('record'); setReceiptFormMode('standard'); setEditingReceiptId(null); }}>
          Record Receipt
        </button>
        <button className={`sub-tab-btn ${receiptSubTab === 'advance' ? 'active' : ''}`} onClick={() => { setReceiptSubTab('advance'); setEditingAdvanceReceipt(null); }}>
          Record Advance
        </button>
        <button className={`sub-tab-btn ${receiptSubTab === 'registry' ? 'active' : ''}`} onClick={() => setReceiptSubTab('registry')}>
          Collections Registry
        </button>
        <button className={`sub-tab-btn ${receiptSubTab === 'dashboard' ? 'active' : ''}`} onClick={() => setReceiptSubTab('dashboard')}>
          Collections Dashboard
        </button>
        <button className={`sub-tab-btn ${receiptSubTab === 'ageing' ? 'active' : ''}`} onClick={() => setReceiptSubTab('ageing')}>
          Debtor Ageing Analysis
        </button>
        <button className={`sub-tab-btn ${receiptSubTab === 'forex' ? 'active' : ''}`} onClick={() => setReceiptSubTab('forex')}>
          Forex Conversion
        </button>
      </div>

      {receiptSubTab === 'forex' && (
        <div className="master-form">
          <h3 className="form-section-title">Foreign Currency → INR Conversion</h3>
          <p className="form-hint" style={{ marginBottom: '16px', fontSize: '12px' }}>
            Record conversion of foreign currency collected against export / FC invoices. Only invoices with FC receipts not yet fully converted appear below.
          </p>

          {forexPendingInvoices.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No foreign currency receipts pending conversion.</p>
          ) : (
            <>
              <div className="premium-table-wrapper" style={{ marginBottom: '20px' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Currency</th>
                      <th style={{ textAlign: 'right' }}>FC Received</th>
                      <th style={{ textAlign: 'right' }}>Already Converted</th>
                      <th style={{ textAlign: 'right' }}>Pending</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {forexPendingInvoices.map((row) => (
                      <tr key={row.invoiceId}>
                        <td style={{ fontFamily: 'monospace' }}>{row.invoiceNumber}</td>
                        <td>{row.customerName}</td>
                        <td>{row.currency}</td>
                        <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.fcReceived, row.currency)}</td>
                        <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.fcConverted, row.currency)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatDocumentMoney(row.remaining, row.currency)}</td>
                        <td>
                          <button type="button" className="btn-secondary-sm" onClick={() => applyForexInvoiceRow(row)}>
                            Convert
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleSaveForexConversion}>
                <div className="form-grid-3">
                  <div className="form-group">
                    <Req>Invoice</Req>
                    <select className="form-input" value={fxInvoiceId} onChange={(e) => {
                      const row = forexPendingInvoices.find((r) => sameId(r.invoiceId, e.target.value));
                      if (row) applyForexInvoiceRow(row);
                      else setFxInvoiceId(e.target.value);
                    }}>
                      <option value="">— Select invoice —</option>
                      {forexPendingInvoices.map((row) => (
                        <option key={row.invoiceId} value={row.invoiceId}>
                          {row.invoiceNumber} — {formatDocumentMoney(row.remaining, row.currency)} pending
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <Req>Conversion date</Req>
                    <input type="date" className="form-input" value={dateOnly(fxDate)} onChange={(e) => setFxDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>From currency</label>
                    <input className="form-input" value={fxFromCurrency} readOnly />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <Req>FC amount to convert</Req>
                    <AmountInput noSpinner value={fxFromAmount} onChange={setFxFromAmount} />
                  </div>
                  <div className="form-group">
                    <Req>Rate to INR</Req>
                    <AmountInput noSpinner value={fxRate} onChange={setFxRate} />
                    {fxFromCurrency && fxFromCurrency !== 'INR' && (
                      <RbiReferenceRateHint currency={fxFromCurrency} date={fxDate} onUseRate={setFxRate} />
                    )}
                  </div>
                  <div className="form-group">
                    <Req>INR amount received</Req>
                    <AmountInput noSpinner value={fxToInrAmount} onChange={setFxToInrAmount} />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <Req>From ledger (FC)</Req>
                    <select className="form-input" value={fxFromLedger} onChange={(e) => setFxFromLedger(e.target.value)}>
                      <option value="">— Select —</option>
                      {bankCashLedgers.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <Req>To ledger (INR)</Req>
                    <select className="form-input" value={fxToLedger} onChange={(e) => setFxToLedger(e.target.value)}>
                      <option value="">— Select —</option>
                      {bankAccounts.map((l) => <option key={l} value={l}>{l}</option>)}
                      {cashLedgers.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <Opt>Reference no.</Opt>
                    <input className="form-input" value={fxReference} onChange={(e) => setFxReference(e.target.value)} placeholder="Bank ref / UTR" />
                  </div>
                </div>
                <div className="btn-row">
                  <button type="submit" className="btn-primary">Record Forex Conversion</button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {receiptSubTab === 'dashboard' && (
        <div>
          {/* STATS METRIC COUNTER ROW */}
          <div className="dashboard-grid">
            <div className="metric-card receipts">
              <div className="metric-header">
                <span>Total Collected Receipts</span>
                <div className="metric-icon-bg"><Receipt size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: 'var(--accent-teal)' }}>₹{formatINR(totalReceiptsVal)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                All-time Payment Inflow
              </span>
            </div>

            <div className="metric-card pending-receipts">
              <div className="metric-header">
                <span>Total Pending Receivables</span>
                <div className="metric-icon-bg"><AlertTriangle size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: 'var(--accent-amber)' }}>₹{formatINR(totalPendingReceivables)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Debtors Outstanding Book
              </span>
            </div>

            {receiptHasCash && (
              <div className="metric-card income">
                <div className="metric-header">
                  <span>Cash Drawer ledger Balance</span>
                  <div className="metric-icon-bg"><TrendingUp size={16} /></div>
                </div>
                <span className="metric-value">₹{formatINR(receiptCashBalance)}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Collections to cash ledgers
                </span>
              </div>
            )}

            {receiptHasBanks && (
              <div className="metric-card profit">
                <div className="metric-header">
                  <span>Bank Ledger Balances</span>
                  <div className="metric-icon-bg"><CreditCard size={16} /></div>
                </div>
                <span className="metric-value" style={{ color: 'var(--accent-blue)' }}>₹{formatINR(receiptBankBalance)}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Collections to bank ledgers
                </span>
              </div>
            )}
          </div>

          {/* CUSTOMER-WISE SUMMARY TABLE */}
          <div className="table-card" style={{ marginTop: '24px' }}>
            <h3 className="chart-title">Customer-Wise Ledger Balance Sheet</h3>
            <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Customer / Company Legal Name</th>
                    <th>Total Payments Collected (₹)</th>
                    <th>Outstanding Debt Balance (₹)</th>
                    <th>Risk Exposure Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReceiptsSummary.map((sum, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 'bold' }}>{sum.name}</td>
                      <td style={{ color: 'var(--accent-teal)' }}>₹{formatINR(sum.received)}</td>
                      <td style={{ color: sum.pending > 100000 ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                        ₹{formatINR(sum.pending)}
                      </td>
                      <td>
                        {sum.pending === 0 ? (
                          <span className="status-badge paid">Cleared</span>
                        ) : sum.pending > 200000 ? (
                          <span className="status-badge unpaid">High Risk</span>
                        ) : (
                          <span className="status-badge partially paid">Medium Risk</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {receiptSubTab === 'ageing' && (
        <div>
          {/* DEBTOR AGEING VISUAL CHART CARD */}
          <div className="chart-card" style={{ marginBottom: '24px', minHeight: '260px' }}>
            <div className="chart-header">
              <h3 className="chart-title">Outstanding Debtor Ageing Intervals (2D graphic scales)</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Calculation as of: {formatDateDDMMYYYY(portalTodayDateOnly())}</span>
            </div>
            <div className="chart-area" style={{ minHeight: '160px' }}>
              <div className="chart-bar-container">
                <span className="chart-bar-value" style={{ fontSize: '11px' }}>₹{Math.round(toAmount(ageingData['0-30']) / 1000)}k</span>
                <div className="chart-bar" style={{ height: `${Math.max(5, (toAmount(ageingData['0-30']) / Math.max(1, totalPendingReceivables)) * 100)}%`, backgroundColor: 'var(--accent-green)' }}></div>
                <span className="chart-bar-label">0-30 Days</span>
              </div>
              <div className="chart-bar-container">
                <span className="chart-bar-value" style={{ fontSize: '11px' }}>₹{Math.round(toAmount(ageingData['31-60']) / 1000)}k</span>
                <div className="chart-bar" style={{ height: `${Math.max(5, (toAmount(ageingData['31-60']) / Math.max(1, totalPendingReceivables)) * 100)}%`, backgroundColor: 'var(--accent-teal)' }}></div>
                <span className="chart-bar-label">31-60 Days</span>
              </div>
              <div className="chart-bar-container">
                <span className="chart-bar-value" style={{ fontSize: '11px' }}>₹{Math.round(toAmount(ageingData['60-90']) / 1000)}k</span>
                <div className="chart-bar" style={{ height: `${Math.max(5, (toAmount(ageingData['60-90']) / Math.max(1, totalPendingReceivables)) * 100)}%`, backgroundColor: 'var(--accent-amber)' }}></div>
                <span className="chart-bar-label">61-90 Days</span>
              </div>
              <div className="chart-bar-container">
                <span className="chart-bar-value" style={{ fontSize: '11px' }}>₹{Math.round(toAmount(ageingData['90+']) / 1000)}k</span>
                <div className="chart-bar" style={{ height: `${Math.max(5, (toAmount(ageingData['90+']) / Math.max(1, totalPendingReceivables)) * 100)}%`, backgroundColor: 'var(--accent-red)' }}></div>
                <span className="chart-bar-label">90+ Days</span>
              </div>
            </div>
          </div>

          {/* AGEING SUMMARY TABLE */}
          <div className="table-card">
            <h3 className="chart-title">Aging Interval Details Report</h3>
            <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Ageing Bracket Interval</th>
                    <th>Combined Outstanding Balance (₹)</th>
                    <th>Risk Class Recommendation</th>
                    <th>Legal Penalty Notice Interest</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>0 to 30 Days (Current)</strong></td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>₹{formatINR(ageingData['0-30'])}</td>
                    <td><span className="status-badge paid">Safe / Low Risk</span></td>
                    <td>0% Interest Accrued</td>
                  </tr>
                  <tr>
                    <td><strong>31 to 60 Days (Slightly Overdue)</strong></td>
                    <td style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>₹{formatINR(ageingData['31-60'])}</td>
                    <td><span className="status-badge partially paid">Standard / Follow Up</span></td>
                    <td>0% Grace Period Active</td>
                  </tr>
                  <tr>
                    <td><strong>61 to 90 Days (Late Recovery)</strong></td>
                    <td style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>₹{formatINR(ageingData['60-90'])}</td>
                    <td><span className="status-badge partially paid" style={{ color: 'var(--accent-amber)' }}>Medium Risk Credit Check</span></td>
                    <td>12% p.a. Penal Interest</td>
                  </tr>
                  <tr>
                    <td><strong>90+ Days (Bad Debt Threat)</strong></td>
                    <td style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>₹{formatINR(ageingData['90+'])}</td>
                    <td><span className="status-badge unpaid">Severe Risk Legal Notice</span></td>
                    <td>18% p.a. Overdue Interest</td>
                  </tr>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <td><strong>Total outstanding Debts Book</strong></td>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{formatINR(totalPendingReceivables)}</td>
                    <td><span style={{ fontSize: '11px', fontWeight: 'bold' }}>Combined Debits</span></td>
                    <td>Compliance Ledger locked</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {receiptSubTab === 'record' && (
        <div className="master-form" style={{ marginBottom: '30px' }}>
          <h3 className="form-section-title">Record Collection Receipt Voucher</h3>
          {receiptFormMode === 'standard' && (
            <form onSubmit={handleSaveReceipt}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Select Customer Profile*</label>
                  <select className="form-input" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setInvoiceId(''); }}>
                    <option value="">-- Choose client company --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Choose Unpaid Invoice*</label>
                  <select className="form-input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} disabled={!customerId}>
                    <option value="">-- Select outstanding invoice --</option>
                    {filteredUnpaidInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} (Outstanding: {formatDocumentMoney(invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments), inv.currency || 'INR')})
                      </option>
                    ))}
                  </select>
                </div>
                <CurrencySelect label="Receipt currency" value={receiptCurrency} onChange={setReceiptCurrency} required />
                <div className="form-group">
                  <label>Settlement type*</label>
                  <SettlementModeToggle
                    value={receiptSettleMode}
                    onChange={applyReceiptSettleMode}
                    fullLabel="Full receipt"
                    partialLabel="Partial receipt"
                    ariaLabel="Receipt settlement type"
                  />
                  <p className="form-hint">
                    {receiptSettleMode === 'partial'
                      ? 'Enter only the portion being collected now. Remaining balance stays on the invoice.'
                      : 'Clears the full outstanding balance on this invoice (after TDS / discount).'}
                  </p>
                </div>
                <div className="form-group">
                  <label>
                    {receiptSettleMode === 'partial'
                      ? `Partial amount to settle (${receiptCurSym})*`
                      : `Amount Receivable (${receiptCurSym})*`}
                  </label>
                  <AmountInput
                    noSpinner
                    className="form-input"
                    value={amountReceivable}
                    onChange={(v) => {
                      setAmountReceivable(v);
                      const pending = getPendingAmount();
                      if (pending > 0 && toAmount(v) + 0.009 < pending) {
                        setReceiptSettleMode('partial');
                      } else if (pending > 0 && Math.abs(toAmount(v) - pending) < 0.02) {
                        setReceiptSettleMode('full');
                      }
                    }}
                    placeholder={
                      receiptSettleMode === 'partial'
                        ? 'Enter partial settlement amount'
                        : 'Outstanding / partial settlement'
                    }
                    readOnly={receiptSettleMode === 'full' && !!invoiceId}
                    style={
                      receiptSettleMode === 'full' && invoiceId
                        ? { backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }
                        : undefined
                    }
                  />
                  {invoiceId && (
                    <p className="form-hint" style={{ marginTop: 4 }}>
                      Outstanding on bill: {formatDocumentMoney(getPendingAmount(), receiptCurrency)}
                      {receiptSettleMode === 'partial' && toAmount(amountReceivable) > 0 && (
                        <>
                          {' · '}Remaining after this:{' '}
                          {formatDocumentMoney(
                            Math.max(0, getPendingAmount() - toAmount(amountReceivable)),
                            receiptCurrency
                          )}
                        </>
                      )}
                    </p>
                  )}
                </div>
                <TdsPercentAmountFields
                  baseAmount={receiptTdsBase}
                  tdsAmount={tdsDeducted}
                  onTdsAmountChange={setTdsDeducted}
                  currency={receiptCurrency}
                  percentLabel="TDS rate deducted by customer"
                  amountLabel="TDS tax deducted by customer"
                  amountPlaceholder="TDS amount"
                />
                <div className="form-group" style={{ maxWidth: '320px' }}>
                  <label>Pre-negotiated Discounts Allowed ({receiptCurSym})</label>
                  <AmountInput
                    noSpinner
                    className="form-input"
                    value={discountAllowed}
                    onChange={setDiscountAllowed}
                    placeholder="Adjustment / Cash write-off discount"
                  />
                </div>
                <div className="form-group">
                  <label>Net Amount Received ({receiptCurSym})*</label>
                  <AmountInput
                    noSpinner
                    className="form-input"
                    value={amountReceived}
                    readOnly
                    style={{ backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }}
                  />
                </div>
                {toAmount(amountReceivable) > 0 && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <SettlementBreakdown
                      currency={receiptCurrency}
                      settlement={amountReceivable}
                      tds={tdsDeducted}
                      discount={discountAllowed}
                      netCash={receiptNetCash}
                    />
                  </div>
                )}
              </div>
              <div className="form-grid-4">
                <div className="form-group">
                  <label>Receipt Voucher Date*</label>
                  <input type="date" className="form-input" value={dateOnly(paymentDate)} onChange={(e) => setPaymentDate(dateOnly(e.target.value))} />
                </div>
                <DynamicSelect
                  optionKey="receipt_payment_modes"
                  label="Mode of Payment"
                  value={paymentMode}
                  onChange={(v) => {
                    setPaymentMode(v);
                    if (v.includes('Bank:')) setDepositTo(v.replace('Bank: ', ''));
                    else if (v.includes('Cash:')) setDepositTo(v.replace('Cash: ', ''));
                  }}
                  required
                  baseOptions={receiptPaymentModeOptions}
                />
                <div className="form-group">
                  <label>Deposit To Ledger Account*</label>
                  <select className="form-input" value={depositTo} onChange={(e) => setDepositTo(e.target.value)}>
                    {paymentMode.includes('Bank') || paymentMode === 'Bank' ? (
                      bankAccounts.map((b) => <option key={b}>{b}</option>)
                    ) : (
                      cashLedgers.map((c) => <option key={c}>{c}</option>)
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cheque No. / UTR Ref <Opt>(optional)</Opt></label>
                  <input type="text" className="form-input" placeholder="e.g. UTR-9988112" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                </div>
              </div>
              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={() => { resetReceiptForm(); setReceiptSubTab('registry'); }}>
                  Cancel Voucher
                </button>
                <button type="submit" className="btn-primary">
                  {editingReceiptId ? 'Update Collection Voucher' : 'Post Collection Voucher'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {receiptSubTab === 'advance' && (
        <AdvanceReceiptPanel
          customers={customers}
          receipts={receipts}
          advanceAdjustments={advanceAdjustments}
          invoices={invoices}
          creditNotes={creditNotes}
          bankAccounts={bankAccounts}
          cashLedgers={cashLedgers}
          isFinancialYearLocked={isFinancialYearLocked}
          createReceipt={createReceipt}
          updateReceipt={updateReceipt}
          deleteReceipt={deleteReceipt}
          createAdvanceAdjustments={createAdvanceAdjustments}
          editingReceipt={editingAdvanceReceipt}
          onCancelEdit={() => setEditingAdvanceReceipt(null)}
          onSaved={() => {
            setEditingAdvanceReceipt(null);
            setReceiptSubTab('registry');
          }}
          getReceiptShare={getReceiptShare}
          onViewReceipt={(rec) => setSelectedReceiptForPDF(rec)}
          onEditAdvance={(rec) => {
            setEditingAdvanceReceipt(rec);
            setReceiptSubTab('advance');
          }}
        />
      )}

      {receiptSubTab === 'registry' && (
        <div>
          {/* CONTROL HEADER FILTER & POST */}
          <div className="receipt-registry-toolbar table-header-row" style={{ marginBottom: '24px' }}>
            <div className="receipt-registry-toolbar__filters">
              <span className="filter-label">Quick filter list:</span>
              <select className="filter-select" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
                <option value="">-- All customer ledgers --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" className="form-input receipt-registry-toolbar__date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} title="Issue date from" />
              <input type="date" className="form-input receipt-registry-toolbar__date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} title="Issue date to" />
            </div>
            <div className="receipt-registry-toolbar__actions">
              <button type="button" className="btn-primary" onClick={() => { setReceiptSubTab('record'); setReceiptFormMode('standard'); setEditingReceiptId(null); }}>
                Record Collection Receipt
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setReceiptSubTab('advance'); setEditingAdvanceReceipt(null); }}>
                Record Advance
              </button>
              <button
                type="button"
                className="btn-primary receipt-registry-toolbar__export"
                onClick={() => handleDownloadReceipts('csv')}
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                className="btn-primary receipt-registry-toolbar__export receipt-registry-toolbar__export--excel"
                onClick={() => handleDownloadReceipts('excel')}
              >
                <FileSpreadsheet size={14} /> Export Excel
              </button>
            </div>
          </div>

          <div>
              {/* PENDING INVOICES CHECKLIST VIEW */}
              <div className="table-card" style={{ marginBottom: '24px' }}>
                <div className="table-header-row">
                  <h3 className="chart-title">Pending Debtors Invoice Registry ({pendingInvoices.length} Invoices)</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-tracked dynamically</span>
                </div>
                <div className="premium-table-wrapper">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Invoice Number</th>
                        <th>Client Name</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Total Raised (₹)</th>
                        <th>Pending Debt (₹)</th>
                        <th>Ageing Days</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvoices.map((inv) => {
                        const diffDays = Math.ceil(Math.abs(today - new Date(inv.issue_date)) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={inv.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{inv.invoice_number}</td>
                            <td>{inv.customer_name}</td>
                            <td>{formatDateDDMMYYYY(inv.issue_date)}</td>
                            <td>{formatDateDDMMYYYY(inv.due_date)}</td>
                            <td style={{ color: 'var(--text-muted)' }}>₹{inv.total_amount.toLocaleString()}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--accent-amber)' }}>₹{inv.outstanding.toLocaleString()}</td>
                            <td style={{ fontWeight: 'bold', color: diffDays > 60 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                              {diffDays} Days Overdue
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn-primary"
                                style={{ padding: '6px 12px', fontSize: '11px' }}
                                onClick={() => {
                                  setCustomerId(inv.customer_id.toString());
                                  setInvoiceId(inv.id.toString());
                                  setReceiptFormMode('standard');
                                  setReceiptSubTab('record');
                                  setEditingReceiptId(null);
                                }}
                              >
                                Record Receipt
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {pendingInvoices.length === 0 && (
                        <tr>
                          <td colSpan="8" className="empty-state">No pending outstanding debtor invoices found! All clear.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REGISTERED RECEIPTS TABLE */}
              <div className="premium-table-wrapper desktop-only registry-ledger-wrap">
                <table className="premium-table registry-ledger">
                  <thead>
                    <tr>
                      <ExcelColumnFilter
                        label="Document"
                        columnKey="document"
                        className="registry-ledger__doc"
                        values={receiptExcelValues.document}
                        sort={receiptExcelSort}
                        onSort={setReceiptExcelSort}
                        selected={receiptExcelFilters.document || null}
                        onFilter={(s) => setReceiptExcelFilterFor('document', s)}
                      />
                      <ExcelColumnFilter
                        label="Client"
                        columnKey="party"
                        className="registry-ledger__party"
                        values={receiptExcelValues.party}
                        sort={receiptExcelSort}
                        onSort={setReceiptExcelSort}
                        selected={receiptExcelFilters.party || null}
                        onFilter={(s) => setReceiptExcelFilterFor('party', s)}
                      />
                      <ExcelColumnFilter
                        label="Settlement"
                        columnKey="amount"
                        className="registry-ledger__settle"
                        values={receiptExcelValues.amount}
                        sort={receiptExcelSort}
                        onSort={setReceiptExcelSort}
                        selected={receiptExcelFilters.amount || null}
                        onFilter={(s) => setReceiptExcelFilterFor('amount', s)}
                        valueType="number"
                      />
                      <ExcelColumnFilter
                        label="Details"
                        columnKey="mode"
                        className="registry-ledger__meta"
                        values={receiptExcelValues.mode}
                        sort={receiptExcelSort}
                        onSort={setReceiptExcelSort}
                        selected={receiptExcelFilters.mode || null}
                        onFilter={(s) => setReceiptExcelFilterFor('mode', s)}
                      />
                      <ExcelColumnFilter
                        label="Date"
                        columnKey="date"
                        className="registry-ledger__status"
                        values={receiptExcelValues.date}
                        sort={receiptExcelSort}
                        onSort={setReceiptExcelSort}
                        selected={receiptExcelFilters.date || null}
                        onFilter={(s) => setReceiptExcelFilterFor('date', s)}
                      />
                      <th className="registry-ledger__actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistryReceipts.map((rec) => (
                      <tr key={rec.id}>
                        <td className="registry-ledger__doc">
                          <div className="registry-ledger__id">{rec.receipt_number}</div>
                          <div className="registry-ledger__sub">
                            <span>{receiptSettledInvoiceLabel(rec, invoices)}</span>
                          </div>
                        </td>
                        <td className="registry-ledger__party">
                          <div className="registry-ledger__party-name">{rec.customer_name}</div>
                        </td>
                        <td className="registry-ledger__settle">
                          <div className="registry-ledger__amount is-in">
                            ₹{toAmount(rec.amount_received).toLocaleString('en-IN')}
                          </div>
                          <div className="registry-ledger__sub">
                            <span>TDS ₹{toAmount(rec.tds_deducted).toLocaleString('en-IN')}</span>
                            <span>Disc ₹{toAmount(rec.discount_allowed).toLocaleString('en-IN')}</span>
                          </div>
                        </td>
                        <td className="registry-ledger__meta">
                          <div>{rec.payment_mode}</div>
                          <div className="registry-ledger__sub">
                            <span>{rec.deposit_to || '—'}</span>
                            {rec.reference_no ? <span>{rec.reference_no}</span> : null}
                          </div>
                        </td>
                        <td className="registry-ledger__status">{formatDateDDMMYYYY(rec.payment_date)}</td>
                        <td className="registry-ledger__actions registry-actions-cell">
                          <RegistryRowActions
                            onEdit={() => openEditReceipt(rec)}
                            onView={() => setSelectedReceiptForPDF(rec)}
                            viewTitle="View receipt voucher"
                            share={getReceiptShare(rec)}
                            deleteLabel={`receipt ${rec.receipt_number}`}
                            onDelete={() => deleteReceipt(rec.id)}
                            deleteDisabled={isFinancialYearLocked}
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredRegistryReceipts.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-state">No receipt vouchers match the current filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <MobileRegistryCards
                items={filteredRegistryReceipts}
                emptyLabel="No receipt vouchers match the current filter."
                renderCard={(rec) => (
                  <>
                    <div className="mobile-registry-card__head">
                      <div>
                        <div className="mobile-registry-card__title">{rec.receipt_number}</div>
                        <div className="mobile-registry-card__meta">{rec.customer_name}</div>
                      </div>
                      <div className="mobile-registry-card__amount">₹{rec.amount_received.toLocaleString()}</div>
                    </div>
                    <div className="mobile-registry-card__row"><span>Date</span><span>{formatDateDDMMYYYY(rec.payment_date)}</span></div>
                    <div className="mobile-registry-card__row"><span>Status</span><span>{rec.is_advance ? 'Advance' : 'Settled'}</span></div>
                    <MobileCardExpand label="More details">
                      <div className="mobile-registry-card__row"><span>Mode</span><span>{rec.payment_mode}</span></div>
                      <div className="mobile-registry-card__row"><span>Deposited to</span><span>{rec.deposit_to || '—'}</span></div>
                    </MobileCardExpand>
                    <div className="mobile-registry-card__actions">
                      <MobileRegistryCardActions
                        onView={() => setSelectedReceiptForPDF(rec)}
                        viewTitle="View receipt voucher"
                        onEdit={() => openEditReceipt(rec)}
                        share={getReceiptShare(rec)}
                        deleteLabel={`receipt ${rec.receipt_number}`}
                        onDelete={() => deleteReceipt(rec.id)}
                        deleteDisabled={isFinancialYearLocked}
                      />
                    </div>
                  </>
                )}
              />
          </div>
        </div>
      )}

      {/* HIGH-FIDELITY RECEIPT VOUCHER PDF PRINT PREVIEW MODAL */}
      {selectedReceiptForPDF && (
        <PdfPrintModal
          onClose={() => setSelectedReceiptForPDF(null)}
          screenTitle="Receipt Collection Voucher"
          closeLabel="Close Voucher"
          toolbarExtra={
            <DocumentShareToolbar share={getReceiptShare(selectedReceiptForPDF)} />
          }
        >
          <div className="pdf-print-page">
            <h1 className="pdf-document-title">Receipt Voucher</h1>
            <PdfDocumentHeader
              company={companyDetails}
              rightContent={
                <>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Voucher No: {selectedReceiptForPDF.receipt_number}</p>
                  <p style={{ fontSize: '12px', margin: 0 }}>Date: {formatDateDDMMYYYY(selectedReceiptForPDF.payment_date)}</p>
                </>
              }
            />

            <div style={{ marginTop: '24px', fontSize: '14px', lineHeight: '1.6' }}>
              <p>Received with thanks from: <strong style={{ color: '#111' }}>{selectedReceiptForPDF.customer_name}</strong></p>
              
              <table className="pdf-meta-table" style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'left' }}>Description Reference</th>
                    <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>TDS Deducted (₹)</th>
                    <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Discount Allowed (₹)</th>
                    <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Net Amount Received (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                      {selectedReceiptForPDF.is_advance && !selectedReceiptForPDF.invoice_id ? (
                        <strong>Advance payment collection against future bills</strong>
                      ) : (
                        <span>Settlement against Sales Invoice: <strong>{receiptSettledInvoiceLabel(selectedReceiptForPDF, invoices)}</strong></span>
                      )}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
                      {formatPdfINR(selectedReceiptForPDF.tds_deducted || 0)}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
                      {formatPdfINR(selectedReceiptForPDF.discount_allowed || 0)}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatPdfINR(selectedReceiptForPDF.amount_received)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '30px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <p><strong>Payment Mechanics:</strong></p>
                  <p>Mode: {selectedReceiptForPDF.payment_mode}</p>
                  <p>Deposited To: {selectedReceiptForPDF.deposit_to || 'HDFC Bank A/c'}</p>
                  <PdfOptionalLine label="UTR No. / Cheque Ref:" value={selectedReceiptForPDF.reference_no} />
                </div>
                <div style={{ textAlign: 'right', borderTop: '2px solid #333', paddingTop: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#666' }}>Total Cleared Value:</span>
                  <h3 style={{ margin: '4px 0', fontSize: '20px', color: '#111' }}>
                    {formatPdfINR(
                      toAmount(selectedReceiptForPDF.amount_received) +
                      toAmount(selectedReceiptForPDF.tds_deducted) +
                      toAmount(selectedReceiptForPDF.discount_allowed)
                    )}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '12px' }}>This is a computer generated system receipt. No physical signature required.</p>
                </div>
              </div>
            </div>
          </div>
        </PdfPrintModal>
      )}
    </div>
  );
}

// ==========================================
// D. EXPENSE TAB SCREEN
// ==========================================
function ExpenseTab({ recordTypeFilter = 'expense', vendorMasterOnly = false, purchaseMode = false }) {
  const { expenses, payments, expenseHeads, vendors, createVendor, updateVendor, deleteVendor, createExpense, updateExpense, deleteExpense, inventory, currentUser, cronReminderLogs, runCronJobScheduler, companyDetails, isFinancialYearLocked, addConsoleLog, debitNotes } = useSimulator();
  const registeredState = resolveRegisteredState(companyDetails);
  const today = new Date('2026-05-23');
  const [expenseSubTab, setExpenseSubTab] = useState(vendorMasterOnly ? 'vendors' : 'expenses');
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [placeOfSupply, setPlaceOfSupply] = useState(registeredState || 'Gujarat');
  const [exportCountry, setExportCountry] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [tdsDeducted, setTdsDeducted] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showInlineVendor, setShowInlineVendor] = useState(false);
  const [showInlineInventory, setShowInlineInventory] = useState(false);
  const [expenseCurrency, setExpenseCurrency] = useState('INR');
  const [expenseConversionRate, setExpenseConversionRate] = useState('1.00');
  const [expenseSupplyMechanism, setExpenseSupplyMechanism] = useState('FCM');
  const [useExpenseLineItems, setUseExpenseLineItems] = useState(purchaseMode);
  const [expenseLineItems, setExpenseLineItems] = useState([emptyLineItem()]);
  const [uploadedBillFile, setUploadedBillFile] = useState(null);
  const billFileRef = useRef(null);

  const [selectedLedgerVendor, setSelectedLedgerVendor] = useState(null);
  const [selectedLedgerVendorPDF, setSelectedLedgerVendorPDF] = useState(null);

  const getVendorLedger = (vend) => buildVendorLedger(vend, expenses, payments, debitNotes);

  // Form States
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [expenseHead, setExpenseHead] = useState('Utilities');
  const [expenseDate, setExpenseDate] = useState(portalTodayDateOnly());
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState(18);
  const [hsnSac, setHsnSac] = useState('9984');

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('Monthly');
  const [remindersOptIn, setRemindersOptIn] = useState(true);

  // Accounting & Tax
  const [itcEligible, setItcEligible] = useState(true);

  // Settlement
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [dueDate, setDueDate] = useState(portalTodayDateOnly());
  const [paidFromAccount, setPaidFromAccount] = useState('HDFC Bank Current A/c');
  const [paymentReference, setPaymentReference] = useState('');

  // Scanning state (OCR)
  const [ocrLogs, setOcrLogs] = useState('');
  const [scanFilename, setScanFilename] = useState('');

  // New Vendor Form
  const [vendorNameInput, setVendorNameInput] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vAddress, setVAddress] = useState('');
  const [vCity, setVCity] = useState('');
  const [vState, setVState] = useState('Gujarat');
  const [vPincode, setVPincode] = useState('');
  const [vCountry, setVCountry] = useState('India');
  const [vCategory, setVCategory] = useState('Supplier');
  const [vGstType, setVGstType] = useState('Registered - Regular');
  const [vGstin, setVGstin] = useState('');
  const [vCurrency, setVCurrency] = useState('INR');
  const [vPaymentTerms, setVPaymentTerms] = useState('Due on Receipt');
  const [vPan, setVPan] = useState('');
  const [vOpening, setVOpening] = useState('0.00');
  const [vOpeningDate, setVOpeningDate] = useState('2026-04-01');

  const expenseTotals = useExpenseLineItems
    ? aggregateLinesTax(expenseLineItems, 0, placeOfSupply, registeredState)
    : aggregateLinesTax(
        [{ rate: toAmount(amount), quantity: 1, tax_rate_override: taxRate, supply_mechanism: expenseSupplyMechanism }],
        0,
        placeOfSupply,
        registeredState
      );
  const { cgst: expCgst, sgst: expSgst, igst: expIgst, tax_amount: taxAmount, total_amount: totalAmount, postDiscount: expSubtotal } = expenseTotals;

  const handleExpenseLineChange = (index, field, value) => {
    const updated = [...expenseLineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'product_id' && value !== '') {
      const matched = inventoryProduct(inventory, value);
      if (matched) updated[index] = enrichLineFromProduct(updated[index], matched, registeredState, placeOfSupply);
    } else {
      const t = calcLineTax(updated[index], placeOfSupply, registeredState);
      updated[index] = { ...updated[index], ...t, line_total: t.taxable };
    }
    setExpenseLineItems(updated);
  };

  const getExpenseOutstanding = (exp) => {
    if (!exp) return 0;
    const paid = payments
      .filter((p) => sameId(p.expense_id, exp.id))
      .reduce((sum, p) => sum + toAmount(p.amount_paid) + toAmount(p.tds_deducted), 0);
    return Math.max(0, toAmount(exp.total_amount) - paid);
  };

  const scopedExpenses = expenses.filter((e) => {
    const rt = e.record_type || 'expense';
    if (recordTypeFilter === 'purchase') return rt === 'purchase';
    return rt !== 'purchase';
  });

  const totalBookedExpenses = sumField(scopedExpenses, 'total_amount');
  const totalPaidExpenses = sumField(scopedExpenses.filter((e) => e.payment_status === 'Paid'), 'total_amount');
  const totalPayablesPipeline = scopedExpenses.reduce((sum, exp) => sum + getExpenseOutstanding(exp), 0);

  const unpaidBillsPipeline = scopedExpenses
    .map((exp) => ({ ...exp, outstanding: getExpenseOutstanding(exp) }))
    .filter((e) => e.outstanding > 0.009)
    .sort((a, b) => dateOnly(a.due_date).localeCompare(dateOnly(b.due_date)));

  const filteredRegistryExpensesBase = useMemo(
    () =>
      sortRegistryNewestFirst(
        scopedExpenses.filter((exp) => {
          if (registrySearch.trim()) {
            const q = registrySearch.trim().toLowerCase();
            const hay = `${exp.expense_number} ${exp.invoice_number} ${exp.vendor_name} ${exp.expense_head}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          if (filterStartDate && dateOnly(exp.expense_date) < filterStartDate) return false;
          if (filterEndDate && dateOnly(exp.expense_date) > filterEndDate) return false;
          return true;
        }),
        'expense_date'
      ),
    [scopedExpenses, registrySearch, filterStartDate, filterEndDate]
  );

  const expenseExcelGetters = useMemo(
    () => ({
      document: (e) => e.expense_number || '',
      party: (e) => e.vendor_name || '',
      amount: (e) => toAmount(e.total_amount),
      status: (e) => e.payment_status || '',
      date: (e) => e.expense_date || '',
      head: (e) => e.expense_head || '',
    }),
    []
  );
  const expenseExcelFilterGetters = useMemo(
    () => ({
      ...expenseExcelGetters,
      amount: (e) => `₹${toAmount(e.total_amount).toLocaleString('en-IN')}`,
      date: (e) => formatDateDDMMYYYY(e.expense_date),
    }),
    [expenseExcelGetters]
  );
  const {
    excelSort: expenseExcelSort,
    setExcelSort: setExpenseExcelSort,
    excelFilters: expenseExcelFilters,
    setExcelFilterFor: setExpenseExcelFilterFor,
    columnValues: expenseExcelValues,
    displayedRows: filteredRegistryExpenses,
  } = useExcelTableState(filteredRegistryExpensesBase, expenseExcelGetters, expenseExcelFilterGetters);

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setShowAddForm(false);
    setVendorId('');
    setInvoiceNumber('');
    setDescription('');
    setAmount('');
    setTaxRate(18);
    setHsnSac('9984');
    setExpenseDate(portalTodayDateOnly());
    setDueDate(portalTodayDateOnly());
    setPaymentStatus('Paid');
    setTdsDeducted('');
    setPaymentReference('');
    setScanFilename('');
    setUploadedBillFile(null);
    setUseExpenseLineItems(purchaseMode);
    setExpenseLineItems([emptyLineItem()]);
    setPlaceOfSupply(registeredState || 'Gujarat');
    setExportCountry('');
    setExpenseCurrency('INR');
    setExpenseConversionRate('1.00');
  };

  const openEditExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setVendorId(String(exp.vendor_id || ''));
    setInvoiceNumber(exp.invoice_number || '');
    setDescription(exp.description || '');
    setExpenseHead(exp.expense_head || 'Utilities');
    setExpenseDate(dateOnly(exp.expense_date) || portalTodayDateOnly());
    setAmount(exp.amount ?? '');
    setTaxRate(exp.tax_rate ?? 18);
    setHsnSac(exp.hsn_sac || '9984');
    setPlaceOfSupply(exp.place_of_supply === 'Overseas' ? 'Out of India' : (exp.place_of_supply || registeredState || 'Gujarat'));
    setExportCountry(exp.export_country || '');
    setExpenseCurrency(exp.currency || 'INR');
    setExpenseConversionRate(String(exp.conversion_rate ?? '1.00'));
    setExpenseSupplyMechanism(exp.supply_mechanism || 'FCM');
    setPaymentStatus(exp.payment_status || 'Unpaid');
    setDueDate(dateOnly(exp.due_date) || dateOnly(exp.expense_date) || portalTodayDateOnly());
    setItcEligible(exp.itc_eligible !== false);
    setTdsDeducted(exp.tds_deducted ?? '');
    setPaidFromAccount(exp.paid_from_account || paidFromAccount);
    setPaymentReference(exp.payment_reference || '');
    setIsRecurring(Boolean(exp.is_recurring));
    setRecurringFrequency(exp.recurring_frequency || 'Monthly');
    setRemindersOptIn(exp.reminders_opt_in !== false);
    setUseExpenseLineItems(purchaseMode ? true : false);
    setShowAddForm(true);
  };

  // 2. Simulated OCR Scan bill
  const handleOcrBillScan = () => {
    if (!uploadedBillFile) {
      alert("Validation Warning: No file uploaded yet. Please click the scanner zone to upload a document first!");
      return;
    }
    setIsScanning(true);
    setScanProgress(0);
    setOcrLogs(`Scanning uploaded bill document: ${uploadedBillFile.name}...\n`);
    setScanFilename(uploadedBillFile.name);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);

          // Populate Form with parsed OCR values
          setVendorId('2'); // AWS
          setInvoiceNumber(`AWS-${Math.floor(1000 + Math.random() * 9000)}`);
          setAmount(98000);
          setTaxRate(18);
          setExpenseHead('Software & Server Hosting');
          setHsnSac('9984');
          setDescription(`AWS Cloud hosting charges (OCR Scanned: ${uploadedBillFile.name})`);
          setExpenseDate(portalTodayDateOnly());
          setDueDate('2026-06-07');
          
          setOcrLogs(l => l + `\nOCR SUCCESS: Auto-filled Vendor (AWS), Date (23-May-2026), Subtotal: ₹98,000, GST: 18%, Invoice No generated from file: ${uploadedBillFile.name}!`);
          return 100;
        }

        if (prev === 25) setOcrLogs(l => l + 'Extracting bounding segments and text tokens...\n');
        if (prev === 50) setOcrLogs(l => l + 'Parsing Tax Registration fields (PAN/GSTIN)...\n');
        if (prev === 75) setOcrLogs(l => l + 'Aligning base pricing grids & item subtotals...\n');

        return prev + 25;
      });
    }, 200);
  };

  // 3. Save Expense Booking
  const handlePostExpense = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }

    // Validations
    if (!vendorId) { alert('Supplier/Vendor selection is strictly mandatory.'); return; }
    if (!invoiceNumber) { alert('Bill Invoice Number is strictly mandatory.'); return; }
    if (!expenseDate) { alert('Bill Date is strictly mandatory.'); return; }
    const bookedAmount = (useExpenseLineItems || purchaseMode) ? expSubtotal : toAmount(amount);
    if (bookedAmount <= 0) { alert('Base price amount must be positive.'); return; }

    const selectedVendor = vendors.find(v => v.id === parseInt(vendorId));
    if (!selectedVendor) return;

    const isDuplicate = expenses.some(exp =>
      exp.vendor_id === selectedVendor.id &&
      exp.invoice_number.toUpperCase() === invoiceNumber.toUpperCase() &&
      exp.id !== editingExpenseId
    );
    if (isDuplicate) {
      alert(`Strict Validation Failure: Vendor Bill duplication detected!\nAn expense ledger already contains Invoice No. "${invoiceNumber}" for supplier "${selectedVendor.name}".`);
      return;
    }

    if (paymentStatus === 'Paid' && !paidFromAccount) {
      alert('Validation Failure: Please select the Cash/Bank ledger paid from.');
      return;
    }

    if (isExportPlaceOfSupply(placeOfSupply) && !exportCountry.trim()) {
      alert('Validation Failure: Select the destination country for Out of India supply.');
      return;
    }

    try {
      const expensePayload = {
        record_type: recordTypeFilter === 'purchase' ? 'purchase' : 'expense',
        invoice_number: invoiceNumber,
        description,
        expense_head: purchaseMode ? 'Purchase' : expenseHead,
        vendor_id: vendorId,
        vendor_name: selectedVendor.name,
        expense_date: dateOnly(expenseDate),
        amount: (useExpenseLineItems || purchaseMode) ? expSubtotal : toAmount(amount),
        tax_rate: taxRate,
        tax_amount: taxAmount,
        cgst: expCgst,
        sgst: expSgst,
        igst: expIgst,
        total_amount: totalAmount,
        place_of_supply: placeOfSupply,
        export_country: isExportPlaceOfSupply(placeOfSupply) ? exportCountry.trim() : null,
        currency: expenseCurrency || 'INR',
        conversion_rate: parseFloat(expenseConversionRate) || 1,
        supply_mechanism: expenseSupplyMechanism,
        payment_status: paymentStatus,
        hsn_sac: hsnSac,
        is_recurring: purchaseMode ? false : isRecurring,
        recurring_frequency: purchaseMode ? '' : (isRecurring ? recurringFrequency : ''),
        reminders_opt_in: purchaseMode ? false : (isRecurring ? remindersOptIn : false),
        itc_eligible: itcEligible,
        tds_deducted: toAmount(tdsDeducted),
        attachment: scanFilename || 'manual_entry_bill.pdf',
        due_date: dateOnly(dueDate) || (paymentStatus === 'Paid' ? dateOnly(expenseDate) : null),
        paid_from_account: paymentStatus === 'Paid' ? paidFromAccount : '',
        payment_reference: paymentStatus === 'Paid' ? paymentReference : '',
      };
      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expensePayload);
      } else {
        await createExpense(expensePayload);
      }
    } catch (err) {
      showApiError(editingExpenseId ? 'Updating expense / purchase bill' : 'Saving expense / purchase bill', err);
      return;
    }

    resetExpenseForm();
  };

  // 4. Save Vendor Master
  const resetVendorForm = () => {
    setEditingVendorId(null);
    setVendorNameInput('');
    setVContact('');
    setVEmail('');
    setVPhone('');
    setVAddress('');
    setVCity('');
    setVState(registeredState || 'Gujarat');
    setVPincode('');
    setVCountry('India');
    setVCategory('Supplier');
    setVGstType('Registered - Regular');
    setVGstin('');
    setVCurrency('INR');
    setVPaymentTerms('Due on Receipt');
    setVPan('');
    setVOpening('0.00');
    setVOpeningDate('2026-04-01');
  };

  const expenseFormIntentTab = vendorMasterOnly ? 'vendor-master' : purchaseMode ? 'purchase' : 'expense';
  usePortalFormIntent(expenseFormIntentTab, () => {
    if (vendorMasterOnly) {
      resetVendorForm();
      setShowVendorForm(true);
    } else {
      resetExpenseForm();
      setShowAddForm(true);
    }
  });

  useMobileBackHandler(showAddForm, () => {
    resetExpenseForm();
    return true;
  });

  useMobileBackHandler(showVendorForm, () => {
    setShowVendorForm(false);
    resetVendorForm();
    return true;
  });

  useMobileBackHandler(!!selectedLedgerVendor, () => {
    setSelectedLedgerVendor(null);
    return true;
  });

  const handleVendorGstinChange = (val) => {
    setVGstin(clean);
    if (clean.length >= 12) {
      setVPan(clean.substring(2, 12));
    }
  };

  const handleSaveVendorMaster = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }
    if (!vendorNameInput) { alert('Vendor name is strictly mandatory.'); return; }
    if (!vAddress || !vCity || !vState || !vPincode) {
      alert('Billing address details (Street, City, State, Pincode) are strictly mandatory.');
      return;
    }
    if (!isValidPaymentTerms(vPaymentTerms)) {
      alert('Please select payment terms, or enter whole number of days for custom Net terms.');
      return;
    }

    const isGstRegistered = ['Registered - Regular', 'Registered - Composition', 'SEZ (Special Economic Zone)'].includes(vGstType);
    if (isGstRegistered && (!vGstin || vGstin.length !== 15)) {
      alert('Validation Failure: GST registered vendor must have a valid 15-character GSTIN.');
      return;
    }

    const vendorPayload = {
      name: vendorNameInput,
      contact_person: vContact,
      email: vEmail,
      phone: vPhone,
      category: vCategory,
      gst_type: vGstType,
      gstin: ['Unregistered (Consumer/B2C)', 'Overseas (Export)'].includes(vGstType) ? null : (vGstin || null),
      currency: vCurrency || 'INR',
      billing_address: vAddress,
      billing_city: vCity,
      billing_state: vState,
      billing_pincode: vPincode,
      billing_country: vCountry || 'India',
      pan: vPan || 'NIL',
      opening_balance: vOpening,
      opening_balance_date: dateOnly(vOpeningDate) || null,
      payment_terms: vPaymentTerms,
    };

    try {
      if (editingVendorId) {
        await updateVendor(editingVendorId, vendorPayload);
      } else {
        await createVendor(vendorPayload);
      }
    } catch (err) {
      showApiError('Saving vendor', err);
      return;
    }

    setShowVendorForm(false);
    resetVendorForm();
  };

  const openEditVendor = (v) => {
    setEditingVendorId(v.id);
    setVendorNameInput(v.name || '');
    setVContact(v.contact_person || '');
    setVEmail(v.email || '');
    setVPhone(v.phone || '');
    setVAddress(v.billing_address || '');
    setVCity(v.billing_city || '');
    setVState(v.billing_state || registeredState || 'Gujarat');
    setVPincode(v.billing_pincode || '');
    setVCountry(v.billing_country || 'India');
    setVCategory(v.category || 'Supplier');
    setVGstType(v.gst_type || 'Registered - Regular');
    setVGstin(v.gstin || '');
    setVCurrency(v.currency || 'INR');
    setVPaymentTerms(v.payment_terms || 'Due on Receipt');
    setVPan(v.pan === 'NIL' ? '' : v.pan || '');
    setVOpening(String(v.opening_balance ?? '0.00'));
    setVOpeningDate(dateOnly(v.opening_balance_date) || '2026-04-01');
    setShowVendorForm(true);
  };

  const handleDeleteVendor = async (v) => {
    if (!window.confirm(`Delete vendor "${v.name}"?`)) return;
    try {
      await deleteVendor(v.id);
    } catch (err) {
      showApiError('Deleting vendor', err);
    }
  };

  const handleDownloadExpenses = (format = 'csv') => {
    let csvContent = "Bill No,Vendor,Category,HSN/SAC,Tax Rate (%),Subtotal (₹),Tax Claimed (₹),Total Cost (₹),ITC Eligible\n";
    filteredRegistryExpenses.forEach(exp => {
      csvContent += `"${exp.expense_number}","${exp.vendor_name}","${exp.expense_head}","${exp.hsn_sac}",${toAmount(exp.tax_rate)},${toAmount(exp.amount).toFixed(2)},${toAmount(exp.tax_amount).toFixed(2)},${toAmount(exp.total_amount).toFixed(2)},"${exp.itc_eligible ? 'Yes' : 'No'}"\n`;
    });

    const reportType = "booked_outward_expenses";
    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${reportType}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'EXPENSES', `vouchex_${reportType}.xls`);
    }

    addConsoleLog('event', `GET /api/expenses/download?format=${format}`, `Exported Booked Expenses Registry as ${format.toUpperCase()} spreadsheet.`);
  };

  return (
    <div>
      {vendorMasterOnly ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="table-header-row">
            <h3 className="chart-title">Vendor Master Database</h3>
            {!showVendorForm && (
              <button type="button" className="btn-primary" onClick={() => { resetVendorForm(); setShowVendorForm(true); }}>
                Add Vendor Profile
              </button>
            )}
          </div>
          {showVendorForm && (
          <form onSubmit={handleSaveVendorMaster} className="master-form">
            <h4 className="form-section-title">{editingVendorId ? 'Edit Vendor Master Ledger' : 'Register New Vendor Master Ledger'}</h4>

            <h4 className="form-section-title">1. Supplier Identity & Contact</h4>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Supplier / Vendor Company Name*</label>
                <input type="text" className="form-input" placeholder="e.g. AWS Cloud Hosting" value={vendorNameInput} onChange={(e) => setVendorNameInput(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Point of Contact Person</label>
                <input type="text" className="form-input" placeholder="e.g. Accounts desk" value={vContact} onChange={(e) => setVContact(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Supplier Billing Email ID</label>
                <input type="email" className="form-input" placeholder="billing@vendor.com" value={vEmail} onChange={(e) => setVEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Supplier Phone / Mobile</label>
                <input type="text" className="form-input" value={vPhone} onChange={(e) => setVPhone(e.target.value)} />
              </div>
              <DynamicSelect
                optionKey="vendor_categories"
                label="Vendor Category Classification"
                value={vCategory}
                onChange={setVCategory}
                baseOptions={['Supplier', 'Contractor', 'Service Provider', 'Importer', 'Standard Vendor']}
                manualPlaceholder="Enter category manually…"
              />
            </div>

            <h4 className="form-section-title">2. Legal & Tax Compliance</h4>
            <div className="form-grid-4">
              <div className="form-group">
                <label>GST Registration Category Type*</label>
                <select className="form-input" value={vGstType} onChange={(e) => setVGstType(e.target.value)}>
                  <option>Registered - Regular</option>
                  <option>Registered - Composition</option>
                  <option>Unregistered (Consumer/B2C)</option>
                  <option>SEZ (Special Economic Zone)</option>
                  <option>Overseas (Export)</option>
                </select>
              </div>
              <div className="form-group">
                <label>GSTIN Tax Registration ID</label>
                <input
                  type="text"
                  className="form-input"
                  maxLength="15"
                  placeholder="15 Character GSTIN"
                  value={vGstin}
                  onChange={(e) => handleVendorGstinChange(e.target.value)}
                  disabled={['Unregistered (Consumer/B2C)', 'Overseas (Export)'].includes(vGstType)}
                />
              </div>
              <div className="form-group">
                <label>Permanent Account Number (PAN)</label>
                <input type="text" className="form-input" placeholder="10 digit PAN" maxLength="10" value={vPan} onChange={(e) => setVPan(e.target.value.toUpperCase())} />
              </div>
              <CurrencySelect label="Default Currency" value={vCurrency} onChange={setVCurrency} optionKey="vendor_currencies" />
            </div>

            <h4 className="form-section-title">3. Billing Address Details</h4>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Billing Street Address*</label>
                <input type="text" className="form-input" placeholder="HQ Street suite details" value={vAddress} onChange={(e) => setVAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label>City*</label>
                <input type="text" className="form-input" placeholder="e.g. Mumbai" value={vCity} onChange={(e) => setVCity(e.target.value)} />
              </div>
              <StatePlaceOfSupplySelect label="Billing State*" value={vState} onChange={setVState} required />
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Postal Pincode*</label>
                <input type="text" className="form-input" placeholder="e.g. 400001" value={vPincode} onChange={(e) => setVPincode(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Country*</label>
                <input type="text" className="form-input" value={vCountry} onChange={(e) => setVCountry(e.target.value)} />
              </div>
              <PaymentTermsSelect value={vPaymentTerms} onChange={setVPaymentTerms} label="Default Payment Terms" />
            </div>

            <h4 className="form-section-title">4. Opening Balance</h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Opening Outstanding Balance ({formatCurrencyLabel(vCurrency)})</label>
                <input type="number" step="0.01" className="form-input" value={vOpening} onChange={(e) => setVOpening(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Opening Balance As-Of Date</label>
                <input type="date" className="form-input" value={dateOnly(vOpeningDate)} onChange={(e) => setVOpeningDate(e.target.value)} />
              </div>
            </div>

            <div className="btn-row">
              <button type="button" className="btn-secondary" onClick={() => { setShowVendorForm(false); resetVendorForm(); }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingVendorId ? 'Update Vendor Profile' : 'Register Vendor Profile'}
              </button>
            </div>
          </form>
          )}

          <div className="table-card">
            <h3 className="chart-title">Supplier Master registries</h3>
            <div className="premium-table-wrapper desktop-only" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Vendor ID</th>
                    <th>Supplier / Company Legal Name</th>
                    <th>Primary Billing Email ID</th>
                    <th>HQ Address details</th>
                    <th>Supplier PAN</th>
                    <th>Opening Balance</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontFamily: 'monospace' }}>#VEN-00{v.id}</td>
                      <td style={{ fontWeight: 'bold' }}>{v.name}</td>
                      <td>{v.email}</td>
                      <td>{v.billing_address}</td>
                      <td style={{ fontFamily: 'monospace' }}>{v.pan}</td>
                      <td style={{ fontWeight: 'bold' }}>₹{v.opening_balance.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => openEditVendor(v)}>Edit</button>
                          <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--accent-red)' }} onClick={() => handleDeleteVendor(v)}>Delete</button>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
                            onClick={() => setSelectedLedgerVendor(v)}
                          >
                            View Party Ledger 📒
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MobileRegistryCards
              items={vendors}
              emptyLabel="No vendors registered yet."
              renderCard={(v) => (
                <>
                  <div className="mobile-registry-card__head">
                    <div>
                      <div className="mobile-registry-card__title">{v.name}</div>
                      <div className="mobile-registry-card__meta">{v.gst_type || v.category || 'Supplier'}</div>
                    </div>
                    <div className="mobile-registry-card__amount">₹{v.opening_balance.toLocaleString()}</div>
                  </div>
                  <MobileCardExpand label="More details">
                    <div className="mobile-registry-card__row"><span>GSTIN</span><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v.gstin || '—'}</span></div>
                    <div className="mobile-registry-card__row"><span>Email</span><span>{v.email || '—'}</span></div>
                  </MobileCardExpand>
                  <div className="mobile-registry-card__actions">
                    <MobileRegistryCardActions
                      onView={() => setSelectedLedgerVendor(v)}
                      viewLabel="Ledger"
                      viewTitle="View party ledger"
                      onEdit={() => openEditVendor(v)}
                      extraItems={[
                        { label: 'Delete', onClick: () => handleDeleteVendor(v), danger: true },
                      ]}
                    />
                  </div>
                </>
              )}
            />
          </div>
        </div>
      ) : (
      <>
      {expenseSubTab === 'expenses' && (
        <div>
          <InlineVendorModal open={showInlineVendor} onClose={() => setShowInlineVendor(false)} onCreated={(v) => { setVendorId(String(v.id)); setShowInlineVendor(false); }} />
          <InlineInventoryModal open={showInlineInventory} onClose={() => setShowInlineInventory(false)} onCreated={() => setShowInlineInventory(false)} />

          {showAddForm ? (
            <form onSubmit={handlePostExpense} className="master-form" style={{ marginBottom: '30px' }}>
              <div className="table-header-row" style={{ marginBottom: '16px' }}>
                <h3 className="form-section-title" style={{ margin: 0 }}>
                  {editingExpenseId
                    ? (purchaseMode ? 'Edit Purchase Bill' : 'Edit Expense Bill')
                    : (purchaseMode ? 'Record Purchase Invoice' : 'Record Expense Bill')}
                </h3>
                <button type="button" className="btn-secondary" onClick={resetExpenseForm}>
                  ← Back to Registry
                </button>
              </div>

              {/* OCR BILL UPLOAD CONTAINER */}
              <div className="invoice-creator-layout" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className={purchaseMode ? 'form-grid-2' : 'form-grid-3'}>
                    <div className="form-group">
                      <Req>{purchaseMode ? 'Select Supplier / Vendor' : 'Select Supplier/Vendor Profile'}</Req>
                      <select className="form-input" value={vendorId} onChange={(e) => {
                        const id = e.target.value;
                        setVendorId(id);
                        const v = vendors.find((x) => sameId(x.id, id));
                        if (v?.currency) setExpenseCurrency(v.currency);
                        if (v?.billing_state) setPlaceOfSupply(v.billing_state);
                      }}>
                        <option value="">-- Choose registered vendor --</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <button type="button" className="btn-secondary-sm" style={{ marginTop: 8 }} onClick={() => setShowInlineVendor(true)}>+ Add New Profile</button>
                    </div>

                    <div className="form-group">
                      <Req>{purchaseMode ? 'Supplier Invoice No.' : 'Vendor Bill / Invoice No.'}</Req>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={purchaseMode ? 'e.g. PO-8822A' : 'e.g. AWS-8822A'}
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                      />
                    </div>

                    {!purchaseMode && (
                      <DynamicSelect optionKey="expense_heads" label="Expense Head Category Type" value={expenseHead} onChange={setExpenseHead} required baseOptions={expenseHeads} />
                    )}
                  </div>
                </div>

                {/* Simulated OCR Drag/Drop */}
                <div className="scanner-card">
                  <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>OCR Bill Auto-Fill Scanner</span>
                    <span style={{ fontSize: '10px', color: 'var(--accent-red)' }}>Upload any bill image or PDF</span>
                  </h4>
                  <input 
                    type="file" 
                    ref={billFileRef} 
                    style={{ display: 'none' }} 
                    accept="image/*,application/pdf" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadedBillFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div 
                    className="scanner-dropzone" 
                    onClick={() => billFileRef.current.click()}
                    style={{ borderStyle: uploadedBillFile ? 'solid' : 'dashed', borderColor: uploadedBillFile ? 'var(--accent-red)' : '' }}
                  >
                    <FileText style={{ color: uploadedBillFile ? 'var(--accent-red)' : 'var(--text-muted)' }} />
                    {uploadedBillFile ? (
                      <>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>File: {uploadedBillFile.name}</span>
                        <span style={{ fontSize: '9px', color: 'var(--accent-red)' }}>Ready for parsing! Click to change file.</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Upload Vendor Bill (PDF/Image)</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Click to select or drag document here</span>
                      </>
                    )}
                  </div>
                  {uploadedBillFile && !isScanning && (
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ width: '100%', marginTop: '10px', height: '36px', fontSize: '12px', background: 'linear-gradient(135deg, var(--accent-red), var(--accent-amber))' }}
                      onClick={handleOcrBillScan}
                    >
                      Run AI OCR Scan ⚡
                    </button>
                  )}
                  {isScanning && (
                    <div className="scanner-progress-container">
                      <div className="scanner-progress-bar">
                        <div className="scanner-progress-fill" style={{ width: `${scanProgress}%` }}></div>
                      </div>
                      <pre className="scanner-ocr-text"><code>{ocrLogs}</code></pre>
                    </div>
                  )}
                  {scanFilename && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--accent-teal)', fontSize: '10px', fontWeight: 'bold' }}>
                        Attachment: {scanFilename}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setScanFilename('')}
                        style={{ border: 'none', background: 'transparent', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '10px' }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>— OR UPLOAD MANUALLY —</span>
                  </div>
                  
                  <div>
                    <input 
                      type="file" 
                      id="manual-bill-attachment" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setScanFilename(e.target.files[0].name);
                          addConsoleLog('system', `Manual document attached for audit trail`, `Uploaded: ${e.target.files[0].name}`);
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => document.getElementById('manual-bill-attachment').click()}
                      className="btn-secondary" 
                      style={{ width: '100%', fontSize: '11px', padding: '6px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Plus size={12} /> Choose PDF / Image
                    </button>
                  </div>
                </div>
              </div>

              {/* CORE DYNAMIC FORM SECTION */}
              <div className="form-section-title">{purchaseMode ? '2. Invoice Date, Supply & Line Items' : '2. Bill Timelines & Pricing'}</div>
              <div className="form-grid-4">
                <div className="form-group">
                  <Req>{purchaseMode ? 'Invoice Date' : 'Bill Issue Date'}</Req>
                  <input type="date" className="form-input" value={dateOnly(expenseDate)} onChange={(e) => setExpenseDate(dateOnly(e.target.value))} />
                </div>
                <div className="form-group">
                  <Opt>{purchaseMode ? 'Payment Due Date' : 'Calculated Due Date'}</Opt>
                  <input
                type="date"
                className="form-input"
                value={dateOnly(dueDate)}
                onChange={(e) => {
                  dueDateUserEditedRef.current = true;
                  setDueDate(dateOnly(e.target.value));
                }}
              />
                </div>
                <StatePlaceOfSupplySelect value={placeOfSupply} onChange={setPlaceOfSupply} />
              </div>
              <div className={purchaseMode ? 'form-grid-2' : 'form-grid-4'}>
                <DynamicSelect optionKey="expense_currencies" label={purchaseMode ? 'Invoice Currency' : 'Bill Currency'} value={expenseCurrency} onChange={setExpenseCurrency} baseOptions={['INR', 'USD', 'EUR']} />
                <div className="form-group">
                  <Req>Supply Mechanism (FCM/RCM/ECO)</Req>
                  <select className="form-input" value={expenseSupplyMechanism} onChange={(e) => setExpenseSupplyMechanism(e.target.value)}>
                    <option value="FCM">FCM</option>
                    <option value="RCM">RCM</option>
                    <option value="ECO">ECO</option>
                  </select>
                </div>
                {!purchaseMode && (
                  <div className="form-group">
                    <label>Use multi line items</label>
                    <select className="form-input" value={useExpenseLineItems.toString()} onChange={(e) => setUseExpenseLineItems(e.target.value === 'true')}>
                      <option value="false">Single amount entry</option>
                      <option value="true">Line items grid</option>
                    </select>
                  </div>
                )}
              </div>
              {!purchaseMode && !useExpenseLineItems ? (
              <div className="form-grid-4">
                <div className="form-group">
                  <Req>Baseline Subtotal Cost (₹)</Req>
                  <AmountInput value={amount} onChange={setAmount} />
                </div>
                <div className="form-group">
                  <Req>GST Tax rate (%)</Req>
                  <select className="form-input" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))}>
                    <option value="0">0% GST</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard Services)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
                <div className="form-group">
                  <Opt>HSN / SAC Code</Opt>
                  <input type="text" className="form-input" placeholder="e.g. 9984" value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
                </div>
                <div className="form-group" style={{ fontSize: 12 }}>
                  <label>Tax split</label>
                  <div>CGST: ₹{expCgst.toLocaleString()} | SGST: ₹{expSgst.toLocaleString()} | IGST: ₹{expIgst.toLocaleString()}</div>
                  <div style={{ fontWeight: 'bold', marginTop: 4 }}>Total: ₹{totalAmount.toLocaleString()}</div>
                </div>
              </div>
              ) : (
              <>
              <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{purchaseMode ? 'Purchase invoice line items' : 'Expense line items'}</span>
                <button type="button" className="btn-secondary-sm" onClick={() => setShowInlineInventory(true)}>+ Add New Item</button>
              </div>
              <div className="invoice-items-scroll">
                <table className="invoice-items-table">
                  <thead><tr><th>Product</th><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>GST%</th><th>Supply</th><th>Tax</th><th></th></tr></thead>
                  <tbody>
                    {expenseLineItems.map((item, idx) => (
                      <LineItemTaxRow key={idx} line={item} index={idx} onChange={handleExpenseLineChange} onRemove={(i) => expenseLineItems.length > 1 && setExpenseLineItems(expenseLineItems.filter((_, j) => j !== i))} canRemove={expenseLineItems.length > 1} placeOfSupply={placeOfSupply} companyState={registeredState} inventory={inventory} />
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn-secondary-sm" style={{ marginTop: 8 }} onClick={() => setExpenseLineItems([...expenseLineItems, emptyLineItem()])}>+ Add line</button>
              </>
              )}

              {!purchaseMode && (
              <>
              {/* RECURRING EXPENSE REMINDER MECHANISM */}
              <div className="form-section-title">3. Recurring Type & Reminder Compliance</div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Booking Inflow Type</label>
                  <select className="form-input" value={isRecurring.toString()} onChange={(e) => setIsRecurring(e.target.value === 'true')}>
                    <option value="false">Non-Recurring Outward Expense</option>
                    <option value="true">Recurring Fixed Expense</option>
                  </select>
                </div>
                {isRecurring && (
                  <>
                    <div className="form-group">
                      <label>Cron Billing Frequency</label>
                      <select className="form-input" value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value)}>
                        <option>Monthly</option>
                        <option>Quarterly</option>
                        <option>Yearly</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ justifyContent: 'center' }}>
                      <div className="checkbox-group" onClick={() => setRemindersOptIn(!remindersOptIn)}>
                        <div className={`checkbox-custom ${remindersOptIn ? 'checked' : ''}`}>
                          {remindersOptIn && <CheckCircle2 className="checkbox-custom-tick" />}
                        </div>
                        <span className="checkbox-label" style={{ fontSize: '11px' }}>
                          Opt-In Cron Email Reminders (Trigger 1 day prior & on due date)
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              </>
              )}

              {/* TAX COMPLIANCE AND DEDUCTIBLES */}
              <div className="form-section-title">{purchaseMode ? '3. Input Tax Credit (ITC) & TDS' : '4. Tax Eligibility (ITC) & TDS Withholding'}</div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Claim Input Tax Credit (ITC)?*</label>
                  <div 
                    onClick={() => setItcEligible(!itcEligible)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      background: 'var(--bg-secondary)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      userSelect: 'none',
                      marginTop: '4px',
                      height: '42px'
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: itcEligible ? 'var(--accent-teal)' : '#cbd5e1',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: '3px',
                        left: itcEligible ? '23px' : '3px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: itcEligible ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                      {itcEligible ? 'Yes (ITC Eligible)' : 'No (Cost Expensed)'}
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label>TDS Amount Deducted (Withheld) (₹)</label>
                  <AmountInput
                    className="form-input"
                    placeholder="Enter withholding amount if any"
                    value={tdsDeducted}
                    onChange={setTdsDeducted}
                  />
                </div>
                <div className="form-group">
                  <label>Description / Audit Notes (Optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. AWS Mumbai region servers lease" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              {/* PAYMENT STATUS & INTEGRATED OUTFLOW VOUCHER */}
              <div className="form-section-title">{purchaseMode ? '4. Payment Status & Creditors Settlement' : '5. Payment Status & Payables Settlement'}</div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>{purchaseMode ? 'Invoice Payment Status*' : 'Voucher Payment Settlement Status*'}</label>
                  <select className="form-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                    <option value="Unpaid">{purchaseMode ? 'Unpaid (Creditors / Accounts Payable)' : 'Unpaid Debt (Registers in Accounts Payables)'}</option>
                    <option value="Paid">{purchaseMode ? 'Paid (Auto-generates Payment Voucher)' : 'Paid Fully (Auto-generates Linked Payment Voucher)'}</option>
                  </select>
                </div>

                {paymentStatus === 'Unpaid' ? (
                  <div className="form-group">
                    <label>Settlement Due Date*</label>
                    <input type="date" className="form-input" value={dateOnly(dueDate)} onChange={(e) => setDueDate(dateOnly(e.target.value))} />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Paid From Cash/Bank Ledger Account*</label>
                      <select className="form-input" value={paidFromAccount} onChange={(e) => setPaidFromAccount(e.target.value)}>
                        <option>HDFC Bank Current A/c</option>
                        <option>ICICI Bank A/c</option>
                        <option>Main Cash Ledger</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>UTR/Reference No. <Opt>(optional)</Opt></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. UTR-AWS-9911"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* DYNAMIC SUM SUMMARY BOX */}
              <div className="invoice-calculations">
                <div className="calc-row">
                  <span>{purchaseMode ? 'Purchase Subtotal:' : 'Bill Subtotal:'}</span>
                  <span className="calc-val">₹{((useExpenseLineItems || purchaseMode) ? expSubtotal : toAmount(amount)).toLocaleString()}</span>
                </div>
                <div className="calc-row">
                  <span>{purchaseMode ? 'Input GST:' : `GST Tax (${taxRate}%):`}</span>
                  <span className="calc-val" style={{ color: 'var(--accent-red)' }}>₹{taxAmount.toLocaleString()}</span>
                </div>
                {purchaseMode && (
                  <>
                    <div className="calc-row" style={{ fontSize: '11px' }}>
                      <span>CGST / SGST / IGST:</span>
                      <span>₹{expCgst.toLocaleString()} / ₹{expSgst.toLocaleString()} / ₹{expIgst.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {toAmount(tdsDeducted) > 0 && (
                  <div className="calc-row" style={{ color: 'var(--accent-amber)' }}>
                    <span>TDS Withheld / Deducted:</span>
                    <span>-₹{toAmount(tdsDeducted).toLocaleString()}</span>
                  </div>
                )}
                <div className="calc-row grand-total">
                  <span>{purchaseMode ? 'Total Payable Amount:' : 'Total Liability Amount:'}</span>
                  <span className="calc-val" style={{ color: 'var(--accent-red)' }}>₹{totalAmount.toLocaleString()}</span>
                </div>
                {paymentStatus === 'Paid' && (
                  <div className="calc-row" style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 'bold', paddingTop: '4px' }}>
                    <span>{purchaseMode ? 'Immediate Payment (Net of TDS):' : 'Immediate Outflow Paid Value (Net of TDS):'}</span>
                    <span>₹{(totalAmount - toAmount(tdsDeducted)).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={resetExpenseForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingExpenseId
                    ? (purchaseMode ? 'Update Purchase Bill' : 'Update Expense Bill')
                    : (purchaseMode ? 'Book Purchase Bill' : 'Book Expense Bill')}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
                <div className="metric-card expenses">
                  <div className="metric-header">
                    <span>{purchaseMode ? 'Total Purchases Booked' : 'Total Booked Outflows'}</span>
                    <div className="metric-icon-bg"><TrendingDown size={16} /></div>
                  </div>
                  <span className="metric-value" style={{ color: 'var(--accent-red)' }}>₹{formatINR(totalBookedExpenses)}</span>
                </div>
                <div className="metric-card receipts">
                  <div className="metric-header">
                    <span>Settled (Paid)</span>
                    <div className="metric-icon-bg"><CheckCircle2 size={16} /></div>
                  </div>
                  <span className="metric-value" style={{ color: 'var(--accent-teal)' }}>₹{formatINR(totalPaidExpenses)}</span>
                </div>
                <div className="metric-card pending-receipts">
                  <div className="metric-header">
                    <span>Outstanding Payables</span>
                    <div className="metric-icon-bg"><AlertTriangle size={16} /></div>
                  </div>
                  <span className="metric-value" style={{ color: 'var(--accent-amber)' }}>₹{formatINR(totalPayablesPipeline)}</span>
                </div>
              </div>

              <div className="table-header-row" style={{ marginBottom: '16px' }}>
                <h3 className="chart-title">{purchaseMode ? 'Purchase Bills Registry' : 'Expenses Registry'}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" onClick={() => { setEditingExpenseId(null); setShowAddForm(true); }}>
                    {purchaseMode ? 'Record Purchase Invoice' : 'Record Expense'}
                  </button>
                  <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadExpenses('csv')}>
                    <Download size={14} /> Export CSV
                  </button>
                  <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadExpenses('excel')}>
                    <FileSpreadsheet size={14} /> Export Excel
                  </button>
                </div>
              </div>

              <MobileFilterShell
                activeCount={countActiveFilters([filterStartDate, filterEndDate, registrySearch])}
                title={purchaseMode ? 'Purchase filters' : 'Expense filters'}
              >
              <div className="registry-filter-bar form-grid-4" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <Opt>From Date</Opt>
                  <input type="date" className="form-input" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <Opt>To Date</Opt>
                  <input type="date" className="form-input" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <Opt>Search registry</Opt>
                  <input type="text" className="form-input" placeholder="Bill no, vendor, category..." value={registrySearch} onChange={(e) => setRegistrySearch(e.target.value)} />
                </div>
              </div>
              </MobileFilterShell>

              <div className="premium-table-wrapper desktop-only registry-ledger-wrap">
                <table className="premium-table registry-ledger">
                  <thead>
                    <tr>
                      <ExcelColumnFilter
                        label="Document"
                        columnKey="document"
                        className="registry-ledger__doc"
                        values={expenseExcelValues.document}
                        sort={expenseExcelSort}
                        onSort={setExpenseExcelSort}
                        selected={expenseExcelFilters.document || null}
                        onFilter={(s) => setExpenseExcelFilterFor('document', s)}
                      />
                      <ExcelColumnFilter
                        label="Supplier"
                        columnKey="party"
                        className="registry-ledger__party"
                        values={expenseExcelValues.party}
                        sort={expenseExcelSort}
                        onSort={setExpenseExcelSort}
                        selected={expenseExcelFilters.party || null}
                        onFilter={(s) => setExpenseExcelFilterFor('party', s)}
                      />
                      <ExcelColumnFilter
                        label="Settlement"
                        columnKey="amount"
                        className="registry-ledger__settle"
                        values={expenseExcelValues.amount}
                        sort={expenseExcelSort}
                        onSort={setExpenseExcelSort}
                        selected={expenseExcelFilters.amount || null}
                        onFilter={(s) => setExpenseExcelFilterFor('amount', s)}
                        valueType="number"
                      />
                      {!purchaseMode && (
                        <ExcelColumnFilter
                          label="Head"
                          columnKey="head"
                          className="registry-ledger__meta"
                          values={expenseExcelValues.head}
                          sort={expenseExcelSort}
                          onSort={setExpenseExcelSort}
                          selected={expenseExcelFilters.head || null}
                          onFilter={(s) => setExpenseExcelFilterFor('head', s)}
                        />
                      )}
                      <ExcelColumnFilter
                        label="Status"
                        columnKey="status"
                        className="registry-ledger__status"
                        values={expenseExcelValues.status}
                        sort={expenseExcelSort}
                        onSort={setExpenseExcelSort}
                        selected={expenseExcelFilters.status || null}
                        onFilter={(s) => setExpenseExcelFilterFor('status', s)}
                      />
                      <th className="registry-ledger__actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistryExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="registry-ledger__doc">
                          <div className="registry-ledger__id">{exp.expense_number}</div>
                          <div className="registry-ledger__sub">
                            {exp.invoice_number ? <span>{exp.invoice_number}</span> : null}
                            <span>{formatDateDDMMYYYY(exp.expense_date)}</span>
                          </div>
                        </td>
                        <td className="registry-ledger__party">
                          <div className="registry-ledger__party-name">{exp.vendor_name}</div>
                          <div className="registry-ledger__sub">
                            <span className={`status-badge ${exp.itc_eligible ? 'paid' : 'draft'}`}>
                              {exp.itc_eligible ? 'ITC' : 'No ITC'}
                            </span>
                          </div>
                        </td>
                        <td className="registry-ledger__settle">
                          <div className="registry-ledger__amount is-out">
                            ₹{toAmount(exp.total_amount).toLocaleString('en-IN')}
                          </div>
                          <div className="registry-ledger__sub">
                            <span>TDS ₹{toAmount(exp.tds_deducted).toLocaleString('en-IN')}</span>
                            {exp.payment_status === 'Paid' ? (
                              <span>{exp.paid_from_account || 'Paid'}</span>
                            ) : (
                              <span>Due {formatDateDDMMYYYY(exp.due_date)}</span>
                            )}
                          </div>
                        </td>
                        {!purchaseMode && (
                          <td className="registry-ledger__meta">{exp.expense_head}</td>
                        )}
                        <td className="registry-ledger__status">
                          <span className={`status-badge ${exp.payment_status.toLowerCase() === 'paid' ? 'paid' : 'unpaid'}`}>
                            {exp.payment_status}
                          </span>
                        </td>
                        <td className="registry-ledger__actions registry-actions-cell">
                          <RegistryRowActions
                            onEdit={() => openEditExpense(exp)}
                            deleteLabel={`expense ${exp.expense_number}`}
                            onDelete={() => deleteExpense(exp.id)}
                            deleteDisabled={isFinancialYearLocked}
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredRegistryExpenses.length === 0 && (
                      <tr>
                        <td colSpan={purchaseMode ? 5 : 6} className="empty-state">No bills found in registry.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <MobileRegistryCards
                items={filteredRegistryExpenses}
                emptyLabel="No bills found in registry."
                renderCard={(exp) => (
                  <>
                    <div className="mobile-registry-card__head">
                      <div>
                        <div className="mobile-registry-card__title">{exp.expense_number}</div>
                        <div className="mobile-registry-card__meta">{exp.vendor_name}</div>
                      </div>
                      <div className="mobile-registry-card__amount">₹{exp.total_amount.toLocaleString()}</div>
                    </div>
                    <div className="mobile-registry-card__row"><span>Date</span><span>{formatDateDDMMYYYY(exp.expense_date)}</span></div>
                    <div className="mobile-registry-card__row">
                      <span>Status</span>
                      <span className={`status-badge ${exp.payment_status.toLowerCase() === 'paid' ? 'paid' : 'unpaid'}`}>{exp.payment_status}</span>
                    </div>
                    <MobileCardExpand label="More details">
                      {!purchaseMode && (
                        <div className="mobile-registry-card__row"><span>Head</span><span>{exp.expense_head}</span></div>
                      )}
                      <div className="mobile-registry-card__row"><span>Due</span><span>{formatDateDDMMYYYY(exp.due_date) || '—'}</span></div>
                    </MobileCardExpand>
                    <div className="mobile-registry-card__actions">
                      <MobileRegistryCardActions
                        onView={() => openEditExpense(exp)}
                        viewLabel="Open"
                        viewTitle="View / edit bill"
                        onEdit={() => openEditExpense(exp)}
                        deleteLabel={`expense ${exp.expense_number}`}
                        onDelete={() => deleteExpense(exp.id)}
                        deleteDisabled={isFinancialYearLocked}
                      />
                    </div>
                  </>
                )}
              />
            </>
          )}
        </div>
      )}

      {expenseSubTab === 'cron-logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* CRON STATUS BOARD */}
          <div className="dashboard-grid">
            <div className="metric-card receipts" style={{ borderLeft: '4px solid var(--accent-teal)' }}>
              <div className="metric-header">
                <span>Active Notification Pipelines</span>
                <div className="metric-icon-bg"><Mail size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: 'var(--accent-teal)' }}>
                {expenses.filter(e => e.is_recurring && e.reminders_opt_in).length} Ledgers
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Opt-in recurring expenses
              </span>
            </div>

            <div className="metric-card pending-receipts" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
              <div className="metric-header">
                <span>Auto-logout Opt-out / Manual</span>
                <div className="metric-icon-bg"><AlertTriangle size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: 'var(--accent-amber)' }}>
                {expenses.filter(e => e.is_recurring && !e.reminders_opt_in).length} Ledgers
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Notifications disabled
              </span>
            </div>

            <div className="metric-card profit" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
              <div className="metric-header">
                <span>Scheduled Cron Interval</span>
                <div className="metric-icon-bg"><Calendar size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: 'var(--accent-purple)', fontSize: '20px', marginTop: '4px' }}>
                Daily at 08:00 AM
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                */5 * * * * (Laravel Scheduler)
              </span>
            </div>
          </div>

          {/* SIMULATION CONTROLS */}
          <div className="master-form" style={{ margin: 0, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Simulated Background Email Cron Dispatcher</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                Execute the Laravel schedule processor manually to scan due dates and generate automated alerts (1 day prior and on the due date itself).
              </p>
            </div>
            <button
              onClick={() => {
                const res = runCronJobScheduler();
                alert(`CRON SIMULATOR COMPLETED:\nSuccessfully scanned recurring ledgers and generated ${res.count * 2} alert logs!`);
              }}
              className="btn-primary"
              style={{
                height: '46px',
                padding: '0 24px',
                background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Activity size={16} /> Run Simulated Cron Scheduler
            </button>
          </div>

          {/* LOGS TABLE */}
          <div className="table-card">
            <h3 className="chart-title">Cron Job Notification Transmission Log History</h3>
            <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Supplier / Payee</th>
                    <th>Expense Bill Ref</th>
                    <th>Bill Due Date</th>
                    <th>Simulated Scheduled Dispatch Date</th>
                    <th>Notification Alert Type</th>
                    <th>Recipient Email Inbox</th>
                    <th>Transmission Status</th>
                    <th>Real-Time Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {cronReminderLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace' }}>#CRN-{Math.floor(log.id).toString().slice(-6)}</td>
                      <td style={{ fontWeight: 'bold' }}>{log.vendor_name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{log.expense_number}</td>
                      <td>{formatDateDDMMYYYY(log.due_date)}</td>
                      <td style={{ fontWeight: 'bold' }}>{log.scheduled_date}</td>
                      <td>
                        <span className="status-badge" style={{
                          backgroundColor: log.type.includes('1-Day') ? 'rgba(6, 182, 212, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                          color: log.type.includes('1-Day') ? 'var(--accent-teal)' : 'var(--accent-purple)'
                        }}>
                          {log.type}
                        </span>
                      </td>
                      <td>{log.recipient}</td>
                      <td>
                        <span className="status-badge paid">
                          {log.status}
                        </span>
                      </td>
                      <td>{formatDateDDMMYYYY(log.timestamp)}</td>
                    </tr>
                  ))}
                  {cronReminderLogs.length === 0 && (
                    <tr>
                      <td colSpan="9" className="empty-state">No notification alerts have been transmitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      </>
      )}

      {selectedLedgerVendor && (() => {
        const ledgerData = getVendorLedger(selectedLedgerVendor);
        const totalDebit = ledgerData.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = ledgerData.reduce((sum, item) => sum + item.credit, 0);
        const currentPayable = ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].running_balance : 0;
        return (
          <div className="modal-overlay" onClick={() => setSelectedLedgerVendor(null)}>
            <div className="pdf-preview-card" style={{ maxWidth: '950px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#111' }}>Party Ledger: {selectedLedgerVendor.name}</h2>
                <button className="btn-secondary" onClick={() => setSelectedLedgerVendor(null)}>Close</button>
              </div>
              <p style={{ marginBottom: 12 }}>Net payable: ₹{currentPayable.toLocaleString()} · Dr ₹{totalDebit.toLocaleString()} · Cr ₹{totalCredit.toLocaleString()}</p>
              <div className="premium-table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr><th>Date</th><th>Description</th><th>Ref</th><th>Dr</th><th>Cr</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {ledgerData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{formatDateDDMMYYYY(row.date)}</td>
                        <td>{row.description}</td>
                        <td>{row.reference}</td>
                        <td>{row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '-'}</td>
                        <td>{row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '-'}</td>
                        <td>₹{row.running_balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ==========================================
// E. PAYMENT TAB SCREEN
// ==========================================
function PaymentTab() {
  const {
    payments, 
    expenses, 
    receipts,
    debitNotes,
    createPayment,
    updatePayment,
    deletePayment,
    currentUser, 
    companyDetails, 
    bankAccounts, 
    cashLedgers, 
    isFinancialYearLocked,
    addConsoleLog,
    vendors,
  } = useSimulator();

  const [paymentSubTab, setPaymentSubTab] = useState('registry');
  const [selectedPaymentForPDF, setSelectedPaymentForPDF] = useState(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const skipPaymentExpenseAutofillRef = useRef(false);
  const paymentAutofillExpenseRef = useRef(null);
  const [expenseId, setExpenseId] = useState('');
  const [tdsDeducted, setTdsDeducted] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('INR');
  const paymentCurSym = getCurrencySymbol(paymentCurrency);

  // Single Form States
  const [payee, setPayee] = useState('');
  const [amountPayable, setAmountPayable] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentSettleMode, setPaymentSettleMode] = useState('full'); // full | partial
  const [paymentDate, setPaymentDate] = useState('2026-05-23');
  const [paidFrom, setPaidFrom] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');

  // Advance Form States
  const [advPayee, setAdvPayee] = useState('');
  const [advAmountPayable, setAdvAmountPayable] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advTds, setAdvTds] = useState('');
  const [advPaidFrom, setAdvPaidFrom] = useState('');
  const [advMode, setAdvMode] = useState('Bank Transfer');
  const [advRef, setAdvRef] = useState('');

  // Initialize Paid From dropdowns
  useEffect(() => {
    if (bankAccounts.length > 0) {
      setPaidFrom(bankAccounts[0]);
      setAdvPaidFrom(bankAccounts[0]);
    } else if (cashLedgers.length > 0) {
      setPaidFrom(cashLedgers[0]);
      setAdvPaidFrom(cashLedgers[0]);
    } else {
      setPaidFrom('');
      setAdvPaidFrom('');
    }
  }, [bankAccounts, cashLedgers]);

  const sortedPaymentsBase = useMemo(
    () => sortRegistryNewestFirst(payments, 'payment_date'),
    [payments]
  );

  const paymentExcelGetters = useMemo(
    () => ({
      document: (p) => p.payment_number || '',
      party: (p) => p.payee || '',
      amount: (p) => toAmount(p.amount_paid),
      type: (p) => paymentVoucherTypeLabel(p),
      mode: (p) => p.payment_mode || '',
      date: (p) => p.payment_date || '',
    }),
    []
  );
  const paymentExcelFilterGetters = useMemo(
    () => ({
      ...paymentExcelGetters,
      amount: (p) => `₹${toAmount(p.amount_paid).toLocaleString('en-IN')}`,
      date: (p) => formatDateDDMMYYYY(p.payment_date),
    }),
    [paymentExcelGetters]
  );
  const {
    excelSort: paymentExcelSort,
    setExcelSort: setPaymentExcelSort,
    excelFilters: paymentExcelFilters,
    setExcelFilterFor: setPaymentExcelFilterFor,
    columnValues: paymentExcelValues,
    displayedRows: sortedPayments,
  } = useExcelTableState(sortedPaymentsBase, paymentExcelGetters, paymentExcelFilterGetters);

  const getPaymentShare = (voucher) => {
    const vendor = vendors.find(
      (v) => v.name === voucher.payee || sameId(v.id, voucher.vendor_id)
    );
    return buildPaymentSharePayload(voucher, {
      company: companyDetails,
      vendor,
      expenses,
      fromEmail: currentUser?.email,
    });
  };

  const getOutstandingForExpense = (exp, excludePaymentId = null) => {
    let outstanding = expenseOutstandingAmount(exp, payments, debitNotes);
    if (excludePaymentId) {
      const editing = payments.find((p) => sameId(p.id, excludePaymentId));
      if (editing && sameId(editing.expense_id, exp?.id)) {
        outstanding += paymentSettlementTotal(editing);
      }
    }
    return outstanding;
  };

  const openEditPayment = (pay) => {
    skipPaymentExpenseAutofillRef.current = true;
    setEditingPaymentId(pay.id);
    setShowRecordPayment(true);
    setPayee(pay.payee || '');
    setExpenseId(pay.expense_id != null ? String(pay.expense_id) : '');
    setPaymentDate(dateOnly(pay.payment_date) || portalTodayDateOnly());
    setPaymentMode(pay.payment_mode || 'Bank Transfer');
    setPaidFrom(pay.paid_from || '');
    setReferenceNo(pay.reference_no && pay.reference_no !== 'NIL' ? pay.reference_no : '');
    setPaymentCurrency(pay.currency || 'INR');
    setAmountPayable(paymentSettlementTotal(pay));
    setTdsDeducted(pay.tds_deducted ?? '');
    setAmountPaid(pay.amount_paid);
    const exp = expenses.find((e) => sameId(e.id, pay.expense_id));
    let outstanding = exp ? getOutstandingForExpense(exp, pay.id) : 0;
    outstanding += paymentSettlementTotal(pay);
    const settled = paymentSettlementTotal(pay);
    setPaymentSettleMode(settled + 0.009 < outstanding ? 'partial' : 'full');
  };

  const applyPaymentSettleMode = (mode) => {
    setPaymentSettleMode(mode);
    if (!expenseId) return;
    const exp = expenses.find((e) => sameId(e.id, expenseId));
    if (!exp) return;
    const outstanding = getOutstandingForExpense(exp, editingPaymentId);
    if (mode === 'full') {
      setAmountPayable(outstanding > 0 ? outstanding : '');
      setTdsDeducted('');
    } else if (Math.abs(toAmount(amountPayable) - outstanding) < 0.02) {
      setAmountPayable('');
      setAmountPaid('');
    }
  };

  // List of unique vendors with outstanding balances
  const uniqueVendorsWithUnpaid = Array.from(new Set(
    expenses
      .filter(exp => ['Unpaid', 'Partially Paid'].includes(exp.payment_status))
      .map(exp => exp.vendor_name)
  ));

  const getFilteredExpensesForPayee = (vendorName) => {
    return expenses.filter(
      (exp) => exp.vendor_name.toLowerCase().includes(vendorName.toLowerCase()) && getOutstandingForExpense(exp) > 0.009
    );
  };

  const linkedPaymentExpense = expenseId
    ? expenses.find((e) => sameId(e.id, parseInt(expenseId, 10)))
    : null;
  const paymentTdsBase = linkedPaymentExpense && toAmount(amountPayable) > 0
    ? tdsBaseForSettlement(linkedPaymentExpense, amountPayable)
    : 0;
  const paymentNetCash = netCashFromSettlement(amountPayable, tdsDeducted, 0);
  const advancePaymentTdsBase = toAmount(advAmountPayable) > 0
    ? toAmount(advAmountPayable)
    : 0;
  const advNetCash = netCashFromSettlement(advAmountPayable, advTds, 0);

  useEffect(() => {
    if (!expenseId || editingPaymentId) return;
    if (paymentSettleMode !== 'full') return;
    const exp = expenses.find((e) => e.id === parseInt(expenseId, 10));
    if (exp) {
      setAmountPayable(getOutstandingForExpense(exp, editingPaymentId));
    }
  }, [expenseId, editingPaymentId, paymentSettleMode]);

  useEffect(() => {
    if (skipPaymentExpenseAutofillRef.current) {
      skipPaymentExpenseAutofillRef.current = false;
      return;
    }

    const prevExpense = paymentAutofillExpenseRef.current;
    paymentAutofillExpenseRef.current = expenseId;
    if (prevExpense === expenseId && expenseId) return;

    if (expenseId && !editingPaymentId) {
      const exp = expenses.find((e) => e.id === parseInt(expenseId, 10));
      if (exp) {
        const outstanding = getOutstandingForExpense(exp, editingPaymentId);
        setPaymentSettleMode('full');
        setAmountPayable(outstanding);
        setTdsDeducted('');
        setAmountPaid(outstanding);
        if (exp.currency) setPaymentCurrency(exp.currency || 'INR');
      }
    } else if (!expenseId) {
      setAmountPayable('');
      setAmountPaid('');
      setTdsDeducted('');
      setPaymentSettleMode('full');
    }
  }, [expenseId, editingPaymentId]);

  useEffect(() => {
    if (!expenseId) return;
    setAmountPaid(netCashFromSettlement(amountPayable, tdsDeducted, 0));
  }, [amountPayable, tdsDeducted, expenseId]);

  useEffect(() => {
    setAdvAmount(netCashFromSettlement(advAmountPayable, advTds, 0));
  }, [advAmountPayable, advTds]);

  const pendingBills = expenses.filter((exp) => getOutstandingForExpense(exp) > 0.009);

  const startPaymentForBill = (exp) => {
    setPayee(exp.vendor_name);
    setExpenseId(String(exp.id));
    setShowRecordPayment(true);
  };

  const resetPaymentForm = () => {
    setShowRecordPayment(false);
    setEditingPaymentId(null);
    setPayee('');
    setExpenseId('');
    setAmountPayable('');
    setAmountPaid('');
    setTdsDeducted('');
    setReferenceNo('');
    setPaymentSettleMode('full');
  };

  usePortalFormIntent('payment', () => {
    setPaymentSubTab('registry');
    setEditingPaymentId(null);
    setShowRecordPayment(true);
  });

  useMobileBackHandler(showRecordPayment, () => {
    resetPaymentForm();
    return true;
  });

  // Metrics calculations
  const totalPaymentsMade = sumField(payments, 'amount_paid');

  const totalOutstandingPayables = expenses.reduce(
    (sum, exp) => sum + getOutstandingForExpense(exp),
    0
  );

  const {
    bankBalance: paymentBankBalance,
    cashBalance: paymentCashBalance,
    hasBankLedgers: paymentHasBanks,
    hasCashLedgers: paymentHasCash,
    showLedgerBalances: paymentShowLedgerBalances,
  } = computeBankCashBalances(receipts, payments, bankAccounts, cashLedgers);

  // Creditor Ageing Analysis calculation
  const getAgeingData = () => {
    let bracket1 = 0; // 0-30 days
    let bracket2 = 0; // 31-60 days
    let bracket3 = 0; // 61-90 days
    let bracket4 = 0; // 90+ days
    
    const today = portalToday();
    
    expenses.forEach(exp => {
      if (exp.payment_status === 'Paid') return;
      const outstanding = getOutstandingForExpense(exp);
      if (outstanding <= 0) return;
      
      const dueDate = parseDateOnlyLocal(exp.due_date || exp.expense_date) || portalToday();
      const diffTime = today - dueDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) bracket1 += outstanding;
      else if (diffDays <= 60) bracket2 += outstanding;
      else if (diffDays <= 90) bracket3 += outstanding;
      else bracket4 += outstanding;
    });
    
    return { bracket1, bracket2, bracket3, bracket4 };
  };

  const ageing = getAgeingData();
  const totalAgeingVal = ageing.bracket1 + ageing.bracket2 + ageing.bracket3 + ageing.bracket4;
  
  const calcAgeingPct = (val) => {
    if (totalAgeingVal === 0) return '0%';
    return `${Math.max(5, (val / totalAgeingVal) * 100)}%`;
  };

  // Save Voucher Handlers
  const handleSaveSinglePayment = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }
    if (!payee) return alert('Select or type vendor payee.');
    if (!expenseId) return alert('Select outstanding bill.');
    const payable = toAmount(amountPayable);
    const paidAmt = toAmount(amountPaid);
    const tdsAmt = toAmount(tdsDeducted);
    if (payable <= 0) return alert('Amount payable must be positive.');
    const exp = expenses.find((e) => sameId(e.id, expenseId));
    const outstanding = getOutstandingForExpense(exp, editingPaymentId);
    if (payable > outstanding + 0.009) {
      return alert(`Amount payable (${formatDocumentMoney(payable, paymentCurrency)}) cannot exceed outstanding liability of ${formatDocumentMoney(outstanding, paymentCurrency)}.`);
    }
    if (Math.abs(settlementFromComponents(paidAmt, tdsAmt, 0) - payable) > 0.02) {
      return alert(`Settlement mismatch: ${formatDocumentMoney(paidAmt, paymentCurrency)} paid + ${formatDocumentMoney(tdsAmt, paymentCurrency)} TDS must equal ${formatDocumentMoney(payable, paymentCurrency)} payable.`);
    }
    if (paidAmt <= 0) return alert('Net amount paid must be positive.');

    try {
      const paymentPayload = {
        payment_date: dateOnly(paymentDate),
        amount_paid: paidAmt,
        tds_deducted: tdsAmt,
        currency: paymentCurrency || 'INR',
        payment_mode: paymentMode,
        paid_from: paidFrom,
        reference_no: referenceNo,
      };
      if (editingPaymentId) {
        await updatePayment(editingPaymentId, paymentPayload);
      } else {
        await createPayment({
          expense_id: parseInt(expenseId, 10),
          expense_number: exp ? exp.expense_number : 'NIL',
          payee: payee,
          ...paymentPayload,
          is_advance: false,
        });
      }
    } catch (err) {
      showApiError(editingPaymentId ? 'Updating payment' : 'Saving payment', err);
      return;
    }

    alert(editingPaymentId ? 'Payment voucher updated successfully!' : 'Success: Payment voucher registered successfully!');
    resetPaymentForm();
  };

  const handleSaveAdvancePayment = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }
    if (!advPayee) return alert('Enter vendor payee.');
    const payable = toAmount(advAmountPayable);
    const advPaid = toAmount(advAmount);
    const advTdsAmt = toAmount(advTds);
    if (payable <= 0) return alert('Amount payable must be positive.');
    if (Math.abs(settlementFromComponents(advPaid, advTdsAmt, 0) - payable) > 0.02) {
      return alert(`Settlement mismatch: net paid + TDS must equal amount payable.`);
    }
    if (advPaid <= 0) return alert('Net amount disbursed must be positive.');

    try {
      await createPayment({
        expense_id: null,
        expense_number: 'NIL',
        payee: advPayee,
        payment_date: dateOnly(paymentDate),
        amount_paid: advPaid,
        tds_deducted: toAmount(advTds),
        currency: paymentCurrency || 'INR',
        payment_mode: advMode,
        paid_from: advPaidFrom,
        reference_no: advRef,
        is_advance: true,
      });
    } catch (err) {
      showApiError('Saving advance payment', err);
      return;
    }

    alert('Success: Advance payment voucher registered successfully!');
    setAdvPayee('');
    setAdvAmountPayable('');
    setAdvAmount('');
    setAdvTds('');
    setAdvRef('');
    setPaymentSubTab('registry');
  };

  const handleDownloadPayments = (format = 'csv') => {
    let csvContent = "Payment Voucher No.,Payee Vendor,Voucher Date,Payment Mode,Source Account,Cheque/UTR Ref,TDS (₹),Amount Paid (₹)\n";
    payments.forEach(pay => {
      csvContent += `"${pay.payment_number}","${pay.payee}","${formatDateDDMMYYYY(pay.payment_date)}","${pay.payment_mode}","${pay.payment_source}","${pay.reference_no}",${toAmount(pay.tds_deducted).toFixed(2)},${toAmount(pay.amount_paid).toFixed(2)}\n`;
    });

    const reportType = "outflow_payments_vouchers";
    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${reportType}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'PAYMENTS', `vouchex_${reportType}.xls`);
    }

    addConsoleLog('event', `GET /api/payments/download?format=${format}`, `Exported Outflow Payments registry as ${format.toUpperCase()} spreadsheet.`);
  };

  return (
    <div>
      {/* SUB-TABS */}
      <MobilePaymentNav active={paymentSubTab} onSelect={setPaymentSubTab} />
      <div className="tab-nav-sub desktop-subtabs">
        <button className={`sub-tab-btn ${paymentSubTab === 'registry' ? 'active' : ''}`} onClick={() => setPaymentSubTab('registry')}>
          📋 Payment Registry
        </button>
        <button className={`sub-tab-btn ${paymentSubTab === 'dashboard' ? 'active' : ''}`} onClick={() => setPaymentSubTab('dashboard')}>
          💳 Payments Dashboard
        </button>
        <button className={`sub-tab-btn ${paymentSubTab === 'ageing' ? 'active' : ''}`} onClick={() => setPaymentSubTab('ageing')}>
          ⏳ Creditors Ageing
        </button>
        <button className={`sub-tab-btn ${paymentSubTab === 'advance' ? 'active' : ''}`} onClick={() => setPaymentSubTab('advance')}>
          🚀 Record Advance Payment
        </button>
      </div>

      {/* DASHBOARD SECTION */}
      {paymentSubTab === 'dashboard' && (
        <div>
          <div className="dashboard-grid">
            <div className="metric-card income">
              <div className="metric-header">
                <span>Total Disbursements Done</span>
                <div className="metric-icon-bg"><TrendingDown size={16} /></div>
              </div>
              <span className="metric-value">₹{formatINR(totalPaymentsMade)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Paid Supplier Vouchers ({payments.length})
              </span>
            </div>

            <div className="metric-card expenses">
              <div className="metric-header">
                <span>Total Outstanding Payables</span>
                <div className="metric-icon-bg"><AlertTriangle size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: 'var(--accent-red)' }}>₹{formatINR(totalOutstandingPayables)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Vendor Unpaid Liabilities
              </span>
            </div>

            {paymentShowLedgerBalances && (
              <div className="metric-card receipts">
                <div className="metric-header">
                  <span>Cash & Bank Balances</span>
                  <div className="metric-icon-bg"><Receipt size={16} /></div>
                </div>
                <span className="metric-value" style={{ color: 'var(--accent-teal)' }}>
                  ₹{formatINR((paymentBankBalance ?? 0) + (paymentCashBalance ?? 0))}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {paymentHasBanks && `Bank: ₹${formatINR(paymentBankBalance)}`}
                  {paymentHasBanks && paymentHasCash && ' | '}
                  {paymentHasCash && `Cash: ₹${formatINR(paymentCashBalance)}`}
                </span>
              </div>
            )}
          </div>

          <div className="quick-actions-card" style={{ marginTop: '24px' }}>
            <h3 className="chart-title">Disbursement Insights</h3>
            <div style={{ marginTop: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
              <p>
                <strong>Compliance Warning:</strong> Under CBIC rules, credit claims require invoices to be settled within <strong>180 days</strong> of booking.
              </p>
              <div style={{ borderLeft: '3px solid var(--accent-red)', paddingLeft: '10px', background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                <span style={{ fontWeight: 'bold', display: 'block', fontSize: '11px', color: 'var(--accent-red)' }}>Rule 37 ITC Reversal Alert</span>
                <span style={{ fontSize: '12px' }}>
                  Ensure outstanding supplier bills in the 90+ days bracket are cleared to prevent mandatory ITC reversals with interest.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentSubTab === 'ageing' && (
        <div>
          <div className="dashboard-middle" style={{ gridTemplateColumns: '1fr', marginTop: '8px' }}>
            <div className="chart-card" style={{ minHeight: '300px' }}>
              <div className="chart-header">
                <h3 className="chart-title">Creditor Ageing Analysis Report</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overdue Brackets (FIFO basis)</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                {/* 0-30 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
                    <span>0 - 30 Days Outstanding</span>
                    <span>₹{formatINR(ageing.bracket1)} ({calcAgeingPct(ageing.bracket1)})</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: calcAgeingPct(ageing.bracket1), height: '100%', background: 'linear-gradient(to right, var(--accent-teal), var(--accent-green))' }} />
                  </div>
                </div>

                {/* 31-60 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
                    <span>31 - 60 Days Outstanding</span>
                    <span>₹{formatINR(ageing.bracket2)} ({calcAgeingPct(ageing.bracket2)})</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: calcAgeingPct(ageing.bracket2), height: '100%', background: 'var(--accent-amber)' }} />
                  </div>
                </div>

                {/* 61-90 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
                    <span>61 - 90 Days Outstanding</span>
                    <span>₹{formatINR(ageing.bracket3)} ({calcAgeingPct(ageing.bracket3)})</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: calcAgeingPct(ageing.bracket3), height: '100%', background: 'linear-gradient(to right, var(--accent-amber), var(--accent-red))' }} />
                  </div>
                </div>

                {/* 90+ */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--accent-red)' }}>90+ Days Critical Overdue</span>
                    <span style={{ color: 'var(--accent-red)' }}>₹{formatINR(ageing.bracket4)} ({calcAgeingPct(ageing.bracket4)})</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: calcAgeingPct(ageing.bracket4), height: '100%', background: 'var(--accent-red)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT REGISTRY — record payment + pending bills + voucher list */}
      {paymentSubTab === 'registry' && (
        <>
          {!showRecordPayment && (
            <div className="table-header-row" style={{ marginBottom: '16px' }}>
              <h3 className="chart-title" style={{ margin: 0 }}>Payment Registry</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-primary" onClick={() => setShowRecordPayment(true)}>
                  Record Payment
                </button>
                <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '6px 12px' }} onClick={() => handleDownloadPayments('csv')}>
                  <Download size={12} /> Export CSV
                </button>
                <button className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '6px 12px' }} onClick={() => handleDownloadPayments('excel')}>
                  <FileSpreadsheet size={12} /> Export Excel
                </button>
              </div>
            </div>
          )}

          {showRecordPayment && (
            <form onSubmit={handleSaveSinglePayment} className="master-form" style={{ marginBottom: '24px' }}>
              <div className="table-header-row" style={{ marginBottom: '16px' }}>
                <h3 className="form-section-title" style={{ margin: 0 }}>Record Vendor Payment Settlement</h3>
                <button type="button" className="btn-secondary" onClick={resetPaymentForm}>← Back to Registry</button>
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <DynamicSelect
                    optionKey="payment_single_vendors"
                    label="Select Supplier Payee"
                    value={payee}
                    onChange={(v) => { setPayee(v); setExpenseId(''); }}
                    required
                    baseOptions={[...new Set([...vendors.map((v) => v.name), ...uniqueVendorsWithUnpaid])]}
                    manualPlaceholder="Type supplier name manually…"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <Req>Link Outstanding Bill</Req>
                  <select className="form-input" value={expenseId} onChange={(e) => setExpenseId(e.target.value)} disabled={!payee}>
                    <option value="">-- Choose outstanding expense voucher --</option>
                    {getFilteredExpensesForPayee(payee).map(exp => (
                      <option key={exp.id} value={String(exp.id)}>
                        {exp.expense_number} ({exp.description || exp.expense_head} - Outstanding: ₹{formatINR(getOutstandingForExpense(exp))})
                      </option>
                    ))}
                  </select>
                </div>
                <CurrencySelect label="Payment currency" value={paymentCurrency} onChange={setPaymentCurrency} required />
                <div className="form-group">
                  <label>Settlement type*</label>
                  <SettlementModeToggle
                    value={paymentSettleMode}
                    onChange={applyPaymentSettleMode}
                    fullLabel="Full payment"
                    partialLabel="Partial payment"
                    ariaLabel="Payment settlement type"
                  />
                  <p className="form-hint">
                    {paymentSettleMode === 'partial'
                      ? 'Enter only the portion being paid now. Remaining balance stays on the bill.'
                      : 'Clears the full outstanding liability on this bill (after TDS).'}
                  </p>
                </div>
                <div className="form-group">
                  <Req>
                    {paymentSettleMode === 'partial'
                      ? `Partial amount to settle (${paymentCurSym})`
                      : `Amount Payable (${paymentCurSym})`}
                  </Req>
                  <AmountInput
                    noSpinner
                    value={amountPayable}
                    onChange={(v) => {
                      setAmountPayable(v);
                      const outstanding = linkedPaymentExpense
                        ? getOutstandingForExpense(linkedPaymentExpense, editingPaymentId)
                        : 0;
                      if (outstanding > 0 && toAmount(v) + 0.009 < outstanding) {
                        setPaymentSettleMode('partial');
                      } else if (outstanding > 0 && Math.abs(toAmount(v) - outstanding) < 0.02) {
                        setPaymentSettleMode('full');
                      }
                    }}
                    placeholder={
                      paymentSettleMode === 'partial'
                        ? 'Enter partial settlement amount'
                        : undefined
                    }
                    readOnly={paymentSettleMode === 'full' && !!expenseId}
                    style={
                      paymentSettleMode === 'full' && expenseId
                        ? { backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }
                        : undefined
                    }
                  />
                  {expenseId && (
                    <p className="form-hint" style={{ marginTop: 4 }}>
                      Outstanding on bill:{' '}
                      {formatDocumentMoney(
                        getOutstandingForExpense(linkedPaymentExpense, editingPaymentId),
                        paymentCurrency
                      )}
                      {paymentSettleMode === 'partial' && toAmount(amountPayable) > 0 && (
                        <>
                          {' · '}Remaining after this:{' '}
                          {formatDocumentMoney(
                            Math.max(
                              0,
                              getOutstandingForExpense(linkedPaymentExpense, editingPaymentId) -
                                toAmount(amountPayable)
                            ),
                            paymentCurrency
                          )}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <TdsPercentAmountFields
                baseAmount={paymentTdsBase}
                tdsAmount={tdsDeducted}
                onTdsAmountChange={setTdsDeducted}
                currency={paymentCurrency}
                percentLabel="TDS rate withheld"
                amountLabel="TDS deducted on bill"
                amountPlaceholder="TDS amount"
              />
              <div className="form-grid-3">
                <div className="form-group">
                  <Req>Net Amount Paid ({paymentCurSym})</Req>
                  <AmountInput noSpinner value={amountPaid} readOnly style={{ backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }} />
                </div>
              </div>
              {toAmount(amountPayable) > 0 && (
                <SettlementBreakdown
                  currency={paymentCurrency}
                  settlementLabel="Amount payable"
                  settlement={amountPayable}
                  tds={tdsDeducted}
                  netCash={paymentNetCash}
                  netLabel="Net amount paid"
                />
              )}
              <div className="form-grid-3">
                <div className="form-group">
                  <Req>Paid From (Acc Master)</Req>
                  <select className="form-input" value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)}>
                    <optgroup label="Bank Accounts">
                      {bankAccounts.map(b => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                    <optgroup label="Cash Ledgers">
                      {cashLedgers.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="form-group">
                  <Req>Disbursement Date</Req>
                  <input type="date" className="form-input" value={dateOnly(paymentDate)} onChange={(e) => setPaymentDate(dateOnly(e.target.value))} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <Req>Mode of Payment</Req>
                  <select className="form-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option>Bank Transfer / IMPS</option>
                    <option>NEFT / RTGS</option>
                    <option>Cheque / DD</option>
                    <option>Cash Disbursement</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>UTR No. / Transaction Reference <Opt>(optional)</Opt></label>
                  <input type="text" className="form-input" placeholder="e.g. UTR-HDFC-88992211" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                </div>
              </div>
              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={resetPaymentForm}>Cancel</button>
                <button type="submit" className="btn-primary">Post Payment Voucher</button>
              </div>
            </form>
          )}

          {!showRecordPayment && pendingBills.length > 0 && (
            <div className="table-card" style={{ marginBottom: '24px', border: '1px solid var(--accent-amber)' }}>
              <div className="table-header-row">
                <h3 className="chart-title" style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <AlertTriangle size={18} />
                  Pending Creditor Bills
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 'bold' }}>{pendingBills.length} outstanding</span>
              </div>
              <div className="premium-table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Bill Ref</th>
                      <th>Vendor</th>
                      <th>Category</th>
                      <th>Due Date</th>
                      <th>Outstanding (₹)</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBills.map((exp) => {
                      const outstanding = getOutstandingForExpense(exp);
                      return (
                        <tr key={exp.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{exp.expense_number}</td>
                          <td><strong>{exp.vendor_name}</strong></td>
                          <td>{exp.expense_head}</td>
                          <td>{formatDateDDMMYYYY(exp.due_date || exp.expense_date)}</td>
                          <td style={{ fontWeight: 'bold', color: 'var(--accent-amber)' }}>₹{outstanding.toLocaleString()}</td>
                          <td>
                            <span className="status-badge" style={{
                              backgroundColor: exp.payment_status === 'Unpaid' ? 'var(--accent-red-bg)' : 'rgba(245, 158, 11, 0.08)',
                              color: exp.payment_status === 'Unpaid' ? 'var(--accent-red)' : 'var(--accent-amber)',
                            }}>
                              {exp.payment_status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" className="btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => startPaymentForBill(exp)}>
                              Record Settlement
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!showRecordPayment && (
            <div className="table-card">
              <h3 className="chart-title" style={{ marginBottom: '16px' }}>Outflow Payments Voucher Registry</h3>
              <div className="premium-table-wrapper desktop-only registry-ledger-wrap">
                <table className="premium-table registry-ledger">
                  <thead>
                    <tr>
                      <ExcelColumnFilter
                        label="Document"
                        columnKey="document"
                        className="registry-ledger__doc"
                        values={paymentExcelValues.document}
                        sort={paymentExcelSort}
                        onSort={setPaymentExcelSort}
                        selected={paymentExcelFilters.document || null}
                        onFilter={(s) => setPaymentExcelFilterFor('document', s)}
                      />
                      <ExcelColumnFilter
                        label="Payee"
                        columnKey="party"
                        className="registry-ledger__party"
                        values={paymentExcelValues.party}
                        sort={paymentExcelSort}
                        onSort={setPaymentExcelSort}
                        selected={paymentExcelFilters.party || null}
                        onFilter={(s) => setPaymentExcelFilterFor('party', s)}
                      />
                      <ExcelColumnFilter
                        label="Settlement"
                        columnKey="amount"
                        className="registry-ledger__settle"
                        values={paymentExcelValues.amount}
                        sort={paymentExcelSort}
                        onSort={setPaymentExcelSort}
                        selected={paymentExcelFilters.amount || null}
                        onFilter={(s) => setPaymentExcelFilterFor('amount', s)}
                        valueType="number"
                      />
                      <ExcelColumnFilter
                        label="Details"
                        columnKey="mode"
                        className="registry-ledger__meta"
                        values={paymentExcelValues.mode}
                        sort={paymentExcelSort}
                        onSort={setPaymentExcelSort}
                        selected={paymentExcelFilters.mode || null}
                        onFilter={(s) => setPaymentExcelFilterFor('mode', s)}
                      />
                      <ExcelColumnFilter
                        label="Type"
                        columnKey="type"
                        className="registry-ledger__status"
                        values={paymentExcelValues.type}
                        sort={paymentExcelSort}
                        onSort={setPaymentExcelSort}
                        selected={paymentExcelFilters.type || null}
                        onFilter={(s) => setPaymentExcelFilterFor('type', s)}
                      />
                      <th className="registry-ledger__actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPayments.map((pay) => (
                      <tr key={pay.id}>
                        <td className="registry-ledger__doc">
                          <div className="registry-ledger__id">{pay.payment_number}</div>
                          <div className="registry-ledger__sub">
                            <span>{formatDateDDMMYYYY(pay.payment_date)}</span>
                            <span>{paymentSettledExpenseLabel(pay, expenses)}</span>
                          </div>
                        </td>
                        <td className="registry-ledger__party">
                          <div className="registry-ledger__party-name">{pay.payee}</div>
                        </td>
                        <td className="registry-ledger__settle">
                          <div className="registry-ledger__amount is-out">
                            ₹{toAmount(pay.amount_paid).toLocaleString('en-IN')}
                          </div>
                          <div className="registry-ledger__sub">
                            <span>{pay.paid_from || 'Bank A/c'}</span>
                          </div>
                        </td>
                        <td className="registry-ledger__meta">
                          <div>{pay.payment_mode}</div>
                          <div className="registry-ledger__sub">
                            {pay.reference_no ? <span>{pay.reference_no}</span> : null}
                          </div>
                        </td>
                        <td className="registry-ledger__status">
                          <span className="status-badge" style={{
                            backgroundColor: paymentVoucherTypeLabel(pay) === 'Advance' ? 'rgba(13, 148, 136, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: paymentVoucherTypeLabel(pay) === 'Advance' ? 'var(--accent-teal)' : 'var(--accent-blue)',
                          }}>
                            {paymentVoucherTypeLabel(pay)}
                          </span>
                        </td>
                        <td className="registry-ledger__actions registry-actions-cell">
                          <RegistryRowActions
                            onEdit={() => openEditPayment(pay)}
                            onView={() => setSelectedPaymentForPDF(pay)}
                            viewTitle="View payment voucher"
                            share={getPaymentShare(pay)}
                            deleteLabel={`payment ${pay.payment_number}`}
                            onDelete={() => deletePayment(pay.id)}
                            deleteDisabled={isFinancialYearLocked}
                          />
                        </td>
                      </tr>
                    ))}
                    {sortedPayments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-state">No payment disbursements recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <MobileRegistryCards
                items={sortedPayments}
                emptyLabel="No payment disbursements recorded yet."
                renderCard={(pay) => (
                  <>
                    <div className="mobile-registry-card__head">
                      <div>
                        <div className="mobile-registry-card__title">{pay.payment_number}</div>
                        <div className="mobile-registry-card__meta">{pay.payee}</div>
                      </div>
                      <div className="mobile-registry-card__amount">₹{pay.amount_paid.toLocaleString()}</div>
                    </div>
                    <div className="mobile-registry-card__row"><span>Date</span><span>{formatDateDDMMYYYY(pay.payment_date)}</span></div>
                    <div className="mobile-registry-card__row"><span>Status</span><span>{paymentVoucherTypeLabel(pay)}</span></div>
                    <MobileCardExpand label="More details">
                      <div className="mobile-registry-card__row"><span>Paid from</span><span>{pay.paid_from || '—'}</span></div>
                      <div className="mobile-registry-card__row"><span>Reference</span><span>{pay.reference_no || '—'}</span></div>
                    </MobileCardExpand>
                    <div className="mobile-registry-card__actions">
                      <MobileRegistryCardActions
                        onView={() => setSelectedPaymentForPDF(pay)}
                        viewTitle="View payment voucher"
                        onEdit={() => openEditPayment(pay)}
                        share={getPaymentShare(pay)}
                        deleteLabel={`payment ${pay.payment_number}`}
                        onDelete={() => deletePayment(pay.id)}
                        deleteDisabled={isFinancialYearLocked}
                      />
                    </div>
                  </>
                )}
              />
            </div>
          )}
        </>
      )}

      {/* ADVANCE PAYMENT FORM */}
      {paymentSubTab === 'advance' && (
        <form onSubmit={handleSaveAdvancePayment} className="master-form">
          <h3 className="form-section-title">Record Advance Vendor Payment (Without Linked Bill)</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Book money paid to suppliers in advance. This can later be matched and linked against vendor invoices booked under the Expense tab.
          </p>
          <div className="form-grid-3">
            <div className="form-group">
              <DynamicSelect
                optionKey="payment_advance_vendors"
                label="Select Vendor / Payee Entity Name"
                value={advPayee}
                onChange={setAdvPayee}
                required
                baseOptions={[...new Set([...vendors.map((v) => v.name), ...uniqueVendorsWithUnpaid])]}
                manualPlaceholder="Type supplier name manually…"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <Req>Amount Payable ({paymentCurSym})</Req>
              <AmountInput noSpinner value={advAmountPayable} onChange={setAdvAmountPayable} />
            </div>
            <CurrencySelect label="Payment currency" value={paymentCurrency} onChange={setPaymentCurrency} required />
          </div>

          <TdsPercentAmountFields
            baseAmount={advancePaymentTdsBase}
            tdsAmount={advTds}
            onTdsAmountChange={setAdvTds}
            currency={paymentCurrency}
            percentLabel="TDS rate withheld"
            amountLabel="TDS withheld / deducted"
            showHelper={toAmount(advAmountPayable) > 0}
          />
          <div className="form-grid-3">
            <div className="form-group">
              <Req>Net Amount Disbursed ({paymentCurSym})</Req>
              <AmountInput noSpinner value={advAmount} readOnly style={{ backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }} />
            </div>
          </div>
          {toAmount(advAmountPayable) > 0 && (
            <SettlementBreakdown
              currency={paymentCurrency}
              settlementLabel="Amount payable"
              settlement={advAmountPayable}
              tds={advTds}
              netCash={advNetCash}
              netLabel="Net amount disbursed"
            />
          )}

          <div className="form-grid-3">
            <div className="form-group">
              <label>Paid From Ledger*</label>
              <select className="form-input" value={advPaidFrom} onChange={(e) => setAdvPaidFrom(e.target.value)}>
                <optgroup label="Bank Accounts">
                  {bankAccounts.map(b => <option key={b} value={b}>{b}</option>)}
                </optgroup>
                <optgroup label="Cash Ledgers">
                  {cashLedgers.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label>Disbursement Date*</label>
              <input type="date" className="form-input" value={dateOnly(paymentDate)} onChange={(e) => setPaymentDate(dateOnly(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Mode of Payment*</label>
              <select className="form-input" value={advMode} onChange={(e) => setAdvMode(e.target.value)}>
                <option>Bank Transfer / IMPS</option>
                <option>NEFT / RTGS</option>
                <option>Cheque / DD</option>
                <option>Cash Disbursement</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>UTR Ref / Transaction Code*</label>
            <input type="text" className="form-input" placeholder="e.g. ADV-UTR-9901" value={advRef} onChange={(e) => setAdvRef(e.target.value)} />
          </div>

          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => setPaymentSubTab('dashboard')}>
              Cancel Advance
            </button>
            <button type="submit" className="btn-primary">
              Post Advance Payment
            </button>
          </div>
        </form>
      )}

      {/* PAYMENT VOUCHER PDF MODAL */}
      {selectedPaymentForPDF && (
        <PdfPrintModal
          onClose={() => setSelectedPaymentForPDF(null)}
          screenTitle="Payment Disbursement Slip"
          closeLabel="Close Voucher"
          toolbarExtra={<DocumentShareToolbar share={getPaymentShare(selectedPaymentForPDF)} />}
        >
          <div className="pdf-print-page">
            <h1 className="pdf-document-title">Payment Voucher</h1>
            <PdfDocumentHeader
              company={companyDetails}
              rightContent={
                <>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Voucher No: {selectedPaymentForPDF.payment_number}</p>
                  <p style={{ fontSize: '12px', margin: 0 }}>Date: {formatDateDDMMYYYY(selectedPaymentForPDF.payment_date)}</p>
                </>
              }
            />

            <div style={{ marginTop: '24px', fontSize: '14px', lineHeight: '1.6' }}>
              <p>Paid To Supplier: <strong style={{ color: '#111' }}>{selectedPaymentForPDF.payee}</strong></p>
              
              <table className="pdf-meta-table" style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'left' }}>Description Reference</th>
                    <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>TDS Deducted (₹)</th>
                    <th style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'right' }}>Net Amount Disbursed (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                      {selectedPaymentForPDF.is_advance ? (
                        <strong>Advance payment booking against future bills</strong>
                      ) : (
                        <span>Settlement against Vendor Bill: <strong>{paymentSettledExpenseLabel(selectedPaymentForPDF, expenses)}</strong></span>
                      )}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right' }}>
                      {formatPdfINR(selectedPaymentForPDF.tds_deducted || 0)}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatPdfINR(selectedPaymentForPDF.amount_paid)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '30px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <p><strong>Accounting Ledgers debited:</strong></p>
                  <p>Debit Ledger: Supplier Payee A/c</p>
                  <p>Credit Ledger: {selectedPaymentForPDF.paid_from || 'HDFC Bank Current A/c'}</p>
                  <p>Payment Mode: {selectedPaymentForPDF.payment_mode}</p>
                  <PdfOptionalLine label="Reference No:" value={selectedPaymentForPDF.reference_no} />
                </div>
                <div style={{ textAlign: 'right', borderTop: '2px solid #333', paddingTop: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#666' }}>Total Net Paid:</span>
                  <h3 style={{ margin: '4px 0', fontSize: '20px', color: '#b91c1c' }}>
                    {formatPdfINR(selectedPaymentForPDF.amount_paid)}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '12px' }}>Voucher authorized by: {selectedPaymentForPDF.created_by_name || 'Admin Account'}</p>
                </div>
              </div>
            </div>
          </div>
        </PdfPrintModal>
      )}
    </div>
  );
}

// ==========================================
// F. INVENTORY TAB SCREEN
// ==========================================
function InventoryTab() {
  const { inventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, isFinancialYearLocked, addConsoleLog, expenseHeads } = useSimulator();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [editingInventoryId, setEditingInventoryId] = useState(null);

  // Form states
  const [type, setType] = useState('Product');
  const [sku, setSku] = useState('');
  const [code, setCode] = useState(''); // HSN or SAC code
  const [unit, setUnit] = useState('Nos'); // UOM
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salesPrice, setSalesPrice] = useState('');
  const [taxRate, setTaxRate] = useState(18); // GST 2.0 slabs: 0, 5, 18, 40
  const [openingStock, setOpeningStock] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(50);
  const [productClass, setProductClass] = useState('finished_goods');
  const [defaultExpenseHead, setDefaultExpenseHead] = useState('');

  const resetInventoryForm = () => {
    setEditingInventoryId(null);
    setType('Product');
    setName('');
    setSku('');
    setCode('');
    setUnit('Nos');
    setPurchasePrice(0);
    setSalesPrice(0);
    setTaxRate(18);
    setOpeningStock(0);
    setLowStockThreshold(50);
    setProductClass('finished_goods');
    setDefaultExpenseHead('');
  };

  const openEditInventory = (inv) => {
    setEditingInventoryId(inv.id);
    setType(inv.type || 'Product');
    setName(inv.name || '');
    setSku(inv.sku || '');
    setCode(inv.code || '');
    setUnit(inv.unit || 'Nos');
    setPurchasePrice(parseFloat(inv.purchase_price || 0));
    setSalesPrice(parseFloat(inv.sales_price || inv.rate || 0));
    setTaxRate(parseFloat(inv.tax_rate ?? 18));
    setOpeningStock(inv.type === 'Product' ? parseInt(inv.quantity || 0, 10) : 0);
    setLowStockThreshold(parseInt(inv.low_stock_threshold || 50, 10));
    setProductClass(inv.product_class || 'finished_goods');
    setDefaultExpenseHead(inv.default_expense_head || '');
    setShowAddForm(true);
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Financial Period is locked from tampering.");
      return;
    }
    if (!name) return alert('Enter item name.');
    if (!code) return alert('Enter HSN/SAC classifier code.');
    if (!sku) return alert('Enter SKU/Item Code.');
    if (toAmount(salesPrice) < 0 || toAmount(purchasePrice) < 0) return alert('Pricing must be non-negative.');

    const payload = {
      type,
      name,
      code,
      sku,
      unit,
      rate: toAmount(salesPrice),
      purchase_price: toAmount(purchasePrice),
      sales_price: toAmount(salesPrice),
      tax_rate: taxRate,
      quantity: type === 'Product' ? openingStock : 0,
      low_stock_threshold: type === 'Product' ? lowStockThreshold : 0,
      product_class: type === 'Product' ? productClass : null,
      default_expense_head: defaultExpenseHead || null,
    };

    try {
      if (editingInventoryId) {
        await updateInventoryItem(editingInventoryId, payload);
        alert('Success: Inventory item updated.');
      } else {
        await createInventoryItem({
          ...payload,
          opening_stock: type === 'Product' ? openingStock : 0,
        });
        alert('Success: Inventory item setup completed successfully!');
      }
    } catch (err) {
      showApiError('Saving inventory item', err);
      return;
    }

    setShowAddForm(false);
    resetInventoryForm();
  };

  const handleDownloadInventoryReport = (format = 'csv') => {
    let csvContent = "Item ID,Category,SKU / Code,Product/Service Name,HSN / SAC,Purchase Cost (₹),Selling Price (₹),GST Rate (%),Stock Balance,UOM,Status Alert\n";
    inventory.forEach(inv => {
      const isLowStock = inv.type === 'Product' && inv.quantity <= (inv.low_stock_threshold || 0);
      const alertStr = inv.type === 'Product' && isLowStock ? `Low Stock Alert` : inv.type === 'Product' ? 'Optimal' : 'Non-Inventory';
      const quantityStr = inv.type === 'Product' ? inv.quantity : 'Service (N/A)';
      
      csvContent += `"${inv.id}","${inv.type}","${inv.sku || 'N/A'}","${inv.name}","${inv.code}",${parseFloat(inv.purchase_price || 0).toFixed(2)},${parseFloat(inv.sales_price || inv.rate || 0).toFixed(2)},${inv.tax_rate},"${quantityStr}","${inv.unit}","${alertStr}"\n`;
    });

    const reportType = "inventory_catalog_master";
    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${reportType}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'INVENTORY', `vouchex_${reportType}.xls`);
    }

    addConsoleLog('event', `GET /api/inventory/download?format=${format}`, `Exported inventory catalog as ${format.toUpperCase()} spreadsheet.`);
  };

  return (
    <div>
      <div className="table-header-row">
        <h3>Inventory Master (Products & Services)</h3>
        {!showAddForm && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-primary"
              onClick={() => {
                resetInventoryForm();
                setShowAddForm(true);
              }}
            >
              Add Products / Service Item
            </button>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => handleDownloadInventoryReport('csv')}
            >
              <Download size={14} /> Export CSV 📥
            </button>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => handleDownloadInventoryReport('excel')}
            >
              <FileSpreadsheet size={14} /> Export Excel 📊
            </button>
          </div>
        )}
      </div>

      {showAddForm ? (
        <form onSubmit={handleSaveInventory} className="master-form" style={{ marginBottom: '30px' }}>
          <h3 className="form-section-title">
            {editingInventoryId ? 'Edit Inventory / Service Item' : 'New Inventory / Service Item Setup'}
          </h3>
          
          <div className="form-grid-3">
            <div className="form-group">
              <label>Classification Type*</label>
              <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Product">Product Stock (Inventory Tracking Required)</option>
                <option value="Service">Service Item (No Stock Tracking Required)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Product/Service Name*</label>
              <input type="text" className="form-input" placeholder="e.g. Eco-Friendly Cleaning Fluid" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>SKU / Item Code*</label>
              <input type="text" className="form-input" placeholder="e.g. SKU-CLN-02" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>HSN (Products) or SAC (Services) Code*</label>
              <input type="text" className="form-input" placeholder="e.g. 3402 (4-digit min)" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <DynamicSelect
              optionKey="inventory_uom"
              label="Unit of Measurement (UOM)"
              required
              value={unit}
              onChange={setUnit}
              baseOptions={INVENTORY_UNIT_BASE_OPTIONS}
              manualPlaceholder="Add unit of measurement manually…"
            />
            <div className="form-group">
              <label>Default GST Slab Rate (%) (GST 2.0)*</label>
              <select className="form-input" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))}>
                <option value="0">0% (Nil / Exempt Supply)</option>
                <option value="5">5% (Essential Supplies)</option>
                <option value="18">18% (Standard Rate)</option>
                <option value="40">40% (Luxury/Demerit Goods - 2026 Slab)</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Default Purchase Price (₹)*</label>
              <AmountInput className="form-input" value={purchasePrice} onChange={setPurchasePrice} />
            </div>
            <div className="form-group">
              <label>Default Sales Price (₹)*</label>
              <AmountInput className="form-input" value={salesPrice} onChange={setSalesPrice} />
            </div>
          </div>

          {type === 'Product' && (
            <div className="form-grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label>Product classification*</label>
                <select className="form-input" value={productClass} onChange={(e) => setProductClass(e.target.value)}>
                  <option value="raw_material">Raw material</option>
                  <option value="semi_finished">Semi-finished goods</option>
                  <option value="finished_goods">Finished goods</option>
                </select>
              </div>
              <div className="form-group">
                <label>Default expense head (for consumption)</label>
                <select className="form-input" value={defaultExpenseHead} onChange={(e) => setDefaultExpenseHead(e.target.value)}>
                  <option value="">— Select —</option>
                  {expenseHeads.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'Product' && (
            <div className="form-grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label>Product classification*</label>
                <select className="form-input" value={productClass} onChange={(e) => setProductClass(e.target.value)}>
                  <option value="raw_material">Raw material</option>
                  <option value="semi_finished">Semi-finished goods</option>
                  <option value="finished_goods">Finished goods</option>
                </select>
              </div>
              <div className="form-group">
                <label>Default expense head (for consumption)</label>
                <select className="form-input" value={defaultExpenseHead} onChange={(e) => setDefaultExpenseHead(e.target.value)}>
                  <option value="">— Select —</option>
                  {expenseHeads.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'Product' && (
            <div className="form-grid-2" style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Opening Initial Stock Quantity*</label>
                <input
                  type="number"
                  className="form-input"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(parseInt(e.target.value || 0))}
                />
              </div>
              <div className="form-group">
                <label>Low Stock Warning Threshold Level*</label>
                <input
                  type="number"
                  className="form-input"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value || 0))}
                />
              </div>
            </div>
          )}

          <div className="btn-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAddForm(false);
                resetInventoryForm();
              }}
            >
              Cancel Setup
            </button>
            <button type="submit" className="btn-primary">
              {editingInventoryId ? 'Save Changes' : 'Register Stock Item'}
            </button>
          </div>
        </form>
      ) : (
        <>
        <div className="premium-table-wrapper desktop-only" style={{ marginTop: '20px' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Category</th>
                <th>SKU / Code</th>
                <th>Product/Service Name</th>
                <th>HSN / SAC</th>
                <th>Purchase Cost (₹)</th>
                <th>Selling Price (₹)</th>
                <th>GST Rate</th>
                <th>Stock Balance</th>
                <th>UOM</th>
                <th>Status Alerts</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((inv) => {
                const isLowStock = inv.type === 'Product' && inv.quantity <= (inv.low_stock_threshold || 0);
                return (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace' }}>#{inv.id}</td>
                    <td>
                      <span className="status-badge" style={{ 
                        backgroundColor: inv.type === 'Product' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(139, 92, 246, 0.1)', 
                        color: inv.type === 'Product' ? 'var(--accent-teal)' : 'var(--accent-purple)' 
                      }}>
                        {inv.type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{inv.sku || 'N/A'}</td>
                    <td style={{ fontWeight: 'bold' }}>{inv.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{inv.code}</td>
                    <td>₹{parseFloat(inv.purchase_price || 0).toLocaleString()}</td>
                    <td>₹{parseFloat(inv.sales_price || inv.rate || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>{inv.tax_rate}%</td>
                    <td style={{ fontWeight: 'bold', color: isLowStock ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                      {inv.type === 'Product' ? inv.quantity.toLocaleString() : 'Service (N/A)'}
                    </td>
                    <td>{inv.unit}</td>
                    <td>
                      {inv.type === 'Product' && isLowStock ? (
                        <span className="status-badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
                          ⚠️ Low Stock Alert (Threshold: {inv.low_stock_threshold})
                        </span>
                      ) : inv.type === 'Product' ? (
                        <span className="status-badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                          ✅ Optimal
                        </span>
                      ) : (
                        <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          Non-Inventory
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="registry-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                          onClick={() => openEditInventory(inv)}
                          disabled={isFinancialYearLocked}
                        >
                          Edit
                        </button>
                        <RecordDeleteButton
                          label={inv.name}
                          disabled={isFinancialYearLocked}
                          onDelete={async () => {
                            await deleteInventoryItem(inv.id);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <MobileRegistryCards
          items={inventory}
          emptyLabel="No inventory items yet."
          renderCard={(inv) => {
            const isLowStock = inv.type === 'Product' && inv.quantity <= (inv.low_stock_threshold || 0);
            return (
              <>
                <div className="mobile-registry-card__head">
                  <div>
                    <div className="mobile-registry-card__title">{inv.name}</div>
                    <div className="mobile-registry-card__meta">{inv.type} · {inv.sku || inv.code}</div>
                  </div>
                  <div className="mobile-registry-card__amount">₹{parseFloat(inv.sales_price || inv.rate || 0).toLocaleString()}</div>
                </div>
                <div className="mobile-registry-card__row">
                  <span>Stock</span>
                  <span style={{ color: isLowStock ? 'var(--accent-red)' : undefined }}>
                    {inv.type === 'Product' ? inv.quantity : 'N/A'}
                  </span>
                </div>
                <MobileCardExpand label="More details">
                  <div className="mobile-registry-card__row"><span>SKU</span><span>{inv.sku || inv.code || '—'}</span></div>
                  <div className="mobile-registry-card__row"><span>Purchase</span><span>₹{parseFloat(inv.purchase_price || 0).toLocaleString()}</span></div>
                </MobileCardExpand>
                <div className="mobile-registry-card__actions">
                  <MobileRegistryCardActions
                    onView={() => openEditInventory(inv)}
                    viewLabel="Open"
                    viewTitle="View / edit item"
                    onEdit={() => openEditInventory(inv)}
                    deleteLabel={inv.name}
                    onDelete={async () => { await deleteInventoryItem(inv.id); }}
                    deleteDisabled={isFinancialYearLocked}
                  />
                </div>
              </>
            );
          }}
        />
        </>
      )}
    </div>
  );
}

// ==========================================
// G. TAXATION TAB SCREEN
// ==========================================
function TaxationTab() {
  const {
    invoices, 
    expenses, 
    receipts,
    payments,
    companyDetails, 
    rcmLedgerBalance, 
    setRcmLedgerBalance, 
    ecrsLogs, 
    setEcrsLogs, 
    addConsoleLog,
    isFinancialYearLocked,
    creditNotes,
    debitNotes,
    invoiceItems,
    creditNoteItems,
    customers,
    vendors,
  } = useSimulator();
  const registeredState = resolveRegisteredState(companyDetails);

  const [taxReportSubTab, setTaxReportSubTab] = useState('summary'); // summary, gstr1, gstr2b, gstr3b, tds, compliance
  const [periodDraft, setPeriodDraft] = useState(() => getDefaultAppliedPeriod());
  const [appliedPeriod, setAppliedPeriod] = useState(() => getDefaultAppliedPeriod());
  const [periodError, setPeriodError] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreset, setExportPreset] = useState({ forTally: false, tallyFormat: 'xlsx', forceGstr1Workbook: false, gstrFormat: 'xlsx' });

  const taxScope = useMemo(
    () => scopeTaxDataForPeriod({ invoices, creditNotes, debitNotes, expenses, receipts, payments }, appliedPeriod),
    [invoices, creditNotes, debitNotes, expenses, receipts, payments, appliedPeriod]
  );
  const {
    invoices: periodInvoices,
    creditNotes: periodCreditNotes,
    debitNotes: periodDebitNotes,
    expenses: periodExpenses,
    receipts: periodReceipts,
    payments: periodPayments,
  } = taxScope;

  const periodEcrsLogs = useMemo(
    () => filterRecordsByDateRange(ecrsLogs, appliedPeriod.from, appliedPeriod.to, 'timestamp'),
    [ecrsLogs, appliedPeriod]
  );

  const sortedTaxCreditNotes = useMemo(
    () => sortRegistryNewestFirst(periodCreditNotes, 'issue_date'),
    [periodCreditNotes]
  );
  const sortedTaxDebitNotes = useMemo(
    () => sortRegistryNewestFirst(periodDebitNotes, 'issue_date'),
    [periodDebitNotes]
  );
  const sortedItcExpenses = useMemo(
    () => sortRegistryNewestFirst(periodExpenses.filter((exp) => exp.itc_eligible === true), 'expense_date'),
    [periodExpenses]
  );

  const handleApplyTaxPeriod = (next, err) => {
    if (err) {
      setPeriodError(err);
      return;
    }
    setPeriodError('');
    setAppliedPeriod(next);
    setPeriodDraft(next);
  };

  const getCustomerLedger = (cust) => {
    if (!cust) return [];
    const custInvoices = invoices.filter((inv) => inv.customer_id === cust.id && inv.status !== 'Cancelled');
    const custReceipts = receipts.filter((rec) => rec.customer_id === cust.id);
    const custCNs = creditNotes.filter((cn) => cn.customer_id === cust.id);
    const entries = [];
    entries.push({
      date: cust.opening_balance_date || '2026-04-01',
      description: 'Opening Balance',
      reference: 'NIL',
      debit: parseFloat(cust.opening_balance || 0),
      credit: 0,
    });
    custInvoices.forEach((inv) => {
      entries.push({ date: inv.issue_date, description: `Sales Invoice (${inv.invoice_number})`, reference: inv.invoice_number, debit: inv.total_amount, credit: 0 });
    });
    custReceipts.forEach((rec) => {
      entries.push({ date: rec.payment_date, description: `Receipt (${rec.receipt_number})`, reference: rec.receipt_number, debit: 0, credit: rec.amount_received });
    });
    custCNs.forEach((cn) => {
      entries.push({ date: cn.issue_date, description: `Credit Note (${cn.credit_note_number})`, reference: cn.credit_note_number, debit: 0, credit: cn.total_amount });
    });
    let balance = 0;
    return entries.map((entry) => {
      balance = balance + parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
      return { ...entry, running_balance: balance };
    });
  };

  const getVendorLedger = (vend) => {
    if (!vend) return [];
    const vendExpenses = expenses.filter((exp) => exp.vendor_id === vend.id);
    const vendPayments = payments.filter((pay) => pay.payee === vend.name || String(pay.payee) === String(vend.id));
    const vendDNs = debitNotes.filter((dn) => dn.vendor_id === vend.id);
    const entries = [];
    entries.push({ date: '2026-04-01', description: 'Opening Balance', reference: 'NIL', debit: 0, credit: parseFloat(vend.opening_balance || 0) });
    vendExpenses.forEach((exp) => entries.push({ date: exp.expense_date, description: `Bill (${exp.expense_number})`, reference: exp.expense_number, debit: 0, credit: exp.total_amount }));
    vendPayments.forEach((pay) => entries.push({ date: pay.payment_date, description: `Payment (${pay.payment_number})`, reference: pay.payment_number, debit: pay.amount_paid, credit: 0 }));
    vendDNs.forEach((dn) => entries.push({ date: dn.issue_date, description: `Debit Note (${dn.debit_note_number})`, reference: dn.debit_note_number, debit: dn.total_amount, credit: 0 }));
    let balance = 0;
    return entries.map((entry) => {
      balance = balance + parseFloat(entry.credit || 0) - parseFloat(entry.debit || 0);
      return { ...entry, running_balance: balance };
    });
  };
  
  const openTaxExport = (preset = {}) => {
    setExportPreset({
      forTally: false,
      tallyFormat: 'xlsx',
      forceGstr1Workbook: false,
      gstrFormat: 'xlsx',
      ...preset,
    });
    setShowExportModal(true);
  };

  // RCM local balance state to simulate warnings
  const [localRcmBalance, setLocalRcmBalance] = useState(rcmLedgerBalance);

  useEffect(() => {
    setRcmLedgerBalance(localRcmBalance);
  }, [localRcmBalance, setRcmLedgerBalance]);

  const sumBifurcated = (records, placeKey = 'place_of_supply') => {
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let total = 0;
    records.forEach((r) => {
      const b = bifurcateStoredTax(r, r[placeKey], registeredState);
      cgst += b.cgst;
      sgst += b.sgst;
      igst += b.igst;
      total += parseFloat(r.tax_amount || 0);
    });
    return { cgst, sgst, igst, total };
  };

  const salesOut = sumBifurcated(periodInvoices);
  const cnOut = sumBifurcated(periodCreditNotes);
  const cgstCollected = Math.max(0, salesOut.cgst - cnOut.cgst);
  const sgstCollected = Math.max(0, salesOut.sgst - cnOut.sgst);
  const igstCollected = Math.max(0, salesOut.igst - cnOut.igst);
  const totalSalesTax = Math.max(0, salesOut.total - cnOut.total);

  const eligibleExpenses = periodExpenses.filter((exp) => exp.itc_eligible === true);
  const itcIn = sumBifurcated(eligibleExpenses, 'place_of_supply');
  const dnOut = sumBifurcated(periodDebitNotes);
  const cgstPaid = Math.max(0, itcIn.cgst - dnOut.cgst);
  const sgstPaid = Math.max(0, itcIn.sgst - dnOut.sgst);
  const igstPaid = Math.max(0, itcIn.igst - dnOut.igst);
  const totalITCPaid = Math.max(0, itcIn.total - dnOut.total);

  const netGstPayable = (totalSalesTax - totalITCPaid);
  const netCgstPayable = cgstCollected - cgstPaid;
  const netSgstPayable = sgstCollected - sgstPaid;
  const netIgstPayable = igstCollected - igstPaid;

  // TDS Calculations
  // TDS Receivable: Withheld by clients (receipts with tds_deducted > 0)
  const tdsReceivableList = sortRegistryNewestFirst(
    periodReceipts.filter((r) => parseFloat(r.tds_deducted || 0) > 0),
    'payment_date'
  );
  const totalTdsReceivable = tdsReceivableList.reduce((sum, r) => sum + parseFloat(r.tds_deducted), 0);

  // TDS Payable: Withheld from suppliers (expense bills + payment vouchers)
  const tdsPayableList = useMemo(() => {
    const fromExpenses = periodExpenses
      .filter((e) => parseFloat(e.tds_deducted || 0) > 0)
      .map((e) => ({
        key: `exp-${e.id}`,
        kind: 'Bill',
        reference: e.expense_number,
        party: e.vendor_name,
        date: e.expense_date,
        baseAmount: e.total_amount,
        tds_deducted: parseFloat(e.tds_deducted),
      }));
    const fromPayments = periodPayments
      .filter((p) => parseFloat(p.tds_deducted || 0) > 0)
      .map((p) => ({
        key: `pay-${p.id}`,
        kind: 'Payment',
        reference: p.payment_number,
        party: p.payee,
        date: p.payment_date,
        baseAmount: toAmount(p.amount_paid) + toAmount(p.tds_deducted),
        tds_deducted: parseFloat(p.tds_deducted),
      }));
    return sortRegistryNewestFirst([...fromExpenses, ...fromPayments], 'date');
  }, [periodExpenses, periodPayments]);
  const totalTdsPayable = tdsPayableList.reduce((sum, row) => sum + row.tds_deducted, 0);

  // Return Filing lock older than 3 years (e.g. older than May 2023 relative to May 2026 current mock time)
  const isReturnTimeBarred = (year) => {
    const currentYear = 2026;
    return currentYear - year >= 3;
  };

  const handleDownloadTaxReport = (reportType, format = 'csv') => {
    let csvContent = "";

    if (reportType === 'summary') {
      csvContent += "Metric,CGST,SGST,IGST,Total Amount\n";
      csvContent += `Output GST Liability,₹${cgstCollected.toFixed(2)},₹${sgstCollected.toFixed(2)},₹${igstCollected.toFixed(2)},₹${totalSalesTax.toFixed(2)}\n`;
      csvContent += `Input Tax Credit (ITC),₹${cgstPaid.toFixed(2)},₹${sgstPaid.toFixed(2)},₹0.00,₹${totalITCPaid.toFixed(2)}\n`;
      csvContent += `Net GST Cash Payable,,,₹${netGstPayable.toFixed(2)}\n`;
    } else if (reportType === 'gstr1') {
      csvContent += "Invoice No,Customer,GSTIN,Place of Supply,Subtotal,Tax Amount,Total Amount\n";
      periodInvoices.forEach(inv => {
        csvContent += `"${inv.invoice_number}","${inv.customer_name}","${inv.gstin}","${inv.place_of_supply}",${inv.subtotal},${inv.tax_amount},${inv.total_amount}\n`;
      });
      periodCreditNotes.forEach(cn => {
        csvContent += `"${cn.credit_note_number} (CN)","${cn.customer_name}","NIL","${cn.reason}",-${cn.subtotal},-${cn.tax_amount},-${cn.total_amount}\n`;
      });
    } else if (reportType === 'gstr2b') {
      csvContent += "Bill No,Vendor,Category,HSN/SAC,Tax Rate (%),Subtotal,Tax Claimed,Total Cost\n";
      eligibleExpenses.forEach(exp => {
        csvContent += `"${exp.expense_number}","${exp.vendor_name}","${exp.expense_head}","${exp.hsn_sac}",${exp.tax_rate},${exp.amount},${exp.tax_amount},${exp.total_amount}\n`;
      });
      periodDebitNotes.forEach(dn => {
        csvContent += `"${dn.debit_note_number} (DN)","${dn.vendor_name}","ITC Reversal","${dn.reason}",${dn.tax_rate},-${dn.subtotal},-${dn.tax_amount},-${dn.total_amount}\n`;
      });
    } else if (reportType === 'gstr3b') {
      csvContent += "GSTR-3B Section,CGST,SGST,IGST,Total Tax\n";
      csvContent += `3.1 Outward Taxable Supplies,${cgstCollected.toFixed(2)},${sgstCollected.toFixed(2)},${igstCollected.toFixed(2)},${totalSalesTax.toFixed(2)}\n`;
      csvContent += `4. Eligible Input Tax Credit,${cgstPaid.toFixed(2)},${sgstPaid.toFixed(2)},0.00,${totalITCPaid.toFixed(2)}\n`;
      csvContent += `6.1 Net Tax Payable,${(cgstCollected - cgstPaid).toFixed(2)},${(sgstCollected - sgstPaid).toFixed(2)},${igstCollected.toFixed(2)},${netGstPayable.toFixed(2)}\n`;
    } else if (reportType === 'tds') {
      csvContent += "TDS Ledger Type,Party,Reference,Total Amount,TDS Withheld\n";
      tdsReceivableList.forEach(r => {
        csvContent += `Receivable (Client Withheld),"${r.customer_name}","${r.payment_number}",${r.amount_received},${r.tds_deducted}\n`;
      });
      tdsPayableList.forEach((row) => {
        csvContent += `Payable (${row.kind}),"${row.party}","${row.reference}",${row.baseAmount},${row.tds_deducted}\n`;
      });
    } else {
      csvContent += "Compliance Parameter,Status / Log details,Audit Value\n";
      const totalEcrs = periodEcrsLogs.reduce((sum, l) => sum + (l.cgst || 0) + (l.sgst || 0) + (l.igst || 0), 0);
      csvContent += `May 2026 ECRS Balance,Active,₹${totalEcrs.toFixed(2)}\n`;
      csvContent += `Reverse Charge Mechanism (RCM),Threshold check,₹${rcmLedgerBalance.toFixed(2)}\n`;
      csvContent += `3-Year hard time lock,Active,2026 vs 2023 Locked\n`;
    }

    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${reportType}_report.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, reportType.toUpperCase(), `vouchex_${reportType}_report.xls`);
    }

    addConsoleLog('event', `GET /api/tax/download-${reportType}?format=${format}`, `Exported ${reportType} as ${format.toUpperCase()} statement for offline tax compliance audit logs.`);
  };

  const handleDownloadGstr1Json = async () => {
    try {
      const result = await exportGstr1OfflineJson({
        invoices,
        invoiceItems,
        creditNotes,
        creditNoteItems,
        companyDetails,
        periodStart: appliedPeriod.from,
        periodEnd: appliedPeriod.to,
      });
      let msg = `Exported GSTR-1 JSON (${result.filename}) for GST portal offline upload. Return period: ${result.filingPeriod}.`;
      if (result.multiPeriod) {
        msg += ' Note: data spans multiple months — only the first return period was included. Filter to a single month before portal upload.';
      }
      addConsoleLog('event', 'GET /api/tax/download-gstr1?format=json', msg);
    } catch (err) {
      addConsoleLog('error', 'GSTR-1 JSON export failed', err.message || 'Export failed.');
      window.alert(err.message || 'GSTR-1 JSON export failed.');
    }
  };

  const handleDownloadLedgerReport = (party, isCustomer = true, format = 'csv') => {
    if (!party) return;
    const ledgerData = isCustomer ? getCustomerLedger(party) : getVendorLedger(party);

    let csvContent = `Date,Description,Reference No.,Debit (Dr) (₹),Credit (Cr) (₹),Running Balance (₹)\n`;

    ledgerData.forEach(entry => {
      csvContent += `"${entry.date}","${entry.description}","${entry.reference}",${entry.debit.toFixed(2)},${entry.credit.toFixed(2)},${entry.running_balance.toFixed(2)}\n`;
    });

    const reportType = isCustomer ? `customer_${party.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ledger` : `vendor_${party.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ledger`;

    if (format === 'csv') {
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${reportType}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csvContent, 'LEDGER STATEMENT', `vouchex_${reportType}.xls`);
    }

    addConsoleLog('event', `GET /api/ledgers/download?party=${party.id}&isCustomer=${isCustomer}&format=${format}`, `Exported running ledger for ${party.name} as ${format.toUpperCase()} statement.`);
  };

  return (
    <div>
      <FinancialPeriodBar
        draft={periodDraft}
        onDraftChange={setPeriodDraft}
        onApply={handleApplyTaxPeriod}
        periodError={periodError}
      />

      {/* SUB-TABS */}
      <MobileTaxationNav active={taxReportSubTab} onSelect={setTaxReportSubTab} />
      <div className="tab-nav-sub" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
        <div className="desktop-subtabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`sub-tab-btn ${taxReportSubTab === 'summary' ? 'active' : ''}`} onClick={() => setTaxReportSubTab('summary')}>
            📈 GST Liability Ledger
          </button>
          <button className={`sub-tab-btn ${taxReportSubTab === 'gstr1' ? 'active' : ''}`} onClick={() => setTaxReportSubTab('gstr1')}>
            📦 GSTR-1 (Outward Supplies)
          </button>
          <button className={`sub-tab-btn ${taxReportSubTab === 'gstr2b' ? 'active' : ''}`} onClick={() => setTaxReportSubTab('gstr2b')}>
            📥 GSTR-2B (Inward Supplies ITC Eligible)
          </button>
          <button className={`sub-tab-btn ${taxReportSubTab === 'gstr3b' ? 'active' : ''}`} onClick={() => setTaxReportSubTab('gstr3b')}>
            📊 GSTR-3B Self-Assessment
          </button>
          <button className={`sub-tab-btn ${taxReportSubTab === 'tds' ? 'active' : ''}`} onClick={() => setTaxReportSubTab('tds')}>
            📑 TDS Compliance reports
          </button>
          <button className={`sub-tab-btn ${taxReportSubTab === 'compliance' ? 'active' : ''}`} onClick={() => setTaxReportSubTab('compliance')}>
            🚨 May 2026 CBIC statutory controls
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              fontSize: '12px', 
              fontWeight: 'bold', 
              borderRadius: '6px', 
              background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', 
              border: 'none', 
              color: 'white',
              cursor: 'pointer',
              height: '36px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
            }}
            onClick={() => handleDownloadTaxReport(taxReportSubTab, 'csv')}
          >
            <Download size={14} /> Export CSV 📥
          </button>
          <button
            className="btn-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              fontSize: '12px', 
              fontWeight: 'bold', 
              borderRadius: '6px', 
              background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', 
              border: 'none', 
              color: 'white',
              cursor: 'pointer',
              height: '36px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.2)'
            }}
            onClick={() => openTaxExport()}
          >
            <FileSpreadsheet size={14} /> {taxReportSubTab === 'gstr1' ? 'Export GSTR-1' : 'Export Excel'} 📊
          </button>
          {(taxReportSubTab === 'gstr1' || taxReportSubTab === 'summary') && (
            <button
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                height: '36px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
              }}
              onClick={handleDownloadGstr1Json}
              title="Download GSTR-1 JSON for GST portal offline upload"
            >
              <FileJson size={14} /> Export GST JSON
            </button>
          )}
        </div>
      </div>

      {/* 1. GST COMP Ledger */}
      {taxReportSubTab === 'summary' && (
        <MobileDetailGate
          summary={(
            <MobileTaxSummaryBlock
              title="GST Summary"
              subtitle="Output tax, ITC & net payable"
              stats={[
                { label: 'Output GST', value: `₹${totalSalesTax.toLocaleString()}` },
                { label: 'ITC', value: `₹${totalITCPaid.toLocaleString()}` },
                { label: 'Net payable', value: `₹${netGstPayable.toLocaleString()}` },
              ]}
            />
          )}
        >
        <div>
          <div className="dashboard-grid">
            <div className="metric-card income">
              <div className="metric-header">
                <span>Output GST Liability (Sales collected)</span>
                <div className="metric-icon-bg"><TrendingUp size={16} /></div>
              </div>
              <span className="metric-value">₹{totalSalesTax.toLocaleString()}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                CGST: ₹{cgstCollected.toLocaleString()} | SGST: ₹{sgstCollected.toLocaleString()} | IGST: ₹{igstCollected.toLocaleString()}
              </span>
            </div>

            <div className="metric-card receipts">
              <div className="metric-header">
                <span>Eligible Input Tax Credit (ITC Claims)</span>
                <div className="metric-icon-bg"><Receipt size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: 'var(--accent-teal)' }}>₹{totalITCPaid.toLocaleString()}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                CGST Input: ₹{cgstPaid.toLocaleString()} | SGST Input: ₹{sgstPaid.toLocaleString()} (Filtered `itc_eligible=true`)
              </span>
            </div>

            <div className="metric-card profit">
              <div className="metric-header">
                <span>Net GST Cash Payable to Govt</span>
                <div className="metric-icon-bg"><Percent size={16} /></div>
              </div>
              <span className="metric-value" style={{ color: netGstPayable >= 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                ₹{netGstPayable.toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {netGstPayable >= 0 ? 'Tax Liability to pay via cash ledger' : 'Credit Carry Forward'}
              </span>
            </div>
          </div>

          <div className="table-card" style={{ marginTop: '24px' }}>
            <h3 className="chart-title">GST Computation Ledger</h3>
            <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Tax Category Group</th>
                    <th>Output Liability (Sales)</th>
                    <th>Input Tax Credit (Eligible Expenses)</th>
                    <th>Net Balance Payable (Out - In)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Central GST (CGST)</strong></td>
                    <td>₹{cgstCollected.toLocaleString()}</td>
                    <td>₹{cgstPaid.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{Math.max(0, cgstCollected - cgstPaid).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><strong>State GST (SGST)</strong></td>
                    <td>₹{sgstCollected.toLocaleString()}</td>
                    <td>₹{sgstPaid.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{Math.max(0, sgstCollected - sgstPaid).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><strong>Integrated GST (IGST)</strong></td>
                    <td>₹{igstCollected.toLocaleString()}</td>
                    <td>₹{igstPaid.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{Math.max(0, igstCollected - igstPaid).toLocaleString()}</td>
                  </tr>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <td><strong>Grand Total Sum</strong></td>
                    <td style={{ fontWeight: 'bold' }}>₹{totalSalesTax.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{totalITCPaid.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-teal)' }}>₹{netGstPayable.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </MobileDetailGate>
      )}

      {/* 2. GSTR-1 */}
      {taxReportSubTab === 'gstr1' && (
        <div className="table-card">
          <MobileDetailGate
            summary={(
              <MobileGstrSummary
                invoices={periodInvoices}
                registeredState={registeredState}
                summaryOnly
              />
            )}
          >
          <div className="table-header-row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 className="chart-title">GSTR-1 Outward Supply Return Registry Sheet</h3>
              <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontFamily: 'monospace' }}>GSTN offline utility compatible export</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34 }}
                onClick={() => openTaxExport({ forTally: false, forceGstr1Workbook: true })}
              >
                <FileSpreadsheet size={14} /> Download GSTR-1 workbook
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34 }}
                onClick={handleDownloadGstr1Json}
                title="GST portal offline upload format"
              >
                <FileJson size={14} /> Download GSTR-1 JSON
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34 }}
                onClick={() => openTaxExport({ forTally: true, tallyFormat: 'xlsx' })}
              >
                <FileSpreadsheet size={14} /> Export for accounts software
              </button>
            </div>
          </div>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Section Type</th>
                  <th>Supply Type Description</th>
                  <th>No. of invoices</th>
                  <th>Combined Taxable Value</th>
                  <th>Combined CGST (₹)</th>
                  <th>Combined SGST (₹)</th>
                  <th>Combined IGST (₹)</th>
                  <th>Total Return Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>4A, 4B (B2B)</strong></td>
                  <td>Sales to Registered Business Entities</td>
                  <td>{periodInvoices.filter(i => i.invoice_type === 'B2B').length}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2B').reduce((s, i) => s + toAmount(i.subtotal) - toAmount(i.discount), 0))}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2B' && isIntraState(i.place_of_supply, registeredState)).reduce((s, i) => s + bifurcateStoredTax(i, i.place_of_supply, registeredState).cgst, 0))}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2B' && isIntraState(i.place_of_supply, registeredState)).reduce((s, i) => s + bifurcateStoredTax(i, i.place_of_supply, registeredState).sgst, 0))}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2B' && !isIntraState(i.place_of_supply, registeredState)).reduce((s, i) => s + bifurcateStoredTax(i, i.place_of_supply, registeredState).igst, 0))}</td>
                  <td style={{ fontWeight: 'bold' }}>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2B').reduce((s, i) => s + toAmount(i.total_amount), 0))}</td>
                </tr>
                <tr>
                  <td><strong>7 (B2C)</strong></td>
                  <td>Sales to Consumers (Unregistered Retail)</td>
                  <td>{periodInvoices.filter(i => i.invoice_type === 'B2C').length}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2C').reduce((s, i) => s + toAmount(i.subtotal) - toAmount(i.discount), 0))}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2C' && isIntraState(i.place_of_supply, registeredState)).reduce((s, i) => s + bifurcateStoredTax(i, i.place_of_supply, registeredState).cgst, 0))}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2C' && isIntraState(i.place_of_supply, registeredState)).reduce((s, i) => s + bifurcateStoredTax(i, i.place_of_supply, registeredState).sgst, 0))}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2C' && !isIntraState(i.place_of_supply, registeredState)).reduce((s, i) => s + bifurcateStoredTax(i, i.place_of_supply, registeredState).igst, 0))}</td>
                  <td style={{ fontWeight: 'bold' }}>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'B2C').reduce((s, i) => s + toAmount(i.total_amount), 0))}</td>
                </tr>
                <tr>
                  <td><strong>6A (Export)</strong></td>
                  <td>Exports Overseas Supply</td>
                  <td>{periodInvoices.filter(i => i.invoice_type === 'Export').length}</td>
                  <td>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'Export').reduce((s, i) => s + toAmount(i.subtotal) - toAmount(i.discount), 0))}</td>
                  <td>₹0</td>
                  <td>₹0</td>
                  <td>₹0</td>
                  <td style={{ fontWeight: 'bold' }}>₹{formatINR(periodInvoices.filter(i => i.invoice_type === 'Export').reduce((s, i) => s + toAmount(i.total_amount), 0))}</td>
                </tr>
                <tr style={{ background: 'rgba(239, 68, 68, 0.03)' }}>
                  <td><strong>9B (Credit Notes)</strong></td>
                  <td>Credit Notes (Outward Sales Returns)</td>
                  <td>{periodCreditNotes.length}</td>
                  <td style={{ color: 'var(--accent-red)' }}>-₹{formatINR(periodCreditNotes.reduce((s, cn) => s + toAmount(cn.subtotal), 0))}</td>
                  <td style={{ color: 'var(--accent-red)' }}>-₹{formatINR(periodCreditNotes.reduce((s, cn) => s + toAmount(cn.tax_amount) / 2, 0))}</td>
                  <td style={{ color: 'var(--accent-red)' }}>-₹{formatINR(periodCreditNotes.reduce((s, cn) => s + toAmount(cn.tax_amount) / 2, 0))}</td>
                  <td style={{ color: 'var(--accent-red)' }}>-₹{0}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>-₹{formatINR(periodCreditNotes.reduce((s, cn) => s + toAmount(cn.total_amount), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="table-header-row" style={{ marginTop: '30px', marginBottom: '16px' }}>
            <h4 className="chart-title" style={{ fontSize: '14px', fontWeight: 'bold' }}>9B - Credit / Debit Notes (Registered & Unregistered) Outward returns</h4>
          </div>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Credit Note No</th>
                  <th>Linked Sales Invoice</th>
                  <th>Filing Date</th>
                  <th>Customer Name</th>
                  <th>GST Reason</th>
                  <th>Taxable Subtotal Refund</th>
                  <th>GST Refund Offset</th>
                  <th>Grand Net Credit</th>
                </tr>
              </thead>
              <tbody>
                {sortedTaxCreditNotes.map((cn) => (
                  <tr key={cn.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{cn.credit_note_number}</td>
                    <td style={{ fontFamily: 'monospace' }}>{cn.original_invoice_number} ({formatDateDDMMYYYY(cn.original_invoice_date)})</td>
                    <td>{formatDateDDMMYYYY(cn.issue_date)}</td>
                    <td><strong>{cn.customer_name}</strong></td>
                    <td>{cn.reason}</td>
                    <td>₹{cn.subtotal.toLocaleString()}</td>
                    <td style={{ color: 'var(--accent-red)' }}>₹{cn.tax_amount.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-teal)' }}>₹{cn.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
                {sortedTaxCreditNotes.length === 0 && (
                  <tr>
                    <td colSpan="8" className="empty-state">No Credit Notes filed in outward supplies returns.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </MobileDetailGate>
        </div>
      )}

      {/* 3. GSTR-2B */}
      {taxReportSubTab === 'gstr2b' && (
        <div className="table-card">
          <MobileDetailGate
            summary={(
              <MobileTaxSummaryBlock
                title="GSTR-2B"
                subtitle="Inward ITC statement"
                stats={[
                  { label: 'Eligible bills', value: eligibleExpenses.length },
                  { label: 'ITC value', value: `₹${formatINR(eligibleExpenses.reduce((s, e) => s + parseFloat(e.tax_amount || 0), 0))}` },
                  { label: 'Debit notes', value: periodDebitNotes.length },
                ]}
              />
            )}
          >
          <div className="table-header-row">
            <div>
              <h3 className="chart-title">GSTR-2B Inward Supply Registry (Auto-Drafted ITC Statement)</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Strict compliance: showing only booked expenses where **ITC Eligibility** is marked "Yes" per May 2026 guidelines.
              </p>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontFamily: 'monospace' }}>ITC STATEMENT</span>
          </div>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Voucher Ref</th>
                  <th>Vendor Supplier</th>
                  <th>HSN/SAC</th>
                  <th>Booking Date</th>
                  <th>Taxable Expense (₹)</th>
                  <th>GST Rate</th>
                  <th>Eligible Input Tax Credit (ITC - ₹)</th>
                  <th>ITC status</th>
                </tr>
              </thead>
              <tbody>
                {sortedItcExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{exp.expense_number}</td>
                    <td><strong>{exp.vendor_name}</strong></td>
                    <td style={{ fontFamily: 'monospace' }}>{exp.hsn_sac || 'NIL'}</td>
                    <td>{formatDateDDMMYYYY(exp.expense_date)}</td>
                    <td>₹{exp.amount.toLocaleString()}</td>
                    <td>{exp.tax_rate}%</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-teal)' }}>₹{exp.tax_amount.toLocaleString()}</td>
                    <td>
                      <span className="status-badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                        Eligible ITC Claimed
                      </span>
                    </td>
                  </tr>
                ))}
                {sortedItcExpenses.length === 0 && (
                  <tr>
                    <td colSpan="8" className="empty-state">No inward ITC eligible expenses booked.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-header-row" style={{ marginTop: '30px', marginBottom: '16px' }}>
            <h4 className="chart-title" style={{ fontSize: '14px', fontWeight: 'bold' }}>ITC Reversals (Debit Notes / Returns) Inward Purchase Returns</h4>
          </div>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Debit Note No</th>
                  <th>Original Booked Bill</th>
                  <th>Filing Date</th>
                  <th>Vendor Legal Name</th>
                  <th>GST Reason</th>
                  <th>Taxable Adjusted Value</th>
                  <th>GST Reversal (ITC Debit)</th>
                  <th>Grand Net Reversal</th>
                </tr>
              </thead>
              <tbody>
                {sortedTaxDebitNotes.map((dn) => (
                  <tr key={dn.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{dn.debit_note_number}</td>
                    <td style={{ fontFamily: 'monospace' }}>{dn.original_expense_number} ({formatDateDDMMYYYY(dn.original_expense_date)})</td>
                    <td>{formatDateDDMMYYYY(dn.issue_date)}</td>
                    <td><strong>{dn.vendor_name}</strong></td>
                    <td>{dn.reason}</td>
                    <td>₹{dn.subtotal.toLocaleString()}</td>
                    <td style={{ color: 'var(--accent-red)' }}>₹{dn.tax_amount.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>₹{dn.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
                {sortedTaxDebitNotes.length === 0 && (
                  <tr>
                    <td colSpan="8" className="empty-state">No Debit Notes raised for inward returns.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </MobileDetailGate>
        </div>
      )}

      {/* 4. GSTR-3B */}
      {taxReportSubTab === 'gstr3b' && (
        <div className="table-card">
          <MobileDetailGate
            summary={(
              <MobileTaxSummaryBlock
                title="GSTR-3B"
                subtitle="Monthly self-assessment return"
                stats={[
                  { label: 'Net GST payable', value: `₹${netGstPayable.toLocaleString()}` },
                  { label: 'Output GST', value: `₹${totalSalesTax.toLocaleString()}` },
                  { label: 'ITC offset', value: `₹${totalITCPaid.toLocaleString()}` },
                ]}
              />
            )}
          >
          <h3 className="chart-title">GSTR-3B Self-Assessment Consolidated Return</h3>
          <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Box Code</th>
                  <th>Supply Returns Detail</th>
                  <th>Taxable Value</th>
                  <th>Integrated Tax (IGST)</th>
                  <th>Central Tax (CGST)</th>
                  <th>State Tax (SGST)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>3.1 (a)</strong></td>
                  <td>Outward supplies (other than zero rated, nil rated, exempt) (Net of Credit Notes)</td>
                  <td>₹{(periodInvoices.filter(i => i.invoice_type !== 'Exempt').reduce((s, i) => s + i.subtotal - i.discount, 0) - periodCreditNotes.reduce((s, cn) => s + cn.subtotal, 0)).toLocaleString()}</td>
                  <td>₹{igstCollected.toLocaleString()}</td>
                  <td>₹{cgstCollected.toLocaleString()}</td>
                  <td>₹{sgstCollected.toLocaleString()}</td>
                </tr>
                <tr>
                  <td><strong>3.1 (b)</strong></td>
                  <td>Outward supplies (zero rated / Export)</td>
                  <td>₹{periodInvoices.filter(i => i.invoice_type === 'Export').reduce((s, i) => s + i.subtotal - i.discount, 0).toLocaleString()}</td>
                  <td>₹0</td>
                  <td>₹0</td>
                  <td>₹0</td>
                </tr>
                <tr>
                  <td><strong>4.0</strong></td>
                  <td>Eligible Input Tax Credit (ITC - Inward Supplies) (Net of Debit Notes)</td>
                  <td>₹{(eligibleExpenses.reduce((s, e) => s + e.amount, 0) - periodDebitNotes.reduce((s, dn) => s + dn.subtotal, 0)).toLocaleString()}</td>
                  <td>₹0</td>
                  <td>₹{cgstPaid.toLocaleString()}</td>
                  <td>₹{sgstPaid.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          </MobileDetailGate>
        </div>
      )}

      {/* 5. TDS TRACKING */}
      {taxReportSubTab === 'tds' && (
        <MobileDetailGate
          summary={(
            <MobileTaxSummaryBlock
              title="TDS Compliance"
              subtitle="Withholding receivable & payable"
              stats={[
                { label: 'Receivable', value: `₹${totalTdsReceivable.toLocaleString()}` },
                { label: 'Payable', value: `₹${totalTdsPayable.toLocaleString()}` },
                { label: 'Entries', value: tdsReceivableList.length + tdsPayableList.length },
              ]}
            />
          )}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* TDS Receivable */}
          <div className="table-card">
            <div className="table-header-row">
              <div>
                <h3 className="chart-title">TDS Receivable Report (Withheld by Clients)</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Extracted from customer collection Receipts where tax was deducted at source before receipt settlement.
                </p>
              </div>
              <span className="status-badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                Total Asset: ₹{totalTdsReceivable.toLocaleString()}
              </span>
            </div>
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Receipt Ref</th>
                    <th>Customer Name</th>
                    <th>Settlement Date</th>
                    <th>Receipt Sum (₹)</th>
                    <th>TDS Asset Withheld (₹)</th>
                    <th>Filing Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tdsReceivableList.map((rec) => (
                    <tr key={rec.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{rec.receipt_number}</td>
                      <td><strong>{rec.customer_name}</strong></td>
                      <td>{formatDateDDMMYYYY(rec.payment_date)}</td>
                      <td>₹{rec.amount_received.toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-teal)' }}>₹{parseFloat(rec.tds_deducted).toLocaleString()}</td>
                      <td>
                        <span className="status-badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                          Eligible to claim in ITR
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tdsReceivableList.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-state">No TDS receivables registered in receipts.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TDS Payable */}
          <div className="table-card">
            <div className="table-header-row">
              <div>
                <h3 className="chart-title">TDS Payable Report (Withheld from Suppliers)</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Extracted from booked vendor Expenses/Payments where TDS was withheld per corporate income tax sections (e.g. 194C, 194J).
                </p>
              </div>
              <span className="status-badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)', fontWeight: 'bold' }}>
                Total Liability: ₹{totalTdsPayable.toLocaleString()}
              </span>
            </div>
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Reference</th>
                    <th>Vendor / Payee</th>
                    <th>Booking Date</th>
                    <th>Base Value (₹)</th>
                    <th>TDS Liability Withheld (₹)</th>
                    <th>Filing Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tdsPayableList.map((row) => (
                    <tr key={row.key}>
                      <td>{row.kind}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{row.reference}</td>
                      <td><strong>{row.party}</strong></td>
                      <td>{formatDateDDMMYYYY(row.date)}</td>
                      <td>₹{parseFloat(row.baseAmount || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>₹{parseFloat(row.tds_deducted).toLocaleString()}</td>
                      <td>
                        <span className="status-badge" style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' }}>
                          Pending Deposit (Form 26Q)
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tdsPayableList.length === 0 && (
                    <tr>
                      <td colSpan="7" className="empty-state">No TDS payable withholdings registered in bills or payments.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </MobileDetailGate>
      )}

      {/* 6. STATUTORY COMPLIANCE May 2026 */}
      {taxReportSubTab === 'compliance' && (
        <MobileDetailGate
          summary={(
            <MobileTaxSummaryBlock
              title="Statutory Controls"
              subtitle="ECRS, RCM & filing locks"
              stats={[
                { label: 'ECRS entries', value: periodEcrsLogs.length },
                { label: 'RCM balance', value: `₹${localRcmBalance.toLocaleString()}` },
                { label: 'RCM status', value: localRcmBalance >= 0 ? 'Compliant' : 'Blocked' },
              ]}
            />
          )}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* ECRS LEDGER */}
          <div className="table-card">
            <h3 className="chart-title">1. ECRS (Electronic Credit Reversal and Reclaimed Statement) Ledger</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Statutory verification statement detailing monthly ITC Reversals (e.g. Rule 42) and subsequent eligible Reclaims to prevent double claims.
            </p>
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Entry ID</th>
                    <th>Audit Action Type</th>
                    <th>Compliance Classification</th>
                    <th>CGST (₹)</th>
                    <th>SGST (₹)</th>
                    <th>IGST (₹)</th>
                    <th>Timestamp</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {periodEcrsLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace' }}>#ECRS-{log.id}</td>
                      <td>
                        <span className="status-badge" style={{ 
                          background: log.action === 'REVERSAL' ? 'var(--accent-red-bg)' : 'var(--accent-green-bg)',
                          color: log.action === 'REVERSAL' ? 'var(--accent-red)' : 'var(--accent-green)'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.type}</td>
                      <td>₹{log.cgst.toLocaleString()}</td>
                      <td>₹{log.sgst.toLocaleString()}</td>
                      <td>₹{log.igst.toLocaleString()}</td>
                      <td>{formatDateDDMMYYYY(log.timestamp)}</td>
                      <td>
                        <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RCM BLOCKER & TIMELINE HARD LOCK */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* RCM Ledger Balance */}
            <div className="table-card" style={{ margin: 0 }}>
              <h3 className="chart-title">2. Reverse Charge Mechanism (RCM) Balance Verification</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '16px' }}>
                CBIC mandate blocks return generation if RCM liability is negative or unpaid. Simulate a positive or negative balance below:
              </p>
              
              <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Simulated RCM Ledger Balance:</span>
                  <strong style={{ color: localRcmBalance < 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: '16px' }}>
                    ₹{localRcmBalance.toLocaleString()}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="quick-login-btn"
                    style={{ background: localRcmBalance >= 0 ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-secondary)', borderColor: localRcmBalance >= 0 ? 'var(--accent-teal)' : 'var(--border-color)' }}
                    onClick={() => {
                      setLocalRcmBalance(15000);
                      addConsoleLog('system', 'RCM Ledger Balance simulated positive.', 'UPDATE ledgers SET rcm_balance = 15000 WHERE type = \'liability\';');
                    }}
                  >
                    Set Positive (₹15,000)
                  </button>
                  <button 
                    type="button" 
                    className="quick-login-btn"
                    style={{ background: localRcmBalance < 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)', borderColor: localRcmBalance < 0 ? 'var(--accent-red)' : 'var(--border-color)' }}
                    onClick={() => {
                      setLocalRcmBalance(-4500);
                      addConsoleLog('system', 'WARNING: RCM Ledger Balance simulated negative.', 'UPDATE ledgers SET rcm_balance = -4500 WHERE type = \'liability\';\n# Negative balance triggers returning block.');
                    }}
                  >
                    Set Negative (-₹4,500)
                  </button>
                </div>

                {localRcmBalance < 0 ? (
                  <div className="error-banner" style={{ margin: 0, padding: '10px' }}>
                    <AlertTriangle size={16} />
                    <span>
                      RCM BALANCE ERROR: Negative balance detected! Return generation is strictly BLOCKED under CBIC rules.
                    </span>
                  </div>
                ) : (
                  <div className="error-banner" style={{ margin: 0, padding: '10px', background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>
                    <CheckCircle2 size={16} />
                    <span>RCM ledger is positive and compliant. Return generation enabled.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Time Bar Hard-Stop timeline */}
            <div className="table-card" style={{ margin: 0 }}>
              <h3 className="chart-title">3. CBIC 3-Year Time-Bar Filing Hard Locks</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '16px' }}>
                Hard lockout: Returns older than 3 financial years are strictly barred from amendments, credit claims, or submissions under Section 39(9).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>FY 2025-26 Returns (Active)</span>
                  <span className="status-badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Open to Edit</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>FY 2024-25 Returns (Historical)</span>
                  <span className="status-badge" style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' }}>Amendment Allowed</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>FY 2023-24 Returns (Historical)</span>
                  <span className="status-badge" style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' }}>Amendment Allowed</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--accent-red)', borderRadius: '6px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent-red)' }}>FY 2022-23 & older (Time-Barred)</span>
                  <span className="status-badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>🔒 HARD LOCKED (3-Yr Bar)</span>
                </div>
              </div>
            </div>
          </div>

          {/* E-INVOICING TURNOVER THRESHOLD CHECKER */}
          <div className="table-card">
            <h3 className="chart-title">4. Corporate E-Invoicing Turnover Threshold Compliance Validator</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginTop: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p>
                  As of <strong>April 1, 2026</strong>, all business entities with an Annual Aggregate Turnover (AATO) exceeding <strong>₹5 Crores</strong> in any previous financial year are mandated to generate IRN e-invoices for all B2B and Export outward transactions.
                </p>
                <p style={{ fontWeight: 'bold' }}>
                  VouchEx Status: COMPLIANT. Corporate sales volume logged at ₹4.2M, within safe thresholds, but system e-invoice routing is pre-integrated.
                </p>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifySelf: 'center', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Aggregate Annual Turnover (AATO)</span>
                <h2 style={{ fontSize: '28px', color: 'var(--accent-blue)', margin: '4px 0' }}>₹42.8 Lakhs</h2>
                <span className="status-badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '10px' }}>
                  e-Invoicing Exempt (&lt; ₹5Cr Limit)
                </span>
              </div>
            </div>
          </div>
        </div>
        </MobileDetailGate>
      )}
      <TaxExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportType={taxReportSubTab}
        initialForTally={exportPreset.forTally}
        initialTallyFormat={exportPreset.tallyFormat}
        forceGstr1Workbook={exportPreset.forceGstr1Workbook}
        initialGstrFormat={exportPreset.gstrFormat}
        onLegacyExcel={() => handleDownloadTaxReport(taxReportSubTab, 'excel')}
        exportData={{
          invoices,
          invoiceItems,
          creditNotes,
          creditNoteItems,
          customers,
          companyDetails,
          periodStart: appliedPeriod.from,
          periodEnd: appliedPeriod.to,
        }}
      />
    </div>
  );
}

// ==========================================
// H. SETTINGS TAB SCREEN
// ==========================================
function SettingsTab({ isDemoLogoutMode, setIsDemoLogoutMode, onViewPlans }) {
  const {
    companyDetails, 
    saveCompanyProfile,
    uploadCompanyLogo,
    patchCompanyDetailsLocal, 
    users, 
    loginLogs, 
    auditLogs, 
    currentUser, 
    createUser,
    updateUser,
    deleteUser,
    addConsoleLog,
    isFinancialYearLocked,
    setIsFinancialYearLocked,
    lockedMonths,
    setLockedMonths,
    inactivityTimeout,
    setInactivityTimeout,
    customers,
    invoices,
    receipts,
    expenses,
    payments,
    inventory,
    companies,
    createCompany,
    deleteCompany,
    activeCompany,
    customOptions,
    persistCustomOptions,
    refreshPortalData,
    account,
    submitSubscriptionPayment,
    loadSubscriptionStatus,
  } = useSimulator();

  const isStaffAdmin = isCompanyStaffAdmin(currentUser);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isGroupAdmin = userIsGroupAdmin(currentUser);
  const canManageCompanies = isSuperAdmin || isGroupAdmin;
  const isCompanyAdmin = isPortalCompanyAdmin(currentUser) || isSuperAdmin;
  const canUploadLogo = isSuperAdmin || account?.subscription?.can_upload_logo === true;
  const [showLogoPaywall, setShowLogoPaywall] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyGstin, setNewCompanyGstin] = useState('');
  const [newCompanyState, setNewCompanyState] = useState('Gujarat');
  const [newCompanyUserIds, setNewCompanyUserIds] = useState([]);
  const [newCompanyUserRoles, setNewCompanyUserRoles] = useState({});
  const [companyCreating, setCompanyCreating] = useState(false);
  const [companyDeletingId, setCompanyDeletingId] = useState(null);
  
  const [settingsSubTab, setSettingsSubTab] = useState('profile');
  const [settingsMainTab, setSettingsMainTab] = useState('company');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPassword, setNewPassword] = useState('user123'); // created by admin
  const [newAssignedCompanyIds, setNewAssignedCompanyIds] = useState([]);
  const [newCompanyRoles, setNewCompanyRoles] = useState({});
  const [userCompanyFilter, setUserCompanyFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState('user');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editAssignedCompanyIds, setEditAssignedCompanyIds] = useState([]);
  const [editCompanyRoles, setEditCompanyRoles] = useState({});
  const [registeredPasswords, setRegisteredPasswords] = useState({});

  const assignableCompanies = companies || [];
  const canAssignCompanies = isSuperAdmin || isGroupAdmin || isCompanyAdmin;
  const assignableUsersForNewCompany = useMemo(
    () => (users || []).filter((u) => u.role !== 'super_admin' && u.role !== 'trial_owner' && u.id !== currentUser?.id),
    [users, currentUser?.id]
  );

  // Profile Edit fields
  const [cName, setCName] = useState(companyDetails.name);
  const [cGstin, setCGstin] = useState(companyDetails.gstin);
  const [cPan, setCPan] = useState(companyDetails.pan);
  const [cAddress, setCAddress] = useState(companyDetails.address);
  const [cState, setCState] = useState(companyDetails.state);
  const [cCity, setCCity] = useState(companyDetails.city);
  const [cEmail, setCEmail] = useState(companyDetails.email);
  const [cPhone, setCPhone] = useState(companyDetails.phone);
  const [cPincode, setCPincode] = useState(companyDetails.pincode || '');
  const [cCountry, setCCountry] = useState(companyDetails.country || 'India');
  const [cBankName, setCBankName] = useState(companyDetails.bank_name || '');
  const [cBankAccount, setCBankAccount] = useState(companyDetails.bank_account || '');
  const [cBankAccountHolder, setCBankAccountHolder] = useState(companyDetails.bank_account_holder || '');
  const [cBankIfsc, setCBankIfsc] = useState(companyDetails.bank_ifsc || '');
  const [cBankBranch, setCBankBranch] = useState(companyDetails.bank_branch || '');
  const [cUpiId, setCUpiId] = useState(companyDetails.upi_id || '');
  const [cAccountingFramework, setCAccountingFramework] = useState(companyDetails.accounting_framework || 'AS');
  const [profileSaving, setProfileSaving] = useState(false);

  const applyProfileFormFields = (details) => {
    if (!details) return;
    setCName(details.name || '');
    setCGstin(details.gstin || '');
    setCPan(details.pan || '');
    setCAddress(details.address || '');
    setCState(details.state || '');
    setCCity(details.city || '');
    setCEmail(details.email || '');
    setCPhone(details.phone || '');
    setCPincode(details.pincode || '');
    setCCountry(details.country || 'India');
    setCBankName(details.bank_name || '');
    setCBankAccount(details.bank_account || '');
    setCBankAccountHolder(details.bank_account_holder || '');
    setCBankIfsc(details.bank_ifsc || '');
    setCBankBranch(details.bank_branch || '');
    setCUpiId(details.upi_id || '');
    setCAccountingFramework(details.accounting_framework || 'AS');
  };

  const loadProfileFormFromServer = () => applyProfileFormFields(companyDetails);

  const profileFormHydratedRef = useRef(false);

  useEffect(() => {
    if (settingsSubTab !== 'profile') {
      profileFormHydratedRef.current = false;
      return;
    }
    if (!profileFormHydratedRef.current) {
      loadProfileFormFromServer();
      profileFormHydratedRef.current = true;
    }
  }, [settingsSubTab]);

  useEffect(() => {
    if (settingsSubTab !== 'profile' || profileFormHydratedRef.current) return;
    if (companyDetails.name || companyDetails.gstin) {
      loadProfileFormFromServer();
      profileFormHydratedRef.current = true;
    }
  }, [settingsSubTab, companyDetails.name, companyDetails.gstin]);

  const [backupDownloading, setBackupDownloading] = useState(false);
  const [backupRestoring, setBackupRestoring] = useState(false);
  const [backupEmailStatus, setBackupEmailStatus] = useState(null);
  const [backupEmailSending, setBackupEmailSending] = useState(false);
  const restoreFileInputRef = useRef(null);

  useEffect(() => {
    if (settingsSubTab !== 'backup' || !isSuperAdmin) return undefined;
    let cancelled = false;
    portalApi.getBackupEmailStatus()
      .then((data) => { if (!cancelled) setBackupEmailStatus(data); })
      .catch(() => { if (!cancelled) setBackupEmailStatus(null); });
    return () => { cancelled = true; };
  }, [settingsSubTab, isSuperAdmin]);

  const handleSendBackupEmailNow = async () => {
    setBackupEmailSending(true);
    try {
      const result = await portalApi.sendBackupEmailNow();
      setBackupEmailStatus((prev) => ({
        ...prev,
        last_run_at: new Date().toISOString(),
        last_run_ok: true,
        last_run_message: result.message,
        recipients: result.recipients || prev?.recipients,
      }));
      alert(result.message || 'Backup email sent.');
    } catch (err) {
      showApiError('Sending backup email', err);
      try {
        const status = await portalApi.getBackupEmailStatus();
        setBackupEmailStatus(status);
      } catch {
        /* ignore */
      }
    } finally {
      setBackupEmailSending(false);
    }
  };

  const handleManualBackup = async () => {
    if (!activeCompany?.id) {
      alert('Select a company from the header dropdown before downloading a backup.');
      return;
    }
    setBackupDownloading(true);
    try {
      const { blob, filename } = await portalApi.downloadCompanyBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`Backup downloaded: ${filename}\n\nThis file contains all data for "${activeCompany.name}" only.`);
    } catch (err) {
      showApiError('Downloading company backup', err);
    } finally {
      setBackupDownloading(false);
    }
  };

  const handleRestoreBackupClick = () => {
    if (!activeCompany?.id) {
      alert('Select a company from the header dropdown before restoring a backup.');
      return;
    }
    restoreFileInputRef.current?.click();
  };

  const handleRestoreFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeCompany?.id) return;

    const warning =
      `RESTORE WARNING\n\n` +
      `Company: ${activeCompany.name}\n\n` +
      `All current data for this company will be replaced by the backup file.\n` +
      `Anything created after that backup (e.g. new invoices) will be permanently removed.\n\n` +
      `Other companies on the portal will NOT be affected.\n\n` +
      `Do you want to restore this company to the backup version?`;

    if (!window.confirm(warning)) return;
    if (!window.confirm('Final confirmation: proceed with restore?')) return;

    setBackupRestoring(true);
    try {
      await portalApi.restoreCompanyBackup(file);
      await refreshPortalData();
      alert('Restore completed. The portal now shows data from your backup file.');
    } catch (err) {
      showApiError('Restoring company backup', err);
    } finally {
      setBackupRestoring(false);
    }
  };

  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!isStaffAdmin) {
      alert('Only administrators can update company profile.');
      return;
    }
    if (isFinancialYearLocked) {
      alert("SYSTEM LOCK ACTIVE: Period is locked from tampering.");
      return;
    }
    setProfileSaving(true);
    try {
      const saved = await saveCompanyProfile({
        name: cName.trim(),
        gstin: cGstin.trim(),
        pan: cPan.trim(),
        address: cAddress.trim(),
        state: cState.trim(),
        city: cCity.trim(),
        pincode: cPincode.trim(),
        country: cCountry.trim(),
        email: cEmail.trim(),
        phone: cPhone.trim(),
        bank_name: cBankName.trim(),
        bank_account: cBankAccount.trim(),
        bank_account_holder: cBankAccountHolder.trim(),
        bank_ifsc: cBankIfsc.trim(),
        bank_branch: cBankBranch.trim(),
        upi_id: cUpiId.trim(),
        accounting_framework: cAccountingFramework,
      });
      applyProfileFormFields(saved);
      profileFormHydratedRef.current = true;
      alert('Company profile saved. Invoices, vouchers, and emails will use these details.');
    } catch (err) {
      showApiError('Updating company profile', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newName) {
      alert('Email and Name are mandatory.');
      return;
    }
    const assignedIds = canAssignCompanies
      ? newAssignedCompanyIds.map((id) => parseInt(id, 10)).filter(Boolean)
      : (activeCompany?.id ? [parseInt(activeCompany.id, 10)] : []);
    if (!assignedIds.length) {
      alert(canAssignCompanies
        ? 'Select at least one company for this user.'
        : 'Select a company for this user.');
      return;
    }
    const companyRoles = {};
    assignedIds.forEach((id) => {
      const key = String(id);
      companyRoles[key] = newCompanyRoles[key] || (newRole === 'admin' ? 'admin' : 'user');
    });
    try {
      const created = await createUser({
        email: newEmail,
        name: newName,
        role: newRole,
        password: newPassword,
        company_id: newRole === 'group_admin' ? undefined : assignedIds[0],
        company_ids: assignedIds,
        company_roles: newRole === 'group_admin' ? undefined : companyRoles,
      });
      setRegisteredPasswords((prev) => ({ ...prev, [created.id]: newPassword }));
    } catch (err) {
      showApiError('Creating user', err);
      return;
    }
    alert(`Success: User account created successfully. Password: ${newPassword}`);
    setNewEmail('');
    setNewName('');
    setNewAssignedCompanyIds([]);
    setNewCompanyRoles({});
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const assignedIds = canAssignCompanies
      ? editAssignedCompanyIds.map((id) => parseInt(id, 10)).filter(Boolean)
      : [];
    if (canAssignCompanies && !assignedIds.length) {
      alert('Select at least one company for this user.');
      return;
    }
    try {
      const payload = {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole,
        password: editUserPassword || undefined,
      };
      if (canAssignCompanies) {
        payload.company_ids = assignedIds;
        if (editUserRole !== 'group_admin') {
          payload.company_id = assignedIds[0];
          const companyRoles = {};
          assignedIds.forEach((id) => {
            const key = String(id);
            companyRoles[key] = editCompanyRoles[key] || (editUserRole === 'admin' ? 'admin' : 'user');
          });
          payload.company_roles = companyRoles;
        }
      }
      await updateUser(editingUser.id, payload);
      if (editUserPassword) {
        setRegisteredPasswords((prev) => ({ ...prev, [editingUser.id]: editUserPassword }));
      }
      setEditingUser(null);
      setEditAssignedCompanyIds([]);
      setEditCompanyRoles({});
      alert('User updated successfully.');
    } catch (err) {
      showApiError('Updating user', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (u.role === 'super_admin' || u.role === 'trial_owner') return false;
    if (u.role === 'group_admin' && !isSuperAdmin) return false;

    const assignedIds = (u.managed_company_ids && u.managed_company_ids.length)
      ? u.managed_company_ids
      : (u.company_id ? [u.company_id] : []);

    if (isSuperAdmin) {
      if (!userCompanyFilter) return true;
      return assignedIds.some((companyId) => sameId(companyId, userCompanyFilter));
    }
    if (isGroupAdmin) {
      const companyId = activeCompany?.id;
      return companyId ? assignedIds.some((id) => sameId(id, companyId)) : false;
    }
    const companyId = activeCompany?.id || currentUser?.company_id;
    return companyId ? assignedIds.some((id) => sameId(id, companyId)) : false;
  });

  const companyNameFor = (companyId) => companies.find((c) => sameId(c.id, companyId))?.name || `Company #${companyId}`;

  const companyNamesForUser = (user) => {
    const ids = (user.managed_company_ids && user.managed_company_ids.length)
      ? user.managed_company_ids
      : (user.company_id ? [user.company_id] : []);
    if (!ids.length) return 'No companies assigned';
    return ids.map((companyId) => companyNameFor(companyId)).join(', ');
  };

  const renderCompanyAccessPicker = (selectedIds, onChangeIds, rolesByCompany, onChangeRole, inputId, showRoles = true) => (
    <CompanyAccessPicker
      companies={assignableCompanies}
      selectedIds={selectedIds}
      rolesByCompany={rolesByCompany}
      onChangeIds={onChangeIds}
      onChangeRole={onChangeRole}
      showRoles={showRoles}
      label="2. Company Access Matrix"
      idPrefix={inputId}
    />
  );

  // Logo file handler
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !isStaffAdmin) return;
    if (!canUploadLogo) {
      setShowLogoPaywall(true);
      e.target.value = '';
      return;
    }
    setProfileSaving(true);
    try {
      await uploadCompanyLogo(file);
      alert('Company logo saved successfully.');
    } catch (err) {
      if (err?.status === 402 || err?.data?.type === 'premium_feature') {
        setShowLogoPaywall(true);
      } else {
        showApiError('Uploading company logo', err);
      }
    } finally {
      setProfileSaving(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!isStaffAdmin || !canUploadLogo) {
      if (!canUploadLogo) setShowLogoPaywall(true);
      return;
    }
    try {
      await saveCompanyProfile({ logo: '' });
      persistCustomOptions({ ...customOptions, logo_layout: 'auto' });
      patchCompanyDetailsLocal((prev) => ({ ...prev, logo: '', logo_layout: 'auto' }));
    } catch (err) {
      showApiError('Removing company logo', err);
    }
  };

  const handleLogoLayoutChange = (value) => {
    const next = { ...customOptions, logo_layout: value };
    persistCustomOptions(next);
    patchCompanyDetailsLocal((prev) => ({ ...prev, logo_layout: value }));
  };

  return (
    <div>
      <PremiumFeatureModal
        open={showLogoPaywall}
        title="Company logo — paid plans"
        message="Upload a custom logo on invoices and PDFs with any paid subscription. Your trial includes full accounting features without logo branding."
        onClose={() => setShowLogoPaywall(false)}
        onUpgrade={() => {
          setShowLogoPaywall(false);
          onViewPlans?.();
        }}
      />
      {isSuperAdmin && (
        <div className="settings-main-nav">
          <button
            type="button"
            className={`settings-main-nav__btn ${settingsMainTab === 'company' ? 'active' : ''}`}
            onClick={() => {
              setSettingsMainTab('company');
              setSettingsSubTab('profile');
            }}
          >
            Company Settings
          </button>
          <button
            type="button"
            className={`settings-main-nav__btn ${settingsMainTab === 'website' ? 'active' : ''}`}
            onClick={() => {
              setSettingsMainTab('website');
              setSettingsSubTab('sessions');
            }}
          >
            Website Settings
          </button>
        </div>
      )}

      <MobileSettingsNav
        settingsMainTab={settingsMainTab}
        settingsSubTab={settingsSubTab}
        setSettingsSubTab={setSettingsSubTab}
        isSuperAdmin={isSuperAdmin}
        isGroupAdmin={isGroupAdmin}
        isAdmin={isCompanyAdmin}
      />

      <div className="tab-nav-sub desktop-subtabs">
        {(!isSuperAdmin || settingsMainTab === 'company') && (
          <>
            <button className={`sub-tab-btn ${settingsSubTab === 'profile' ? 'active' : ''}`} onClick={() => setSettingsSubTab('profile')}>
              Company Details
            </button>
            {(isCompanyAdmin) && (
              <button className={`sub-tab-btn ${settingsSubTab === 'gst-compliance' ? 'active' : ''}`} onClick={() => setSettingsSubTab('gst-compliance')}>
                GST Compliance (E-Inv / E-Way)
              </button>
            )}
            {isCompanyAdmin && (
              <>
                {canManageCompanies && (
                  <button className={`sub-tab-btn ${settingsSubTab === 'companies' ? 'active' : ''}`} onClick={() => setSettingsSubTab('companies')}>
                    Manage Companies
                  </button>
                )}
                <button className={`sub-tab-btn ${settingsSubTab === 'user-mgmt' ? 'active' : ''}`} onClick={() => setSettingsSubTab('user-mgmt')}>
                  User Management
                </button>
                <button className={`sub-tab-btn ${settingsSubTab === 'lock-controls' ? 'active' : ''}`} onClick={() => setSettingsSubTab('lock-controls')}>
                  Financial Year Lock
                </button>
              </>
            )}
          </>
        )}
        {isSuperAdmin && settingsMainTab === 'website' && (
          <>
            <button className={`sub-tab-btn ${settingsSubTab === 'sessions' ? 'active' : ''}`} onClick={() => setSettingsSubTab('sessions')}>
              Login & Audit Trail
            </button>
            <button className={`sub-tab-btn ${settingsSubTab === 'backup' ? 'active' : ''}`} onClick={() => setSettingsSubTab('backup')}>
              Data Backups & Restore
            </button>
            <button className={`sub-tab-btn ${settingsSubTab === 'system-health' ? 'active' : ''}`} onClick={() => setSettingsSubTab('system-health')}>
              System Health
            </button>
            <button className={`sub-tab-btn ${settingsSubTab === 'subscriptions' ? 'active' : ''}`} onClick={() => setSettingsSubTab('subscriptions')}>
              Subscription Payments
            </button>
          </>
        )}
      </div>

      {settingsSubTab === 'companies' && canManageCompanies && (
        <div className="master-form user-mgmt-sheet">
          <div className="user-mgmt-sheet__toolbar">
            <div>
              <p className="user-mgmt-sheet__eyebrow">Manage Companies</p>
              <h3 className="form-section-title user-mgmt-sheet__title">Create New Company Sheet</h3>
              <p className="user-mgmt-sheet__subtitle">
                {isGroupAdmin
                  ? 'Add a company under your group, then grant access to existing users in one step.'
                  : 'Register a company and optionally grant Aditya (or any user) access immediately.'}
              </p>
            </div>
          </div>

          <div className="form-section-title">1. Company Identity</div>
          <div className="form-grid-2 user-mgmt-panel">
            <div className="form-group">
              <label>Company Legal Name*</label>
              <input className="form-input" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>GSTIN (Optional)</label>
              <input className="form-input" value={newCompanyGstin} onChange={(e) => setNewCompanyGstin(e.target.value)} maxLength={15} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="form-input" value={newCompanyState} onChange={(e) => setNewCompanyState(e.target.value)} />
            </div>
          </div>

          <div className="user-mgmt-panel">
            <UserAccessPicker
              users={assignableUsersForNewCompany}
              selectedIds={newCompanyUserIds}
              rolesByUser={newCompanyUserRoles}
              onChangeIds={setNewCompanyUserIds}
              onChangeRole={(userId, role) => setNewCompanyUserRoles((prev) => ({ ...prev, [String(userId)]: role }))}
              label="2. Grant Access to Existing Users"
              idPrefix="new-company-users"
            />
          </div>

          <div className="btn-row">
            <button
              type="button"
              className="btn-primary"
              disabled={companyCreating || !newCompanyName.trim()}
              onClick={async () => {
                setCompanyCreating(true);
                try {
                  const userRoles = {};
                  newCompanyUserIds.forEach((id) => {
                    userRoles[String(id)] = newCompanyUserRoles[String(id)] || 'user';
                  });
                  await createCompany({
                    name: newCompanyName.trim(),
                    gstin: newCompanyGstin.trim() || null,
                    state: newCompanyState.trim() || 'Gujarat',
                    user_ids: newCompanyUserIds.map((id) => parseInt(id, 10)).filter(Boolean),
                    user_roles: userRoles,
                  });
                  setNewCompanyName('');
                  setNewCompanyGstin('');
                  setNewCompanyUserIds([]);
                  setNewCompanyUserRoles({});
                  alert('Company created successfully.');
                } catch (err) {
                  showApiError('Creating company', err);
                } finally {
                  setCompanyCreating(false);
                }
              }}
            >
              {companyCreating ? 'Creating...' : 'Create Company'}
            </button>
          </div>

          <h3 className="form-section-title" style={{ marginTop: '32px' }}>Registered Companies</h3>
          <div className="table-card">
            <table className="premium-table">
              <thead>
                <tr><th>ID</th><th>Company Name</th><th>Slug</th>{isSuperAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}</tr>
              </thead>
              <tbody>
                {(companies || []).map((co) => (
                  <tr key={co.id}>
                    <td>{co.id}</td>
                    <td>{co.name}</td>
                    <td>{co.slug}</td>
                    {isSuperAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px', color: '#ef4444', border: '1px solid #fecaca', background: '#fef2f2' }}
                        disabled={companyDeletingId === co.id || companies.length <= 1}
                        title={companies.length <= 1 ? 'Cannot delete the only company' : `Delete ${co.name}`}
                        onClick={async () => {
                          if (!confirm(`Delete company "${co.name}" and ALL its data (invoices, users, vouchers)? This cannot be undone.`)) return;
                          setCompanyDeletingId(co.id);
                          try {
                            await deleteCompany(co.id);
                            alert('Company deleted successfully.');
                          } catch (err) {
                            showApiError('Deleting company', err);
                          } finally {
                            setCompanyDeletingId(null);
                          }
                        }}
                      >
                        {companyDeletingId === co.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {settingsSubTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="master-form">
          {(currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'group_admin') && (
            <p style={{ fontSize: '13px', color: 'var(--accent-amber)', marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              View only — you cannot change company details. Ask an administrator to update this profile.
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
            <div>
              <h3 className="form-section-title">Company Profile Details</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Legal Company Entity Name*</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={cName} 
                    onChange={(e) => setCName(e.target.value)} 
                    readOnly={!isStaffAdmin}
                  />
                </div>
                <div className="form-group">
                  <label>Registration Tax Number (GSTIN)*</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={cGstin} 
                    onChange={(e) => setCGstin(e.target.value.toUpperCase())} 
                    readOnly={!isStaffAdmin}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Permanent Account Number (PAN)*</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={cPan} 
                    onChange={(e) => setCPan(e.target.value.toUpperCase())} 
                    readOnly={!isStaffAdmin}
                  />
                </div>
                <div className="form-group">
                  <label>Registered State (Supply HQ)*</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={cState} 
                    onChange={(e) => setCState(e.target.value)} 
                    readOnly={!isStaffAdmin}
                  />
                </div>
                <div className="form-group">
                  <label>Supply City*</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={cCity} 
                    onChange={(e) => setCCity(e.target.value)} 
                    readOnly={!isStaffAdmin}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Accounting framework (for financial reports)</label>
                <select
                  className="form-input"
                  value={cAccountingFramework}
                  onChange={(e) => setCAccountingFramework(e.target.value)}
                  disabled={!isStaffAdmin}
                >
                  <option value="AS">AS — Accounting Standards (Schedule III, Division I) — most private companies</option>
                  <option value="IND_AS">Ind AS — Indian Accounting Standards (Schedule III, Division II) — Ind AS companies</option>
                </select>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
                  Choose the reporting standard your company follows (Schedule III Division I = AS, Division II = Ind AS).
                  This does <strong>not</strong> change your numbers or existing report groups instantly — it only sets which
                  template loads in Chart of Accounts → Report Groupings → <em>Load template</em>, and the label on Financial Statements.
                  To switch frameworks after groups are already set up, delete the old group tree first, save this setting, then load the new template and run Automatic Map.
                  If unsure, ask your accountant — most small businesses use AS.
                </p>
              </div>

              <div className="form-group">
                <label>HQ Official Address* (one line per row — shown on invoices)</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  readOnly={!isStaffAdmin}
                  style={{ resize: 'vertical', minHeight: '88px' }}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Primary Contact Email*</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={cEmail} 
                    onChange={(e) => setCEmail(e.target.value)} 
                    readOnly={!isStaffAdmin}
                  />
                </div>
                <div className="form-group">
                  <label>Official Phone Contact*</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={cPhone} 
                    onChange={(e) => setCPhone(e.target.value)} 
                    readOnly={!isStaffAdmin}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Pincode</label>
                  <input type="text" className="form-input" value={cPincode} onChange={(e) => setCPincode(e.target.value)} readOnly={!isStaffAdmin} />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input type="text" className="form-input" value={cCountry} onChange={(e) => setCCountry(e.target.value)} readOnly={!isStaffAdmin} />
                </div>
              </div>

              <h4 className="form-section-title" style={{ marginTop: 20 }}>Bank &amp; UPI details (shown on invoices &amp; vouchers)</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>A/C Holder&apos;s Name</label>
                  <input type="text" className="form-input" value={cBankAccountHolder} onChange={(e) => setCBankAccountHolder(e.target.value)} readOnly={!isStaffAdmin} placeholder="Name as per bank records" />
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input type="text" className="form-input" value={cBankName} onChange={(e) => setCBankName(e.target.value)} readOnly={!isStaffAdmin} />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input type="text" className="form-input" value={cBankAccount} onChange={(e) => setCBankAccount(e.target.value)} readOnly={!isStaffAdmin} />
                </div>
                <div className="form-group">
                  <label>IFSC</label>
                  <input type="text" className="form-input" value={cBankIfsc} onChange={(e) => setCBankIfsc(e.target.value)} readOnly={!isStaffAdmin} />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <input type="text" className="form-input" value={cBankBranch} onChange={(e) => setCBankBranch(e.target.value)} readOnly={!isStaffAdmin} />
                </div>
                <div className="form-group">
                  <label>UPI ID</label>
                  <input type="text" className="form-input" value={cUpiId} onChange={(e) => setCUpiId(e.target.value)} readOnly={!isStaffAdmin} placeholder="e.g. company@okaxis" />
                </div>
              </div>

              {isStaffAdmin && (
                <button
                  type="submit"
                  className={`btn-primary ${profileSaving ? 'btn-submitting' : ''}`}
                  style={{ marginTop: '20px', width: '200px' }}
                  disabled={profileSaving}
                >
                  Update Profile Details
                </button>
              )}
            </div>

            {/* DYNAMIC LOGO UPLOADER BOX */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 className="form-section-title">Official Corporate Logo</h3>
              <div 
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  gap: '16px',
                  minHeight: '220px'
                }}
              >
                {companyDetails.logo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                    <CompanyLogoPreview
                      logo={companyDetails.logo}
                      logoLayout={companyDetails.logo_layout || 'auto'}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 'bold' }}>Logo uploaded — preview matches invoice PDF header</span>
                    {isStaffAdmin && canUploadLogo && (
                      <button 
                        type="button" 
                        className="item-delete-btn" 
                        onClick={handleRemoveLogo}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', border: 'none', cursor: 'pointer' }}
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={28} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>No Corporate Logo Set</span>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto', lineHeight: 1.5 }}>
                      Upload a square icon or a wide horizontal letterhead (company name + tagline in one image).
                      PNG, JPG, or WebP up to 10 MB. Wide logos display full-width on invoice PDFs.
                    </p>
                  </div>
                )}

                {isStaffAdmin && (
                  <>
                    {!canUploadLogo && (
                      <p style={{ fontSize: '11px', color: 'var(--accent-amber, #d97706)', margin: 0 }}>
                        Logo upload unlocks with a paid plan.
                      </p>
                    )}
                    <div className="form-group" style={{ textAlign: 'left', margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>PDF logo placement</label>
                      <select
                        className="form-input"
                        value={companyDetails.logo_layout || customOptions.logo_layout || 'auto'}
                        onChange={(e) => handleLogoLayoutChange(e.target.value)}
                      >
                        <option value="auto">Auto detect (recommended)</option>
                        <option value="banner">Wide horizontal letterhead</option>
                        <option value="compact">Compact icon beside company name</option>
                      </select>
                    </div>
                    <div style={{ width: '100%' }}>
                      <input 
                        type="file" 
                        id="settings-logo-upload" 
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        style={{ display: 'none' }} 
                        onChange={handleLogoUpload}
                      />
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ width: '100%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => document.getElementById('settings-logo-upload').click()}
                      >
                        <Plus size={14} /> Upload Company Logo
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {settingsSubTab === 'gst-compliance' && isStaffAdmin && (
        <GstComplianceSettingsPanel />
      )}

      {settingsSubTab === 'user-mgmt' && isCompanyAdmin && (
        <div className="user-mgmt-shell">

          {editingUser && (
            <form onSubmit={handleUpdateUser} className="master-form user-mgmt-sheet">
              <div className="user-mgmt-sheet__toolbar">
                <div>
                  <p className="user-mgmt-sheet__eyebrow">User Management</p>
                  <h3 className="form-section-title user-mgmt-sheet__title">
                    Edit User Access Sheet
                  </h3>
                  <p className="user-mgmt-sheet__subtitle">
                    Update identity, password, and multi-company access for <strong>{editingUser.name}</strong> ({editingUser.email}).
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingUser(null);
                    setEditAssignedCompanyIds([]);
                    setEditCompanyRoles({});
                  }}
                >
                  ← Back to Registry
                </button>
              </div>

              <div className="form-section-title">1. Account Identity</div>
              <div className="form-grid-2 user-mgmt-panel">
                <div className="form-group">
                  <label>Full Employee Name*</label>
                  <input className="form-input" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Login Email ID*</label>
                  <input type="email" className="form-input" value={editUserEmail} onChange={(e) => setEditUserEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Primary System Role*</label>
                  <select
                    className="form-input"
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Administrator</option>
                    {isSuperAdmin && (
                      <option value="group_admin">Group Admin (Multiple companies)</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reset Password (optional)</label>
                  <input
                    className="form-input"
                    placeholder="Leave blank to keep current password"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                  />
                </div>
              </div>

              {canAssignCompanies && (
                <div className="user-mgmt-panel">
                  {renderCompanyAccessPicker(
                    editAssignedCompanyIds,
                    setEditAssignedCompanyIds,
                    editCompanyRoles,
                    (companyId, role) => setEditCompanyRoles((prev) => ({ ...prev, [String(companyId)]: role })),
                    'edit-user-companies',
                    editUserRole !== 'group_admin'
                  )}
                </div>
              )}

              <div className="btn-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingUser(null);
                    setEditAssignedCompanyIds([]);
                    setEditCompanyRoles({});
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Save User Access</button>
              </div>
            </form>
          )}
          
          {/* USER REGISTRATION FORM */}
          {!editingUser && (
          <form onSubmit={handleCreateUser} className="master-form user-mgmt-sheet">
            <div className="user-mgmt-sheet__toolbar">
              <div>
                <p className="user-mgmt-sheet__eyebrow">User Management</p>
                <h3 className="form-section-title user-mgmt-sheet__title">
                  Register New Company Employee
                </h3>
                <p className="user-mgmt-sheet__subtitle">
                  Create login credentials and grant access across one or more companies — same clarity as your sales billing sheet.
                </p>
              </div>
            </div>

            <div className="form-section-title">1. Employee Identity & Role</div>
            <div className="form-grid-3 user-mgmt-panel">
              <div className="form-group">
                <label>User Email ID (Login ID)*</label>
                <input type="email" className="form-input" placeholder="name@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Full Employee Name*</label>
                <input type="text" className="form-input" placeholder="e.g. Aditya Bhai" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>System Role Rights*</label>
                <select
                  className="form-input"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="user">Standard User (Work allotted, add/edit records only)</option>
                  <option value="admin">System Administrator (Full access, Dashboard configs)</option>
                  {isSuperAdmin && (
                    <option value="group_admin">Group Admin (Multiple companies, same email)</option>
                  )}
                </select>
              </div>
            </div>

            {canAssignCompanies && (
              <div className="user-mgmt-panel">
                {renderCompanyAccessPicker(
                  newAssignedCompanyIds,
                  setNewAssignedCompanyIds,
                  newCompanyRoles,
                  (companyId, role) => setNewCompanyRoles((prev) => ({ ...prev, [String(companyId)]: role })),
                  'new-user-companies',
                  newRole !== 'group_admin'
                )}
              </div>
            )}
            {!canAssignCompanies && activeCompany?.name && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>
                New users will be registered under <strong>{activeCompany.name}</strong>.
              </p>
            )}

            <div className="form-section-title">3. Security Credentials</div>
            <div className="form-grid-2 user-mgmt-panel">
              <div className="form-group">
                <label>Define Password*</label>
                <input type="text" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 6 }}>
                  User cannot self-change password (security audit trail).
                </p>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end', display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn-primary" style={{ minWidth: '220px' }}>
                  Register User Credentials
                </button>
              </div>
            </div>
          </form>
          )}

          {/* USER LIST REGISTRY */}
          <div className="table-card user-registry-card">
            <div className="user-registry-card__head">
              <div>
                <p className="user-mgmt-sheet__eyebrow">Registry</p>
                <h3 className="chart-title">Registered User Database</h3>
              </div>
              {isSuperAdmin && (
                <div className="form-group user-registry-card__filter">
                  <label>Filter by Company</label>
                  <select className="form-input" value={userCompanyFilter} onChange={(e) => setUserCompanyFilter(e.target.value)}>
                    <option value="">All companies</option>
                    {(companies || []).map((co) => (
                      <option key={co.id} value={co.id}>{co.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    {isSuperAdmin && <th>Company Access</th>}
                    <th>Email Address</th>
                    <th>Full Employee Name</th>
                    <th>Access Role</th>
                    <th>Login Password</th>
                    <th>Registered At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'monospace' }}>USR-00{u.id}</td>
                      {isSuperAdmin && <td>{companyNamesForUser(u)}</td>}
                      <td style={{ fontWeight: 'bold' }}>{u.email}</td>
                      <td>{u.name}</td>
                      <td>
                        <span className="status-badge" style={{
                          backgroundColor: u.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : u.role === 'group_admin' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(59, 130, 246, 0.1)',
                          color: u.role === 'admin' ? 'var(--accent-red)' : u.role === 'group_admin' ? '#a855f7' : 'var(--accent-blue)',
                        }}>
                          {roleDisplayLabel(u.role)}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{registeredPasswords[u.id] || '(set by admin)'}</td>
                      <td>{u.created_at ? formatDateDDMMYYYY(u.created_at) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                            onClick={() => {
                              setEditingUser(u);
                              setEditUserName(u.name);
                              setEditUserEmail(u.email);
                              setEditUserRole(u.role);
                              setEditUserPassword('');
                              const ids = (u.managed_company_ids && u.managed_company_ids.length)
                                ? u.managed_company_ids
                                : (u.company_id ? [u.company_id] : []);
                              setEditAssignedCompanyIds(ids.map(String));
                              const roles = { ...(u.company_roles || {}) };
                              ids.forEach((cid) => {
                                const key = String(cid);
                                if (!roles[key]) {
                                  roles[key] = u.role === 'admin' ? 'admin' : 'user';
                                }
                              });
                              setEditCompanyRoles(roles);
                            }}
                          >
                            Edit Access
                          </button>
                          {currentUser.id !== u.id ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '11px', color: '#ef4444', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', borderRadius: '4px' }}
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete employee "${u.name}" (${u.email})?`)) return;
                                try {
                                  await deleteUser(u.id);
                                  alert('User deleted successfully.');
                                } catch (err) {
                                  showApiError('Deleting user', err);
                                }
                              }}
                            >
                              Delete
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Active Session</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 8 : 7} className="empty-state">
                        {users.length === 0
                          ? 'No users loaded yet. Register a user above or refresh the page.'
                          : 'No users match the current filter for your access level.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === 'sessions' && isSuperAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* USER LOGIN HISTORY LOG */}
          <div className="table-card">
            <h3 className="chart-title">1. Exact User Login Logs (last 10)</h3>
            <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>User Mail ID</th>
                    <th>User Name</th>
                    <th>Session Timestamp</th>
                    <th>Operation Status</th>
                    <th>Action Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace' }}>#{log.id}</td>
                      <td>{log.email}</td>
                      <td style={{ fontWeight: 'bold' }}>{log.name}</td>
                      <td>{formatDateDDMMYYYY(log.timestamp)}</td>
                      <td>
                        <span className="status-badge" style={{
                          backgroundColor: log.status === 'Success' ? 'var(--accent-green-bg)' : log.status === 'Logout' ? 'rgba(255,255,255,0.05)' : 'var(--accent-red-bg)',
                          color: log.status === 'Success' ? 'var(--accent-green)' : log.status === 'Logout' ? 'var(--text-secondary)' : 'var(--accent-red)'
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AUDIT DETAILS */}
          <div className="table-card">
            <h3 className="chart-title">2. System Audit Trail (last 20)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Transaction audit history for compliance. Older entries are trimmed automatically.
            </p>
            <div className="premium-table-wrapper" style={{ marginTop: '16px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Voucher Log ID</th>
                    <th>Registered By Employee</th>
                    <th>Action</th>
                    <th>Target Document</th>
                    <th>Auditor details description</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace' }}>#TX-{log.id}</td>
                      <td>{log.user_name}</td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--accent-teal)' }}>{log.target}</span></td>
                      <td>{log.details}</td>
                      <td>{formatDateDDMMYYYY(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === 'lock-controls' && isCompanyAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="master-form">
            <h3 className="form-section-title">Financial Period Lock</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Applies to the currently selected company ({activeCompany?.name || '—'}).
            </p>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Lock company transactions</strong>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      When enabled, users cannot create, edit, or delete vouchers for locked periods in this company.
                    </p>
                  </div>
                  <label className="switch-container" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                    <input
                      type="checkbox"
                      checked={isFinancialYearLocked}
                      onChange={(e) => {
                        setIsFinancialYearLocked(e.target.checked);
                        addConsoleLog(
                          'system',
                          `Financial Period hard lock toggled to: ${e.target.checked ? 'LOCKED' : 'UNLOCKED'}`,
                          `UPDATE company_settings SET is_fy_locked = ${e.target.checked ? 'true' : 'false'};`
                        );
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className="slider" style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isFinancialYearLocked ? 'var(--accent-red)' : '#ccc',
                      transition: '.4s', borderRadius: '34px',
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: '18px', width: '18px', left: isFinancialYearLocked ? '28px' : '4px', bottom: '4px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      }} />
                    </span>
                  </label>
                </div>
                {isFinancialYearLocked && (
                  <div className="error-banner" style={{ margin: 0, background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--accent-red)', color: 'var(--accent-red)' }}>
                    <AlertTriangle size={16} />
                    <span>Warning: Hard lock is ACTIVE for this company. Voucher edits are read-only.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === 'system-health' && isSuperAdmin && (
        <SystemHealthPanel
          inactivityTimeout={inactivityTimeout}
          setInactivityTimeout={setInactivityTimeout}
          isDemoLogoutMode={isDemoLogoutMode}
          setIsDemoLogoutMode={setIsDemoLogoutMode}
        />
      )}

      {settingsSubTab === 'subscriptions' && isSuperAdmin && (
        <SubscriptionAdminPanel />
      )}

      {settingsSubTab === 'backup' && isSuperAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="error-banner" style={{ background: 'var(--accent-blue-bg, #eff6ff)', borderColor: 'var(--accent-blue)', color: 'var(--text-primary)' }}>
            <Shield size={18} />
            <span>
              <strong>Super admin only.</strong> Backups are per company. Select the company in the header first.
              {activeCompany?.name ? (
                <> Active: <strong>{activeCompany.name}</strong>.</>
              ) : (
                <> No company selected — choose one before backup or restore.</>
              )}
            </span>
          </div>

          <div className="master-form">
            <h3 className="form-section-title">1) Manual backup</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              Downloads one JSON file with every record for the selected company (invoices, receipts, expenses, users, inventory, notes, logs, settings, and more). Filename: <strong>Vouchex_CompanyName_YYYY-MM-DD.json</strong>.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleManualBackup}
              disabled={backupDownloading || !activeCompany?.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} /> {backupDownloading ? 'Preparing backup…' : 'Download manual backup'}
            </button>
          </div>

          <div className="master-form">
            <h3 className="form-section-title">2) Restore from backup</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              Upload a backup JSON for the <strong>same company</strong> selected in the header. After restore, only data in that file remains; newer transactions not in the backup are removed. Other companies are never changed.
            </p>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleRestoreFileSelected}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRestoreBackupClick}
              disabled={backupRestoring || !activeCompany?.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'var(--accent-red, #dc2626)', color: 'var(--accent-red, #dc2626)' }}
            >
              <Upload size={16} /> {backupRestoring ? 'Restoring…' : 'Restore company from backup file'}
            </button>
          </div>

          <div className="master-form">
            <h3 className="form-section-title">3) Automatic daily backup (email)</h3>
            <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                Every day at <strong>1:00 PM (India time)</strong>, the server emails one backup file per active company to:
              </p>
              <ul style={{ fontSize: '13px', margin: '0 0 12px 20px', color: 'var(--text-primary)' }}>
                {(backupEmailStatus?.recipients?.length ? backupEmailStatus.recipients : ['rajatlakhani2@gmail.com', 'rajpopatpriyank@gmail.com']).map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
              {backupEmailStatus?.last_run_at && (
                <p style={{ fontSize: '12px', margin: '0 0 12px 0', color: backupEmailStatus.last_run_ok ? 'var(--accent-teal, #0d9488)' : 'var(--accent-red, #dc2626)' }}>
                  Last run: {new Date(backupEmailStatus.last_run_at).toLocaleString('en-IN')}
                  {backupEmailStatus.last_run_message ? ` — ${backupEmailStatus.last_run_message}` : ''}
                </p>
              )}
              {backupEmailStatus?.mail_driver === 'log' && (
                <p style={{ fontSize: '12px', color: 'var(--accent-red, #dc2626)', margin: '0 0 12px 0' }}>
                  Warning: MAIL_MAILER is &quot;log&quot; on the server — emails are not sent until SMTP is configured in .env.
                </p>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSendBackupEmailNow}
                disabled={backupEmailSending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}
              >
                <Mail size={16} /> {backupEmailSending ? 'Sending…' : 'Send backup email now (test)'}
              </button>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Requires SMTP in server <code>.env</code> and cPanel cron running every minute:<br />
                <code>* * * * * cd /home/USER/vouchex && php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1</code>
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// SKELETON LOADER COMPONENT FOR INSTANT FEEDBACK
// ==========================================
function SkeletonLoader({ tab }) {
  return (
    <div className="skeleton-container animate-pulse" style={{ width: '100%' }}>
      {tab === 'dashboard' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="dashboard-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="metric-card" style={{ height: '110px' }}>
                <div className="skeleton-line" style={{ width: '40%', height: '12px', background: 'var(--border-color)', borderRadius: '4px' }} />
                <div className="skeleton-line" style={{ width: '60%', height: '24px', marginTop: '12px', background: 'var(--border-color)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
          <div className="dashboard-middle">
            <div className="chart-card" style={{ height: '350px' }}>
              <div className="skeleton-line" style={{ width: '30%', height: '16px', background: 'var(--border-color)', borderRadius: '4px' }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '40px 0' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton-block" style={{ width: '24px', height: `${i * 30 + 30}px`, background: 'var(--border-color)', borderRadius: '8px' }} />
                ))}
              </div>
            </div>
            <div className="quick-actions-card" style={{ height: '350px' }}>
              <div className="skeleton-line" style={{ width: '40%', height: '16px', background: 'var(--border-color)', borderRadius: '4px' }} />
              <div className="quick-actions-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton-block" style={{ background: 'var(--border-color)', borderRadius: '10px' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton-line" style={{ width: '200px', height: '28px', background: 'var(--border-color)', borderRadius: '4px' }} />
            <div className="skeleton-line" style={{ width: '120px', height: '36px', background: 'var(--border-color)', borderRadius: '4px' }} />
          </div>
          <div className="table-card">
            <div className="skeleton-line" style={{ width: '150px', height: '16px', marginBottom: '20px', background: 'var(--border-color)', borderRadius: '4px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div className="skeleton-line" style={{ width: '20%', height: '14px', background: 'var(--border-color)', borderRadius: '4px' }} />
                  <div className="skeleton-line" style={{ width: '30%', height: '14px', background: 'var(--border-color)', borderRadius: '4px' }} />
                  <div className="skeleton-line" style={{ width: '25%', height: '14px', background: 'var(--border-color)', borderRadius: '4px' }} />
                  <div className="skeleton-line" style={{ width: '15%', height: '14px', background: 'var(--border-color)', borderRadius: '4px' }} />
                  <div className="skeleton-line" style={{ width: '10%', height: '14px', background: 'var(--border-color)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
