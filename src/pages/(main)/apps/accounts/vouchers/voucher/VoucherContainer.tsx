'use client';
// @refresh reset
import React from 'react';
import { VoucherView } from './VoucherView';
import { useVoucherState } from './useVoucherState';
import type { PaymentMode, PaymentVoucherRouteView } from './types';
import type { VoucherProfile } from './voucherProfiles';

type VoucherContainerProps = {
    profile: VoucherProfile;
    mode: PaymentMode;
    routeView: PaymentVoucherRouteView;
    routeVoucherNo: string | null;
};

export function VoucherContainer({ profile, mode, routeView, routeVoucherNo }: VoucherContainerProps) {
    const viewProps = useVoucherState(profile, mode, routeView, routeVoucherNo);
    return <VoucherView {...viewProps} />;
}
