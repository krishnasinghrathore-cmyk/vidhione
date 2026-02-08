'use client';
import React from 'react';
import { PaymentVoucherView } from './PaymentVoucherView';
import { usePaymentVoucherState } from './usePaymentVoucherState';
import type { PaymentMode, PaymentVoucherRouteView } from './types';

type PaymentVoucherContainerProps = {
    mode: PaymentMode;
    routeView: PaymentVoucherRouteView;
    routeVoucherNo: string | null;
};

export function PaymentVoucherContainer({ mode, routeView, routeVoucherNo }: PaymentVoucherContainerProps) {
    const viewProps = usePaymentVoucherState(mode, routeView, routeVoucherNo);
    return <PaymentVoucherView {...viewProps} />;
}
