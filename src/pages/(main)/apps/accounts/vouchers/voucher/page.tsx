import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { VoucherContainer } from './VoucherContainer';
import type { PaymentVoucherRouteView } from './types';
import { getStoredPaymentMode, normalizePaymentMode } from './utils';
import { getVoucherAllowedModes, getVoucherProfile, isVoucherModeSupported, resolveVoucherMode } from './voucherProfiles';

const DEFAULT_VOUCHER_PROFILE_KEY = 'payment';

const resolveRouteView = (pathname: string): PaymentVoucherRouteView => {
    if (/\/vouchers\/voucher\/[^/]+\/[^/]+\/new\/?$/.test(pathname)) {
        return 'new';
    }
    if (/\/vouchers\/voucher\/[^/]+\/[^/]+\/edit\/[^/]+\/?$/.test(pathname)) {
        return 'edit';
    }
    return 'register';
};

export default function AccountsVoucherRoute() {
    const { voucherType, mode, voucherNo } = useParams<{ voucherType?: string; mode?: string; voucherNo?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const voucherProfile = React.useMemo(() => {
        const profileKey = (voucherType ?? DEFAULT_VOUCHER_PROFILE_KEY).toLowerCase();
        try {
            return getVoucherProfile(profileKey);
        } catch {
            return null;
        }
    }, [voucherType]);
    const routeMode = normalizePaymentMode(mode ?? null);
    const routeView = React.useMemo(() => resolveRouteView(location.pathname), [location.pathname]);
    const allowedModes = React.useMemo(() => (voucherProfile ? getVoucherAllowedModes(voucherProfile) : []), [voucherProfile]);
    const singleSupportedMode = allowedModes.length === 1 ? allowedModes[0] : null;
    const effectiveMode = React.useMemo(() => {
        if (!voucherProfile) return null;
        if (isVoucherModeSupported(voucherProfile, routeMode)) return routeMode;
        if (routeView === 'register' && singleSupportedMode) return singleSupportedMode;
        return null;
    }, [routeMode, routeView, singleSupportedMode, voucherProfile]);

    React.useEffect(() => {
        if (!voucherProfile) {
            const fallbackProfile = getVoucherProfile(DEFAULT_VOUCHER_PROFILE_KEY);
            const fallbackStoredMode = getStoredPaymentMode(fallbackProfile.storagePrefix);
            const fallbackMode = resolveVoucherMode(fallbackProfile, fallbackStoredMode);
            navigate(`/apps/accounts/vouchers/voucher/${fallbackProfile.key}/${fallbackMode}`, { replace: true });
            return;
        }
        if (routeView === 'register' && singleSupportedMode) {
            if (mode) {
                navigate(`/apps/accounts/vouchers/voucher/${voucherProfile.key}`, { replace: true });
            }
            return;
        }
        if (isVoucherModeSupported(voucherProfile, routeMode)) return;

        const restoredMode = getStoredPaymentMode(voucherProfile.storagePrefix);
        const resolvedMode = resolveVoucherMode(voucherProfile, restoredMode);
        const fallbackMode = allowedModes.includes(resolvedMode) ? resolvedMode : voucherProfile.defaultMode;
        navigate(`/apps/accounts/vouchers/voucher/${voucherProfile.key}/${fallbackMode}`, { replace: true });
    }, [allowedModes, mode, navigate, routeMode, routeView, singleSupportedMode, voucherProfile]);

    if (!voucherProfile || !effectiveMode) return null;

    return (
        <VoucherContainer
            profile={voucherProfile}
            mode={effectiveMode}
            routeView={routeView}
            routeVoucherNo={voucherNo ?? null}
        />
    );
}
