export type AppCategory = 'industry' | 'core' | 'addon';

export interface AppDefinition {
    id: string;
    name: string;
    path: string;
    icon: string;
    category: AppCategory;
}

export const APPS: AppDefinition[] = [
    // Industry apps
    { id: 'agency', name: 'Agency', path: '/apps/agency', icon: 'pi pi-briefcase', category: 'industry' },
    { id: 'retail', name: 'Retail', path: '/apps/retail', icon: 'pi pi-shopping-bag', category: 'industry' },
    { id: 'textile', name: 'Textile', path: '/apps/textile', icon: 'pi pi-sitemap', category: 'industry' },
    { id: 'restaurant', name: 'Restaurant', path: '/apps/restaurant', icon: 'pi pi-microsoft', category: 'industry' },
    { id: 'media', name: 'Media', path: '/apps/media', icon: 'pi pi-image', category: 'industry' },

    // Core platform apps
    { id: 'accounts', name: 'Accounts', path: '/apps/accounts', icon: 'pi pi-book', category: 'core' },
    { id: 'inventory', name: 'Inventory', path: '/apps/inventory', icon: 'pi pi-box', category: 'core' },
    { id: 'billing', name: 'Billing', path: '/apps/billing', icon: 'pi pi-credit-card', category: 'core' },
    { id: 'gst', name: 'GST', path: '/apps/gst', icon: 'pi pi-percentage', category: 'core' },

    // Add-ons
    { id: 'whatsapp', name: 'WhatsApp', path: '/apps/whatsapp', icon: 'pi pi-whatsapp', category: 'addon' },
    { id: 'email', name: 'Email', path: '/apps/email', icon: 'pi pi-envelope', category: 'addon' },
    { id: 'sms', name: 'SMS', path: '/apps/sms', icon: 'pi pi-comment', category: 'addon' },
    { id: 'crm', name: 'CRM', path: '/apps/crm', icon: 'pi pi-users', category: 'addon' },
    { id: 'website', name: 'Website', path: '/apps/website', icon: 'pi pi-globe', category: 'addon' },
    { id: 'ecommerce', name: 'E-commerce', path: '/apps/ecommerce', icon: 'pi pi-shopping-cart', category: 'addon' },
    { id: 'wealth', name: 'Wealth', path: '/apps/wealth', icon: 'pi pi-chart-line', category: 'addon' },
    { id: 'mobileapp', name: 'Mobile App', path: '/apps/mobileapp', icon: 'pi pi-mobile', category: 'addon' },
    { id: 'giftcoupon', name: 'Gift Coupon', path: '/apps/giftcoupon', icon: 'pi pi-ticket', category: 'addon' },
    { id: 'adcampaigns', name: 'Ad Campaigns', path: '/apps/adcampaigns', icon: 'pi pi-megaphone', category: 'addon' }
];
