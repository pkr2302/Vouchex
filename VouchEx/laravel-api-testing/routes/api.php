<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyBackupController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DocumentLockController;
use App\Http\Controllers\Api\PortalDataController;
use App\Http\Controllers\Api\PortalMutationController;
use App\Http\Controllers\Api\ReferenceRateController;
use App\Http\Controllers\Api\SystemHealthController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TaxCalendarController;
use Illuminate\Support\Facades\Route;

Route::get('/public/config', [\App\Http\Controllers\Api\PublicConfigController::class, 'show']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/auth/google', [AuthController::class, 'google']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/set-password', [AuthController::class, 'setPassword']);

    Route::get('/onboarding/status', [\App\Http\Controllers\Api\OnboardingController::class, 'status']);
    Route::post('/onboarding/company', [\App\Http\Controllers\Api\OnboardingController::class, 'createCompany']);
    Route::put('/onboarding/company-details', [\App\Http\Controllers\Api\OnboardingController::class, 'saveCompanyDetails']);

    Route::get('/subscription/plans', [\App\Http\Controllers\Api\SubscriptionController::class, 'plans']);
    Route::get('/subscription/status', [\App\Http\Controllers\Api\SubscriptionController::class, 'status']);
    Route::post('/subscription/payment', [\App\Http\Controllers\Api\SubscriptionController::class, 'submitPayment']);
    Route::get('/subscription/payments/pending', [\App\Http\Controllers\Api\SubscriptionController::class, 'listPendingPayments']);
    Route::post('/subscription/payments/{id}/approve', [\App\Http\Controllers\Api\SubscriptionController::class, 'approvePayment']);
    Route::post('/subscription/payments/{id}/reject', [\App\Http\Controllers\Api\SubscriptionController::class, 'rejectPayment']);

    Route::get('/portal/reference-rate', [PortalDataController::class, 'referenceRate']);
    Route::get('/reference-rate', [ReferenceRateController::class, 'show']);

    Route::get('/companies', [CompanyController::class, 'index']);
    Route::post('/companies', [CompanyController::class, 'store']);
    Route::put('/companies/{id}', [CompanyController::class, 'update']);
    Route::delete('/companies/{id}', [CompanyController::class, 'destroy']);

    Route::get('/admin/backups/download', [CompanyBackupController::class, 'download']);
    Route::post('/admin/backups/restore', [CompanyBackupController::class, 'restore']);
    Route::get('/admin/backups/email-status', [CompanyBackupController::class, 'emailStatus']);
    Route::post('/admin/backups/send-email', [CompanyBackupController::class, 'sendEmailNow']);

    Route::get('/system/health', [SystemHealthController::class, 'show']);
    Route::post('/system/clear-cache', [SystemHealthController::class, 'clearCache']);
    Route::post('/system/optimize', [SystemHealthController::class, 'optimize']);
    Route::post('/system/migrate', [SystemHealthController::class, 'migrate']);
    Route::put('/system/inactivity-timeout', [SystemHealthController::class, 'updateInactivityTimeout']);

    Route::middleware([\App\Http\Middleware\SetTenantContext::class, \App\Http\Middleware\EnsurePortalAccess::class])->group(function () {
        Route::get('/portal/bootstrap', [PortalDataController::class, 'bootstrap']);
        Route::get('/sync/changes', [SyncController::class, 'changes']);

        Route::get('/locks/check', [DocumentLockController::class, 'check']);
        Route::post('/locks/acquire', [DocumentLockController::class, 'acquire']);
        Route::delete('/locks/{id}', [DocumentLockController::class, 'release']);

        Route::post('/customers', [PortalMutationController::class, 'storeCustomer']);
        Route::put('/customers/{id}', [PortalMutationController::class, 'updateCustomer']);
        Route::delete('/customers/{id}', [PortalMutationController::class, 'deleteCustomer']);
        Route::put('/vendors/{id}', [PortalMutationController::class, 'updateVendor']);
        Route::delete('/vendors/{id}', [PortalMutationController::class, 'deleteVendor']);
        Route::post('/invoices', [PortalMutationController::class, 'storeInvoice']);
        Route::put('/invoices/{id}', [PortalMutationController::class, 'updateInvoice']);
        Route::delete('/invoices/{id}', [PortalMutationController::class, 'deleteInvoice']);
        Route::put('/expenses/{id}', [PortalMutationController::class, 'updateExpense']);
        Route::delete('/expenses/{id}', [PortalMutationController::class, 'deleteExpense']);
        Route::post('/receipts', [PortalMutationController::class, 'storeReceipt']);
        Route::put('/receipts/{id}', [PortalMutationController::class, 'updateReceipt']);
        Route::delete('/receipts/{id}', [PortalMutationController::class, 'deleteReceipt']);
        Route::post('/advance-adjustments', [PortalMutationController::class, 'storeAdvanceAdjustments']);
        Route::post('/expenses', [PortalMutationController::class, 'storeExpense']);
        Route::post('/payments', [PortalMutationController::class, 'storePayment']);
        Route::put('/payments/{id}', [PortalMutationController::class, 'updatePayment']);
        Route::post('/currency-conversions', [PortalMutationController::class, 'storeCurrencyConversion']);
        Route::delete('/payments/{id}', [PortalMutationController::class, 'deletePayment']);
        Route::post('/vendors', [PortalMutationController::class, 'storeVendor']);
        Route::post('/inventory', [PortalMutationController::class, 'storeInventory']);
        Route::put('/inventory/{id}', [PortalMutationController::class, 'updateInventory']);
        Route::delete('/inventory/{id}', [PortalMutationController::class, 'deleteInventory']);
        Route::post('/credit-notes', [PortalMutationController::class, 'storeCreditNote']);
        Route::put('/credit-notes/{id}', [PortalMutationController::class, 'updateCreditNote']);
        Route::delete('/credit-notes/{id}', [PortalMutationController::class, 'deleteCreditNote']);
        Route::post('/debit-notes', [PortalMutationController::class, 'storeDebitNote']);
        Route::put('/debit-notes/{id}', [PortalMutationController::class, 'updateDebitNote']);
        Route::delete('/debit-notes/{id}', [PortalMutationController::class, 'deleteDebitNote']);

        Route::post('/settings/users', [PortalMutationController::class, 'storeUser']);
        Route::put('/settings/users/{id}', [PortalMutationController::class, 'updateUser']);
        Route::delete('/settings/users/{id}', [PortalMutationController::class, 'deleteUser']);
        Route::post('/settings/expense-heads', [PortalMutationController::class, 'storeExpenseHead']);
        Route::put('/settings/expense-heads/{id}', [PortalMutationController::class, 'updateExpenseHead']);
        Route::delete('/settings/expense-heads/{id}', [PortalMutationController::class, 'deleteExpenseHead']);
        Route::post('/settings/bank-ledgers', [PortalMutationController::class, 'storeBankLedger']);
        Route::put('/settings/bank-ledgers/{id}', [PortalMutationController::class, 'updateBankLedger']);
        Route::delete('/settings/bank-ledgers/{id}', [PortalMutationController::class, 'deleteBankLedger']);
        Route::post('/settings/cash-ledgers', [PortalMutationController::class, 'storeCashLedger']);
        Route::put('/settings/cash-ledgers/{id}', [PortalMutationController::class, 'updateCashLedger']);
        Route::delete('/settings/cash-ledgers/{id}', [PortalMutationController::class, 'deleteCashLedger']);
        Route::put('/settings/company', [PortalMutationController::class, 'updateCompany']);
        Route::post('/settings/company/logo', [PortalMutationController::class, 'uploadCompanyLogo']);

        Route::get('/gst-compliance/settings', [\App\Http\Controllers\Api\GstComplianceController::class, 'showSettings']);
        Route::put('/gst-compliance/settings', [\App\Http\Controllers\Api\GstComplianceController::class, 'updateSettings']);
        Route::post('/invoices/{id}/einvoice/generate', [\App\Http\Controllers\Api\GstComplianceController::class, 'generateEinvoice']);
        Route::post('/invoices/{id}/einvoice/cancel', [\App\Http\Controllers\Api\GstComplianceController::class, 'cancelEinvoice']);
        Route::post('/invoices/{id}/ewaybill/generate', [\App\Http\Controllers\Api\GstComplianceController::class, 'generateEwayBill']);
        Route::get('/eway-bills', [\App\Http\Controllers\Api\GstComplianceController::class, 'listEwayBills']);

        Route::post('/tax-calendar/reminders', [TaxCalendarController::class, 'store']);
        Route::put('/tax-calendar/reminders/{id}', [TaxCalendarController::class, 'update']);
        Route::delete('/tax-calendar/reminders/{id}', [TaxCalendarController::class, 'destroy']);
        Route::post('/tax-calendar/reminders/{id}/acknowledge-popup', [TaxCalendarController::class, 'acknowledgePopup']);

        Route::post('/consumptions', [PortalMutationController::class, 'storeConsumption']);
        Route::delete('/consumptions/{id}', [PortalMutationController::class, 'deleteConsumption']);

        Route::get('/gl/trial-balance', [\App\Http\Controllers\Api\GlFinancialController::class, 'trialBalance']);
        Route::get('/gl/profit-and-loss', [\App\Http\Controllers\Api\GlFinancialController::class, 'profitAndLoss']);
        Route::get('/gl/balance-sheet', [\App\Http\Controllers\Api\GlFinancialController::class, 'balanceSheet']);
        Route::get('/gl/operational-reports', [\App\Http\Controllers\Api\GlFinancialController::class, 'operationalReports']);
        Route::get('/gl/ledger-statement', [\App\Http\Controllers\Api\GlFinancialController::class, 'ledgerStatement']);
        Route::get('/gl/notes-to-accounts', [\App\Http\Controllers\Api\GlFinancialController::class, 'notesToAccounts']);
        Route::post('/gl/backfill', [\App\Http\Controllers\Api\GlFinancialController::class, 'backfill']);

        Route::get('/gl/day-book', [\App\Http\Controllers\Api\GlRegistersController::class, 'dayBook']);
        Route::get('/gl/sales-register', [\App\Http\Controllers\Api\GlRegistersController::class, 'salesRegister']);
        Route::get('/gl/purchase-register', [\App\Http\Controllers\Api\GlRegistersController::class, 'purchaseRegister']);
        Route::get('/gl/ledger-accounts', [\App\Http\Controllers\Api\GlRegistersController::class, 'ledgerAccounts']);

        Route::get('/gl/guided-journals', [\App\Http\Controllers\Api\GuidedJournalController::class, 'recent']);
        Route::post('/gl/guided/manual-journal', [\App\Http\Controllers\Api\GuidedJournalController::class, 'manualJournal']);
        Route::post('/gl/guided/bank-cash-transfer', [\App\Http\Controllers\Api\GuidedJournalController::class, 'bankCashTransfer']);
        Route::post('/gl/guided/capital-introduction', [\App\Http\Controllers\Api\GuidedJournalController::class, 'capitalIntroduction']);
        Route::post('/gl/guided/owner-withdrawal', [\App\Http\Controllers\Api\GuidedJournalController::class, 'ownerWithdrawal']);
        Route::post('/gl/guided/loan-received', [\App\Http\Controllers\Api\GuidedJournalController::class, 'loanReceived']);
        Route::post('/gl/guided/loan-repayment', [\App\Http\Controllers\Api\GuidedJournalController::class, 'loanRepayment']);
        Route::post('/gl/guided/depreciation', [\App\Http\Controllers\Api\GuidedJournalController::class, 'depreciation']);
        Route::post('/gl/guided/statutory-payment', [\App\Http\Controllers\Api\GuidedJournalController::class, 'statutoryPayment']);

        Route::get('/coa/subtypes', [\App\Http\Controllers\Api\CoaController::class, 'subtypes']);
        Route::get('/coa/chart', [\App\Http\Controllers\Api\CoaController::class, 'chart']);
        Route::post('/coa/accounts', [\App\Http\Controllers\Api\CoaController::class, 'storeAccount']);
        Route::put('/coa/accounts/{id}', [\App\Http\Controllers\Api\CoaController::class, 'updateAccount']);
        Route::delete('/coa/accounts/{id}', [\App\Http\Controllers\Api\CoaController::class, 'deleteAccount']);
        Route::get('/coa/report-groups', [\App\Http\Controllers\Api\CoaController::class, 'reportGroups']);
        Route::post('/coa/report-groups', [\App\Http\Controllers\Api\CoaController::class, 'storeReportGroup']);
        Route::post('/coa/report-groups/load-template', [\App\Http\Controllers\Api\CoaController::class, 'loadReportGroupTemplate']);
        Route::post('/coa/report-groups/assign', [\App\Http\Controllers\Api\CoaController::class, 'assignReportGroups']);
        Route::post('/coa/report-groups/auto-map', [\App\Http\Controllers\Api\CoaController::class, 'autoMapReportGroups']);
        Route::put('/coa/report-groups/{id}', [\App\Http\Controllers\Api\CoaController::class, 'updateReportGroup'])->whereNumber('id');
        Route::delete('/coa/report-groups/{id}', [\App\Http\Controllers\Api\CoaController::class, 'deleteReportGroup'])->whereNumber('id');
    });
});
