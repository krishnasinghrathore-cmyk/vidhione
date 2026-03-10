'use client';

import React from 'react';
import { TextileDocumentPage } from '../documents/TextileDocumentPage';
import { TEXTILE_PACKING_SLIP_SCREEN } from '../documents/config';

export default function TextilePackingSlipsPage() {
    return <TextileDocumentPage screen={TEXTILE_PACKING_SLIP_SCREEN} />;
}
