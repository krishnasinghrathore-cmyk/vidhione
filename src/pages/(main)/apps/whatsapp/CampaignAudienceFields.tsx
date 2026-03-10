import React from 'react';
import { Chips } from 'primereact/chips';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { serializeCampaignAudienceForm, type CampaignAudienceFormState } from './campaignAudience';

type CampaignAudienceFieldsProps = {
  value: CampaignAudienceFormState;
  triggerType: string;
  sourceEntityType: string;
  disabled?: boolean;
  onChange: (value: CampaignAudienceFormState) => void;
};

const normalizeChipList = (value: unknown) =>
  Array.isArray(value) ? value.map((entry) => String(entry)).filter((entry) => entry.trim().length > 0) : [];

const getAudienceHint = (triggerType: string, sourceEntityType: string) => {
  const normalizedTrigger = triggerType.trim().toLowerCase();
  const normalizedSource = sourceEntityType.trim().toLowerCase();

  if (normalizedTrigger === 'broadcast' && normalizedSource === 'ledger') {
    return 'Ledger broadcast campaigns require either Allow all or one or more ledger IDs.';
  }
  if (normalizedTrigger === 'broadcast') {
    return 'Broadcast campaigns require Allow all or at least one audience filter.';
  }
  return 'Leave all filters empty to target every CRM party whose event date matches the run date.';
};

export function CampaignAudienceFields({
  value,
  triggerType,
  sourceEntityType,
  disabled,
  onChange,
}: CampaignAudienceFieldsProps) {
  const preview = React.useMemo(() => {
    try {
      return serializeCampaignAudienceForm(value);
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid audience extras JSON.';
    }
  }, [value]);

  const previewIsError = React.useMemo(() => {
    try {
      serializeCampaignAudienceForm(value);
      return false;
    } catch {
      return true;
    }
  }, [value]);

  const showCrmFilters = sourceEntityType === 'crm_party';

  const update = (patch: Partial<CampaignAudienceFormState>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
      <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
        <div className="text-900 font-medium">Audience Filters</div>
        <div className="flex align-items-center gap-2">
          <InputSwitch
            inputId="whatsapp-campaign-audience-allow-all"
            checked={value.allowAll}
            onChange={(event) => update({ allowAll: !!event.value })}
            disabled={disabled}
          />
          <label htmlFor="whatsapp-campaign-audience-allow-all">Allow all matching records</label>
        </div>
      </div>
      <div className="text-600 text-sm">{getAudienceHint(triggerType, sourceEntityType)}</div>
      <div>
        <label htmlFor="whatsapp-campaign-audience-ledger-ids" className="block text-700 mb-2">Ledger IDs</label>
        <Chips
          inputId="whatsapp-campaign-audience-ledger-ids"
          value={value.ledgerIds}
          onChange={(event) => update({ ledgerIds: normalizeChipList(event.value) })}
          separator="," 
          className="w-full"
          disabled={disabled}
        />
        <div className="text-500 text-xs mt-1">Optional explicit ledger filters. Use IDs from ledger/customer records.</div>
      </div>
      {showCrmFilters ? (
        <>
          <div>
            <label htmlFor="whatsapp-campaign-audience-party-types" className="block text-700 mb-2">Party types</label>
            <Chips
              inputId="whatsapp-campaign-audience-party-types"
              value={value.partyTypes}
              onChange={(event) => update({ partyTypes: normalizeChipList(event.value) })}
              separator="," 
              className="w-full"
              disabled={disabled}
            />
            <div className="text-500 text-xs mt-1">Examples: `customer`, `vendor`, `prospect`.</div>
          </div>
          <div>
            <label htmlFor="whatsapp-campaign-audience-membership-tiers" className="block text-700 mb-2">Membership tiers</label>
            <Chips
              inputId="whatsapp-campaign-audience-membership-tiers"
              value={value.membershipTiers}
              onChange={(event) => update({ membershipTiers: normalizeChipList(event.value) })}
              separator="," 
              className="w-full"
              disabled={disabled}
            />
            <div className="text-500 text-xs mt-1">Examples: `standard`, `gold`, `vip`.</div>
          </div>
          <div>
            <label htmlFor="whatsapp-campaign-audience-tags" className="block text-700 mb-2">Any matching tags</label>
            <Chips
              inputId="whatsapp-campaign-audience-tags"
              value={value.tagAny}
              onChange={(event) => update({ tagAny: normalizeChipList(event.value) })}
              separator="," 
              className="w-full"
              disabled={disabled}
            />
            <div className="text-500 text-xs mt-1">At least one tag must match. Examples: `vip`, `retail`, `festival-2026`.</div>
          </div>
        </>
      ) : null}
      <div>
        <label htmlFor="whatsapp-campaign-audience-extras" className="block text-700 mb-2">Advanced audience JSON</label>
        <InputTextarea
          id="whatsapp-campaign-audience-extras"
          value={value.extrasJson}
          onChange={(event) => update({ extrasJson: event.target.value })}
          rows={5}
          className="w-full font-mono text-sm"
          disabled={disabled}
        />
        <div className="text-500 text-xs mt-1">Optional extra keys for future audience rules. Structured fields still control the standard audience filters.</div>
      </div>
      {previewIsError ? <Message severity="warn" text={preview} /> : null}
      <div>
        <label htmlFor="whatsapp-campaign-audience-preview" className="block text-700 mb-2">Effective audience JSON</label>
        <InputTextarea
          id="whatsapp-campaign-audience-preview"
          value={previewIsError ? '' : preview}
          rows={6}
          className="w-full font-mono text-sm"
          readOnly
        />
      </div>
    </div>
  );
}
