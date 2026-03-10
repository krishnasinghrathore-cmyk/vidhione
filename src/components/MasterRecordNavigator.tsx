import React from 'react';
import { Button } from 'primereact/button';
import type { MasterDialogDirection } from '@/lib/masterDialogNavigation';

type MasterRecordNavigatorProps = {
  index: number;
  total: number;
  onNavigate: (direction: MasterDialogDirection) => void;
  disabled?: boolean;
};

export default function MasterRecordNavigator({
  index,
  total,
  onNavigate,
  disabled = false
}: MasterRecordNavigatorProps) {
  if (index < 0 || total <= 0) return null;

  const canGoFirst = index > 0;
  const canGoPrevious = index > 0;
  const canGoNext = index < total - 1;
  const canGoLast = index < total - 1;

  return (
    <div className="flex align-items-center gap-2">
      <Button
        icon="pi pi-angle-double-left"
        className="p-button-text p-button-sm p-button-icon-only"
        aria-label="First record"
        tooltip="First"
        tooltipOptions={{ position: 'top' }}
        onClick={() => onNavigate('first')}
        disabled={disabled || !canGoFirst}
      />
      <Button
        icon="pi pi-chevron-left"
        className="p-button-text p-button-sm p-button-icon-only"
        aria-label="Previous record"
        tooltip="Previous"
        tooltipOptions={{ position: 'top' }}
        onClick={() => onNavigate('previous')}
        disabled={disabled || !canGoPrevious}
      />
      <span className="text-600 text-sm">{`${index + 1} / ${total}`}</span>
      <Button
        icon="pi pi-chevron-right"
        className="p-button-text p-button-sm p-button-icon-only"
        aria-label="Next record"
        tooltip="Next"
        tooltipOptions={{ position: 'top' }}
        onClick={() => onNavigate('next')}
        disabled={disabled || !canGoNext}
      />
      <Button
        icon="pi pi-angle-double-right"
        className="p-button-text p-button-sm p-button-icon-only"
        aria-label="Last record"
        tooltip="Last"
        tooltipOptions={{ position: 'top' }}
        onClick={() => onNavigate('last')}
        disabled={disabled || !canGoLast}
      />
    </div>
  );
}
