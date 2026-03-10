'use client';

import React from 'react';
import { TextileDocumentPage } from '../documents/TextileDocumentPage';
import { TEXTILE_DELIVERY_CHALLAN_SCREEN } from '../documents/config';

export default function TextileDeliveryChallansPage() {
    return <TextileDocumentPage screen={TEXTILE_DELIVERY_CHALLAN_SCREEN} />;
}
