type HelpSection = {
    title: string;
    items: string[];
};

export type MasterPageHelpConfig = {
    title: string;
    summary: string;
    sections: HelpSection[];
    dialogWidth?: string;
};

type MasterPageHelpKey =
    | 'areas'
    | 'banks'
    | 'billCollectionStatus'
    | 'branches'
    | 'checkedBy'
    | 'cities'
    | 'companies'
    | 'deliveryBy'
    | 'deliveryStatus'
    | 'districts'
    | 'forms'
    | 'godowns'
    | 'hsnCodes'
    | 'ledgerGroups'
    | 'ledgers'
    | 'managers'
    | 'paymentVia'
    | 'productAttributeTypes'
    | 'productBrands'
    | 'productGroups'
    | 'products'
    | 'salesmen'
    | 'schemeBatches'
    | 'states'
    | 'transporters'
    | 'units'
    | 'users';

type SimpleMasterHelpOptions = {
    title: string;
    summary: string;
    createLabel: string;
    listItems?: string[];
    formItems?: string[];
    dialogWidth?: string;
};

function buildSimpleMasterHelp({
    title,
    summary,
    createLabel,
    listItems = [],
    formItems = [],
    dialogWidth
}: SimpleMasterHelpOptions): MasterPageHelpConfig {
    return {
        title,
        summary,
        dialogWidth,
        sections: [
            {
                title: 'List View',
                items: [
                    `Use search, View, Edit, and Delete to review existing ${title.toLowerCase()} records.`,
                    ...listItems
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    `${createLabel} opens the master form for adding a new entry.`,
                    'Use Standard for one-off saves or Bulk to keep the popup open after save.',
                    ...formItems
                ]
            }
        ]
    };
}

const HELP_CONFIG: Record<MasterPageHelpKey, MasterPageHelpConfig> = {
    areas: buildSimpleMasterHelp({
        title: 'Areas',
        summary: 'Use this page to maintain area masters used in the accounts workflow.',
        createLabel: 'New Area'
    }),
    banks: buildSimpleMasterHelp({
        title: 'Banks',
        summary: 'Use this page to maintain bank masters used in accounts and voucher workflows.',
        createLabel: 'New Bank'
    }),
    billCollectionStatus: buildSimpleMasterHelp({
        title: 'Bill Collection Status',
        summary: 'Use this page to maintain bill collection status labels and their display colors.',
        createLabel: 'New Bill Collection Status',
        formItems: ['Set the status name and color in the form so the same status reads clearly in billing flows.']
    }),
    branches: buildSimpleMasterHelp({
        title: 'Branches',
        summary: 'Use this page to maintain branch masters used across accounts forms and reporting.',
        createLabel: 'New Branch'
    }),
    checkedBy: buildSimpleMasterHelp({
        title: 'Checked By',
        summary: 'Use this page to maintain checked-by labels used in inventory and billing documents.',
        createLabel: 'New Checked By'
    }),
    cities: buildSimpleMasterHelp({
        title: 'Cities',
        summary: 'Use this page to maintain city masters for address and place lookups.',
        createLabel: 'New City'
    }),
    companies: {
        title: 'Companies',
        summary: 'Use this page to maintain full company profiles including identity, contact, tax, and bank details.',
        dialogWidth: 'min(620px, 96vw)',
        sections: [
            {
                title: 'List View',
                items: [
                    'Use search and row actions to review company profiles.',
                    'View opens the grouped detail layout, while Edit opens the full company form.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New Company opens the profile form with grouped sections for basic info, address, tax, and bank details.',
                    'Use Standard for one-off saves or Bulk to continue entering multiple company profiles.'
                ]
            }
        ]
    },
    deliveryBy: buildSimpleMasterHelp({
        title: 'Delivery By',
        summary: 'Use this page to maintain delivery-by labels used in inventory and billing flows.',
        createLabel: 'New Delivery By'
    }),
    deliveryStatus: buildSimpleMasterHelp({
        title: 'Delivery Status',
        summary: 'Use this page to maintain delivery status labels and their display colors.',
        createLabel: 'New Delivery Status',
        formItems: ['Set the status name and color in the form so delivery tracking stays visually clear.']
    }),
    districts: buildSimpleMasterHelp({
        title: 'Districts',
        summary: 'Use this page to maintain district masters for address and location lookups.',
        createLabel: 'New District'
    }),
    forms: buildSimpleMasterHelp({
        title: 'Forms',
        summary: 'Use this page to maintain form masters and their menu ordering.',
        createLabel: 'New Form',
        formItems: ['Ordering is maintained from the list behavior, so the form focuses on the master values.']
    }),
    godowns: buildSimpleMasterHelp({
        title: 'Godowns',
        summary: 'Use this page to maintain godown and stock-location masters used in inventory transactions.',
        createLabel: 'New Godown'
    }),
    hsnCodes: buildSimpleMasterHelp({
        title: 'HSN Codes',
        summary: 'Use this page to maintain HSN code masters used in product and invoice tax flows.',
        createLabel: 'New HSN'
    }),
    ledgerGroups: {
        title: 'Ledger Groups',
        summary: 'Use this page to maintain ledger grouping, classification, and control flags for ledger behavior.',
        sections: [
            {
                title: 'List View',
                items: [
                    'Review group classification, annexure, and protection flags from the list and detail popup.',
                    'Use View to inspect the grouped detail layout or Edit to change the ledger group configuration.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New Group opens the ledger group form for classification, annexure, and locked-field controls.',
                    'Use Standard for one-off saves or Bulk to continue entering groups without reopening the dialog.'
                ]
            }
        ]
    },
    ledgers: {
        title: 'Ledgers',
        summary: 'Use this page to maintain ledger masters with grouped sections for general info, tax controls, shipping IDs, contacts, and extra fields.',
        dialogWidth: 'min(620px, 96vw)',
        sections: [
            {
                title: 'List View',
                items: [
                    'Use search, sorting, and row actions to review ledger records.',
                    'The detail popup now groups information and shows dense child tables for shipping addresses, contacts, and ledger sales taxes.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New Ledger opens the full ledger form with grouped sections instead of one flat field dump.',
                    'Use the built-in Enter flow and Standard/Bulk save modes to move through larger ledger entry work more efficiently.'
                ]
            }
        ]
    },
    managers: {
        title: 'Managers',
        summary: 'Use this page to maintain managers and the salesmen assigned under each manager.',
        sections: [
            {
                title: 'List View',
                items: [
                    'The grid shows each manager with their assigned-salesmen summary.',
                    'View shows the full assigned-salesmen list in a compact read-only table.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New Manager opens the manager form with name plus salesman assignment.',
                    'Use the assignment area to search, select, and maintain the salesmen mapped under each manager.',
                    'Use Standard for one-off saves or Bulk to continue entering managers.'
                ]
            }
        ]
    },
    paymentVia: {
        title: 'Payment Via',
        summary: 'Use this page to maintain payment-mode masters used in voucher and billing workflows.',
        sections: [
            {
                title: 'List View',
                items: [
                    'Use the grid actions to review, view, edit, and delete payment-via records.',
                    'Ordering is maintained from the list by drag-based row movement when the full list is visible.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New Payment Via opens the compact form for code, name, and active status.',
                    'Use Standard for one-off saves or Bulk to keep the popup open for repeated entry.'
                ]
            }
        ]
    },
    productAttributeTypes: {
        title: 'Product Attribute Types',
        summary: 'Use this page to maintain attribute-type masters and their detail values.',
        sections: [
            {
                title: 'List View',
                items: [
                    'Review each attribute type and open View for the compact read-only detail list.',
                    'Use Edit to maintain the attribute detail rows inside the type form.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New Type opens the form with the type name and the detail-row list.',
                    'Add detail values from the inline entry row and use Standard or Bulk save mode as needed.'
                ]
            }
        ]
    },
    productBrands: {
        title: 'Product Brands',
        summary: 'Use this page to manage product brands and the product companies mapped under each brand.',
        sections: [
            {
                title: 'List View',
                items: [
                    'The grid shows each brand with a compact summary of its mapped product companies.',
                    'Use View to see the full product-company list and Edit to maintain the mapping rows.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'Add product-company rows from the Company List area and mark rows in Delete to remove them on save.',
                    'Saved company rows are loaded from the full brand record, not only from the list summary.'
                ]
            },
            {
                title: 'Save Modes',
                items: [
                    'Standard closes the popup after save.',
                    'Bulk keeps the popup open after save so you can continue entering brands.'
                ]
            }
        ]
    },
    productGroups: buildSimpleMasterHelp({
        title: 'Product Groups',
        summary: 'Use this page to maintain product grouping masters used in inventory and billing filters.',
        createLabel: 'New Group'
    }),
    products: {
        title: 'Products',
        summary: 'Use this page to maintain product masters, including basic details, units, taxes, and attribute assignments.',
        dialogWidth: 'min(620px, 96vw)',
        sections: [
            {
                title: 'List View',
                items: [
                    'Use search and filters to review product masters from the grid.',
                    'View shows grouped product details, while Edit opens the full product form.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New Product opens the grouped product form with basic details, units, sales taxes, and attribute sections.',
                    'Use the row editors for unit and tax entries instead of manually packing values into one field.',
                    'Standard closes after save; Bulk keeps the popup open for repeated product entry.'
                ]
            }
        ]
    },
    salesmen: buildSimpleMasterHelp({
        title: 'Salesmen',
        summary: 'Use this page to maintain salesman masters for accounts and billing workflows.',
        createLabel: 'New Salesman'
    }),
    schemeBatches: buildSimpleMasterHelp({
        title: 'Scheme Batches',
        summary: 'Use this page to maintain scheme-batch masters used in inventory and billing references.',
        createLabel: 'New Batch'
    }),
    states: buildSimpleMasterHelp({
        title: 'States',
        summary: 'Use this page to maintain state masters used in address and tax-location flows.',
        createLabel: 'New State'
    }),
    transporters: buildSimpleMasterHelp({
        title: 'Transporters',
        summary: 'Use this page to maintain transporter masters used in delivery and transport workflows.',
        createLabel: 'New Transporter',
        formItems: ['Use the form fields to maintain transporter contact, mobile, and address details.']
    }),
    units: buildSimpleMasterHelp({
        title: 'Units',
        summary: 'Use this page to maintain unit masters, including eInvoice names and aliases.',
        createLabel: 'New Unit'
    }),
    users: {
        title: 'Users',
        summary: 'Use this page to maintain user masters and their access-right assignments.',
        sections: [
            {
                title: 'List View',
                items: [
                    'Use the list to review user records and their access setup.',
                    'View shows grouped user details and rights, while Edit opens the full user form.'
                ]
            },
            {
                title: 'Form Workflow',
                items: [
                    'New User opens the user form for profile fields plus rights selection.',
                    'Use Standard for one-off saves or Bulk to continue entering users without reopening the form.'
                ]
            }
        ]
    }
};

export function getMasterPageHelp(key: MasterPageHelpKey): MasterPageHelpConfig {
    return HELP_CONFIG[key];
}
