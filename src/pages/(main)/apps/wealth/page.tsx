'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient, wealthGraphqlUrl } from '@/lib/wealthApolloClient';
import { extractWealthSegment, stripWealthMetaTags } from '@/lib/wealthNotes';
import { toYmdOrEmpty, toYmdOrNull } from '@/lib/date';

type Account = { id: string; name: string; code?: string | null };
type Security = { id: string; isin?: string | null; symbol?: string | null; name: string };

const ACCOUNTS_QUERY = gql`
  query Accounts {
    accounts {
      id
      name
      code
    }
  }
`;

const SECURITIES_QUERY = gql`
  query Securities {
    securities {
      id
      isin
      symbol
      name
    }
  }
`;

const UPSERT_ACCOUNT = gql`
  mutation UpsertAccount($name: String!, $code: String) {
    upsertAccount(name: $name, code: $code) {
      id
      name
      code
    }
  }
`;

const UPSERT_SECURITY = gql`
  mutation UpsertSecurity($isin: String, $symbol: String, $name: String!) {
    upsertSecurity(isin: $isin, symbol: $symbol, name: $name) {
      id
      isin
      symbol
      name
    }
  }
`;

const UPSERT_PRICE = gql`
  mutation UpsertPrice($securityId: String!, $pdate: String!, $closePrice: String!) {
    upsertPrice(securityId: $securityId, pdate: $pdate, closePrice: $closePrice) {
      securityId
      pdate
      closePrice
    }
  }
`;

const UPSERT_CORPORATE_ACTION = gql`
  mutation UpsertCorporateAction(
    $securityId: String!
    $actionDate: String!
    $actionType: String!
    $ratio: String
    $price: String
    $notes: String
  ) {
    upsertCorporateAction(
      securityId: $securityId
      actionDate: $actionDate
      actionType: $actionType
      ratio: $ratio
      price: $price
      notes: $notes
    ) {
      id
      securityId
      actionDate
      actionType
    }
  }
`;

const UPSERT_TRANSACTION = gql`
  mutation UpsertTransaction(
    $accountId: String!
    $securityId: String!
    $tdate: String!
    $ttype: String!
    $segment: String
    $invoiceDate: String
    $qty: String!
    $price: String!
    $fees: String
    $notes: String
    $sourceDoc: String
  ) {
    upsertTransaction(
      accountId: $accountId
      securityId: $securityId
      tdate: $tdate
      ttype: $ttype
      segment: $segment
      invoiceDate: $invoiceDate
      qty: $qty
      price: $price
      fees: $fees
      notes: $notes
      sourceDoc: $sourceDoc
    ) {
      id
      tdate
      ttype
      segment
      invoiceDate
      qty
      price
      fees
    }
  }
`;

const PRICES_QUERY = gql`
  query PricesList($limit: Int) {
    pricesList(limit: $limit) {
      securityId
      pdate
      closePrice
    }
  }
`;

const PRICE_AT_QUERY = gql`
  query PriceAt($securityId: String!, $asOfDate: String!) {
    pricesList(securityId: $securityId, asOfDate: $asOfDate, limit: 1) {
      securityId
      pdate
      closePrice
    }
  }
`;

const ACTIONS_QUERY = gql`
  query CorporateActionsList($limit: Int) {
    corporateActionsList(limit: $limit) {
      id
      securityId
      actionDate
      actionType
      ratio
      price
      notes
    }
  }
`;

const TX_QUERY = gql`
  query TransactionsPage($limit: Int, $offset: Int) {
    transactionsPage(limit: $limit, offset: $offset) {
      items {
        id
        tdate
        ttype
        segment
        invoiceDate
        qty
        price
        fees
        notes
        sourceDoc
        accountId
        securityId
      }
      meta {
        total
        limit
        offset
        hasMore
        nextOffset
      }
    }
  }
`;

const ACTION_OPTIONS = [
  { label: 'Split', value: 'SPLIT' },
  { label: 'Bonus', value: 'BONUS' },
  { label: 'Rights', value: 'RIGHTS' },
  { label: 'Dividend', value: 'DIVIDEND' },
  { label: 'Capital Reduction', value: 'CAPITAL_REDUCTION' },
  { label: 'Expense', value: 'EXPENSE' }
];

const TX_TYPES = [
  { label: 'BUY', value: 'BUY' },
  { label: 'SELL', value: 'SELL' },
  { label: 'DIVIDEND', value: 'DIVIDEND' },
  { label: 'SPLIT', value: 'SPLIT' },
  { label: 'BONUS', value: 'BONUS' },
  { label: 'RIGHTS', value: 'RIGHTS' },
  { label: 'EXPENSE', value: 'EXPENSE' }
];

const TX_SEGMENTS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'SLBM', value: 'SLBM' },
  { label: 'F&O', value: 'FAO' }
];

const isoDate = (value: Date | null) => toYmdOrEmpty(value);
const formatAmount = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export default function WealthAppPage() {
  const toastRef = useRef<Toast>(null);
  const wealthClient = wealthApolloClient;

  const { data: accountData, loading: accountsLoading, error: accountsError, refetch: refetchAccounts } = useQuery(ACCOUNTS_QUERY, {
    client: wealthClient
  });
  const { data: securityData, loading: securitiesLoading, error: securitiesError, refetch: refetchSecurities } = useQuery(SECURITIES_QUERY, {
    client: wealthClient
  });
  const { data: pricesData, loading: pricesLoading, error: pricesError, refetch: refetchPrices } = useQuery(PRICES_QUERY, {
    client: wealthClient,
    variables: { limit: 10 }
  });
  const { data: actionsData, loading: actionsLoading, error: actionsError, refetch: refetchActions } = useQuery(ACTIONS_QUERY, {
    client: wealthClient,
    variables: { limit: 10 }
  });
  const [txLimit] = useState(10);
  const [txOffset, setTxOffset] = useState(0);
  const { data: txData, loading: txLoading, error: txQueryError, refetch: refetchTx } = useQuery(TX_QUERY, {
    client: wealthClient,
    variables: { limit: txLimit, offset: txOffset }
  });

  const [saveAccount] = useMutation(UPSERT_ACCOUNT, { client: wealthClient });
  const [saveSecurity] = useMutation(UPSERT_SECURITY, { client: wealthClient });
  const [savePrice] = useMutation(UPSERT_PRICE, { client: wealthClient });
  const [saveCorporateAction] = useMutation(UPSERT_CORPORATE_ACTION, { client: wealthClient });
  const [saveTransaction] = useMutation(UPSERT_TRANSACTION, { client: wealthClient });

  const [accountName, setAccountName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  const [securityForm, setSecurityForm] = useState({ isin: '', symbol: '', name: '' });
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [savingSecurity, setSavingSecurity] = useState(false);

  const [priceForm, setPriceForm] = useState<{ securityId: string; pdate: Date | null; closePrice: number | null }>({
    securityId: '',
    pdate: new Date(),
    closePrice: null
  });
  const [priceError, setPriceError] = useState<string | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);

  const [actionForm, setActionForm] = useState<{
    securityId: string;
    actionType: string;
    actionDate: Date | null;
    ratio: number | null;
    price: number | null;
    notes: string;
  }>({
    securityId: '',
    actionType: '',
    actionDate: new Date(),
    ratio: null,
    price: null,
    notes: ''
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  const [fmvSecurityId, setFmvSecurityId] = useState<string>('');
  const [fmvDate, setFmvDate] = useState<Date | null>(new Date());
  const [fmvQty, setFmvQty] = useState<number | null>(1);

  const [txForm, setTxForm] = useState<{
    accountId: string;
    securityId: string;
    tdate: Date | null;
    segment: string;
    ttype: string;
    invoiceDate: Date | null;
    qty: number | null;
    price: number | null;
    fees: number | null;
    notes: string;
    sourceDoc: string;
  }>({
    accountId: '',
    securityId: '',
    tdate: new Date(),
    segment: 'CASH',
    ttype: 'BUY',
    invoiceDate: null,
    qty: null,
    price: null,
    fees: 0,
    notes: '',
    sourceDoc: ''
  });
  const [txFormError, setTxFormError] = useState<string | null>(null);
  const [savingTx, setSavingTx] = useState(false);

  const accounts = accountData?.accounts ?? [];
  const securities = securityData?.securities ?? [];
  const recentPrices = pricesData?.pricesList ?? [];
  const recentActions = actionsData?.corporateActionsList ?? [];
  const txPage = txData?.transactionsPage;
  const txRows = txPage?.items ?? [];

  const accountOptions = useMemo(
    () => accounts.map((a: Account) => ({ label: a.code ? `${a.name} (${a.code})` : a.name, value: a.id })),
    [accounts]
  );
  const securityOptions = useMemo(
    () => securities.map((s: Security) => ({ label: s.symbol || s.name, value: s.id })),
    [securities]
  );
  const securityById = useMemo(() => {
    const map: Record<string, Security> = {};
    securities.forEach((s: Security) => {
      map[s.id] = s;
    });
    return map;
  }, [securities]);
  const accountById = useMemo(() => {
    const map: Record<string, Account> = {};
    accounts.forEach((a: Account) => {
      map[a.id] = a;
    });
    return map;
  }, [accounts]);

  const fmvAsOfDate = toYmdOrNull(fmvDate);
  const { data: fmvPriceData, loading: fmvLoading, error: fmvError } = useQuery(PRICE_AT_QUERY, {
    client: wealthClient,
    skip: !fmvSecurityId || !fmvAsOfDate,
    variables: { securityId: fmvSecurityId, asOfDate: fmvAsOfDate ?? '' }
  });

  const txGrossAmount =
    txForm.qty != null && txForm.price != null ? txForm.qty * txForm.price : null;
  const txFeesAmount = txForm.fees ?? 0;
  const txNetAmount =
    txGrossAmount == null
      ? null
      : txGrossAmount +
        (txForm.ttype === 'SELL' || txForm.ttype === 'DIVIDEND'
          ? -txFeesAmount
          : txFeesAmount);
  const txFeesLabel =
    txForm.ttype === 'DIVIDEND' ? 'TDS' : txForm.ttype === 'BUY' || txForm.ttype === 'SELL' ? 'Brokerage / Fees' : 'Fees';
  const txNetLabel =
    txForm.ttype === 'SELL'
      ? 'Net Proceeds'
      : txForm.ttype === 'BUY'
        ? 'Cost of Purchase'
        : 'Net Amount';

  const actionRatioLabel =
    actionForm.actionType === 'SPLIT'
      ? 'Factor (share multiplier). FV split 10→2 enter 5; merge 2→10 enter 0.2'
      : actionForm.actionType === 'BONUS'
        ? 'Bonus ratio (bonus shares per share). 1:1 enter 1; 1:2 enter 0.5'
        : actionForm.actionType === 'RIGHTS'
          ? 'Rights ratio (rights shares per share). 1:5 enter 0.2'
          : actionForm.actionType === 'CAPITAL_REDUCTION'
            ? 'Factor (remaining share multiplier). Example 1:2 reduction enter 0.5'
            : 'Ratio';

  const actionPriceLabel =
    actionForm.actionType === 'RIGHTS'
      ? 'Rights issue price'
      : actionForm.actionType === 'DIVIDEND'
        ? 'Dividend per share'
        : 'Cash / price';

  const fmvRow = fmvPriceData?.pricesList?.[0] ?? null;
  const fmvClose = fmvRow?.closePrice != null ? Number(fmvRow.closePrice) : NaN;
  const fmvClosePrice = Number.isFinite(fmvClose) ? fmvClose : null;
  const fmvQtyValue = fmvQty != null && Number.isFinite(fmvQty) ? fmvQty : null;
  const fmvValue = fmvClosePrice != null && fmvQtyValue != null ? fmvClosePrice * fmvQtyValue : null;

  useEffect(() => {
    if (!priceForm.securityId && securityOptions.length) {
      setPriceForm((prev) => ({ ...prev, securityId: prev.securityId || securityOptions[0].value }));
    }
    if (!actionForm.securityId && securityOptions.length) {
      setActionForm((prev) => ({ ...prev, securityId: prev.securityId || securityOptions[0].value }));
    }
    if (!txForm.securityId && securityOptions.length) {
      setTxForm((prev) => ({ ...prev, securityId: prev.securityId || securityOptions[0].value }));
    }
    if (!fmvSecurityId && securityOptions.length) {
      setFmvSecurityId(securityOptions[0].value);
    }
    if (!txForm.accountId && accountOptions.length) {
      setTxForm((prev) => ({ ...prev, accountId: prev.accountId || accountOptions[0].value }));
    }
  }, [accountOptions, securityOptions]);

  const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) =>
    toastRef.current?.show({ severity, summary, detail, life: 3500 });

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setAccountError('Account name is required');
      showToast('warn', 'Account name is required');
      return;
    }
    setAccountError(null);
    setSavingAccount(true);
    try {
      await saveAccount({
        variables: {
          name: accountName.trim(),
          code: accountCode.trim() || null
        }
      });
      setAccountName('');
      setAccountCode('');
      await refetchAccounts();
      showToast('success', 'Account saved');
    } catch (err: any) {
      showToast('error', 'Unable to save account', err.message);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityForm.name.trim()) {
      setSecurityError('Security name is required');
      showToast('warn', 'Security name is required');
      return;
    }
    setSecurityError(null);
    setSavingSecurity(true);
    try {
      await saveSecurity({
        variables: {
          isin: securityForm.isin.trim() || null,
          symbol: securityForm.symbol.trim() || null,
          name: securityForm.name.trim()
        }
      });
      setSecurityForm({ isin: '', symbol: '', name: '' });
      await refetchSecurities();
      showToast('success', 'Security saved');
    } catch (err: any) {
      showToast('error', 'Unable to save security', err.message);
    } finally {
      setSavingSecurity(false);
    }
  };

  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceForm.securityId || !priceForm.pdate || priceForm.closePrice === null) {
      setPriceError('Select security, date, and close price');
      showToast('warn', 'Select security, date, and close price');
      return;
    }
    if (priceForm.closePrice < 0) {
      setPriceError('Close price cannot be negative');
      showToast('warn', 'Close price cannot be negative');
      return;
    }
    setPriceError(null);
    setSavingPrice(true);
    try {
      await savePrice({
        variables: {
          securityId: priceForm.securityId,
          pdate: isoDate(priceForm.pdate),
          closePrice: priceForm.closePrice.toString()
        }
      });
      setPriceForm((prev) => ({ ...prev, closePrice: null }));
      await refetchPrices();
      showToast('success', 'Price saved');
    } catch (err: any) {
      showToast('error', 'Unable to save price', err.message);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionForm.securityId || !actionForm.actionDate || !actionForm.actionType) {
      setActionError('Security, type, and action date are required');
      showToast('warn', 'Security, type, and action date are required');
      return;
    }
    if (['SPLIT', 'BONUS', 'RIGHTS', 'CAPITAL_REDUCTION'].includes(actionForm.actionType) && (actionForm.ratio == null || actionForm.ratio === 0)) {
      setActionError('Ratio is required for Split/Bonus/Rights/Capital Reduction');
      showToast('warn', 'Ratio is required for Split/Bonus/Rights/Capital Reduction');
      return;
    }
    setActionError(null);
    setSavingAction(true);
    try {
      await saveCorporateAction({
        variables: {
          securityId: actionForm.securityId,
          actionDate: isoDate(actionForm.actionDate),
          actionType: actionForm.actionType,
          ratio: actionForm.ratio != null ? actionForm.ratio.toString() : null,
          price: actionForm.price != null ? actionForm.price.toString() : null,
          notes: actionForm.notes?.trim() || null
        }
      });
      setActionForm((prev) => ({ ...prev, ratio: null, price: null, notes: '' }));
      await refetchActions();
      showToast('success', 'Corporate action saved');
    } catch (err: any) {
      showToast('error', 'Unable to save corporate action', err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.accountId || !txForm.securityId || !txForm.tdate || !txForm.ttype || txForm.qty === null || txForm.price === null) {
      setTxFormError('Account, security, date, type, qty, and price are required');
      showToast('warn', 'Account, security, date, type, qty, and price are required');
      return;
    }
    if (txForm.qty <= 0) {
      setTxFormError('Quantity must be greater than zero');
      showToast('warn', 'Quantity must be greater than zero');
      return;
    }
    if (txForm.price < 0) {
      setTxFormError('Price cannot be negative');
      showToast('warn', 'Price cannot be negative');
      return;
    }
    setTxFormError(null);
    setSavingTx(true);
    try {
      const cleanedNotes = stripWealthMetaTags(txForm.notes.trim());

      await saveTransaction({
        variables: {
          accountId: txForm.accountId,
          securityId: txForm.securityId,
          tdate: isoDate(txForm.tdate),
          ttype: txForm.ttype,
          segment: txForm.segment,
          invoiceDate: toYmdOrNull(txForm.invoiceDate),
          qty: txForm.qty.toString(),
          price: txForm.price.toString(),
          fees: txForm.fees != null ? txForm.fees.toString() : '0',
          notes: cleanedNotes || null,
          sourceDoc: txForm.sourceDoc?.trim() || null
        }
      });
      setTxForm((prev) => ({ ...prev, invoiceDate: null, qty: null, price: null, fees: 0, notes: '', sourceDoc: '' }));
      await refetchTx({ limit: txLimit, offset: 0 });
      setTxOffset(0);
      showToast('success', 'Transaction saved');
    } catch (err: any) {
      showToast('error', 'Unable to save transaction', err.message);
    } finally {
      setSavingTx(false);
    }
  };

  return (
    <div className="grid">
      <Toast ref={toastRef} />
      <div className="col-12 mb-2" id="admin">
        <div className="flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h2 className="m-0">Wealth Admin</h2>
            <p className="mt-2 mb-0 text-600">
              Capture master data and manual entries for the wealth engine. Styling follows the shared app theme; backend connects to
              wealth_db (same credentials as agency). Point this page to the wealth GraphQL via VITE_WEALTH_GRAPHQL_URL ({wealthGraphqlUrl}).
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Tag value={`${accounts.length} accounts`} severity="info" />
            <Tag value={`${securities.length} securities`} severity="warning" />
          </div>
        </div>
        {(accountsError?.message.includes('Cannot query field') ||
          securitiesError?.message.includes('Cannot query field') ||
          pricesError?.message.includes('Cannot query field') ||
          actionsError?.message.includes('Cannot query field') ||
          txQueryError?.message.includes('Cannot query field')) && (
          <div className="mt-2 p-3 border-round surface-50 border-1 border-yellow-200 text-700">
            This usually means the page is connected to the wrong GraphQL endpoint. Set{' '}
            <code>VITE_WEALTH_GRAPHQL_URL</code> to <code>{wealthGraphqlUrl}</code> (must end with <code>/wealth/graphql</code>) and restart
            the frontend.
          </div>
        )}
        {accountsError && <p className="text-red-500 mt-2 mb-0">Accounts error: {accountsError.message}</p>}
        {securitiesError && <p className="text-red-500 mt-1 mb-0">Securities error: {securitiesError.message}</p>}
        {pricesError && <p className="text-red-500 mt-1 mb-0">Prices error: {pricesError.message}</p>}
        {actionsError && <p className="text-red-500 mt-1 mb-0">Corporate actions error: {actionsError.message}</p>}
        {txQueryError && <p className="text-red-500 mt-1 mb-0">Transactions error: {txQueryError.message}</p>}
      </div>

      <div className="col-12 lg:col-6">
        <Card title="Accounts" subTitle="Trading / demat accounts">
          <form className="flex flex-column gap-3" onSubmit={handleAccountSubmit}>
            <div className="grid">
              <div className="col-12 md:col-7 flex flex-column gap-1">
                <label className="font-medium">Account name</label>
                <InputText
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Zerodha Main"
                  disabled={savingAccount}
                />
              </div>
              <div className="col-12 md:col-5 flex flex-column gap-1">
                <label className="font-medium">Trading code / Account no</label>
                <InputText
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  placeholder="e.g. ABC123"
                  disabled={savingAccount}
                />
              </div>
            </div>
            {accountError && <small className="p-error">{accountError}</small>}
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
              <Button type="submit" label={savingAccount ? 'Saving…' : 'Save account'} icon="pi pi-check" disabled={savingAccount} />
              <div className="flex gap-2 flex-wrap">
                {accounts.map((a: Account) => (
                  <Tag key={a.id} value={a.code ? `${a.name} (${a.code})` : a.name} />
                ))}
              </div>
            </div>
          </form>
        </Card>
      </div>

      <div className="col-12 lg:col-6">
        <Card title="Securities" subTitle="ISIN / symbol master">
          <form className="flex flex-column gap-3" onSubmit={handleSecuritySubmit}>
            <div className="grid">
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">ISIN</label>
                <InputText
                  value={securityForm.isin}
                  onChange={(e) => setSecurityForm((prev) => ({ ...prev, isin: e.target.value }))}
                  placeholder="INE002A01018"
                  disabled={savingSecurity}
                />
              </div>
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Symbol</label>
                <InputText
                  value={securityForm.symbol}
                  onChange={(e) => setSecurityForm((prev) => ({ ...prev, symbol: e.target.value }))}
                  placeholder="RELIANCE"
                  disabled={savingSecurity}
                />
              </div>
            </div>
            <div className="flex flex-column gap-1">
              <label className="font-medium">
                Name <span className="p-error">*</span>
              </label>
              <InputText
                value={securityForm.name}
                onChange={(e) => setSecurityForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Security name"
                disabled={savingSecurity}
              />
            </div>
            {securityError && <small className="p-error">{securityError}</small>}
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
              <Button type="submit" label={savingSecurity ? 'Saving…' : 'Save security'} icon="pi pi-check" disabled={savingSecurity} />
              <div className="flex gap-2 flex-wrap text-600 text-sm">
                {securities.slice(0, 3).map((s: Security) => (
                  <Tag
                    key={s.id}
                    value={s.symbol || s.name}
                    severity="success"
                    tooltip={s.name}
                    pt={{ root: { style: { maxWidth: '160px' } } }}
                  />
                ))}
                {securities.length > 3 && <span className="text-600">+{securities.length - 3} more</span>}
              </div>
            </div>
          </form>
        </Card>
      </div>

      <div className="col-12 lg:col-4" id="prices">
        <Card title="Closing Price" subTitle="Daily close for a security">
          <form className="flex flex-column gap-3" onSubmit={handlePriceSubmit}>
            <div className="flex flex-column gap-1">
              <label className="font-medium">Security</label>
              <AppDropdown
                value={priceForm.securityId}
                options={securityOptions}
                onChange={(e) => setPriceForm((prev) => ({ ...prev, securityId: e.value }))}
                placeholder={securitiesLoading ? 'Loading…' : 'Select security'}
                filter
                disabled={savingPrice || securityOptions.length === 0}
              />
            </div>
            <div className="flex gap-2">
              <span className="flex-1 flex flex-column gap-1">
                <label className="font-medium">Price date</label>
                <AppDateInput value={priceForm.pdate} onChange={(value) => setPriceForm((prev) => ({ ...prev, pdate: value }))} disabled={savingPrice} />
              </span>
              <span className="flex-1 flex flex-column gap-1">
                <label className="font-medium">Close price</label>
                <InputNumber
                  value={priceForm.closePrice ?? undefined}
                  onValueChange={(e) => setPriceForm((prev) => ({ ...prev, closePrice: e.value ?? null }))}
                  mode="decimal"
                  minFractionDigits={2}
                  disabled={savingPrice}
                  inputClassName="w-full"
                  className="w-full"
                />
              </span>
            </div>
            {priceError && <small className="p-error">{priceError}</small>}
            <Button type="submit" label={savingPrice ? 'Saving…' : 'Save price'} icon="pi pi-check" disabled={savingPrice} />
          </form>
        </Card>
      </div>

      <div className="col-12 lg:col-4" id="actions">
        <Card title="Corporate Action" subTitle="Split / bonus / dividend">
          <form className="flex flex-column gap-3" onSubmit={handleActionSubmit}>
            <div className="flex flex-column gap-1">
              <label className="font-medium">Security</label>
              <AppDropdown
                value={actionForm.securityId}
                options={securityOptions}
                onChange={(e) => setActionForm((prev) => ({ ...prev, securityId: e.value }))}
                placeholder={securitiesLoading ? 'Loading…' : 'Select security'}
                filter
                disabled={savingAction || securityOptions.length === 0}
              />
            </div>
            <div className="grid">
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Action type</label>
                <AppDropdown
                  value={actionForm.actionType}
                  options={ACTION_OPTIONS}
                  onChange={(e) => setActionForm((prev) => ({ ...prev, actionType: e.value }))}
                  placeholder="Choose type"
                  disabled={savingAction}
                />
              </div>
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Action date</label>
                <AppDateInput value={actionForm.actionDate} onChange={(value) => setActionForm((prev) => ({ ...prev, actionDate: value }))} disabled={savingAction} />
              </div>
            </div>
            <div className="grid">
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">{actionRatioLabel}</label>
                <InputNumber
                  value={actionForm.ratio ?? undefined}
                  onValueChange={(e) => setActionForm((prev) => ({ ...prev, ratio: e.value ?? null }))}
                  mode="decimal"
                  minFractionDigits={2}
                  inputClassName="w-full"
                  className="w-full"
                  disabled={savingAction}
                />
              </div>
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">{actionPriceLabel}</label>
                <InputNumber
                  value={actionForm.price ?? undefined}
                  onValueChange={(e) => setActionForm((prev) => ({ ...prev, price: e.value ?? null }))}
                  mode="decimal"
                  minFractionDigits={2}
                  inputClassName="w-full"
                  className="w-full"
                  disabled={savingAction}
                />
              </div>
            </div>
            <div className="flex flex-column gap-1">
              <label className="font-medium">Notes</label>
              <InputText
                value={actionForm.notes}
                onChange={(e) => setActionForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Reference or source"
                disabled={savingAction}
              />
            </div>
            {actionError && <small className="p-error">{actionError}</small>}
            <Button type="submit" label={savingAction ? 'Saving…' : 'Save action'} icon="pi pi-check" disabled={savingAction} />
          </form>
        </Card>
      </div>

      <div className="col-12 lg:col-4" id="transactions">
        <Card title="Manual Transaction" subTitle="Direct entry without CSV import">
          <form className="flex flex-column gap-3" onSubmit={handleTxSubmit}>
            <div className="grid">
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Account</label>
                <AppDropdown
                  value={txForm.accountId}
                  options={accountOptions}
                  onChange={(e) => setTxForm((prev) => ({ ...prev, accountId: e.value }))}
                  placeholder={accountsLoading ? 'Loading…' : 'Select account'}
                  disabled={savingTx || accountOptions.length === 0}
                />
              </div>
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Security</label>
                <AppDropdown
                  value={txForm.securityId}
                  options={securityOptions}
                  onChange={(e) => setTxForm((prev) => ({ ...prev, securityId: e.value }))}
                  placeholder={securitiesLoading ? 'Loading…' : 'Select security'}
                  filter
                  disabled={savingTx || securityOptions.length === 0}
                />
              </div>
            </div>
            <div className="grid">
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Date</label>
                <AppDateInput value={txForm.tdate} onChange={(value) => setTxForm((prev) => ({ ...prev, tdate: value }))} disabled={savingTx} />
              </div>
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Type</label>
                <AppDropdown
                  value={txForm.ttype}
                  options={TX_TYPES}
                  onChange={(e) => setTxForm((prev) => ({ ...prev, ttype: e.value }))}
                  placeholder="Select type"
                  disabled={savingTx}
                />
              </div>
            </div>
            <div className="flex flex-column gap-1">
              <label className="font-medium">Segment</label>
              <AppDropdown
                value={txForm.segment}
                options={TX_SEGMENTS}
                onChange={(e) => setTxForm((prev) => ({ ...prev, segment: e.value }))}
                placeholder="Select segment"
                disabled={savingTx}
              />
              <small className="text-600">
                Stored in the <code>transactions.segment</code> column when available; legacy <code>[SEG:...]</code> tags in Notes are supported for older data.
              </small>
            </div>
            <div className="grid">
              <div className="col-12 md:col-4 flex flex-column gap-1">
                <label className="font-medium">Qty</label>
                <InputNumber
                  value={txForm.qty ?? undefined}
                  onValueChange={(e) => setTxForm((prev) => ({ ...prev, qty: e.value ?? null }))}
                  mode="decimal"
                  minFractionDigits={2}
                  inputClassName="w-full"
                  className="w-full"
                  disabled={savingTx}
                />
              </div>
              <div className="col-12 md:col-4 flex flex-column gap-1">
                <label className="font-medium">Price</label>
                <InputNumber
                  value={txForm.price ?? undefined}
                  onValueChange={(e) => setTxForm((prev) => ({ ...prev, price: e.value ?? null }))}
                  mode="decimal"
                  minFractionDigits={2}
                  inputClassName="w-full"
                  className="w-full"
                  disabled={savingTx}
                />
              </div>
              <div className="col-12 md:col-4 flex flex-column gap-1">
                <label className="font-medium">{txFeesLabel}</label>
                <InputNumber
                  value={txForm.fees ?? undefined}
                  onValueChange={(e) => setTxForm((prev) => ({ ...prev, fees: e.value ?? null }))}
                  mode="decimal"
                  minFractionDigits={2}
                  inputClassName="w-full"
                  className="w-full"
                  disabled={savingTx}
                />
              </div>
            </div>
            <div className="flex flex-column gap-1">
              <label className="font-medium">Notes</label>
              <InputText
                value={txForm.notes}
                onChange={(e) => setTxForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Broker reference, batch, etc."
                disabled={savingTx}
              />
            </div>
            <div className="grid">
              <div className="col-12 md:col-4 flex flex-column gap-1">
                <label className="font-medium">GST Invoice / Contract Note No</label>
                <InputText
                  value={txForm.sourceDoc}
                  onChange={(e) => setTxForm((prev) => ({ ...prev, sourceDoc: e.target.value }))}
                  placeholder="e.g. INV-123 / CN-2024-001"
                  disabled={savingTx}
                />
              </div>
              <div className="col-12 md:col-4 flex flex-column gap-1">
                <label className="font-medium">Invoice Date</label>
                <AppDateInput value={txForm.invoiceDate} onChange={(value) => setTxForm((prev) => ({ ...prev, invoiceDate: value }))} disabled={savingTx} />
              </div>
              <div className="col-12 md:col-4 flex flex-column gap-1">
                <label className="font-medium">Summary</label>
                <div className="surface-100 border-round p-2 text-600 text-sm">
                  <div className="flex justify-content-between">
                    <span>Gross Amount</span>
                    <span>{formatAmount(txGrossAmount)}</span>
                  </div>
                  <div className="flex justify-content-between">
                    <span>{txFeesLabel}</span>
                    <span>{formatAmount(txFeesAmount)}</span>
                  </div>
                  <div className="flex justify-content-between font-medium">
                    <span>{txNetLabel}</span>
                    <span>{formatAmount(txNetAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
            {txFormError && <small className="p-error">{txFormError}</small>}
            <Button type="submit" label={savingTx ? 'Saving…' : 'Save transaction'} icon="pi pi-check" disabled={savingTx} />
          </form>
        </Card>
      </div>

      <div className="col-12 lg:col-4">
        <Card
          title="Recent Prices"
          subTitle="Latest close price by security"
          headerClassName="flex align-items-center justify-content-between"
        >
          {pricesLoading ? (
            <p className="m-0 text-600">Loading…</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full small-table">
                <thead>
                  <tr>
                    <th className="text-left">Security</th>
                    <th className="text-left">Date</th>
                    <th className="text-right">Close</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPrices.map((row: any) => {
                    const sec = securityById[row.securityId];
                    return (
                      <tr key={`${row.securityId}-${row.pdate}`}>
                        <td>{sec?.symbol || sec?.name || row.securityId}</td>
                        <td>{row.pdate}</td>
                        <td className="text-right">{row.closePrice}</td>
                      </tr>
                    );
                  })}
                  {!recentPrices.length && (
                    <tr>
                      <td colSpan={3} className="text-center text-600">
                        No prices yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="col-12 lg:col-4" id="fmv">
        <Card title="Fair Market Value (FMV)" subTitle="Calculated from closing prices">
          <div className="flex flex-column gap-3">
            <div className="flex flex-column gap-1">
              <label className="font-medium">Security</label>
              <AppDropdown
                value={fmvSecurityId}
                options={securityOptions}
                onChange={(e) => setFmvSecurityId(e.value)}
                placeholder={securitiesLoading ? 'Loading…' : 'Select security'}
                filter
                disabled={securityOptions.length === 0}
              />
            </div>

            <div className="grid">
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">FMV date</label>
                <AppDateInput value={fmvDate} onChange={(value) => setFmvDate(value)} />
              </div>
              <div className="col-12 md:col-6 flex flex-column gap-1">
                <label className="font-medium">Qty</label>
                <InputNumber
                  value={fmvQty ?? undefined}
                  onValueChange={(e) => setFmvQty(e.value ?? null)}
                  mode="decimal"
                  minFractionDigits={0}
                  maxFractionDigits={6}
                  inputClassName="w-full"
                  className="w-full"
                />
              </div>
            </div>

            {fmvError && <small className="p-error">{fmvError.message}</small>}
            {fmvLoading && <small className="text-600">Loading price…</small>}

            <div className="surface-100 border-round p-2 text-600 text-sm">
              <div className="flex justify-content-between">
                <span>Price date</span>
                <span>{fmvRow?.pdate ?? '-'}</span>
              </div>
              <div className="flex justify-content-between">
                <span>Close price</span>
                <span>{formatAmount(fmvClosePrice)}</span>
              </div>
              <div className="flex justify-content-between font-medium">
                <span>FMV</span>
                <span>{formatAmount(fmvValue)}</span>
              </div>
            </div>

            {!fmvLoading && fmvSecurityId && fmvAsOfDate && !fmvRow && (
              <div className="text-600 text-sm">
                No closing price found on/before <code>{fmvAsOfDate}</code>. Add it in <code>Closing Price</code>.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="col-12 lg:col-4">
        <Card title="Corporate Actions" subTitle="Recent splits/bonus/dividend">
          {actionsLoading ? (
            <p className="m-0 text-600">Loading…</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full small-table">
                <thead>
                  <tr>
                    <th className="text-left">Security</th>
                    <th className="text-left">Type</th>
                    <th className="text-left">Date</th>
                    <th className="text-right">Ratio</th>
                    <th className="text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActions.map((row: any) => {
                    const sec = securityById[row.securityId];
                    return (
                      <tr key={row.id}>
                        <td>{sec?.symbol || sec?.name || row.securityId}</td>
                        <td>{row.actionType}</td>
                        <td>{row.actionDate}</td>
                        <td className="text-right">{row.ratio ?? '-'}</td>
                        <td className="text-right">{row.price ?? '-'}</td>
                      </tr>
                    );
                  })}
                  {!recentActions.length && (
                    <tr>
                      <td colSpan={5} className="text-center text-600">
                        No corporate actions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="col-12 lg:col-4">
        <Card
          title="Recent Transactions"
          subTitle="Last 10 manual/imported rows"
          footer={
            txPage?.meta ? (
              <div className="flex align-items-center justify-content-between">
                <span className="text-600 text-sm">
                  Offset {txPage.meta.offset} / {txPage.meta.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    label="Prev"
                    outlined
                    disabled={txPage.meta.offset <= 0 || txLoading}
                    onClick={() =>
                      setTxOffset(Math.max(0, (txPage.meta.offset || 0) - (txPage.meta.limit || txLimit)))
                    }
                  />
                  <Button
                    size="small"
                    label="Next"
                    outlined
                    disabled={!txPage.meta.hasMore || txLoading}
                    onClick={() => setTxOffset(txPage.meta.nextOffset ?? txPage.meta.offset)}
                  />
                  <Button size="small" label="Refresh" onClick={() => refetchTx({ limit: txLimit, offset: txOffset })} />
                </div>
              </div>
            ) : null
          }
        >
          {txLoading ? (
            <p className="m-0 text-600">Loading…</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full small-table">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Type</th>
                    <th className="text-left">Seg</th>
                    <th className="text-left">Security</th>
                    <th className="text-left">Account</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {txRows.map((row: any) => {
                    const sec = row.securityId ? securityById[row.securityId] : null;
                    const acc = row.accountId ? accountById[row.accountId] : null;
                    const seg = row.segment || extractWealthSegment(row.notes) || 'CASH';
                    const accountLabel = acc ? (acc.code ? `${acc.name} (${acc.code})` : acc.name) : null;
                    return (
                      <tr key={row.id}>
                        <td>{row.tdate}</td>
                        <td>{row.ttype}</td>
                        <td>{seg}</td>
                        <td>{sec?.symbol || sec?.name || row.securityId || '-'}</td>
                        <td>{accountLabel || row.accountId || '-'}</td>
                        <td className="text-right">{row.qty}</td>
                        <td className="text-right">{row.price}</td>
                        <td className="text-right">{row.fees}</td>
                      </tr>
                    );
                  })}
                  {!txRows.length && (
                    <tr>
                      <td colSpan={8} className="text-center text-600">
                        No transactions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
