export type AccountingCountryCode = 'IN' | 'US' | 'GB' | 'AE' | 'SG' | 'AU' | 'CA';

type AccountingCurrencyPreset = {
    locale: string;
    currencyCode: string;
    fractionDigits: number;
};

const ACCOUNTING_CURRENCY_PRESETS: Record<AccountingCountryCode, AccountingCurrencyPreset> = {
    IN: { locale: 'en-IN', currencyCode: 'INR', fractionDigits: 2 },
    US: { locale: 'en-US', currencyCode: 'USD', fractionDigits: 2 },
    GB: { locale: 'en-GB', currencyCode: 'GBP', fractionDigits: 2 },
    AE: { locale: 'en-AE', currencyCode: 'AED', fractionDigits: 2 },
    SG: { locale: 'en-SG', currencyCode: 'SGD', fractionDigits: 2 },
    AU: { locale: 'en-AU', currencyCode: 'AUD', fractionDigits: 2 },
    CA: { locale: 'en-CA', currencyCode: 'CAD', fractionDigits: 2 }
};

const DEFAULT_ACCOUNTING_COUNTRY_CODE: AccountingCountryCode = 'IN';

const isAccountingCountryCode = (value: string): value is AccountingCountryCode =>
    Object.prototype.hasOwnProperty.call(ACCOUNTING_CURRENCY_PRESETS, value);

const resolveAccountingCountryCode = (): AccountingCountryCode => {
    const configured = (import.meta.env.VITE_ACCOUNTING_COUNTRY_CODE ?? '').trim().toUpperCase();
    if (isAccountingCountryCode(configured)) return configured;
    return DEFAULT_ACCOUNTING_COUNTRY_CODE;
};

const activeCountryCode = resolveAccountingCountryCode();
const activePreset = ACCOUNTING_CURRENCY_PRESETS[activeCountryCode];

export const ACCOUNTING_AMOUNT_CONFIG = {
    countryCode: activeCountryCode,
    locale: activePreset.locale,
    currencyCode: activePreset.currencyCode,
    minimumFractionDigits: activePreset.fractionDigits,
    maximumFractionDigits: activePreset.fractionDigits
} as const;
