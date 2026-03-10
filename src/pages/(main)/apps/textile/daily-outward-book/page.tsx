'use client';

import React from 'react';
import { TextileBookScreen } from '../books/TextileBookScreen';
import { TEXTILE_DAILY_OUTWARD_BOOK_SCREEN } from '../books/config';

export default function TextileDailyOutwardBookPage() {
    return <TextileBookScreen screen={TEXTILE_DAILY_OUTWARD_BOOK_SCREEN} />;
}