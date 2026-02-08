import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PaymentVoucherContainer } from './PaymentVoucherContainer';
import type { PaymentMode, PaymentVoucherRouteView } from './types';
import { getStoredPaymentMode, normalizePaymentMode } from './utils';

const DEFAULT_PAYMENT_MODE: PaymentMode = 'bank';

export default function AccountsPaymentVoucherRoute() {
    const { mode, voucherNo } = useParams<{ mode?: string; voucherNo?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const routeMode = normalizePaymentMode(mode ?? null);
    const routeView: PaymentVoucherRouteView = React.useMemo(() => {
        if (/\/payment-vouchers\/(?:cash|bank)\/new\/?$/.test(location.pathname)) {
            return 'new';
        }
        if (/\/payment-vouchers\/(?:cash|bank)\/edit\/[^/]+\/?$/.test(location.pathname)) {
            return 'edit';
        }
        return 'register';
    }, [location.pathname]);

    React.useEffect(() => {
        if (routeMode) return;
        const restoredMode = getStoredPaymentMode() ?? DEFAULT_PAYMENT_MODE;
        navigate(`/apps/accounts/payment-vouchers/${restoredMode}`, { replace: true });
    }, [navigate, routeMode]);

    if (!routeMode) return null;

    return <PaymentVoucherContainer mode={routeMode} routeView={routeView} routeVoucherNo={voucherNo ?? null} />;
}
