import React, { forwardRef } from 'react';
import type { AutoComplete } from 'primereact/autocomplete';
import RegisterStringAutoComplete from '@/components/RegisterStringAutoComplete';

type ProductBrandAutoCompleteProps = React.ComponentProps<typeof RegisterStringAutoComplete>;

const ProductBrandAutoComplete = forwardRef<AutoComplete, ProductBrandAutoCompleteProps>((props, ref) => (
    <RegisterStringAutoComplete
        {...props}
        ref={ref}
        placeholder={props.placeholder ?? 'All brands'}
        loadingPlaceholder={props.loadingPlaceholder ?? 'Loading brands...'}
    />
));

ProductBrandAutoComplete.displayName = 'ProductBrandAutoComplete';

export default ProductBrandAutoComplete;
