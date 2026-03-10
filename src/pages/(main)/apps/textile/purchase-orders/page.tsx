'use client';

import React from 'react';
import { TextileDocumentPage } from '../documents/TextileDocumentPage';
import { TEXTILE_PURCHASE_ORDER_SCREEN } from '../documents/config';

export default function TextilePurchaseOrdersPage() {
    return <TextileDocumentPage screen={TEXTILE_PURCHASE_ORDER_SCREEN} />;
}
