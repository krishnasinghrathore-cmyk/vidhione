export type CampaignAudienceFormState = {
  allowAll: boolean;
  ledgerIds: string[];
  partyTypes: string[];
  membershipTiers: string[];
  tagAny: string[];
  extrasJson: string;
};

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

const normalizeText = (value?: string | null) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return normalizeText(entry) ?? null;
      if (typeof entry === 'number') return String(entry);
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (value == null) return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const parseAudienceObject = (audienceJson?: string | null) => {
  const normalized = normalizeText(audienceJson);
  if (!normalized) return null;

  const parsed = JSON.parse(normalized) as unknown;
  const record = asRecord(parsed);
  if (!record) throw new Error('Audience JSON must be a JSON object.');
  return record;
};

const pickAudienceExtras = (record: Record<string, unknown>) => {
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (['allowAll', 'ledgerIds', 'partyTypes', 'membershipTiers', 'tagAny'].includes(key)) {
      continue;
    }
    extras[key] = value;
  }
  return extras;
};

const normalizeList = (value: string[]) =>
  Array.from(
    new Set(
      value
        .map((entry) => normalizeText(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  );

export const createCampaignAudienceForm = (audienceJson?: string | null): CampaignAudienceFormState => {
  const base: CampaignAudienceFormState = {
    allowAll: false,
    ledgerIds: [],
    partyTypes: [],
    membershipTiers: [],
    tagAny: [],
    extrasJson: '',
  };

  const normalized = normalizeText(audienceJson);
  if (!normalized) return base;

  try {
    const record = parseAudienceObject(normalized) ?? {};
    const extras = pickAudienceExtras(record);
    return {
      allowAll: normalizeBoolean(record.allowAll, false),
      ledgerIds: asStringArray(record.ledgerIds),
      partyTypes: asStringArray(record.partyTypes),
      membershipTiers: asStringArray(record.membershipTiers),
      tagAny: asStringArray(record.tagAny),
      extrasJson: Object.keys(extras).length > 0 ? formatJson(extras) : '',
    };
  } catch {
    return {
      ...base,
      extrasJson: normalized,
    };
  }
};

export const serializeCampaignAudienceForm = (value: CampaignAudienceFormState) => {
  const audience: Record<string, unknown> = {};
  const ledgerIds = normalizeList(value.ledgerIds);
  const partyTypes = normalizeList(value.partyTypes);
  const membershipTiers = normalizeList(value.membershipTiers);
  const tagAny = normalizeList(value.tagAny);

  if (value.allowAll) {
    audience.allowAll = true;
  }
  if (ledgerIds.length > 0) {
    audience.ledgerIds = ledgerIds;
  }
  if (partyTypes.length > 0) {
    audience.partyTypes = partyTypes;
  }
  if (membershipTiers.length > 0) {
    audience.membershipTiers = membershipTiers;
  }
  if (tagAny.length > 0) {
    audience.tagAny = tagAny;
  }

  const extrasNormalized = normalizeText(value.extrasJson);
  if (!extrasNormalized) {
    return Object.keys(audience).length > 0 ? formatJson(audience) : '';
  }

  const extras = parseAudienceObject(extrasNormalized);
  const merged = { ...(extras ?? {}), ...audience };
  return Object.keys(merged).length > 0 ? formatJson(merged) : '';
};
