'use client';

import React from 'react';
import { TextileBookScreen } from '../books/TextileBookScreen';
import { TEXTILE_PURCHASE_ORDER_BOOK_SCREEN } from '../books/config';

export default function TextilePurchaseOrderBookPage() {
    return <TextileBookScreen screen={TEXTILE_PURCHASE_ORDER_BOOK_SCREEN} />;
}