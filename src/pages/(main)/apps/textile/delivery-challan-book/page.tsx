'use client';

import React from 'react';
import { TextileBookScreen } from '../books/TextileBookScreen';
import { TEXTILE_DELIVERY_CHALLAN_BOOK_SCREEN } from '../books/config';

export default function TextileDeliveryChallanBookPage() {
    return <TextileBookScreen screen={TEXTILE_DELIVERY_CHALLAN_BOOK_SCREEN} />;
}