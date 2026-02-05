'use client';
import PrimeReact, { PrimeReactContext } from 'primereact/api';
import { Button } from 'primereact/button';
import { InputSwitch, InputSwitchChangeEvent } from 'primereact/inputswitch';
import { RadioButton, RadioButtonChangeEvent } from 'primereact/radiobutton';
import { Sidebar } from 'primereact/sidebar';
import { classNames } from 'primereact/utils';
import { useContext, useEffect } from 'react';
import { LayoutContext } from './context/layoutcontext';
import type { AppConfigProps, ColorScheme } from '@/types';

const AppConfig = (props: AppConfigProps) => {
    const { layoutConfig, setLayoutConfig, layoutState, setLayoutState, isSlim, isSlimPlus, isHorizontal } = useContext(LayoutContext);
    const { setRipple, changeTheme } = useContext(PrimeReactContext);
    const scales = [12, 13, 14, 15, 16];
    const componentThemes = [
        { name: 'indigo', color: '#3F51B5' },
        { name: 'pink', color: '#E91E63' },
        { name: 'purple', color: '#9C27B0' },
        { name: 'deeppurple', color: '#673AB7' },
        { name: 'blue', color: '#2196F3' },
        { name: 'lightblue', color: '#03A9F4' },
        { name: 'cyan', color: '#00BCD4' },
        { name: 'teal', color: '#009688' },
        { name: 'green', color: '#4CAF50' },
        { name: 'lightgreen', color: '#8BC34A' },
        { name: 'lime', color: '#CDDC39' },
        { name: 'yellow', color: '#FFEB3B' },
        { name: 'amber', color: '#FFC107' },
        { name: 'orange', color: '#FF9800' },
        { name: 'deeporange', color: '#FF5722' },
        { name: 'brown', color: '#795548' },
        { name: 'bluegrey', color: '#607D8B' }
    ];

    const menuThemes: {
        name: string;
        color: string;
    }[] = [
        { name: 'light', color: '#FDFEFF' },
        { name: 'dark', color: '#434B54' },
        { name: 'indigo', color: '#1A237E' },
        { name: 'blue', color: '#0D47A1' },
        { name: 'lightblue', color: '#0277BD' },
        { name: 'bluegrey', color: '#37474F' },
        { name: 'brown', color: '#4E342E' },
        { name: 'cyan', color: '#006064' },
        { name: 'green', color: '#2E7D32' },
        { name: 'lightgreen', color: '#558B2F' },
        { name: 'lime', color: '#9E9D24' },
        { name: 'yellow', color: '#F9A825' },
        { name: 'amber', color: '#FF8F00' },
        { name: 'orange', color: '#EF6C00' },
        { name: 'deeppurple', color: '#4527A0' },
        { name: 'deeporange', color: '#BF360C' },
        { name: 'pink', color: '#880E4F' },
        { name: 'purple', color: '#6A1B9A' },
        { name: 'teal', color: '#00695C' }
    ];

    const topbarThemes = [
        { name: 'lightblue', color: '#2E88FF' },
        { name: 'dark', color: '#363636' },
        { name: 'white', color: '#FDFEFF' },
        { name: 'blue', color: '#1565C0' },
        { name: 'deeppurple', color: '#4527A0' },
        { name: 'purple', color: '#6A1B9A' },
        { name: 'pink', color: '#AD1457' },
        { name: 'cyan', color: '#0097A7' },
        { name: 'teal', color: '#00796B' },
        { name: 'green', color: '#43A047' },
        { name: 'lightgreen', color: '#689F38' },
        { name: 'lime', color: '#AFB42B' },
        { name: 'yellow', color: '#FBC02D' },
        { name: 'amber', color: '#FFA000' },
        { name: 'orange', color: '#FB8C00' },
        { name: 'deeporange', color: '#D84315' },
        { name: 'brown', color: '#5D4037' },
        { name: 'grey', color: '#616161' },
        { name: 'bluegrey', color: '#546E7A' },
        { name: 'indigo', color: '#3F51B5' }
    ];

    useEffect(() => {
        if (isSlim() || isSlimPlus() || isHorizontal()) {
            setLayoutState((prevState) => ({ ...prevState, resetMenu: true }));
        }
    }, [layoutConfig.menuMode]);

    const onInlineMenuPositionChange = (e: RadioButtonChangeEvent) => {
        setLayoutConfig((prevState) => ({
            ...prevState,
            menuProfilePosition: e.value
        }));
    };
    const onConfigButtonClick = () => {
        setLayoutState((prevState) => ({
            ...prevState,
            configSidebarVisible: true
        }));
    };

    const onConfigSidebarHide = () => {
        setLayoutState((prevState) => ({
            ...prevState,
            configSidebarVisible: false
        }));
    };

    const changeInputStyle = (e: RadioButtonChangeEvent) => {
        setLayoutConfig((prevState) => ({ ...prevState, inputStyle: e.value }));
    };

    const changeRipple = (e: InputSwitchChangeEvent) => {
        setRipple?.(e.value as boolean);
        setLayoutConfig((prevState) => ({
            ...prevState,
            ripple: e.value as boolean
        }));
    };

    const changeMenuMode = (e: RadioButtonChangeEvent) => {
        setLayoutConfig((prevState) => ({ ...prevState, menuMode: e.value }));
    };

    const onChangeMenuTheme = (name: string) => {
        setLayoutConfig((prevState) => ({ ...prevState, menuTheme: name }));
    };

    const changeColorScheme = (colorScheme: ColorScheme) => {
        changeTheme?.(layoutConfig.colorScheme, colorScheme, 'theme-link', () => {
            setLayoutConfig((prevState) => ({
                ...prevState,
                colorScheme,
                menuTheme: colorScheme === 'dark' ? 'dark' : 'light'
            }));
        });
    };

    const _changeTheme = (componentTheme: string) => {
        changeTheme?.(layoutConfig.componentTheme, componentTheme, 'theme-link', () => {
            setLayoutConfig((prevState) => ({ ...prevState, componentTheme }));
        });
    };
    const onTopbarChangeTheme = (name: string) => {
        setLayoutConfig((prevState) => ({ ...prevState, topbarTheme: name }));
    };

    const decrementScale = () => {
        setLayoutConfig((prevState) => ({
            ...prevState,
            scale: prevState.scale - 1
        }));
    };

    const incrementScale = () => {
        setLayoutConfig((prevState) => ({
            ...prevState,
            scale: prevState.scale + 1
        }));
    };

    const applyScale = () => {
        document.documentElement.style.fontSize = layoutConfig.scale + 'px';
    };

    useEffect(() => {
        applyScale();
    }, [layoutConfig.scale]);

    return (
        <>
            <button className="layout-config-button config-link" type="button" onClick={onConfigButtonClick}>
                <i className="pi pi-cog"></i>
            </button>

            <Sidebar visible={layoutState.configSidebarVisible} onHide={onConfigSidebarHide} position="right" className="layout-config-sidebar w-18rem">
                <h5>Layout/Theme Scale</h5>
                <div className="flex align-items-center">
                    <Button icon="pi pi-minus" type="button" onClick={decrementScale} className="w-2rem h-2rem mr-2" rounded text disabled={layoutConfig.scale === scales[0]}></Button>
                    <div className="flex gap-2 align-items-center">
                        {scales.map((s, i) => {
                            return (
                                <i
                                    key={i}
                                    className={classNames('pi pi-circle-fill text-300', {
                                        'text-primary-500': s === layoutConfig.scale
                                    })}
                                ></i>
                            );
                        })}
                    </div>
                    <Button icon="pi pi-plus" type="button" onClick={incrementScale} className="w-2rem h-2rem ml-2" rounded text disabled={layoutConfig.scale === scales[scales.length - 1]}></Button>
                </div>
                <h6>Color Scheme</h6>
                <div className="flex">
                    <div className="flex align-items-center">
                        <RadioButton id="light" name="darkMenu" value="light" checked={layoutConfig.colorScheme === 'light'} onChange={(e) => changeColorScheme(e.value)} />
                        <label htmlFor="light" className="ml-2">
                            Light
                        </label>
                    </div>
                    <div className="flex align-items-center ml-4">
                        <RadioButton id="dark" name="darkMenu" value="dark" checked={layoutConfig.colorScheme === 'dark'} onChange={(e) => changeColorScheme(e.value)} />
                        <label htmlFor="dark" className="ml-2">
                            Dark
                        </label>
                    </div>
                </div>

                {!props.minimal && (
                    <>
                        <h5>Menu Mode</h5>
                        <div className="flex flex-wrap row-gap-3">
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value={'static'} checked={layoutConfig.menuMode === 'static'} onChange={(e) => changeMenuMode(e)} inputId="mode1"></RadioButton>
                                <label htmlFor="mode1">Static</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value={'overlay'} checked={layoutConfig.menuMode === 'overlay'} onChange={(e) => changeMenuMode(e)} inputId="mode2"></RadioButton>
                                <label htmlFor="mode2">Overlay</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value={'slim'} checked={layoutConfig.menuMode === 'slim'} onChange={(e) => changeMenuMode(e)} inputId="mode3"></RadioButton>
                                <label htmlFor="mode3">Slim</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value={'slim-plus'} checked={layoutConfig.menuMode === 'slim-plus'} onChange={(e) => changeMenuMode(e)} inputId="mode4"></RadioButton>
                                <label htmlFor="mode4">Slim +</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value={'drawer'} checked={layoutConfig.menuMode === 'drawer'} onChange={(e) => changeMenuMode(e)} inputId="mode7"></RadioButton>
                                <label htmlFor="mode7">Drawer</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value={'reveal'} checked={layoutConfig.menuMode === 'reveal'} onChange={(e) => changeMenuMode(e)} inputId="mode5"></RadioButton>
                                <label htmlFor="mode6">Reveal</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value={'horizontal'} checked={layoutConfig.menuMode === 'horizontal'} onChange={(e) => changeMenuMode(e)} inputId="mode5"></RadioButton>
                                <label htmlFor="mode5">Horizontal</label>
                            </div>
                        </div>
                        <h5>Menu Profile Position</h5>
                        <div className="flex">
                            <div className="flex align-items-center">
                                <RadioButton id="start" name="position" value="start" checked={layoutConfig.menuProfilePosition === 'start'} onChange={onInlineMenuPositionChange} />
                                <label htmlFor="start" className="ml-2">
                                    Start
                                </label>
                            </div>
                            <div className="flex align-items-center ml-4">
                                <RadioButton id="end" name="position" value="end" checked={layoutConfig.menuProfilePosition === 'end'} onChange={onInlineMenuPositionChange} />
                                <label htmlFor="end" className="ml-2">
                                    End
                                </label>
                            </div>
                        </div>

                        <h5>Input Style</h5>
                        <div className="flex">
                            <div className="field-radiobutton flex-1">
                                <RadioButton name="inputStyle" value="outlined" checked={layoutConfig.inputStyle === 'outlined'} onChange={(e) => changeInputStyle(e)} inputId="outlined_input"></RadioButton>
                                <label htmlFor="outlined_input">Outlined</label>
                            </div>
                            <div className="field-radiobutton flex-1">
                                <RadioButton name="inputStyle" value="filled" checked={layoutConfig.inputStyle === 'filled'} onChange={(e) => changeInputStyle(e)} inputId="filled_input"></RadioButton>
                                <label htmlFor="filled_input">Filled</label>
                            </div>
                        </div>
                    </>
                )}
                <h5>Ripple Effect</h5>
                <InputSwitch checked={layoutConfig.ripple} onChange={changeRipple}></InputSwitch>

                {!props.minimal && (
                    <>
                        <h5>Menu Themes</h5>
                        {layoutConfig.colorScheme !== 'dark' ? (
                            <div className="flex flex-wrap row-gap-3">
                                {menuThemes.map((t, i) => {
                                    return (
                                        <div key={i} className="w-3">
                                            <div style={{ cursor: 'pointer' }} onClick={() => onChangeMenuTheme(t.name)} className="layout-config-color-option" title={t.name}>
                                                <button className="cursor-pointer p-link w-2rem h-2rem border-round shadow-2 flex-shrink-0 flex justify-content-center align-items-center border-circle" style={{ backgroundColor: t.color }}>
                                                    {layoutConfig.menuTheme === t.name && (
                                                        <span className="check flex align-items-center justify-content-center">
                                                            <i className={`pi pi-check ${t.name === layoutConfig.menuTheme && layoutConfig.menuTheme !== 'light' ? 'text-white' : 'text-dark'}`}></i>
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p>Menu themes are only available in light mode by design as large surfaces can emit too much brightness in dark mode.</p>
                        )}

                        <h5>Topbar Themes</h5>
                        <div className="flex flex-wrap row-gap-3">
                            {topbarThemes.map((t, i) => {
                                return (
                                    <div key={i} className="w-3">
                                        <div style={{ cursor: 'pointer' }} onClick={() => onTopbarChangeTheme(t.name)} className="layout-config-color-option p-link" title={t.name}>
                                            <button className="cursor-pointer p-link w-2rem h-2rem border-round shadow-2 flex-shrink-0 flex justify-content-center align-items-center border-circle" style={{ backgroundColor: t.color }}>
                                                {layoutConfig.topbarTheme === t.name && (
                                                    <span className="check flex align-items-center justify-content-center">
                                                        <i className={`pi pi-check ${t.name === layoutConfig.topbarTheme && layoutConfig.topbarTheme !== 'white' ? 'text-white' : 'text-dark'}`}></i>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                <h5>Component Themes</h5>
                <div className="flex flex-wrap row-gap-3">
                    {componentThemes.map((t, i) => {
                        return (
                            <div key={i} className="w-3">
                                <div style={{ cursor: 'pointer' }} onClick={() => _changeTheme(t.name)} className="layout-config-color-option p-link" title={t.name}>
                                    <button className="cursor-pointer p-link w-2rem h-2rem border-round shadow-2 flex-shrink-0 flex justify-content-center align-items-center border-circle" style={{ backgroundColor: t.color }}>
                                        {layoutConfig.componentTheme === t.name && (
                                            <span className="check flex align-items-center justify-content-center">
                                                <i className="pi pi-check text-white"></i>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Sidebar>
        </>
    );
};

export default AppConfig;
