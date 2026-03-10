import React, { forwardRef } from 'react';
import type { AutoComplete } from 'primereact/autocomplete';
import RegisterStringAutoComplete from '@/components/RegisterStringAutoComplete';

type ProductAutoCompleteProps = React.ComponentProps<typeof RegisterStringAutoComplete>;

const ProductAutoComplete = forwardRef<AutoComplete, ProductAutoCompleteProps>((props, ref) => (
    <RegisterStringAutoComplete
        {...props}
        ref={ref}
        placeholder={props.placeholder ?? 'All products'}
        loadingPlaceholder={props.loadingPlaceholder ?? 'Loading products...'}
    />
));

ProductAutoComplete.displayName = 'ProductAutoComplete';

export default ProductAutoComplete;
