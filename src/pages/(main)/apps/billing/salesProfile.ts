export type SalesInvoiceProfileKey = string | null;

export const getSalesProfileLabel = (salesProfileKey: SalesInvoiceProfileKey) => {
    if (!salesProfileKey) return 'Not set';
    if (salesProfileKey === 'agency_sales_gst_v1') return 'Agency • GST Invoice';
    if (salesProfileKey === 'textile_sales_gst2_v1') return 'Textile • GST2 Invoice';
    if (salesProfileKey === 'retail_sales_gst_v1') return 'Retail • GST Invoice';
    if (salesProfileKey === 'media_sales_no_tax_v1') return 'Media • No Tax Invoice';
    if (salesProfileKey === 'restaurant_sales_single_v1') return 'Restaurant • Single Invoice';
    if (salesProfileKey === 'restaurant_sales_split_v1') return 'Restaurant • Split Invoice';
    return salesProfileKey;
};

export const getSalesProfileFlags = (salesProfileKey: SalesInvoiceProfileKey) => {
    const isGstProfile =
        salesProfileKey === 'agency_sales_gst_v1' ||
        salesProfileKey === 'textile_sales_gst2_v1' ||
        salesProfileKey === 'retail_sales_gst_v1';
    const isTextileProfile = salesProfileKey === 'textile_sales_gst2_v1';
    const isRestaurantProfile = salesProfileKey === 'restaurant_sales_single_v1' || salesProfileKey === 'restaurant_sales_split_v1';
    const isSplitProfile = salesProfileKey === 'restaurant_sales_split_v1';
    const taxLocked = salesProfileKey === 'media_sales_no_tax_v1';
    const showTax = !taxLocked;
    const showSellingRate = isTextileProfile;

    return { isGstProfile, isTextileProfile, isRestaurantProfile, isSplitProfile, taxLocked, showTax, showSellingRate };
};

