import React from 'react';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import type {
  WhatsAppAutomationExecution,
  WhatsAppAutomationExecutionItem
} from '@/lib/whatsapp/api';

type CampaignAutomationHistoryPanelProps = {
  executions: WhatsAppAutomationExecution[];
  items: WhatsAppAutomationExecutionItem[];
  loading: boolean;
  itemLoading: boolean;
  selectedExecutionId: string | null;
  selectedCampaignKey?: string | null;
  onOpenExecution: (executionId: string) => void;
};

const executionStatusSeverity = (status: string) => {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'failed') return 'danger';
  if (normalized === 'completed_with_errors') return 'warning';
  return 'success';
};

const decisionStatusSeverity = (status: string) => {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'failed') return 'danger';
  if (normalized === 'skipped') return 'warning';
  if (normalized === 'generated') return 'success';
  if (normalized === 'dry_run') return 'info';
  return undefined;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export function CampaignAutomationHistoryPanel({
  executions,
  items,
  loading,
  itemLoading,
  selectedExecutionId,
  selectedCampaignKey,
  onOpenExecution,
}: CampaignAutomationHistoryPanelProps) {
  const filteredItems = React.useMemo(
    () =>
      selectedCampaignKey
        ? items.filter((item) => item.campaignKey === selectedCampaignKey)
        : items,
    [items, selectedCampaignKey]
  );

  return (
    <div className="grid">
      <div className="col-12 xl:col-5">
        <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
          <div className="text-900 font-medium">Automation History</div>
          <div className="text-600 text-sm">Recent scheduler sweeps for this tenant.</div>
          {loading ? <Message severity="info" text="Loading automation history..." /> : null}
          {!loading && executions.length === 0 ? (
            <Message severity="info" text="No automation executions have been recorded yet for this tenant." />
          ) : null}
          {!loading && executions.length > 0
            ? executions.map((execution) => (
                <button
                  key={execution.id}
                  type="button"
                  className="p-0 border-none bg-transparent text-left cursor-pointer"
                  onClick={() => onOpenExecution(execution.id)}
                  disabled={itemLoading}
                >
                  <div className={`surface-border border-1 border-round p-3 ${selectedExecutionId === execution.id ? 'border-primary' : ''}`}>
                    <div className="flex align-items-center justify-content-between gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-900">{formatTimestamp(execution.startedAt)}</span>
                      <div className="flex align-items-center gap-2 flex-wrap justify-content-end">
                        {execution.dryRun ? <Tag value="Dry Run" severity="info" /> : null}
                        <Tag value={execution.status} severity={executionStatusSeverity(execution.status)} />
                      </div>
                    </div>
                    <div className="text-600 text-sm mb-1">
                      scanned {execution.campaignScannedCount} | due {execution.dueCampaignCount} | generated {execution.generatedRunCount}
                    </div>
                    <div className="text-500 text-xs">
                      dispatch sent {execution.dispatchSentCount} | failed {execution.dispatchFailedCount} | skipped {execution.dispatchSkippedCount}
                    </div>
                    {execution.error ? <div className="text-500 text-xs mt-2">error: {execution.error}</div> : null}
                  </div>
                </button>
              ))
            : null}
        </div>
      </div>
      <div className="col-12 xl:col-7">
        <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
          <div>
            <div className="text-900 font-medium">Scheduler Decisions</div>
            <div className="text-600 text-sm">
              {selectedCampaignKey ? `Filtered to ${selectedCampaignKey}.` : 'All campaign decisions in the selected scheduler sweep.'}
            </div>
          </div>
          {itemLoading ? <Message severity="info" text="Loading scheduler decisions..." /> : null}
          {!itemLoading && filteredItems.length === 0 ? (
            <Message severity="info" text="Select an automation execution to inspect campaign-level scheduler decisions." />
          ) : null}
          {!itemLoading && filteredItems.length > 0
            ? filteredItems.map((item) => (
                <div key={item.id} className="surface-border border-1 border-round p-3 flex flex-column gap-2">
                  <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div>
                      <div className="font-medium text-900">{item.campaignKey ?? 'campaign'}</div>
                      <div className="text-600 text-sm">
                        run date {item.runDate ?? '-'}
                        {item.timezone ? ` | ${item.timezone}` : ''}
                        {item.scheduledAt ? ` | scheduled ${formatTimestamp(item.scheduledAt)}` : ''}
                      </div>
                    </div>
                    <div className="flex align-items-center gap-2 flex-wrap justify-content-end">
                      {item.sendNow ? <Tag value="Send Now" severity="info" /> : null}
                      <Tag value={item.status} severity={decisionStatusSeverity(item.status)} />
                    </div>
                  </div>
                  <div className="text-500 text-xs">
                    {item.reason ? `reason: ${item.reason}` : 'reason: -'}
                    {item.runId ? ` | run ${item.runId}` : ''}
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
