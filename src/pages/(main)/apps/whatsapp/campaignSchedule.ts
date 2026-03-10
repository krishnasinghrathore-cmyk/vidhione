export type CampaignScheduleFormState = {
  enabled: boolean;
  timezone: string;
  runAt: string;
  daysOfWeek: string[];
  sendNow: boolean;
  extrasJson: string;
};

export const CAMPAIGN_SCHEDULE_WEEKDAY_OPTIONS = [
  { label: 'Sunday', value: 'sun' },
  { label: 'Monday', value: 'mon' },
  { label: 'Tuesday', value: 'tue' },
  { label: 'Wednesday', value: 'wed' },
  { label: 'Thursday', value: 'thu' },
  { label: 'Friday', value: 'fri' },
  { label: 'Saturday', value: 'sat' }
];

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const DEFAULT_RUN_AT = '09:00';
const WEEKDAY_VALUES = new Set(CAMPAIGN_SCHEDULE_WEEKDAY_OPTIONS.map((option) => option.value));

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
      if (typeof entry === 'string') return normalizeText(entry)?.toLowerCase() ?? null;
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (value == null) return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const parseScheduleObject = (scheduleJson?: string | null) => {
  const normalized = normalizeText(scheduleJson);
  if (!normalized) return null;

  const parsed = JSON.parse(normalized) as unknown;
  const record = asRecord(parsed);
  if (!record) throw new Error('Schedule JSON must be a JSON object.');
  return record;
};

const pickScheduleExtras = (record: Record<string, unknown>) => {
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (['enabled', 'isEnabled', 'timezone', 'runAt', 'daysOfWeek', 'sendNow'].includes(key)) {
      continue;
    }
    extras[key] = value;
  }
  return extras;
};

export const createCampaignScheduleForm = (scheduleJson?: string | null): CampaignScheduleFormState => {
  const base: CampaignScheduleFormState = {
    enabled: true,
    timezone: DEFAULT_TIMEZONE,
    runAt: DEFAULT_RUN_AT,
    daysOfWeek: [],
    sendNow: false,
    extrasJson: ''
  };

  const normalized = normalizeText(scheduleJson);
  if (!normalized) return base;

  try {
    const record = parseScheduleObject(normalized) ?? {};
    const extras = pickScheduleExtras(record);
    return {
      enabled: normalizeBoolean(record.enabled, normalizeBoolean(record.isEnabled, true)),
      timezone: normalizeText(typeof record.timezone === 'string' ? record.timezone : null) ?? DEFAULT_TIMEZONE,
      runAt: normalizeText(typeof record.runAt === 'string' ? record.runAt : null) ?? DEFAULT_RUN_AT,
      daysOfWeek: asStringArray(record.daysOfWeek).filter((value) => WEEKDAY_VALUES.has(value)),
      sendNow: normalizeBoolean(record.sendNow, false),
      extrasJson: Object.keys(extras).length > 0 ? formatJson(extras) : ''
    };
  } catch {
    return {
      ...base,
      extrasJson: normalized
    };
  }
};

export const serializeCampaignScheduleForm = (value: CampaignScheduleFormState) => {
  const timezone = normalizeText(value.timezone) ?? DEFAULT_TIMEZONE;
  const runAt = normalizeText(value.runAt) ?? DEFAULT_RUN_AT;
  const daysOfWeek = Array.from(new Set(value.daysOfWeek.map((entry) => entry.toLowerCase()))).filter((entry) => WEEKDAY_VALUES.has(entry));

  const schedule: Record<string, unknown> = {
    enabled: value.enabled,
    timezone,
    runAt,
    sendNow: value.sendNow
  };

  if (daysOfWeek.length > 0) {
    schedule.daysOfWeek = daysOfWeek;
  }

  const extrasNormalized = normalizeText(value.extrasJson);
  if (!extrasNormalized) return formatJson(schedule);

  const extras = parseScheduleObject(extrasNormalized);
  return formatJson({ ...(extras ?? {}), ...schedule });
};
