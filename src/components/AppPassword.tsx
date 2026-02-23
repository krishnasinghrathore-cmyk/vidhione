import React from 'react';
import AppPasswordInput from './AppPasswordInput';

type AppPasswordProps = React.ComponentProps<typeof AppPasswordInput>;

const AppPassword = (props: AppPasswordProps) => <AppPasswordInput {...props} />;

export default AppPassword;
