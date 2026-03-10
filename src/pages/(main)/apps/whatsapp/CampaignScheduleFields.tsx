import React from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import AppInput from '@/components/AppInput';
import {
  CAMPAIGN_SCHEDULE_WEEKDAY_OPTIONS,
  serializeCampaignScheduleForm,
  type CampaignScheduleFormState
} from './campaignSchedule';

type CampaignScheduleFieldsProps = {
  value: CampaignScheduleFormState;
  disabled?: boolean;
  onChange: (value: CampaignScheduleFormState) => void;
};

export function CampaignScheduleFields({ value, disabled, onChange }: CampaignScheduleFieldsProps) {
  const preview = React.useMemo(() => {
    try {
      return serializeCampaignScheduleForm(value);
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid schedule extras JSON.';
    }
  }, [value]);

  const previewIsError = React.useMemo(() => {
    try {
      serializeCampaignScheduleForm(value);
      return false;
    } catch {
      return true;
    }
  }, [value]);

  const update = (patch: Partial<CampaignScheduleFormState>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
      <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
        <div className="text-900 font-medium">Automation Schedule</div>
        <div className="flex align-items-center gap-2">
          <InputSwitch
            inputId="whatsapp-campaign-schedule-enabled"
            checked={value.enabled}
            onChange={(event) => update({ enabled: !!event.value })}
            disabled={disabled}
          />
          <label htmlFor="whatsapp-campaign-schedule-enabled">Automation enabled</label>
        </div>
      </div>
      <div className="flex align-items-center gap-2">
        <InputSwitch
          inputId="whatsapp-campaign-schedule-send-now"
          checked={value.sendNow}
          onChange={(event) => update({ sendNow: !!event.value })}
          disabled={disabled}
        />
        <label htmlFor="whatsapp-campaign-schedule-send-now">Send generated runs immediately</label>
      </div>
      <div className="grid">
        <div className="col-12 md:col-6">
          <label htmlFor="whatsapp-campaign-schedule-timezone" className="block text-700 mb-2">Timezone</label>
          <AppInput
            inputId="whatsapp-campaign-schedule-timezone"
            value={value.timezone}
            onChange={(event) => update({ timezone: event.target.value })}
            placeholder="Asia/Kolkata"
            disabled={disabled}
          />
        </div>
        <div className="col-12 md:col-6">
          <label htmlFor="whatsapp-campaign-schedule-runat" className="block text-700 mb-2">Run at</label>
          <AppInput
            inputId="whatsapp-campaign-schedule-runat"
            value={value.runAt}
            onChange={(event) => update({ runAt: event.target.value })}
            placeholder="09:00"
            disabled={disabled}
          />
          <div className="text-500 text-xs mt-1">24-hour local time in HH:MM format.</div>
        </div>
      </div>
      <div>
        <label htmlFor="whatsapp-campaign-schedule-days" className="block text-700 mb-2">Days of week</label>
        <MultiSelect
          inputId="whatsapp-campaign-schedule-days"
          value={value.daysOfWeek}
          options={CAMPAIGN_SCHEDULE_WEEKDAY_OPTIONS}
          optionLabel="label"
          optionValue="value"
          onChange={(event) => update({ daysOfWeek: Array.isArray(event.value) ? event.value.map((entry) => String(entry)) : [] })}
          placeholder="Every day"
          display="chip"
          className="w-full"
          disabled={disabled}
        />
        <div className="text-500 text-xs mt-1">Leave empty to run every day after the configured time.</div>
      </div>
      <div>
        <label htmlFor="whatsapp-campaign-schedule-extras" className="block text-700 mb-2">Advanced schedule JSON</label>
        <InputTextarea
          id="whatsapp-campaign-schedule-extras"
          value={value.extrasJson}
          onChange={(event) => update({ extrasJson: event.target.value })}
          rows={5}
          className="w-full font-mono text-sm"
          disabled={disabled}
        />
        <div className="text-500 text-xs mt-1">Optional extra keys for future automation rules. Structured fields still control the standard schedule keys.</div>
      </div>
      {previewIsError ? <Message severity="warn" text={preview} /> : null}
      <div>
        <label htmlFor="whatsapp-campaign-schedule-preview" className="block text-700 mb-2">Effective schedule JSON</label>
        <InputTextarea
          id="whatsapp-campaign-schedule-preview"
          value={previewIsError ? '' : preview}
          rows={6}
          className="w-full font-mono text-sm"
          readOnly
        />
      </div>
    </div>
  );
}
