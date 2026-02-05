import React, { forwardRef } from 'react';
import { InputText, type InputTextProps } from 'primereact/inputtext';
import { InputNumber, type InputNumberProps } from 'primereact/inputnumber';
import { classNames } from 'primereact/utils';

type AppInputProps =
    | (InputTextProps & { inputType?: 'text' })
    | (InputNumberProps & { inputType: 'number' });

const AppInput = forwardRef<unknown, AppInputProps>((props, ref) => {
    if (props.inputType === 'number') {
        const { inputType: _inputType, className, ...rest } = props as InputNumberProps & { inputType: 'number' };
        return <InputNumber {...rest} ref={ref as any} className={classNames('app-input', className)} />;
    }

    const { inputType: _inputType, className, ...rest } = props as InputTextProps & { inputType?: 'text' };
    return <InputText {...rest} ref={ref as any} className={classNames('app-input', className)} />;
});

AppInput.displayName = 'AppInput';

export default AppInput;
