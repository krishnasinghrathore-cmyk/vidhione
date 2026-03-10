import { apiUrl } from '@/lib/apiBaseUrl';
import { refreshAccessToken } from '@/lib/auth/api';
import { getAccessToken } from '@/lib/auth/storage';

type GraphqlError = { message: string; extensions?: { code?: string } };
type GraphqlResponse<T> = { data?: T; errors?: GraphqlError[] };

const crmGraphqlUrl = apiUrl('/crm/graphql');

const requestCrmGraphql = async <T>(query: string, variables?: Record<string, unknown>, retryOnAuth = true): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(crmGraphqlUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query, variables })
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as GraphqlResponse<T>) : null;
    const errors = json?.errors ?? [];
    if (errors.length) {
        const code = errors[0]?.extensions?.code;
        if (retryOnAuth && code === 'UNAUTHENTICATED') {
            const refreshed = await refreshAccessToken();
            if (refreshed) return await requestCrmGraphql<T>(query, variables, false);
        }
        throw new Error(errors[0]?.message || 'Request failed');
    }
    if (!res.ok || !json?.data) throw new Error(`Request failed (${res.status})`);
    return json.data;
};

export type CrmParty = {
    id: string;
    ledgerId: string;
    ledgerName: string | null;
    mobileNumber: string | null;
    email: string | null;
    partyType: string | null;
    memberCode: string | null;
    membershipTier: string | null;
    memberSinceDateText: string | null;
    birthDateText: string | null;
    anniversaryDateText: string | null;
    gender: string | null;
    alternateMobile: string | null;
    whatsappNumber: string | null;
    communicationPreferencesJson: string | null;
    tagsJson: string | null;
    notes: string | null;
    profileMetaJson: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

export type CrmSettings = {
    id: string;
    defaultPoints: string | null;
    amountPerPoint: string | null;
    pointAdjustmentDays: number | null;
    mobileDigitCount: number | null;
    minimumInvoiceAmount: string | null;
    autoSendSms: boolean;
    autoSendInvoiceSms: boolean;
    enableQr: boolean;
    giftCouponPostingLedgerId: string | null;
    memberCodePrefix: string | null;
    memberBarcodePrefix: string | null;
    extraSettingsJson: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

export type BenefitProgram = { id: string; programKey: string; name: string; programType: string; earnRate: string | null; redemptionRate: string | null; minimumInvoiceAmount: string | null; pointsExpiryDays: number | null; isActive: boolean; settingsJson: string | null; createdAt: string | null; updatedAt: string | null; };
export type BenefitWalletEntry = { id: string; ledgerId: string; programId: string | null; entryType: string; points: string; amountValue: string | null; sourceModule: string | null; sourceEntityType: string | null; sourceEntityId: string | null; referenceNote: string | null; reversalOfEntryId: string | null; effectiveAt: string | null; createdAt: string | null; updatedAt: string | null; };
export type CrmLoyaltySummary = { ledgerId: string; programId: string | null; programName: string | null; availablePoints: string; availableAmount: string | null; minimumRedeemPoints: string | null; redemptionValuePerPoint: string | null; canRedeem: boolean; };
export type CouponDefinition = { id: string; couponCode: string; name: string; benefitType: string; valueAmount: string | null; valuePercent: string | null; minimumInvoiceAmount: string | null; validFromText: string | null; validToText: string | null; usageLimit: number | null; isActive: boolean; metadataJson: string | null; createdAt: string | null; updatedAt: string | null; };
export type GiftCertificate = { id: string; certificateCode: string; couponDefinitionId: string | null; recipientLedgerId: string | null; recipientLedgerName: string | null; issuedToName: string | null; issuedToPhone: string | null; issuedAmount: string; redeemedAmount: string; balanceAmount: string; status: string; issuedOnText: string | null; expiresOnText: string | null; sourceModule: string | null; sourceEntityType: string | null; sourceEntityId: string | null; notes: string | null; metadataJson: string | null; createdAt: string | null; updatedAt: string | null; };
export type IdentifierCode = { id: string; entityType: string; entityId: string; codeValue: string; codeType: string; templateKey: string | null; isPrimary: boolean; status: string; metadataJson: string | null; createdAt: string | null; updatedAt: string | null; };
export type PrintTemplate = { id: string; templateKey: string; name: string; entityType: string; layoutJson: string | null; isDefault: boolean; isActive: boolean; createdAt: string | null; updatedAt: string | null; };
export type PrintJob = { id: string; templateId: string | null; entityType: string; entityId: string; identifierId: string | null; outputFormat: string; status: string; copies: number; title: string | null; payloadJson: string | null; renderedContent: string | null; reprintOfJobId: string | null; printedAt: string | null; createdAt: string | null; updatedAt: string | null; };
export type CampaignTemplate = { id: string; templateKey: string; name: string; channel: string; subjectTemplate: string | null; bodyTemplate: string | null; whatsappTemplateKey: string | null; whatsappTemplateName: string | null; metadataJson: string | null; isActive: boolean; createdAt: string | null; updatedAt: string | null; };
export type CampaignRule = { id: string; ruleKey: string; name: string; triggerType: string; channel: string; templateId: string | null; sourceModule: string | null; scheduleJson: string | null; filterJson: string | null; isActive: boolean; createdAt: string | null; updatedAt: string | null; };
export type CampaignRun = { id: string; ruleId: string | null; templateId: string | null; runKey: string; status: string; triggerType: string; channel: string; recipientCount: number; successCount: number; failureCount: number; requestedByUserId: string | null; contextJson: string | null; startedAt: string | null; completedAt: string | null; createdAt: string | null; updatedAt: string | null; };
export type CrmMessageLog = { id: string; campaignRunId: string | null; ledgerId: string | null; channel: string; recipientName: string | null; recipientPhone: string | null; status: string; providerMessageId: string | null; errorDetail: string | null; messagePreview: string | null; payloadJson: string | null; createdAt: string | null; };
export type CrmFollowupSmsResult = { ledgerId: string; bindingKey: string; id: string; status: string; duplicate: boolean; providerMessageId: string | null; note: string | null; recipientPhone: string; recipientName: string | null; templateKey: string | null; memberCode: string | null; };

const partyFields = `id ledgerId ledgerName mobileNumber email partyType memberCode membershipTier memberSinceDateText birthDateText anniversaryDateText gender alternateMobile whatsappNumber communicationPreferencesJson tagsJson notes profileMetaJson createdAt updatedAt`;
const settingsFields = `id defaultPoints amountPerPoint pointAdjustmentDays mobileDigitCount minimumInvoiceAmount autoSendSms autoSendInvoiceSms enableQr giftCouponPostingLedgerId memberCodePrefix memberBarcodePrefix extraSettingsJson createdAt updatedAt`;
const benefitProgramFields = `id programKey name programType earnRate redemptionRate minimumInvoiceAmount pointsExpiryDays isActive settingsJson createdAt updatedAt`;
const walletFields = `id ledgerId programId entryType points amountValue sourceModule sourceEntityType sourceEntityId referenceNote reversalOfEntryId effectiveAt createdAt updatedAt`;
const loyaltySummaryFields = `ledgerId programId programName availablePoints availableAmount minimumRedeemPoints redemptionValuePerPoint canRedeem`;
const couponFields = `id couponCode name benefitType valueAmount valuePercent minimumInvoiceAmount validFromText validToText usageLimit isActive metadataJson createdAt updatedAt`;
const giftFields = `id certificateCode couponDefinitionId recipientLedgerId recipientLedgerName issuedToName issuedToPhone issuedAmount redeemedAmount balanceAmount status issuedOnText expiresOnText sourceModule sourceEntityType sourceEntityId notes metadataJson createdAt updatedAt`;
const identifierFields = `id entityType entityId codeValue codeType templateKey isPrimary status metadataJson createdAt updatedAt`;
const printTemplateFields = `id templateKey name entityType layoutJson isDefault isActive createdAt updatedAt`;
const printJobFields = `id templateId entityType entityId identifierId outputFormat status copies title payloadJson renderedContent reprintOfJobId printedAt createdAt updatedAt`;
const campaignTemplateFields = `id templateKey name channel subjectTemplate bodyTemplate whatsappTemplateKey whatsappTemplateName metadataJson isActive createdAt updatedAt`;
const campaignRuleFields = `id ruleKey name triggerType channel templateId sourceModule scheduleJson filterJson isActive createdAt updatedAt`;
const campaignRunFields = `id ruleId templateId runKey status triggerType channel recipientCount successCount failureCount requestedByUserId contextJson startedAt completedAt createdAt updatedAt`;
const messageLogFields = `id campaignRunId ledgerId channel recipientName recipientPhone status providerMessageId errorDetail messagePreview payloadJson createdAt`;
const crmFollowupSmsFields = `ledgerId bindingKey id status duplicate providerMessageId note recipientPhone recipientName templateKey memberCode`;
export const listCrmParties = async (search?: string | null) => (await requestCrmGraphql<{ crmParties: CrmParty[] }>(`query($search: String) { crmParties(search: $search) { ${partyFields} } }`, { search: search ?? null })).crmParties;
export const getCrmPartyByLedgerId = async (ledgerId: string) => (await requestCrmGraphql<{ crmPartyByLedgerId: CrmParty | null }>(`query($ledgerId: String!) { crmPartyByLedgerId(ledgerId: $ledgerId) { ${partyFields} } }`, { ledgerId })).crmPartyByLedgerId;
export const upsertCrmPartyProfile = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ upsertCrmPartyProfile: CrmParty }>(`mutation($input: UpsertCrmPartyProfileInput!) { upsertCrmPartyProfile(input: $input) { ${partyFields} } }`, { input })).upsertCrmPartyProfile;
export const getCrmSettings = async () => (await requestCrmGraphql<{ crmSettings: CrmSettings }>(`query { crmSettings { ${settingsFields} } }`)).crmSettings;
export const updateCrmSettings = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ updateCrmSettings: CrmSettings }>(`mutation($input: UpdateCrmSettingsInput!) { updateCrmSettings(input: $input) { ${settingsFields} } }`, { input })).updateCrmSettings;
export const listBenefitPrograms = async () => (await requestCrmGraphql<{ benefitPrograms: BenefitProgram[] }>(`query { benefitPrograms { ${benefitProgramFields} } }`)).benefitPrograms;
export const upsertBenefitProgram = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ upsertBenefitProgram: BenefitProgram }>(`mutation($input: UpsertBenefitProgramInput!) { upsertBenefitProgram(input: $input) { ${benefitProgramFields} } }`, { input })).upsertBenefitProgram;
export const listBenefitWallet = async (ledgerId?: string | null) => (await requestCrmGraphql<{ benefitWallet: BenefitWalletEntry[] }>(`query($ledgerId: String) { benefitWallet(ledgerId: $ledgerId) { ${walletFields} } }`, { ledgerId: ledgerId ?? null })).benefitWallet;
export const getCrmLoyaltySummary = async (ledgerId: string) => (await requestCrmGraphql<{ loyaltySummary: CrmLoyaltySummary | null }>(`query($ledgerId: String!) { loyaltySummary(ledgerId: $ledgerId) { ${loyaltySummaryFields} } }`, { ledgerId })).loyaltySummary;
export const postBenefitAdjustment = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ postBenefitAdjustment: BenefitWalletEntry }>(`mutation($input: PostBenefitAdjustmentInput!) { postBenefitAdjustment(input: $input) { ${walletFields} } }`, { input })).postBenefitAdjustment;
export const listCouponDefinitions = async () => (await requestCrmGraphql<{ couponDefinitions: CouponDefinition[] }>(`query { couponDefinitions { ${couponFields} } }`)).couponDefinitions;
export const upsertCouponDefinition = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ upsertCouponDefinition: CouponDefinition }>(`mutation($input: UpsertCouponDefinitionInput!) { upsertCouponDefinition(input: $input) { ${couponFields} } }`, { input })).upsertCouponDefinition;
export const listGiftCertificates = async (search?: string | null, options?: { recipientLedgerId?: string | null; statuses?: string[] | null }) => (await requestCrmGraphql<{ giftCertificates: GiftCertificate[] }>(`query($search: String, $recipientLedgerId: String, $statuses: [String!]) { giftCertificates(search: $search, recipientLedgerId: $recipientLedgerId, statuses: $statuses) { ${giftFields} } }`, { search: search ?? null, recipientLedgerId: options?.recipientLedgerId ?? null, statuses: options?.statuses ?? null })).giftCertificates;
export const issueGiftCertificate = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ issueGiftCertificate: GiftCertificate }>(`mutation($input: IssueGiftCertificateInput!) { issueGiftCertificate(input: $input) { ${giftFields} } }`, { input })).issueGiftCertificate;
export const redeemGiftCertificate = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ redeemGiftCertificate: GiftCertificate }>(`mutation($input: RedeemGiftCertificateInput!) { redeemGiftCertificate(input: $input) { ${giftFields} } }`, { input })).redeemGiftCertificate;
export const cancelGiftCertificate = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ cancelGiftCertificate: GiftCertificate }>(`mutation($input: CancelGiftCertificateInput!) { cancelGiftCertificate(input: $input) { ${giftFields} } }`, { input })).cancelGiftCertificate;
export const listIdentifierCodes = async (entityType?: string | null, entityId?: string | null, search?: string | null) => (await requestCrmGraphql<{ identifierCodes: IdentifierCode[] }>(`query($entityType: String, $entityId: String, $search: String) { identifierCodes(entityType: $entityType, entityId: $entityId, search: $search) { ${identifierFields} } }`, { entityType: entityType ?? null, entityId: entityId ?? null, search: search ?? null })).identifierCodes;
export const resolveIdentifierCode = async (codeValue: string) => (await requestCrmGraphql<{ resolveIdentifierCode: IdentifierCode | null }>(`query($codeValue: String!) { resolveIdentifierCode(codeValue: $codeValue) { ${identifierFields} } }`, { codeValue })).resolveIdentifierCode;
export const assignIdentifierCode = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ assignIdentifierCode: IdentifierCode }>(`mutation($input: AssignIdentifierCodeInput!) { assignIdentifierCode(input: $input) { ${identifierFields} } }`, { input })).assignIdentifierCode;
export const listPrintTemplates = async () => (await requestCrmGraphql<{ printTemplates: PrintTemplate[] }>(`query { printTemplates { ${printTemplateFields} } }`)).printTemplates;
export const upsertPrintTemplate = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ upsertPrintTemplate: PrintTemplate }>(`mutation($input: UpsertPrintTemplateInput!) { upsertPrintTemplate(input: $input) { ${printTemplateFields} } }`, { input })).upsertPrintTemplate;
export const listPrintJobs = async (entityType?: string | null, entityId?: string | null) => (await requestCrmGraphql<{ printJobHistory: PrintJob[] }>(`query($entityType: String, $entityId: String) { printJobHistory(entityType: $entityType, entityId: $entityId) { ${printJobFields} } }`, { entityType: entityType ?? null, entityId: entityId ?? null })).printJobHistory;
export const createPrintJob = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ createPrintJob: PrintJob }>(`mutation($input: CreatePrintJobInput!) { createPrintJob(input: $input) { ${printJobFields} } }`, { input })).createPrintJob;
export const reprintPrintJob = async (printJobId: string) => (await requestCrmGraphql<{ reprintPrintJob: PrintJob }>(`mutation($printJobId: String!) { reprintPrintJob(printJobId: $printJobId) { ${printJobFields} } }`, { printJobId })).reprintPrintJob;
export const listCampaignTemplates = async () => (await requestCrmGraphql<{ campaignTemplates: CampaignTemplate[] }>(`query { campaignTemplates { ${campaignTemplateFields} } }`)).campaignTemplates;
export const upsertCampaignTemplate = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ upsertCampaignTemplate: CampaignTemplate }>(`mutation($input: UpsertCampaignTemplateInput!) { upsertCampaignTemplate(input: $input) { ${campaignTemplateFields} } }`, { input })).upsertCampaignTemplate;
export const listCampaignRules = async () => (await requestCrmGraphql<{ campaignRules: CampaignRule[] }>(`query { campaignRules { ${campaignRuleFields} } }`)).campaignRules;
export const upsertCampaignRule = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ upsertCampaignRule: CampaignRule }>(`mutation($input: UpsertCampaignRuleInput!) { upsertCampaignRule(input: $input) { ${campaignRuleFields} } }`, { input })).upsertCampaignRule;
export const listCampaignRuns = async () => (await requestCrmGraphql<{ campaignRuns: CampaignRun[] }>(`query { campaignRuns { ${campaignRunFields} } }`)).campaignRuns;
export const runCampaignNow = async (input: Record<string, unknown>) => (await requestCrmGraphql<{ runCampaignNow: CampaignRun }>(`mutation($input: RunCampaignNowInput!) { runCampaignNow(input: $input) { ${campaignRunFields} } }`, { input })).runCampaignNow;
export const listCrmMessageLogs = async () => (await requestCrmGraphql<{ crmMessageLogs: CrmMessageLog[] }>(`query { crmMessageLogs { ${messageLogFields} } }`)).crmMessageLogs;
export const sendCrmFollowupSms = async (input: { ledgerId: string; messageText?: string | null; templateKey?: string | null }) =>
    (await requestCrmGraphql<{ sendCrmFollowupSms: CrmFollowupSmsResult }>(`mutation($input: SendCrmFollowupSmsInput!) { sendCrmFollowupSms(input: $input) { ${crmFollowupSmsFields} } }`, { input })).sendCrmFollowupSms;

