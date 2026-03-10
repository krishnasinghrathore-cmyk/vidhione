import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from './layout/layout';
import FullPageLayout from './pages/(full-page)/layout';
import LandingLayout from './pages/(landing)/layout';
import { RequireAuth, RequireSuperadmin } from '@/lib/auth/guards';

// Main Pages
const SalesDashboard = lazy(() => import('./pages/(main)/page'));
const DashboardRedirect = lazy(() => import('./pages/(main)/dashboard-redirect/page'));
const DashboardAnalytics = lazy(() => import('./pages/(main)/dashboards/dashboardanalytics/page'));
const DashboardSaaS = lazy(() => import('./pages/(main)/dashboards/dashboardsaas/page'));
const BlocksDemo = lazy(() => import('./pages/(main)/blocks/page'));
const Documentation = lazy(() => import('./pages/(main)/documentation/page'));
const AdminDashboard = lazy(() => import('./pages/(main)/admin/dashboard/page'));
const AdminTenants = lazy(() => import('./pages/(main)/admin/tenants/page'));
const AdminUsers = lazy(() => import('./pages/(main)/admin/users/page'));

// Apps
const AppCalendar = lazy(() => import('./pages/(main)/apps/calendar/page'));
const AppAgency = lazy(() => import('./pages/(main)/apps/agency/page'));
const AppRetail = lazy(() => import('./pages/(main)/apps/retail/page'));
const AppTextile = lazy(() => import('./pages/(main)/apps/textile/page'));
const TextilePurchaseOrdersPage = lazy(() => import('./pages/(main)/apps/textile/purchase-orders/page'));
const TextileFabricInwardPage = lazy(() => import('./pages/(main)/apps/textile/fabric-inward/page'));
const TextilePackingSlipsPage = lazy(() => import('./pages/(main)/apps/textile/packing-slips/page'));
const TextileDeliveryChallansPage = lazy(() => import('./pages/(main)/apps/textile/delivery-challans/page'));
const TextileJobWorkIssuePage = lazy(() => import('./pages/(main)/apps/textile/job-work-issue/page'));
const TextileDailyOutwardPage = lazy(() => import('./pages/(main)/apps/textile/daily-outward/page'));
const TextilePurchaseOrderBookPage = lazy(() => import('./pages/(main)/apps/textile/purchase-order-book/page'));
const TextileFabricInwardBookPage = lazy(() => import('./pages/(main)/apps/textile/fabric-inward-book/page'));
const TextilePackingSlipBookPage = lazy(() => import('./pages/(main)/apps/textile/packing-slip-book/page'));
const TextileDeliveryChallanBookPage = lazy(() => import('./pages/(main)/apps/textile/delivery-challan-book/page'));
const TextileJobWorkIssueBookPage = lazy(() => import('./pages/(main)/apps/textile/job-work-issue-book/page'));
const TextileDailyOutwardBookPage = lazy(() => import('./pages/(main)/apps/textile/daily-outward-book/page'));
const TextileBillBookPage = lazy(() => import('./pages/(main)/apps/textile/bill-book/page'));
const TextileDispatchBookPage = lazy(() => import('./pages/(main)/apps/textile/dispatch-book/page'));
const TextileFabricStatementPage = lazy(() => import('./pages/(main)/apps/textile/fabric-statement/page'));
const TextileFabricStockStatementPage = lazy(() => import('./pages/(main)/apps/textile/fabric-stock-statement/page'));
const AppRestaurant = lazy(() => import('./pages/(main)/apps/restaurant/page'));
const AppWealth = lazy(() => import('./pages/(main)/apps/wealth/page'));
const WealthSecuritiesPage = lazy(() => import('./pages/(main)/apps/wealth/securities/page'));
const WealthPricesPage = lazy(() => import('./pages/(main)/apps/wealth/prices/page'));
const WealthCorporateActionsPage = lazy(() => import('./pages/(main)/apps/wealth/corporate-actions/page'));
const WealthManualTransactionsPage = lazy(() => import('./pages/(main)/apps/wealth/manual-transactions/page'));
const WealthInvestorProfilesPage = lazy(() => import('./pages/(main)/apps/wealth/investor-profiles/page'));
const WealthDematAccountsPage = lazy(() => import('./pages/(main)/apps/wealth/demat-accounts/page'));
const WealthImportPage = lazy(() => import('./pages/(main)/apps/wealth/import/page'));
const WealthStatementsPage = lazy(() => import('./pages/(main)/apps/wealth/statements/page'));
const WealthStatementPackPage = lazy(() => import('./pages/(main)/apps/wealth/statements/pack/page'));
const WealthRolloutPage = lazy(() => import('./pages/(main)/apps/wealth/rollout/page'));
const WealthDividendsPage = lazy(() => import('./pages/(main)/apps/wealth/dividends/page')); 
const WealthHoldingsPage = lazy(() => import('./pages/(main)/apps/wealth/holdings/page'));
const WealthRealizedPnlPage = lazy(() => import('./pages/(main)/apps/wealth/realized/page'));
const WealthTransactionsPage = lazy(() => import('./pages/(main)/apps/wealth/transactions/page'));
const WealthCashLedgerPage = lazy(() => import('./pages/(main)/apps/wealth/ledger/page'));
const AppLedger = lazy(() => import('./pages/(main)/apps/ledger/page'));
const AccountsLedgerGroupsPage = lazy(
  () => import('./pages/(main)/apps/accounts/ledger-groups/page')
);
const AccountsLedgerListPage = lazy(
  () => import('./pages/(main)/apps/accounts/ledgers/page')
);
const AccountsVoucherOptionsPage = lazy(
  () => import('./pages/(main)/apps/accounts/voucher-options/page')
);
const AccountsReportTemplatesPage = lazy(
  () => import('./pages/(main)/apps/accounts/report-templates/page')
);
const AccountsDayBookPage = lazy(
  () => import('./pages/(main)/apps/accounts/books/day-book/page')
);
const AccountsTrialBalancePage = lazy(
  () => import('./pages/(main)/apps/accounts/reports/trial-balance/TrialBalanceReport')
);
const AccountsBalanceSheetPage = lazy(
  () => import('./pages/(main)/apps/accounts/reports/balance-sheet/page')
);
const AccountsProfitLossPage = lazy(
  () => import('./pages/(main)/apps/accounts/reports/profit-loss/page')
);
const AccountsLedgerReportPage = lazy(
  () => import('./pages/(main)/apps/accounts/books/ledger/page')
);
const AccountsLedgerMonthWiseSummaryPage = lazy(
  () => import('./pages/(main)/apps/accounts/books/ledger-month-wise-summary/page')
);
const AccountsVoucherEntryPage = lazy(
  () => import('./pages/(main)/apps/accounts/voucher-entry/page')
);
const AccountsCashExpenditureEntryPage = lazy(
  () => import('./pages/(main)/apps/accounts/vouchers/payment-voucher/page')
);
const AccountsVoucherEnginePage = lazy(
  () => import('./pages/(main)/apps/accounts/vouchers/voucher/page')
);
const AccountsBankCashDepositPage = lazy(
  () => import('./pages/(main)/apps/accounts/bank-cash-deposit/page')
);
const AccountsBankChequeIssuePage = lazy(
  () => import('./pages/(main)/apps/accounts/bank-cheque-issue/page')
);
const AccountsChequeBookIssuePage = lazy(
  () => import('./pages/(main)/apps/accounts/bank-audit/cheque-book-issue/page')
);
const AccountsLedgerReconciliationPage = lazy(
    () => import('./pages/(main)/apps/accounts/bank-audit/ledger-reconciliation/page')
);
const AccountsStockInHandPage = lazy(
  () => import('./pages/(main)/apps/accounts/stock-in-hand/page')
);
const AccountsDepreciationPage = lazy(
  () => import('./pages/(main)/apps/accounts/depreciation/page')
);
const AccountsAuditPage = lazy(
  () => import('./pages/(main)/apps/accounts/bank-audit/audit/page')
);
const AccountsBookPrintingPage = lazy(
  () => import('./pages/(main)/apps/accounts/book-printing/page')
);
const AccountsAccountsReportsPage = lazy(
  () => import('./pages/(main)/apps/accounts/accounts-reports/page')
);
const AccountsInvoiceRolloverPage = lazy(
  () => import('./pages/(main)/apps/accounts/books/invoice-rollover/page')
);
const AccountsMigrationMonitorPage = lazy(
  () => import('./pages/(main)/apps/accounts/migration-monitor/page')
);
const AccountsCompanyProfilePage = lazy(
  () => import('./pages/(main)/apps/accounts/company-profile/page')
);
const AccountsOptionsPage = lazy(
  () => import('./pages/(main)/apps/accounts/options/page')
);
const AccountsChangeSessionPage = lazy(
  () => import('./pages/(main)/apps/accounts/change-session/page')
);
const AccountsSectionPage = lazy(() => import('./pages/(main)/apps/accounts/section/page'));
const AppInventory = lazy(() => import('./pages/(main)/apps/inventory/page'));
const InventorySectionPage = lazy(() => import('./pages/(main)/apps/inventory/section/page'));
const AppMedia = lazy(() => import('./pages/(main)/apps/media/page'));
const AppWhatsapp = lazy(() => import('./pages/(main)/apps/whatsapp/page'));
const AppEmail = lazy(() => import('./pages/(main)/apps/email/page'));
const AppSms = lazy(() => import('./pages/(main)/apps/sms/page'));
const AppCrm = lazy(() => import('./pages/(main)/apps/crm/page'));
const AppWebsite = lazy(() => import('./pages/(main)/apps/website/page'));
const AppEcommerce = lazy(() => import('./pages/(main)/apps/ecommerce/page'));
const AppMobileApp = lazy(() => import('./pages/(main)/apps/mobileapp/page'));
const AppGiftCoupon = lazy(() => import('./pages/(main)/apps/giftcoupon/page'));
const AppAdCampaigns = lazy(() => import('./pages/(main)/apps/adcampaigns/page'));
const AppBilling = lazy(() => import('./pages/(main)/apps/billing/page'));
const BillingSalesBookPage = lazy(() => import('./pages/(main)/apps/billing/sales-book/page'));
const BillingEstimateBookPage = lazy(() => import('./pages/(main)/apps/billing/estimate-book/page'));
const BillingPurchaseBookPage = lazy(() => import('./pages/(main)/apps/billing/purchase-book/page'));
const BillingSalesReturnBookPage = lazy(() => import('./pages/(main)/apps/billing/sales-return-book/page'));
const BillingPurchaseReturnBookPage = lazy(() => import('./pages/(main)/apps/billing/purchase-return-book/page'));
const BillingInvoiceFormPage = lazy(() => import('./pages/(main)/apps/billing/invoice-form/page'));
const BillingMoneyReceiptCashPage = lazy(
  () => import('./pages/(main)/apps/billing/money-receipt-cash/page')
);
const BillingMoneyReceiptBankPage = lazy(
  () => import('./pages/(main)/apps/billing/money-receipt-bank/page')
);
const BillingReceiptBookIssuePage = lazy(
  () => import('./pages/(main)/apps/billing/receipt-book-issue/page')
);
const BillingSectionPage = lazy(() => import('./pages/(main)/apps/billing/section/page'));
const AppMarketplace = lazy(() => import('./pages/(main)/apps/marketplace/page'));
const AppGst = lazy(() => import('./pages/(main)/apps/gst/page'));
const GstSectionPage = lazy(() => import('./pages/(main)/apps/gst/section/page'));
const AppChat = lazy(() => import('./pages/(main)/apps/chat/page'));
const ChatLayout = lazy(() => import('./pages/(main)/apps/chat/layout'));
const AppFiles = lazy(() => import('./pages/(main)/apps/files/page'));
const AppTaskList = lazy(() => import('./pages/(main)/apps/tasklist/page'));
const TaskListLayout = lazy(() => import('./pages/(main)/apps/tasklist/layout'));
const AppBlogDetail = lazy(() => import('./pages/(main)/apps/blog/detail/page'));
const AppBlogEdit = lazy(() => import('./pages/(main)/apps/blog/edit/page'));
const AppBlogList = lazy(() => import('./pages/(main)/apps/blog/list/page'));
const MailLayout = lazy(() => import('./pages/(main)/apps/(mail)/layout'));
const AppMailArchived = lazy(() => import('./pages/(main)/apps/(mail)/mail/archived/page'));
const AppMailCompose = lazy(() => import('./pages/(main)/apps/(mail)/mail/compose/page'));
const AppMailDetail = lazy(() => import('./pages/(main)/apps/(mail)/mail/detail/[mailId]/page'));
const AppMailImportant = lazy(() => import('./pages/(main)/apps/(mail)/mail/important/page'));
const AppMailInbox = lazy(() => import('./pages/(main)/apps/(mail)/mail/inbox/page'));
const AppMailSent = lazy(() => import('./pages/(main)/apps/(mail)/mail/sent/page'));
const AppMailSpam = lazy(() => import('./pages/(main)/apps/(mail)/mail/spam/page'));
const AppMailStarred = lazy(() => import('./pages/(main)/apps/(mail)/mail/starred/page'));
const AppMailTrash = lazy(() => import('./pages/(main)/apps/(mail)/mail/trash/page'));

// E-commerce
const EcommerceCheckoutForm = lazy(() => import('./pages/(main)/ecommerce/checkout-form/page'));
const EcommerceNewProduct = lazy(() => import('./pages/(main)/ecommerce/new-product/page'));
const EcommerceOrderHistory = lazy(() => import('./pages/(main)/ecommerce/order-history/page'));
const EcommerceOrderSummary = lazy(() => import('./pages/(main)/ecommerce/order-summary/page'));
const EcommerceProductList = lazy(() => import('./pages/(main)/ecommerce/product-list/page'));
const EcommerceProductOverview = lazy(() => import('./pages/(main)/ecommerce/product-overview/page'));
const EcommerceShoppingCart = lazy(() => import('./pages/(main)/ecommerce/shopping-cart/page'));

// Pages
const PagesContact = lazy(() => import('./pages/(main)/pages/contact/page'));
const PagesCrud = lazy(() => import('./pages/(main)/pages/crud/page'));
const PagesEmpty = lazy(() => import('./pages/(main)/pages/empty/page'));
const PagesHelp = lazy(() => import('./pages/(main)/pages/help/page'));
const PagesAccountingRules = lazy(() => import('./pages/(main)/pages/help/accounting-rules/page'));
const PagesInvoice = lazy(() => import('./pages/(main)/pages/invoice/page'));
const PagesTimeline = lazy(() => import('./pages/(main)/pages/timeline/page'));
const NotFound = lazy(() => import('./pages/(full-page)/pages/notfound/page'));

// Profile
const ProfileCreate = lazy(() => import('./pages/(main)/profile/create/page'));
const ProfileList = lazy(() => import('./pages/(main)/profile/list/page'));

// UI Kit
const ButtonDemo = lazy(() => import('./pages/(main)/uikit/button/page'));
const ChartDemo = lazy(() => import('./pages/(main)/uikit/charts/page'));
const FileDemo = lazy(() => import('./pages/(main)/uikit/file/page'));
const FloatLabelDemo = lazy(() => import('./pages/(main)/uikit/floatlabel/page'));
const FormLayoutDemo = lazy(() => import('./pages/(main)/uikit/formlayout/page'));
const InputDemo = lazy(() => import('./pages/(main)/uikit/input/page'));
const InvalidStateDemo = lazy(() => import('./pages/(main)/uikit/invalidstate/page'));
const ListDemo = lazy(() => import('./pages/(main)/uikit/list/page'));
const MediaDemo = lazy(() => import('./pages/(main)/uikit/media/page'));
const MenuDemo = lazy(() => import('./pages/(main)/uikit/menu/page'));
const MenuConfirmation = lazy(() => import('./pages/(main)/uikit/menu/confirmation/page'));
const MenuPayment = lazy(() => import('./pages/(main)/uikit/menu/payment/page'));
const MenuSeat = lazy(() => import('./pages/(main)/uikit/menu/seat/page'));
const MessageDemo = lazy(() => import('./pages/(main)/uikit/message/page'));
const MiscDemo = lazy(() => import('./pages/(main)/uikit/misc/page'));
const OverlayDemo = lazy(() => import('./pages/(main)/uikit/overlay/page'));
const PanelDemo = lazy(() => import('./pages/(main)/uikit/panel/page'));
const TableDemo = lazy(() => import('./pages/(main)/uikit/table/page'));
const TreeDemo = lazy(() => import('./pages/(main)/uikit/tree/page'));

// Utilities
const UtilitiesColors = lazy(() => import('./pages/(main)/utilities/colors/page'));
const UtilitiesIcons = lazy(() => import('./pages/(main)/utilities/icons/page'));
const UtilitiesPrimeFlex = lazy(() => import('./pages/(main)/utilities/primeflex/page'));
const UtilitiesFigma = lazy(() => import('./pages/(main)/utilities/figma/page'));

// Auth
const Login = lazy(() => import('./pages/(full-page)/auth/login/page'));
const Login2 = lazy(() => import('./pages/(full-page)/auth/login2/page'));
const Access = lazy(() => import('./pages/(full-page)/auth/access/page'));
const Access2 = lazy(() => import('./pages/(full-page)/auth/access2/page'));
const Error = lazy(() => import('./pages/(full-page)/auth/error/page'));
const Error2 = lazy(() => import('./pages/(full-page)/auth/error2/page'));
const ForgotPassword = lazy(() => import('./pages/(full-page)/auth/forgotpassword/page'));
const LockScreen = lazy(() => import('./pages/(full-page)/auth/lockscreen/page'));
const NewPassword = lazy(() => import('./pages/(full-page)/auth/newpassword/page'));
const Invite = lazy(() => import('./pages/(full-page)/auth/invite/page'));
const Register = lazy(() => import('./pages/(full-page)/auth/register/page'));
const Verification = lazy(() => import('./pages/(full-page)/auth/verification/page'));

// Landing
const LandingPage = lazy(() => import('./pages/(landing)/landing/page'));

const AppRoutes = [
    {
        path: '/',
        element: (
            <RequireAuth>
                <Layout />
            </RequireAuth>
        ),
        children: [
            { index: true, element: <DashboardRedirect /> },
            { path: 'dashboard', element: <DashboardRedirect /> },
            {
                path: 'admin',
                children: [
                    {
                        index: true,
                        element: (
                            <RequireSuperadmin>
                                <AdminDashboard />
                            </RequireSuperadmin>
                        )
                    },
                    {
                        path: 'tenants',
                        element: (
                            <RequireSuperadmin>
                                <AdminTenants />
                            </RequireSuperadmin>
                        )
                    },
                    {
                        path: 'users',
                        element: (
                            <RequireSuperadmin>
                                <AdminUsers />
                            </RequireSuperadmin>
                        )
                    }
                ]
            },
            {
                path: 'dashboards',
                children: [
                    { path: 'sales', element: <SalesDashboard /> },
                    { path: 'dashboardanalytics', element: <DashboardAnalytics /> },
                    { path: 'dashboardsaas', element: <DashboardSaaS /> }
                ]
            },
            {
                path: 'apps',
                children: [
                    { path: 'calendar', element: <AppCalendar /> },
                    { path: 'agency', element: <AppAgency /> },
                    { path: 'retail', element: <AppRetail /> },
                    { path: 'textile', element: <AppTextile /> },
                    { path: 'textile/purchase-orders', element: <TextilePurchaseOrdersPage /> },
                    { path: 'textile/fabric-inward', element: <TextileFabricInwardPage /> },
                    { path: 'textile/packing-slips', element: <TextilePackingSlipsPage /> },
                    { path: 'textile/delivery-challans', element: <TextileDeliveryChallansPage /> },
                    { path: 'textile/job-work-issue', element: <TextileJobWorkIssuePage /> },
                    { path: 'textile/daily-outward', element: <TextileDailyOutwardPage /> },
                    { path: 'textile/purchase-order-book', element: <TextilePurchaseOrderBookPage /> },
                    { path: 'textile/fabric-inward-book', element: <TextileFabricInwardBookPage /> },
                    { path: 'textile/packing-slip-book', element: <TextilePackingSlipBookPage /> },
                    { path: 'textile/delivery-challan-book', element: <TextileDeliveryChallanBookPage /> },
                    { path: 'textile/job-work-issue-book', element: <TextileJobWorkIssueBookPage /> },
                    { path: 'textile/daily-outward-book', element: <TextileDailyOutwardBookPage /> },
                    { path: 'textile/dispatch-book', element: <TextileDispatchBookPage /> },
                    { path: 'textile/fabric-statement', element: <TextileFabricStatementPage /> },
                    { path: 'textile/fabric-stock-statement', element: <TextileFabricStockStatementPage /> },
                    { path: 'textile/bill-book', element: <TextileBillBookPage /> },
                    { path: 'textile/gst-invoices', element: <Navigate to="/apps/textile/bill-book" replace /> },
                    { path: 'textile/gst-invoices/new', element: <BillingInvoiceFormPage /> },
                    { path: 'textile/gst-invoices/edit/:saleInvoiceId', element: <BillingInvoiceFormPage /> },
                    { path: 'restaurant', element: <AppRestaurant /> },
                    { path: 'wealth', element: <AppWealth /> },
                    { path: 'wealth/securities', element: <WealthSecuritiesPage /> },
                    { path: 'wealth/prices', element: <WealthPricesPage /> },
                    { path: 'wealth/corporate-actions', element: <WealthCorporateActionsPage /> },
                    { path: 'wealth/manual-transactions', element: <WealthManualTransactionsPage /> },
                    { path: 'wealth/investor-profiles', element: <WealthInvestorProfilesPage /> },
                    { path: 'wealth/demat-accounts', element: <WealthDematAccountsPage /> },
                    { path: 'wealth/import', element: <WealthImportPage /> },
                    { path: 'wealth/statements', element: <WealthStatementsPage /> },
                    { path: 'wealth/statements/pack', element: <WealthStatementPackPage /> },
                    { path: 'wealth/rollout', element: <WealthRolloutPage /> },
                    { path: 'wealth/dividends', element: <WealthDividendsPage /> },
                    { path: 'wealth/holdings', element: <WealthHoldingsPage /> },
                    { path: 'wealth/realized', element: <WealthRealizedPnlPage /> },
                    { path: 'wealth/transactions', element: <WealthTransactionsPage /> },
                    { path: 'wealth/ledger', element: <WealthCashLedgerPage /> },
                    { path: 'accounts', element: <AppLedger /> },
                    { path: 'accounts/ledger-groups', element: <AccountsLedgerGroupsPage /> },
                    { path: 'accounts/ledgers', element: <AccountsLedgerListPage /> },
                    { path: 'accounts/voucher-options', element: <AccountsVoucherOptionsPage /> },
                    { path: 'accounts/voucher-types', element: <Navigate to="/apps/accounts/voucher-options" replace /> },
                    { path: 'accounts/report-templates', element: <AccountsReportTemplatesPage /> },
                    { path: 'accounts/day-book', element: <AccountsDayBookPage /> },
                    { path: 'accounts/trial-balance', element: <AccountsTrialBalancePage /> },
                    { path: 'accounts/balance-sheet', element: <AccountsBalanceSheetPage /> },
                    { path: 'accounts/profit-loss', element: <AccountsProfitLossPage /> },
                    { path: 'accounts/ledger', element: <AccountsLedgerReportPage /> },
                    { path: 'accounts/ledger/month-wise-summary', element: <AccountsLedgerMonthWiseSummaryPage /> },
                    { path: 'accounts/voucher-entry', element: <AccountsVoucherEntryPage /> },
                    { path: 'accounts/payment-voucher', element: <AccountsCashExpenditureEntryPage /> },
                    { path: 'accounts/payment-vouchers', element: <AccountsCashExpenditureEntryPage /> },
                    { path: 'accounts/payment-vouchers/:mode', element: <AccountsCashExpenditureEntryPage /> },
                    { path: 'accounts/payment-vouchers/:mode/new', element: <AccountsCashExpenditureEntryPage /> },
                    { path: 'accounts/payment-vouchers/:mode/edit/:voucherNo', element: <AccountsCashExpenditureEntryPage /> },
                    { path: 'accounts/vouchers/voucher', element: <AccountsVoucherEnginePage /> },
                    { path: 'accounts/vouchers/voucher/:voucherType', element: <AccountsVoucherEnginePage /> },
                    { path: 'accounts/vouchers/voucher/:voucherType/:mode', element: <AccountsVoucherEnginePage /> },
                    { path: 'accounts/vouchers/voucher/:voucherType/:mode/new', element: <AccountsVoucherEnginePage /> },
                    {
                        path: 'accounts/vouchers/voucher/:voucherType/:mode/edit/:voucherNo',
                        element: <AccountsVoucherEnginePage />
                    },
                    { path: 'accounts/bank-cash-deposit', element: <AccountsBankCashDepositPage /> },
                    { path: 'accounts/bank-cheque-issue', element: <AccountsBankChequeIssuePage /> },
                    { path: 'accounts/cheque-book-issue', element: <AccountsChequeBookIssuePage /> },
                    { path: 'accounts/ledger-reconciliation', element: <AccountsLedgerReconciliationPage /> },
                    { path: 'accounts/stock-in-hand', element: <AccountsStockInHandPage /> },
                    { path: 'accounts/depreciation', element: <AccountsDepreciationPage /> },
                    { path: 'accounts/audit', element: <AccountsAuditPage /> },
                    { path: 'accounts/book-printing', element: <AccountsBookPrintingPage /> },
                    { path: 'accounts/accounts-reports', element: <AccountsAccountsReportsPage /> },
                    { path: 'accounts/invoice-rollover', element: <AccountsInvoiceRolloverPage /> },
                    { path: 'accounts/migration-monitor', element: <AccountsMigrationMonitorPage /> },
                    { path: 'accounts/company-profile', element: <AccountsCompanyProfilePage /> },
                    { path: 'accounts/options', element: <AccountsOptionsPage /> },
                    { path: 'accounts/change-session', element: <AccountsChangeSessionPage /> },
                    { path: 'accounts/:section', element: <AccountsSectionPage /> },
                    { path: 'inventory', element: <AppInventory /> },
                    { path: 'inventory/:section', element: <InventorySectionPage /> },
                    { path: 'media', element: <AppMedia /> },
                    { path: 'whatsapp', element: <AppWhatsapp /> },
                    { path: 'email', element: <AppEmail /> },
                    { path: 'sms', element: <AppSms /> },
                    { path: 'crm', element: <AppCrm /> },
                    { path: 'website', element: <AppWebsite /> },
                    { path: 'ecommerce', element: <AppEcommerce /> },
                    { path: 'mobileapp', element: <AppMobileApp /> },
                    { path: 'giftcoupon', element: <AppGiftCoupon /> },
                    { path: 'adcampaigns', element: <AppAdCampaigns /> },
                    { path: 'marketplace', element: <AppMarketplace /> },
                    { path: 'billing', element: <AppBilling /> },
                    { path: 'billing/sales-book', element: <BillingSalesBookPage /> },
                    { path: 'billing/estimate-book', element: <BillingEstimateBookPage /> },
                    { path: 'billing/sales-return-book', element: <BillingSalesReturnBookPage /> },
                    { path: 'billing/purchase-book', element: <BillingPurchaseBookPage /> },
                    { path: 'billing/purchase-return-book', element: <BillingPurchaseReturnBookPage /> },
                    { path: 'billing/sale-book', element: <BillingInvoiceFormPage /> },
                    { path: 'billing/sale-book/new', element: <BillingInvoiceFormPage /> },
                    { path: 'billing/sale-book/edit/:saleInvoiceId', element: <BillingInvoiceFormPage /> },
                    { path: 'billing/invoice-form', element: <BillingInvoiceFormPage /> },
                    { path: 'billing/invoice-form/new', element: <BillingInvoiceFormPage /> },
                    { path: 'billing/invoice-form/edit/:saleInvoiceId', element: <BillingInvoiceFormPage /> },
                    { path: 'billing/money-receipt-cash', element: <BillingMoneyReceiptCashPage /> },
                    { path: 'billing/money-receipt-bank', element: <BillingMoneyReceiptBankPage /> },
                    {
                        path: 'billing/receipt-book-issue',
                        element: <BillingReceiptBookIssuePage />
                    },
                    {
                        path: 'billing/money-receipt-manual-book-issue',
                        element: <Navigate to="/apps/billing/receipt-book-issue" replace />
                    },
                    { path: 'billing/:section', element: <BillingSectionPage /> },
                    { path: 'gst', element: <AppGst /> },
                    { path: 'gst/:section', element: <GstSectionPage /> },
                    {
                        path: 'chat',
                        element: <ChatLayout />,
                        children: [{ index: true, element: <AppChat /> }]
                    },
                    { path: 'files', element: <AppFiles /> },
                    {
                        path: 'tasklist',
                        element: <TaskListLayout />,
                        children: [{ index: true, element: <AppTaskList /> }]
                    },
                    {
                        path: 'blog',
                        children: [
                            { path: 'detail', element: <AppBlogDetail /> },
                            { path: 'edit', element: <AppBlogEdit /> },
                            { path: 'list', element: <AppBlogList /> }
                        ]
                    },
                    {
                        path: 'mail',
                        element: <MailLayout />,
                        children: [
                            { path: 'archived', element: <AppMailArchived /> },
                            { path: 'compose', element: <AppMailCompose /> },
                            { path: 'detail/:mailId', element: <AppMailDetail /> },
                            { path: 'important', element: <AppMailImportant /> },
                            { path: 'inbox', element: <AppMailInbox /> },
                            { path: 'sent', element: <AppMailSent /> },
                            { path: 'spam', element: <AppMailSpam /> },
                            { path: 'starred', element: <AppMailStarred /> },
                            { path: 'trash', element: <AppMailTrash /> }
                        ]
                    }
                ]
            },
            {
                path: 'ecommerce',
                children: [
                    { path: 'checkout-form', element: <EcommerceCheckoutForm /> },
                    { path: 'new-product', element: <EcommerceNewProduct /> },
                    { path: 'order-history', element: <EcommerceOrderHistory /> },
                    { path: 'order-summary', element: <EcommerceOrderSummary /> },
                    { path: 'product-list', element: <EcommerceProductList /> },
                    { path: 'product-overview', element: <EcommerceProductOverview /> },
                    { path: 'shopping-cart', element: <EcommerceShoppingCart /> }
                ]
            },
            {
                path: 'pages',
                children: [
                    { path: 'contact', element: <PagesContact /> },
                    { path: 'crud', element: <PagesCrud /> },
                    { path: 'empty', element: <PagesEmpty /> },
                    { path: 'help', element: <PagesHelp /> },
                    { path: 'help/accounting-rules', element: <PagesAccountingRules /> },
                    { path: 'invoice', element: <PagesInvoice /> },
                    { path: 'timeline', element: <PagesTimeline /> },
                    { path: 'notfound', element: <NotFound /> }
                ]
            },
            {
                path: 'profile',
                children: [
                    { path: 'create', element: <ProfileCreate /> },
                    { path: 'list', element: <ProfileList /> }
                ]
            },
            {
                path: 'uikit',
                children: [
                    { path: 'button', element: <ButtonDemo /> },
                    { path: 'charts', element: <ChartDemo /> },
                    { path: 'file', element: <FileDemo /> },
                    { path: 'floatlabel', element: <FloatLabelDemo /> },
                    { path: 'formlayout', element: <FormLayoutDemo /> },
                    { path: 'input', element: <InputDemo /> },
                    { path: 'invalidstate', element: <InvalidStateDemo /> },
                    { path: 'list', element: <ListDemo /> },
                    { path: 'media', element: <MediaDemo /> },
                    {
                        path: 'menu',
                        children: [
                            { index: true, element: <MenuDemo /> },
                            { path: 'confirmation', element: <MenuConfirmation /> },
                            { path: 'payment', element: <MenuPayment /> },
                            { path: 'seat', element: <MenuSeat /> }
                        ]
                    },
                    { path: 'message', element: <MessageDemo /> },
                    { path: 'misc', element: <MiscDemo /> },
                    { path: 'overlay', element: <OverlayDemo /> },
                    { path: 'panel', element: <PanelDemo /> },
                    { path: 'table', element: <TableDemo /> },
                    { path: 'tree', element: <TreeDemo /> }
                ]
            },
            {
                path: 'utilities',
                children: [
                    { path: 'colors', element: <UtilitiesColors /> },
                    { path: 'icons', element: <UtilitiesIcons /> },
                    { path: 'primeflex', element: <UtilitiesPrimeFlex /> },
                    { path: 'figma', element: <UtilitiesFigma /> }
                ]
            },
            { path: 'blocks', element: <BlocksDemo /> },
            { path: 'documentation', element: <Documentation /> }
        ]
    },
    {
        path: 'auth',
        element: <FullPageLayout />,
        children: [
            { path: 'login', element: <Login /> },
            { path: 'login2', element: <Login2 /> },
            { path: 'access', element: <Access /> },
            { path: 'access2', element: <Access2 /> },
            { path: 'error', element: <Error /> },
            { path: 'error2', element: <Error2 /> },
            { path: 'forgotpassword', element: <ForgotPassword /> },
            { path: 'lockscreen', element: <LockScreen /> },
            { path: 'newpassword', element: <NewPassword /> },
            { path: 'invite', element: <Invite /> },
            { path: 'register', element: <Register /> },
            { path: 'verification', element: <Verification /> }
        ]
    },
    {
        path: 'landing',
        element: <LandingLayout />,
        children: [{ index: true, element: <LandingPage /> }]
    },
    {
        path: 'notfound',
        element: <NotFound />
    },
    { path: '*', element: <Navigate to="/notfound" replace /> }
];

export default AppRoutes; 











