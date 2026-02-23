import React from 'react';
import AppDateInput from './AppDateInput';

type AppDatePickerProps = React.ComponentProps<typeof AppDateInput>;

const AppDatePicker = (props: AppDatePickerProps) => <AppDateInput {...props} />;

export default AppDatePicker;
