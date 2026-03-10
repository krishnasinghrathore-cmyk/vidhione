import React, { forwardRef } from 'react';
import type { AutoComplete } from 'primereact/autocomplete';
import RegisterStringAutoComplete from '@/components/RegisterStringAutoComplete';

type ProductGroupAutoCompleteProps = React.ComponentProps<typeof RegisterStringAutoComplete>;

const ProductGroupAutoComplete = forwardRef<AutoComplete, ProductGroupAutoCompleteProps>((props, ref) => (
    <RegisterStringAutoComplete
        {...props}
        ref={ref}
        placeholder={props.placeholder ?? 'All groups'}
        loadingPlaceholder={props.loadingPlaceholder ?? 'Loading groups...'}
    />
));

ProductGroupAutoComplete.displayName = 'ProductGroupAutoComplete';

export default ProductGroupAutoComplete;
