'use client';

import React from 'react';
import { TextileBookScreen } from '../books/TextileBookScreen';
import { TEXTILE_PACKING_SLIP_BOOK_SCREEN } from '../books/config';

export default function TextilePackingSlipBookPage() {
    return <TextileBookScreen screen={TEXTILE_PACKING_SLIP_BOOK_SCREEN} />;
}