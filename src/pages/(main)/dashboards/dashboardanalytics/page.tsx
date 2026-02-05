'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { classNames } from 'primereact/utils';
import { Menu } from 'primereact/menu';
import { ProgressBar } from 'primereact/progressbar';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { ProductService } from '../../../../demo/service/ProductService';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { SelectButton } from 'primereact/selectbutton';
import { ChartData, ChartOptions } from 'chart.js';
import { Demo, MonthlyDataChart } from '@/types/demo';

let chartMonthlyData: ChartData;
let chartMonthlyOptions: MonthlyDataChart;
let doughnutData: ChartData;
let doughnutOptions: ChartOptions<'doughnut'>;

const DashboardAnalytics = () => {
    const [products, setProducts] = useState<any>(null);
    const [expensesData, setExpenseData] = useState<ChartData | null>(null);
    const [expensesOptions, setExpenseOptions] = useState<ChartOptions | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [storeChartData, setStoreChartData] = useState<any>({
        A: [55, 3, 45, 6, 44, 58, 84, 68, 64],
        B: [81, 75, 63, 100, 69, 79, 38, 37, 76],
        C: [99, 55, 22, 72, 24, 79, 35, 91, 48],
        D: [5, 51, 68, 82, 28, 21, 29, 45, 44]
    });
    const bar = useRef<any>(null);
    const doughnut = useRef<any>(null);
    const storeA = useRef<Chart>(null);
    const storeB = useRef<Chart>(null);
    const storeC = useRef<Chart>(null);
    const storeD = useRef<Chart>(null);
    const menu11 = useRef<any>(null);
    const menu12 = useRef<any>(null);
    const menu13 = useRef<any>(null);
    const { layoutConfig } = useContext(LayoutContext);

    const storeAData = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
        datasets: [
            {
                data: storeChartData['A'],
                borderColor: ['#4DD0E1'],
                backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }
        ]
    };

    const storeBData = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
        datasets: [
            {
                data: storeChartData['B'],
                borderColor: ['#4DD0E1'],
                backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }
        ]
    };

    const storeCData = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
        datasets: [
            {
                data: storeChartData['C'],
                borderColor: ['#4DD0E1'],
                backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }
        ]
    };

    const storeDData = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
        datasets: [
            {
                data: storeChartData['D'],
                borderColor: ['#4DD0E1'],
                backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }
        ]
    };

    const storeOptions = {
        maintainAspectRatio: false,
        aspectRatio: 4,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                display: false
            },
            x: {
                display: false
            }
        },
        tooltips: {
            enabled: false
        },
        elements: {
            point: {
                radius: 0
            }
        },
        animation: {
            duration: 0
        }
    };

    const getColors = () => {
        const isLight = layoutConfig.colorScheme === 'light';
        return {
            pinkColor: isLight ? '#EC407A' : '#F48FB1',
            purpleColor: isLight ? '#AB47BC' : '#CE93D8',
            deeppurpleColor: isLight ? '#7E57C2' : '#B39DDB',
            indigoColor: isLight ? '#5C6BC0' : '#9FA8DA',
            blueColor: isLight ? '#42A5F5' : '#90CAF9',
            lightblueColor: isLight ? '#29B6F6' : '#81D4FA',
            cyanColor: isLight ? '#00ACC1' : '#4DD0E1',
            tealColor: isLight ? '#26A69A' : '#80CBC4',
            greenColor: isLight ? '#66BB6A' : '#A5D6A7',
            lightgreenColor: isLight ? '#9CCC65' : '#C5E1A5',
            limeColor: isLight ? '#D4E157' : '#E6EE9C',
            yellowColor: isLight ? 'FFEE58' : '#FFF59D',
            amberColor: isLight ? '#FFCA28' : '#FFE082',
            orangeColor: isLight ? '#FFA726' : '#FFCC80',
            deeporangeColor: isLight ? '#FF7043' : '#FFAB91',
            brownColor: isLight ? '#8D6E63' : '#BCAAA4'
        };
    };

    const getMonthlyChartData = (): ChartData<'bar'> => {
        const { limeColor, amberColor, orangeColor, blueColor, lightblueColor, cyanColor, tealColor, greenColor, lightgreenColor } = getColors();

        return {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [
                {
                    label: '2012',
                    data: [6, 25, 97, 12, 7, 70, 42],
                    borderColor: blueColor,
                    backgroundColor: blueColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2013',
                    data: [81, 3, 5, 11, 59, 47, 99],
                    borderColor: lightblueColor,
                    backgroundColor: lightblueColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2014',
                    data: [68, 47, 46, 46, 61, 70, 94],
                    borderColor: cyanColor,
                    backgroundColor: cyanColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2015',
                    data: [31, 9, 18, 76, 6, 11, 79],
                    borderColor: tealColor,
                    backgroundColor: tealColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2016',
                    data: [85, 37, 47, 29, 2, 10, 54],
                    borderColor: greenColor,
                    backgroundColor: greenColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2017',
                    data: [28, 48, 40, 19, 86, 27, 90],
                    borderColor: lightgreenColor,
                    backgroundColor: lightgreenColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2018',
                    data: [89, 18, 95, 18, 97, 61, 54],
                    borderColor: limeColor,
                    backgroundColor: limeColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2019',
                    data: [18, 36, 39, 58, 41, 50, 72],
                    borderColor: amberColor,
                    backgroundColor: amberColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                },
                {
                    label: '2020',
                    data: [31, 4, 35, 74, 47, 35, 46],
                    borderColor: orangeColor,
                    backgroundColor: orangeColor,
                    borderWidth: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.8
                }
            ]
        };
    };

    const getMonthlyChartOptions = (): MonthlyDataChart => {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const gridLinesColor = getComputedStyle(document.body).getPropertyValue('--divider-color') || 'rgba(160, 167, 181, .3)';
        const fontFamily = getComputedStyle(document.body).getPropertyValue('--font-family');
        return {
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'x'
            },
            scales: {
                y: {
                    ticks: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    },
                    grid: {
                        color: gridLinesColor
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    },
                    grid: {
                        color: gridLinesColor
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        };
    };

    const getDoughnutData = () => {
        const { blueColor, lightblueColor, cyanColor, tealColor, greenColor, lightgreenColor, orangeColor } = getColors();
        const borderColor = getComputedStyle(document.body).getPropertyValue('--divider-color') || 'rgba(160, 167, 181, .3)';

        return {
            labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            datasets: [
                {
                    data: [11, 29, 71, 33, 28, 95, 6],
                    backgroundColor: [blueColor, lightblueColor, cyanColor, tealColor, greenColor, lightgreenColor, orangeColor],
                    borderColor
                }
            ]
        };
    };

    const getDoughnutOptions = (): ChartOptions<'doughnut'> => {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const fontFamily = getComputedStyle(document.body).getPropertyValue('--font-family');
        return {
            responsive: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    }
                }
            },
            maintainAspectRatio: false,
            circumference: 180,
            rotation: -90,
            animation: {
                animateScale: true,
                animateRotate: true
            }
        };
    };
    const items = [
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' }
    ];

    const [storeATotalValue, setStoreATotalValue] = useState<number>(100);
    const storeADiff = useRef(0);

    const [storeBTotalValue, setStoreBTotalValue] = useState<number>(120);
    const storeBDiff = useRef(0);

    const [storeCTotalValue, setStoreCTotalValue] = useState<number>(150);
    const storeCDiff = useRef(0);

    const [storeDTotalValue, setStoreDTotalValue] = useState<number>(80);
    const storeDDiff = useRef(0);

    const calculateStore = (storeKey: string, totalValue: number) => {
        let randomNumber = +(Math.random() * 500).toFixed(2);
        let data = storeChartData[storeKey];
        let length = data.length;
        data.push(randomNumber);
        data.shift();

        setStoreChartData({ ...storeChartData, [storeKey]: data });

        let diff = +(data[length - 1] - data[length - 2]).toFixed(2);
        let status = diff === 0 ? 0 : diff > 0 ? 1 : -1;
        totalValue = +(totalValue + diff).toFixed(2);

        storeA.current?.refresh();
        storeB.current?.refresh();
        storeC.current?.refresh();
        storeD.current?.refresh();

        return { diff, totalValue, status };
    };
    useEffect(() => {
        ProductService.getProducts().then((data) => setProducts(data));
        chartMonthlyData = getMonthlyChartData();
        chartMonthlyOptions = getMonthlyChartOptions();
        doughnutData = getDoughnutData();
        doughnutOptions = getDoughnutOptions();
        setExpenseData({
            labels: ['January', 'February', 'March', 'April', 'May', 'June'],
            datasets: [
                {
                    data: [44, 59, 32, 44, 58, 52],
                    borderColor: [layoutConfig.colorScheme === 'dark' ? '#fff' : '#000'],
                    backgroundColor: [layoutConfig.colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        });
        setExpenseOptions({
            plugins: {
                legend: {
                    display: false
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            aspectRatio: 4,
            scales: {
                y: {
                    display: false,
                    beginAtZero: true
                },
                x: {
                    display: false
                }
            },
            elements: {
                point: {
                    radius: 5,
                    backgroundColor: layoutConfig.colorScheme === 'dark' ? '#fff' : '#000'
                }
            }
        });
    }, [layoutConfig]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let storeInterval = setInterval(() => {
            let { diff: _storeADiff, totalValue: _storeATotalValue } = calculateStore('A', storeATotalValue);
            storeADiff.current = _storeADiff;
            setStoreATotalValue(_storeATotalValue);

            let { diff: _storeBDiff, totalValue: _storeBTotalValue } = calculateStore('B', storeBTotalValue);
            storeBDiff.current = _storeBDiff;
            setStoreBTotalValue(_storeBTotalValue);

            let { diff: _storeCDiff, totalValue: _storeCTotalValue } = calculateStore('C', storeCTotalValue);
            storeCDiff.current = _storeCDiff;
            setStoreCTotalValue(_storeCTotalValue);

            let { diff: _storeDDiff, totalValue: _storeDTotalValue } = calculateStore('D', storeDTotalValue);
            storeDDiff.current = _storeDDiff;
            setStoreDTotalValue(_storeDTotalValue);
        }, 2000);

        return () => {
            clearInterval(storeInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeADiff]);

    const imageTemplate = (rowData: Demo.Product) => {
        var src = '/demo/images/product/' + rowData.image;
        return <img src={src} alt={rowData.brand as string} width="50px" className="shadow-4" />;
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    };

    const actionTemplate = () => {
        return (
            <>
                <span className="p-column-title">View</span>
                <Button icon="pi pi-search" type="button" text rounded className="mb-1 mr-2"></Button>
            </>
        );
    };

    const priceBodyTemplate = (data: Demo.Product) => {
        return (
            <>
                <span className="p-column-title">Price</span>
                {formatCurrency(data.price as number)}
            </>
        );
    };

    const bodyTemplate = (data: Demo.Product, props: ColumnBodyOptions) => {
        return <>{data[props.field]}</>;
    };

    const changeMonthlyDataView = () => {
        let chart = bar.current.getChart();
        if (chart.options.scales.x.stacked) {
            chart.options.scales.x.stacked = false;
            chart.options.scales.y.stacked = false;
        } else {
            chart.options.scales.x.stacked = true;
            chart.options.scales.y.stacked = true;
        }

        bar.current.refresh();
    };

    const changeDoughnutDataView = () => {
        let chart = doughnut.current.getChart();

        if (chart.config.options.circumference === 360) {
            chart.config.options.circumference = 180;
            chart.config.options.rotation = -1 * 90;
        } else {
            chart.config.options.circumference = 360;
            chart.config.options.rotation = 0;
        }

        doughnut.current.refresh();
    };

    const containerClassesYellow = classNames({
        'bg-yellow-50': layoutConfig.colorScheme === 'light',
        'bg-yellow-800': layoutConfig.colorScheme === 'dark'
    });
    const containerClassesRed = classNames({
        'bg-red-50': layoutConfig.colorScheme === 'light',
        'bg-red-800': layoutConfig.colorScheme === 'dark'
    });
    const containerClassesTeal = classNames({
        'bg-teal-50': layoutConfig.colorScheme === 'light',
        'bg-teal-800': layoutConfig.colorScheme === 'dark'
    });
    const containerClassesPrimary = classNames({
        'bg-primary-50': layoutConfig.colorScheme === 'light',
        'bg-primary-800': layoutConfig.colorScheme === 'dark'
    });

    return (
        <div className="grid">
            <div className="col-12 md:col-8">
                <div className="card height-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5>Monthly Comparison</h5>
                        <Button label="Vertical/Stacked Data" text className="ml-auto" onClick={changeMonthlyDataView}></Button>
                    </div>
                    <Chart ref={bar} type="bar" data={chartMonthlyData} options={chartMonthlyOptions} height="400px"></Chart>
                </div>
            </div>

            <div className="col-12 md:col-4">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-2">
                        <h5>Insights</h5>
                        <div>
                            <Button icon="pi pi-ellipsis-h" text rounded className="p-button-plain" onClick={(event) => menu11.current.toggle(event)}></Button>
                            <Menu
                                ref={menu11}
                                popup={true}
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div className="border-bottom-1 surface-border text-sm text-color-secondary mb-2 flex align-items-center">
                        <span>November 22 - November 29</span>
                        <Button label="Semi/Full Data" text className="ml-auto" onClick={changeDoughnutDataView}></Button>
                    </div>
                    <Chart ref={doughnut} height="200" type="doughnut" data={doughnutData} options={doughnutOptions}></Chart>
                    <div className="flex flex-column justify-content-center">
                        <div className="flex flex-row align-items-center mt-4 px-3">
                            <i className="pi pi-thumbs-up p-3 border-circle bg-green-400 text-white"></i>
                            <div className="flex flex-column ml-3">
                                <span>Best Day of the Week</span>
                                <small>Friday</small>
                            </div>
                            <span className="text-indigo-500 ml-auto">95</span>
                        </div>
                        <div className="flex flex-row align-items-center my-4 px-3">
                            <i className="pi pi-thumbs-down border-circle p-3 bg-orange-400 text-white"></i>
                            <div className="flex flex-column ml-3">
                                <span>Worst Day of the Week</span>
                                <small>Saturday</small>
                            </div>
                            <span className="text-indigo-500 ml-auto"> 6</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-4">
                <div className="card">
                    <div className="flex justify-content-between align-items-center p-3">
                        <div>
                            <i className="pi pi-twitter text-blue-500 text-6xl"></i>
                        </div>
                        <div className="text-right flex flex-column">
                            <span className="text-4xl">44.995</span>
                            <span className="text-color-secondary mt-2">Retweets</span>
                        </div>
                    </div>

                    <div className="stats flex justify-content-between mt-3">
                        <div className="w-6 text-center p-3 flex flex-column border-right-1 surface-border">
                            <span className="font-medium">Target</span>
                            <span className="text-color-secondary mb-2">10.000</span>
                            <ProgressBar value="50" showValue={false}></ProgressBar>
                        </div>
                        <div className="w-6 text-center p-3 flex flex-column">
                            <span className="font-medium">All Time Record</span>
                            <span className="text-color-secondary mb-2">50.702</span>
                            <ProgressBar value="24" showValue={false}></ProgressBar>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-4">
                <div className="card">
                    <div className="flex justify-content-between align-items-center p-3">
                        <div>
                            <i className="pi pi-facebook text-indigo-500 text-6xl"></i>
                        </div>
                        <div className="text-right flex flex-column">
                            <span className="text-4xl">44.995</span>
                            <span className="text-color-secondary mt-2">Facebook Interactions</span>
                        </div>
                    </div>

                    <div className="border-top-1 surface-border flex justify-content-between mt-3">
                        <div className="w-6 text-center p-3 flex flex-column border-right-1 surface-border">
                            <span className="font-medium">Target</span>
                            <span className="text-color-secondary mb-2">10.000</span>
                            <ProgressBar value="23" showValue={false}></ProgressBar>
                        </div>
                        <div className="w-6 text-center p-3 flex flex-column">
                            <span className="font-medium">All Time Record</span>
                            <span className="text-color-secondary mb-2">99.028</span>
                            <ProgressBar value="38" showValue={false}></ProgressBar>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-4">
                <div className="card">
                    <div className="flex justify-content-between align-items-center p-3">
                        <div>
                            <i className="pi pi-github text-color text-6xl"></i>
                        </div>
                        <div className="text-right flex flex-column">
                            <span className="text-4xl">81.002</span>
                            <span className="text-color-secondary mt-2">Stars</span>
                        </div>
                    </div>

                    <div className="border-top-1 surface-border flex justify-content-between mt-3">
                        <div className="w-6 text-center p-3 flex flex-column border-right-1 surface-border">
                            <span className="font-medium">Target</span>
                            <span className="text-color-secondary mb-2">10.000</span>
                            <ProgressBar value="62" showValue={false}></ProgressBar>
                        </div>
                        <div className="w-6 text-center p-3 flex flex-column">
                            <span className="font-medium">All Time Record</span>
                            <span className="text-color-secondary mb-2">162.550</span>
                            <ProgressBar value="14" showValue={false}></ProgressBar>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-12">
                <div className="card grid grid-nogutter block sm:flex">
                    <div className="lg:col-3 md:col-6 sm:col-12 p-0">
                        <div className="flex flex-column p-4">
                            <span className="text-color-secondary">Store A Sales</span>
                            <span className="text-2xl mt-2">
                                {storeADiff.current !== 0 && (
                                    <i
                                        className={classNames('font-bold text-2xl pi pr-1', {
                                            'pi-arrow-up text-green-500': storeADiff.current > 0,
                                            'pi-arrow-down text-pink-500': storeADiff.current < 0
                                        })}
                                    ></i>
                                )}
                                ${storeATotalValue}
                                {storeADiff.current !== 0 && (
                                    <span
                                        className={classNames('font-medium text-base ml-1', {
                                            'text-green-500': storeADiff.current > 0,
                                            'text-pink-500': storeADiff.current < 0
                                        })}
                                    >
                                        {storeADiff.current > 0 ? '+' : ''}
                                        {storeADiff.current}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="px-4">
                            <Chart ref={storeA} type="line" data={storeAData} options={storeOptions}></Chart>
                        </div>
                    </div>
                    <div className="lg:col-3 md:col-6 sm:col-12 p-0">
                        <div className="flex flex-column p-4">
                            <span className="text-color-secondary">Store B Sales</span>
                            <span className="text-2xl mt-2">
                                {storeBDiff.current !== 0 && (
                                    <i
                                        className={classNames('font-bold text-2xl pi pr-1', {
                                            'pi-arrow-up text-green-500': storeBDiff.current > 0,
                                            'pi-arrow-down  text-pink-500': storeBDiff.current < 0
                                        })}
                                    ></i>
                                )}
                                ${storeBTotalValue}
                                {storeBDiff.current !== 0 && (
                                    <span
                                        className={classNames('font-medium text-base ml-1', {
                                            'text-green-500': storeBDiff.current > 0,
                                            'text-pink-500': storeBDiff.current < 0
                                        })}
                                    >
                                        {storeBDiff.current > 0 ? '+' : ''}
                                        {storeBDiff.current}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="px-4">
                            <Chart ref={storeB} type="line" data={storeBData} options={storeOptions}></Chart>
                        </div>
                    </div>
                    <div className="lg:col-3 md:col-6 sm:col-12 p-0">
                        <div className="flex flex-column p-4">
                            <span className="text-color-secondary">Store C Sales</span>
                            <span className="text-2xl mt-2">
                                {storeCDiff.current !== 0 && (
                                    <i
                                        className={classNames('font-bold text-2xl pi pr-1', {
                                            'pi-arrow-up text-green-500': storeCDiff.current > 0,
                                            'pi-arrow-down text-pink-500': storeCDiff.current < 0
                                        })}
                                    ></i>
                                )}
                                ${storeCTotalValue}
                                {storeCDiff.current !== 0 && (
                                    <span
                                        className={classNames('fw-500 fs-normal ml-1', {
                                            'text-green-500': storeCDiff.current > 0,
                                            'text-pink-500': storeCDiff.current < 0
                                        })}
                                    >
                                        {storeCDiff.current > 0 ? '+' : ''}
                                        {storeCDiff.current}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="px-4">
                            <Chart ref={storeC} type="line" data={storeCData} options={storeOptions}></Chart>
                        </div>
                    </div>
                    <div className="lg:col-3 md:col-6 sm:col-12 p-0">
                        <div className="sales-info flex flex-column p-4">
                            <span className="text-color-secondary">Store D Sales</span>
                            <span className="text-2xl mt-2">
                                {storeDDiff.current !== 0 && (
                                    <i
                                        className={classNames('fw-700 fs-large pi pr-1', {
                                            'pi-arrow-up text-green-500': storeDDiff.current > 0,
                                            'pi-arrow-down text-pink-500': storeDDiff.current < 0
                                        })}
                                    ></i>
                                )}
                                ${storeDTotalValue}
                                {storeDDiff.current !== 0 && (
                                    <span
                                        className={classNames('fw-500 fs-normal ml-1', {
                                            'text-green-500': storeDDiff.current > 0,
                                            'text-pink-500': storeDDiff.current < 0
                                        })}
                                    >
                                        {storeDDiff.current > 0 ? '+' : ''}
                                        {storeDDiff.current}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="px-4">
                            <Chart ref={storeD} type="line" data={storeDData} options={storeOptions}></Chart>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5>Top Searchs</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" text rounded className="p-button-plain" onClick={(event) => menu12.current.toggle(event)}></Button>
                            <Menu
                                ref={menu12}
                                popup={true}
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div className="flex justify-content-between surface-200 p-3 border-bottom-1 surface-border">
                        <span>Mat Orange Case</span>
                        <span className="font-medium text-green-500">82% CONV RATE</span>
                    </div>
                    <div className="flex justify-content-between p-3 border-bottom-1 surface-border">
                        <span>Space T-Shirt</span>
                        <span className="font-medium text-green-500">78% CONV RATE</span>
                    </div>
                    <div className="flex justify-content-between surface-200 p-3 border-bottom-1 surface-border">
                        <span>Orange Black Hoodie</span>
                        <span className="font-medium text-green-500">61% CONV RATE</span>
                    </div>
                    <div className="flex justify-content-between p-3 border-bottom-1 surface-border">
                        <span>Wonders Notebook</span>
                        <span className="font-medium text-orange-500">48% CONV RATE</span>
                    </div>
                    <div className="flex justify-content-between surface-200 p-3 border-bottom-1 surface-border">
                        <span>Robots T-Shirt</span>
                        <span className="font-medium text-orange-500">34% CONV RATE</span>
                    </div>
                    <div className="flex justify-content-between p-3">
                        <span>Green Portal Sticker</span>
                        <span className="font-medium text-pink-500">11% CONV RATE</span>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <div className="card">
                    <DataTable value={products} className="p-datatable-customers" style={{ marginBottom: '20px' }} paginator={true} rows={4} selection={selectedProduct} onSelectionChange={(e) => setSelectedProduct(e.value)}>
                        <Column header="Image" body={imageTemplate} style={{ width: '5rem' }} />
                        <Column field="name" header="Name" body={bodyTemplate} sortable />
                        <Column field="category" header="Category" body={bodyTemplate} sortable />
                        <Column field="price" header="Price" sortable body={priceBodyTemplate} />
                        <Column header="View" body={actionTemplate} style={{ width: '4rem' }} />
                    </DataTable>
                </div>
            </div>

            <div className="col-12 md:col-4">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5 className="m-0">Expenses</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" text rounded className="p-button-plain" onClick={(event) => menu13.current.toggle(event)}></Button>
                            <Menu
                                ref={menu13}
                                popup={true}
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div className="border-bottom-1 surface-border text-sm text-color-secondary mb-2 pb-3">November 22 - November 29</div>

                    <div className="flex justify-content-between align-items-center my-2 p-2 border-bottom-1 surface-border">
                        <div className="flex flex-column">
                            <i className="pi pi-cloud text-cyan-700 text-2xl mb-2"></i>
                            <span className="font-medium mb-1">$30.247</span>
                            <span className="text-color-secondary">Cloud Infrastructure</span>
                        </div>
                        <span>
                            <a href="#" className="text-color-secondary">
                                <i className="pi pi-chevron-right"></i>
                            </a>
                        </span>
                    </div>
                    <div className="flex justify-content-between align-items-center my-2 p-2 border-bottom-1 surface-border">
                        <div className="flex flex-column">
                            <i className="pi pi-tag text-cyan-700 text-2xl mb-2"></i>
                            <span className="font-medium mb-1">$29.550</span>
                            <span className="text-color-secondary">General Goods</span>
                        </div>
                        <span>
                            <a href="#" className="text-color-secondary">
                                <i className="pi pi-chevron-right"></i>
                            </a>
                        </span>
                    </div>
                    <div className="flex justify-content-between align-items-center my-2 p-2 border-bottom-1 surface-border">
                        <div className="flex flex-column">
                            <i className="pi pi-desktop text-cyan-700 text-2xl mb-2"></i>
                            <span className="font-medium mb-1">$16.660</span>
                            <span className="text-color-secondary">Consumer Electronics</span>
                        </div>
                        <span>
                            <a href="#" className="text-color-secondary">
                                <i className="pi pi-chevron-right"></i>
                            </a>
                        </span>
                    </div>
                    <div className="flex justify-content-between align-items-center my-2 p-2">
                        <div className="flex flex-column">
                            <i className="pi pi-compass text-cyan-700 text-2xl mb-2"></i>
                            <span className="font-medium mb-1">$5.801</span>
                            <span className="text-color-secondary">Incalculables</span>
                        </div>
                        <span>
                            <a href="#" className="text-color-secondary">
                                <i className="pi pi-chevron-right"></i>
                            </a>
                        </span>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-8">
                <div className="card h-full">
                    <div className="flex flex-column gap-3">
                        <div className={classNames('flex flex-column p-3 gap-3 w-full justify-content-between border-round-md', containerClassesPrimary)}>
                            <div className="flex justify-content-between align-items-center">
                                <h5 className="m-0 text-900 text-2xl font-medium">Expenses</h5>
                                <SelectButton optionLabel="label" options={items} multiple />
                            </div>

                            <div>
                                <Chart type="line" height="150px" data={expensesData as ChartData} options={expensesOptions as ChartOptions}></Chart>
                            </div>
                        </div>
                        <div className="flex flex-column lg:flex-row gap-3 justify-content-between flex-1">
                            <div className={classNames('flex flex-column p-3 gap-3 w-full justify-content-between border-round-md', containerClassesRed)}>
                                <div className="flex justify-content-between">
                                    <div className="flex flex-column gap-1">
                                        <span className="text-900 text-4xl">23</span>
                                        <span className="text-700">Product Questions</span>
                                    </div>
                                    <a href="#/dashboard-analytics">
                                        <i className="pi pi-arrow-up-right text-900 text-2xl"></i>
                                    </a>
                                </div>
                                <div className="flex flex-column gap-2">
                                    <div className="flex gap-2 p-2 surface-0 shadow-1 border-round-md">
                                        <img src="/demo/images/product/black-watch.jpg" className="w-2rem h-2rem border-circle" alt="black-watch" />
                                        <div className="flex flex-column gap-1">
                                            <span className="text-sm font-medium text-900">Black Watch</span>
                                            <span className="text-sm text-900">Is the Black Watch product water-resistant?</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 p-2 surface-0 shadow-1 border-round-md">
                                        <img src="/demo/images/product/blue-t-shirt.jpg" className="w-2rem h-2rem border-circle" alt="blue-t-shirt" />
                                        <div className="flex flex-column gap-1">
                                            <span className="text-sm font-medium text-900">Blue T-Shirt</span>
                                            <span className="text-sm text-900">Can I return or exchange the blue t-shirt if I am not satisfied with it?</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={classNames('flex flex-column p-3 gap-3 w-full justify-content-between border-round-md', containerClassesTeal)}>
                                <div className="flex justify-content-between">
                                    <div className="flex flex-column gap-1">
                                        <span className="text-900 text-4xl">54</span>
                                        <span className="text-700">Product Reviews</span>
                                    </div>
                                    <a href="#/dashboard-analytics">
                                        <i className="pi pi-arrow-up-right text-900 text-2xl"></i>
                                    </a>
                                </div>
                                <div className="flex flex-column gap-2">
                                    <div className="flex gap-2 p-2 surface-0 shadow-1 border-round-md">
                                        <img src="/demo/images/product/blue-band.jpg" className="w-2rem h-2rem border-circle" alt="blue-band" />
                                        <div className="flex flex-column gap-1">
                                            <span className="text-sm font-medium text-900">Blue Band</span>
                                            <span className="text-sm text-900">Loved the blue band from this e-commerce site!</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 p-2 surface-0 shadow-1 border-round-md">
                                        <img src="/demo/images/product/bamboo-watch.jpg" className="w-2rem h-2rem border-circle" alt="bamboo-watch" />
                                        <div className="flex flex-column gap-1">
                                            <span className="text-sm font-medium text-900">Bamboo Watch</span>
                                            <span className="text-sm text-900">I purchased the bamboo watch and I&apos;m really happy with it.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={classNames('flex flex-column p-3 gap-3 w-full justify-content-between border-round-md', containerClassesYellow)}>
                                <div className="flex justify-content-between">
                                    <div className="flex flex-column gap-1">
                                        <span className="text-900 text-4xl">99+</span>
                                        <span className="text-700">Will Shipping Orders</span>
                                    </div>
                                    <a href="#/dashboard-analytics">
                                        <i className="pi pi-arrow-up-right text-900 text-2xl"></i>
                                    </a>
                                </div>
                                <div className="flex flex-column gap-2">
                                    <div className="flex gap-2 p-2 surface-0 shadow-1 border-round-md">
                                        <img src="/demo/images/product/blue-t-shirt.jpg" className="w-2rem h-2rem border-circle" alt="blue-t-shirt-2" />
                                        <div className="flex flex-column gap-1">
                                            <span className="text-sm font-medium text-900">Black Tshirt</span>
                                            <span className="text-sm text-900">Last Shipping Date</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 p-2 surface-0 shadow-1 border-round-md">
                                        <img src="/demo/images/product/black-watch.jpg" className="w-2rem h-2rem border-circle" alt="black-watch-2" />
                                        <div className="flex flex-column gap-1">
                                            <span className="text-sm font-medium text-900">Black Watch</span>
                                            <span className="text-sm text-900">Last Shipping Date</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 p-2 surface-0 shadow-1 border-round-md">
                                        <img src="/demo/images/product/bamboo-watch.jpg" className="w-2rem h-2rem border-circle" alt="bamboo-watch-2" />
                                        <div className="flex flex-column gap-1">
                                            <span className="text-sm font-medium text-900">Blue T-Shirt</span>
                                            <span className="text-sm text-900">Last Shipping Date</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default DashboardAnalytics;
