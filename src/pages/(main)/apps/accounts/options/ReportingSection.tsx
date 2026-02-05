import React from 'react';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import type { AgencyOptionsFormState } from './useAgencyOptionsForm';

type Props = {
    form: AgencyOptionsFormState;
    onChange: (patch: Partial<AgencyOptionsFormState>) => void;
};

export const ReportingSection = ({ form, onChange }: Props) => {
    return (
        <>
            <h3>Reporting</h3>
            <div className="formgrid grid">
                <div className="field col-12 md:col-8">
                    <label htmlFor="reportFolderPath">Report Folder Path</label>
                    <InputText
                        id="reportFolderPath"
                        value={form.reportFolderPath}
                        onChange={(e) => onChange({ reportFolderPath: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="dbBackupPath">DB Backup Path</label>
                    <InputText
                        id="dbBackupPath"
                        value={form.dbBackupPath}
                        onChange={(e) => onChange({ dbBackupPath: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-4">
                    <div className="field-checkbox mt-3">
                        <Checkbox
                            inputId="isReportSetting"
                            checked={form.isReportSetting}
                            onChange={(e) => onChange({ isReportSetting: e.checked ?? false })}
                        />
                        <label htmlFor="isReportSetting">Enable Report Settings</label>
                    </div>
                </div>
            </div>
        </>
    );
};
