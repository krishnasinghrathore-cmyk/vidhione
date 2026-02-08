'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { Chart } from 'primereact/chart';
import { ChartData, ChartOptions } from 'chart.js';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Timeline } from 'primereact/timeline';
import { ProductService } from '@/demo/service/ProductService';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { classNames } from 'primereact/utils';
import { Demo } from '@/types/demo';

let overviewChartData1: ChartData;
let overviewChartData2: ChartData;
let overviewChartData3: ChartData;
let overviewChartData4: ChartData;

let overviewChartOptions = {
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
    }
};

let ordersChart = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
    datasets: [
        {
            label: 'New Orders',
            data: [31, 83, 69, 29, 62, 25, 59, 26, 46],
            borderColor: ['#4DD0E1'],
            backgroundColor: ['rgba(77, 208, 225, 0.8)'],
            borderWidth: 2,
            fill: true,
            tension: 0.4
        },
        {
            label: 'Completed Orders',
            data: [67, 98, 27, 88, 38, 3, 22, 60, 56],
            borderColor: ['#3F51B5'],
            backgroundColor: ['rgba(63, 81, 181, 0.8)'],
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }
    ]
};

function Dashboard() {
    const [products, setProducts] = useState<Demo.Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Demo.Product | null>(null);
    const [ordersOptions, setOrdersOptions] = useState<ChartOptions | null>(null);
    const [chatMessages, setChatMessages] = useState([
        {
            from: 'Ioni Bowcher',
            url: '/demo/images/avatar/ionibowcher.png',
            messages: ['Hey M. hope you are well.', 'Our idea is accepted by the board. Now it’s time to execute it']
        },
        { messages: ['We did it! 🤠'] },
        {
            from: 'Ioni Bowcher',
            url: '/demo/images/avatar/ionibowcher.png',
            messages: ["That's really good!"]
        },
        { messages: ['But it’s important to ship MVP ASAP'] },
        {
            from: 'Ioni Bowcher',
            url: '/demo/images/avatar/ionibowcher.png',
            messages: ['I’ll be looking at the process then, just to be sure 🤓']
        },
        { messages: ['That’s awesome. Thanks!'] }
    ]);
    const menu1 = useRef<Menu | null>(null);
    const menu2 = useRef<Menu | null>(null);
    const menu3 = useRef<Menu | null>(null);
    const menu4 = useRef<Menu | null>(null);
    const menu5 = useRef<Menu | null>(null);
    const menu6 = useRef<Menu | null>(null);
    const menu7 = useRef<Menu | null>(null);
    const menu8 = useRef<Menu | null>(null);
    const menu9 = useRef<Menu | null>(null);
    const menu10 = useRef<Menu | null>(null);
    const chatcontainer = useRef<HTMLUListElement | null>(null);
    const chatInput = useRef<HTMLInputElement | null>(null);
    const op = useRef<OverlayPanel | null>(null);
    const { layoutConfig } = useContext(LayoutContext);
    const chatEmojis = [
        '😀',
        '😃',
        '😄',
        '😁',
        '😆',
        '😅',
        '😂',
        '🤣',
        '😇',
        '😉',
        '😊',
        '🙂',
        '🙃',
        '😋',
        '😌',
        '😍',
        '🥰',
        '😘',
        '😗',
        '😙',
        '😚',
        '🤪',
        '😜',
        '😝',
        '😛',
        '🤑',
        '😎',
        '🤓',
        '🧐',
        '🤠',
        '🥳',
        '🤗',
        '🤡',
        '😏',
        '😶',
        '😐',
        '😑',
        '😒',
        '🙄',
        '🤨',
        '🤔',
        '🤫',
        '🤭',
        '🤥',
        '😳',
        '😞',
        '😟',
        '😠',
        '😡',
        '🤬',
        '😔',
        '😟',
        '😠',
        '😡',
        '🤬',
        '😔',
        '😕',
        '🙁',
        '😬',
        '🥺',
        '😣',
        '😖',
        '😫',
        '😩',
        '🥱',
        '😤',
        '😮',
        '😱',
        '😨',
        '😰',
        '😯',
        '😦',
        '😧',
        '😢',
        '😥',
        '😪',
        '🤤'
    ];

    const timelineEvents = [
        {
            status: 'Ordered',
            date: '15/10/2020 10:30',
            icon: 'pi pi-shopping-cart',
            color: '#E91E63',
            description: 'Richard Jones (C8012) has ordered a blue t-shirt for $79.'
        },
        {
            status: 'Processing',
            date: '15/10/2020 14:00',
            icon: 'pi pi-cog',
            color: '#FB8C00',
            description: 'Order #99207 has processed succesfully.'
        },
        {
            status: 'Shipped',
            date: '15/10/2020 16:15',
            icon: 'pi pi-compass',
            color: '#673AB7',
            description: 'Order #99207 has shipped with shipping code 2222302090.'
        },
        {
            status: 'Delivered',
            date: '16/10/2020 10:00',
            icon: 'pi pi-check-square',
            color: '#0097A7',
            description: 'Richard Jones (C8012) has recieved his blue t-shirt.'
        }
    ];

    const getOverviewColors = () => {
        const isLight = layoutConfig.colorScheme === 'light';
        return {
            pinkBorderColor: isLight ? '#E91E63' : '#EC407A',
            pinkBgColor: isLight ? '#F48FB1' : '#F8BBD0',
            tealBorderColor: isLight ? '#009688' : '#26A69A',
            tealBgColor: isLight ? '#80CBC4' : '#B2DFDB'
        };
    };

    const getOverviewChartData1 = (): ChartData<'line'> => {
        const { tealBorderColor, tealBgColor } = getOverviewColors();

        return {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [50, 64, 32, 24, 18, 27, 20, 36, 30],
                    borderColor: [tealBorderColor],
                    backgroundColor: [tealBgColor],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    };
    const getOverviewChartData2 = (): ChartData<'line'> => {
        const { tealBorderColor, tealBgColor } = getOverviewColors();

        return {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [11, 30, 52, 35, 39, 20, 14, 18, 29],
                    borderColor: [tealBorderColor],
                    backgroundColor: [tealBgColor],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    };
    const getOverviewChartData3 = (): ChartData<'line'> => {
        const { pinkBorderColor, pinkBgColor } = getOverviewColors();

        return {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [20, 29, 39, 36, 45, 24, 28, 20, 15],
                    borderColor: [pinkBorderColor],
                    backgroundColor: [pinkBgColor],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    };
    const getOverviewChartData4 = (): ChartData<'line'> => {
        const { tealBorderColor, tealBgColor } = getOverviewColors();

        return {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [30, 39, 50, 21, 33, 18, 10, 24, 20],
                    borderColor: [tealBorderColor],
                    backgroundColor: [tealBgColor],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    };

    useEffect(() => {
        ProductService.getProductsSmall().then((data) => setProducts(data));
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const gridLinesColor = documentStyle.getPropertyValue('--divider-color') || 'rgba(160, 167, 181, .3)';
        const fontFamily = documentStyle.getPropertyValue('--font-family');
        overviewChartData1 = getOverviewChartData1();
        overviewChartData2 = getOverviewChartData2();
        overviewChartData3 = getOverviewChartData3();
        overviewChartData4 = getOverviewChartData4();
        setOrdersOptions({
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
            }
        });
         
    }, [layoutConfig]);

    const onEmojiOverlayPanel = (emoji: string) => {
        op.current?.hide();
        onEmojiClick(chatInput, emoji);
    };

    const onEmojiClick = (chatInput: React.MutableRefObject<HTMLInputElement | null>, emoji: string) => {
        if (chatInput) {
            chatInput!.current!.value += emoji;
            chatInput!.current!.focus();
        }
    };

    const onChatKeydown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            let message = event.currentTarget.value;
            let newChatMessages = [...chatMessages];
            let lastMessage = newChatMessages[newChatMessages.length - 1];

            if (lastMessage.from) {
                newChatMessages.push({ messages: [message] });
                setChatMessages(newChatMessages);
            } else {
                lastMessage.messages.push(message);
                setChatMessages(newChatMessages);
            }

            if (message.match(/primeng|primereact|primefaces|primevue/i)) {
                newChatMessages.push({
                    from: 'Ioni Bowcher',
                    url: '/demo/images/avatar/ionibowcher.png',
                    messages: ['Always bet on Prime!']
                });
                setChatMessages(newChatMessages);
            }

            event.currentTarget.value = '';

            const el = chatcontainer.current;
            setTimeout(() => {
                el?.scroll({
                    top: el.scrollHeight,
                    behavior: 'smooth'
                });
            }, 1);
        }
    };

    const marker = (item: any) => {
        return (
            <span className="border-round-md shadow-2 p-2" style={{ backgroundColor: item.color }}>
                <i className={classNames('text-white', item.icon)}></i>
            </span>
        );
    };

    const content = (item: any) => {
        return (
            <Card className="mb-3" title={item.status} subTitle={item.date}>
                {item.image && <img src={`showcase/demo/images/product/${item.image}`} alt={item.name} width={200} className="shadow-2" />}
                <p>{item.description}</p>
            </Card>
        );
    };
    const imageTemplate = (rowData: Demo.Product) => {
        var src = '/demo/images/product/' + rowData.image;
        return <img src={src} alt={rowData.brand as string} width="50px" className="shadow-4" />;
    };

    const actionTemplate = () => {
        return (
            <>
                <span className="p-column-title">View</span>
                <Button icon="pi pi-search" type="button" className="mr-2"></Button>
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

    const formatCurrency = (value: number) => {
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    };

    return (
        <div className="grid">
            <div className="col-12 md:col-6 lg:col-3">
                <div className="card flex flex-column">
                    <div className="flex align-items-center text-gray-700">
                        <i className="pi pi-shopping-cart text-color"></i>
                        <h6 className="m-0 text-color pl-2">Orders</h6>
                        <div className="ml-auto">
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text onClick={(event) => menu1.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu1}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div className="flex justify-content-between mt-3 flex-wrap">
                        <div className="flex flex-column" style={{ width: '80px' }}>
                            <span className="mb-1 text-4xl">640</span>
                            <span className="font-medium border-round-xs text-white p-1 bg-teal-500 text-sm">1420 Completed</span>
                        </div>
                        <div className="flex align-items-end">
                            <Chart type="line" data={overviewChartData1} options={overviewChartOptions} height="60" width="160"></Chart>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 md:col-6 lg:col-3">
                <div className="card flex flex-column">
                    <div className="flex align-items-center text-gray-700">
                        <i className="pi pi-dollar text-color"></i>
                        <h6 className="m-0 text-color pl-2">Revenue</h6>
                        <div className="ml-auto">
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text onClick={(event) => menu2.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu2}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div className="flex justify-content-between mt-3 flex-wrap">
                        <div className="flex flex-column" style={{ width: '80px' }}>
                            <span className="mb-1 text-4xl">$57K</span>
                            <span className="font-medium border-round-xs text-white p-1 bg-teal-500 text-sm">$9,640 Income</span>
                        </div>
                        <div className="flex align-items-end">
                            <Chart type="line" data={overviewChartData2} options={overviewChartOptions} height="60px" width="160px"></Chart>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 md:col-6 lg:col-3">
                <div className="card flex flex-column">
                    <div className="flex align-items-center text-gray-700">
                        <i className="pi pi-users text-color"></i>
                        <h6 className="m-0 text-color pl-2">Customers</h6>
                        <div className="ml-auto">
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text onClick={(event) => menu3.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu3}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div className="flex justify-content-between mt-3 flex-wrap">
                        <div className="flex flex-column" style={{ width: '80px' }}>
                            <span className="mb-1 text-4xl">8572</span>
                            <span className="font-medium border-round-xs text-white p-1 bg-pink-500 text-sm">25402 Registered</span>
                        </div>
                        <div className="flex align-items-end">
                            <Chart type="line" data={overviewChartData3} options={overviewChartOptions} height="60px" width="160px"></Chart>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 md:col-6 lg:col-3">
                <div className="card flex flex-column">
                    <div className="flex align-items-center text-gray-700">
                        <i className="pi pi-comments text-color"></i>
                        <h6 className="m-0 text-color pl-2">Comments</h6>
                        <div className="ml-auto">
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text className="p-button-plain" onClick={(event) => menu4.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu4}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div className="flex justify-content-between mt-3 flex-wrap">
                        <div className="flex flex-column" style={{ width: '80px' }}>
                            <span className="mb-1 text-4xl">805</span>
                            <span className="font-medium border-round-xs text-white p-1 bg-teal-500 text-sm">85 Responded</span>
                        </div>
                        <div className="flex align-items-end">
                            <Chart type="line" data={overviewChartData4} options={overviewChartOptions} height="60px" width="160px"></Chart>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 lg:col-6">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5 className="m-0">Contact</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text className="p-button-plain" onClick={(event) => menu5.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu5}
                                popup
                                model={[
                                    { label: 'New', icon: 'pi pi-fw pi-plus' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
                                    { label: 'Delete', icon: 'pi pi-fw pi-trash' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <ul className="p-0 m-0 border-none list-none">
                        <li className="flex align-items-center py-3">
                            <div className="flex align-items-center">
                                <img src="/demo/images/avatar/xuxuefeng.png" alt="xuxuefeng" />
                                <div className="ml-2">
                                    <div>Xuxue Feng</div>
                                    <small className="text-color-secondary">feng@vidhione.org</small>
                                </div>
                            </div>
                            <span className="bg-indigo-500 p-1 font-medium text-white border-round-xs text-sm ml-auto">Accounting</span>
                            <span className="bg-orange-500 p-1 text-sm font-medium text-white border-round-xs ml-2">Sales</span>
                        </li>

                        <li className="flex align-items-center py-3">
                            <div className="flex align-items-center">
                                <img src="/demo/images/avatar/elwinsharvill.png" alt="elwinsharvill" />
                                <div className="ml-2">
                                    <div>Elwin Sharvill</div>
                                    <small className="text-color-secondary">sharvill@vidhione.org</small>
                                </div>
                            </div>
                            <span className="bg-teal-500 p-1 text-sm font-medium text-white border-round-xs ml-auto">Finance</span>
                            <span className="bg-orange-500 p-1 text-sm font-medium text-white border-round-xs ml-2">Sales</span>
                        </li>

                        <li className="flex align-items-center py-3">
                            <div className="flex align-items-center">
                                <img src="/demo/images/avatar/asiyajavayant.png" alt="asiyajavayant" />
                                <div className="ml-2">
                                    <div>Anna Fali</div>
                                    <small className="text-color-secondary">fali@vidhione.org</small>
                                </div>
                            </div>
                            <span className="bg-pink-500 p-1 text-sm font-medium text-white border-round-xs ml-auto">Management</span>
                        </li>

                        <li className="flex align-items-center py-3">
                            <div className="flex align-items-center">
                                <img src="/demo/images/avatar/ivanmagalhaes.png" alt="ivanmagalhaes" />
                                <div className="ml-2">
                                    <div>Jon Stone</div>
                                    <small className="text-color-secondary">stone@vidhione.org</small>
                                </div>
                            </div>
                            <span className="bg-pink-500 p-1 text-sm font-medium text-white border-round-xs ml-auto">Management</span>
                            <span className="bg-teal-500 p-1 text-sm font-medium text-white border-round-xs ml-2">Finance</span>
                        </li>

                        <li className="flex align-items-center py-3">
                            <div className="flex align-items-center">
                                <img src="/demo/images/avatar/stephenshaw.png" alt="stephenshaw" />
                                <div className="ml-2">
                                    <div>Stephen Shaw</div>
                                    <small className="text-color-secondary">shaw@vidhione.org</small>
                                </div>
                            </div>
                            <span className="bg-teal-500 p-1 text-sm font-medium text-white border-round-xs ml-auto">Finance</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="col-12 lg:col-6">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5>Order Graph</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text className="p-button-plain" onClick={(event) => menu6.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu6}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <Chart type="line" data={ordersChart} options={ordersOptions as ChartOptions} width="300"></Chart>
                </div>
            </div>
            <div className="col-12 lg:col-6">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5>Timeline</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text className="p-button-plain" onClick={(event) => menu7.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu7}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <Timeline value={timelineEvents} className="customized-timeline" align="left" marker={marker} content={content} />
                </div>
            </div>
            <div className="col-12 md:col-12 lg:col-6">
                <div className="card h-full">
                    <DataTable value={products} paginator rows={8} className="p-datatable-products" selection={selectedProduct as Demo.Product} onSelectionChange={(e) => setSelectedProduct(e.value)}>
                        <Column header="Image" body={imageTemplate} style={{ width: '5rem' }} />
                        <Column field="name" body={bodyTemplate} header="Name" sortable />
                        <Column field="category" body={bodyTemplate} header="Category" sortable />
                        <Column field="price" body={priceBodyTemplate} header="Price" sortable />
                        <Column header="View" body={actionTemplate} style={{ width: '4rem' }} />
                    </DataTable>
                </div>
            </div>
            <div className="col-12 lg:col-6">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5>Chat</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text className="p-button-plain" onClick={(event) => menu8.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu8}
                                popup
                                model={[
                                    { label: 'View Media', icon: 'pi pi-fw pi-images' },
                                    { label: 'Starred Messages', icon: 'pi pi-fw pi-star' },
                                    { label: 'Search', icon: 'pi pi-fw pi-search' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <div>
                        <ul ref={chatcontainer} className="m-0 px-3 pt-3 pb-0 border-none list-none h-30rem overflow-y-auto outline-none">
                            {chatMessages.map((chartMessage, i) => {
                                const last = i === chatMessages.length - 1;
                                return (
                                    <li key={i} className={classNames('flex align-items-start', { from: !!chartMessage.from, 'text-right justify-content-end': !chartMessage.from, 'mb-3': !last, 'mb-1': last })}>
                                        {!!chartMessage.url && <img src={chartMessage.url} alt="avatar" width="32px" className="mr-2" />}
                                        <div className={classNames('flex flex-column', { 'align-items-start': !!chartMessage.from, 'align-items-end': !chartMessage.from })}>
                                            {chartMessage.messages.map((message, i) => {
                                                const first = i === 0;
                                                return (
                                                    <span
                                                        key={i}
                                                        style={{ wordBreak: 'break-word' }}
                                                        className={classNames('p-3 border-round-3xl text-white', { 'bg-cyan-500': !!chartMessage.from, 'bg-pink-500': !chartMessage.from, 'mt-1': !first })}
                                                    >
                                                        {message}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="p-inputgroup mt-3">
                            <span className="p-inputgroup-addon p-0 overflow-hidden border-round-3xl border-noround-right">
                                <Button type="button" icon="pi pi-plus-circle" text className="p-button-plain h-full"></Button>
                            </span>
                            <InputText ref={chatInput} placeholder="Write your message (Hint: 'PrimeReact')" onKeyDown={onChatKeydown} />
                            <span className="p-inputgroup-addon p-0 overflow-hidden">
                                <Button type="button" icon="pi pi-video" text className="p-button-plain h-full"></Button>
                            </span>
                            <span className="p-inputgroup-addon p-0 overflow-hidden border-round-3xl border-noround-left">
                                <Button type="button" icon="pi pi-clock" onClick={(e) => op.current?.toggle(e)} text className="p-button-plain h-full"></Button>
                                <OverlayPanel ref={op} className="emoji">
                                    {chatEmojis.map((emoji, i) => {
                                        return <Button key={i} type="button" label={emoji} onClick={(e) => onEmojiOverlayPanel(emoji)} text className="emoji-button p-2 p-button-plain"></Button>;
                                    })}
                                </OverlayPanel>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 lg:col-3">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5>Activity</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text className="p-button-plain" onClick={(event) => menu9.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu9}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <ul className="widget-activity p-0 list-none">
                        <li className="py-3 px-0 border-bottom-1 surface-border">
                            <div className="activity-item flex flex-column">
                                <div className="font-medium mb-1">Income</div>
                                <div className="text-sm text-color-secondary mb-2">30 November, 16.20</div>
                                <div className="surface-50" style={{ height: '6px' }}>
                                    <div className="bg-yellow-500 w-6 h-full border-round-lg"></div>
                                </div>
                            </div>
                        </li>
                        <li className="py-3 px-0 border-bottom-1 surface-border">
                            <div className="activity-item flex flex-column">
                                <div className="font-medium mb-1">Tax</div>
                                <div className="text-sm text-color-secondary mb-2">1 December, 15.27</div>
                                <div className="surface-50" style={{ height: '6px' }}>
                                    <div className="bg-pink-500 w-6 h-full border-round-lg"></div>
                                </div>
                            </div>
                        </li>
                        <li className="py-3 px-0 border-bottom-1 surface-border">
                            <div className="activity-item flex flex-column">
                                <div className="font-medium mb-1">Invoices</div>
                                <div className="text-sm text-color-secondary mb-2">1 December, 15.28</div>
                                <div className="surface-50" style={{ height: '6px' }}>
                                    <div className="bg-cyan-600 w-6 h-full border-round-lg"></div>
                                </div>
                            </div>
                        </li>
                        <li className="py-3 px-0 border-bottom-1 surface-border">
                            <div className="activity-item flex flex-column">
                                <div className="font-medium mb-1">Expanses</div>
                                <div className="text-sm text-color-secondary mb-2">3 December, 09.15</div>
                                <div className="surface-50" style={{ height: '6px' }}>
                                    <div className="bg-cyan-600 w-6 h-full border-round-lg"></div>
                                </div>
                            </div>
                        </li>
                        <li className="py-3 px-0 border-bottom-1 surface-border">
                            <div className="activity-item flex flex-column">
                                <div className="font-medium mb-1">Bonus</div>
                                <div className="text-sm text-color-secondary mb-2">1 December, 23.55</div>
                                <div className="surface-50" style={{ height: '6px' }}>
                                    <div className="bg-cyan-600 w-6 h-full border-round-lg"></div>
                                </div>
                            </div>
                        </li>
                        <li className="py-3 px-0">
                            <div className="activity-item flex flex-column">
                                <div className="font-medium mb-1">Revenue</div>
                                <div className="text-sm text-color-secondary mb-2">30 November, 16.20</div>
                                <div className="surface-50" style={{ height: '6px' }}>
                                    <div className="bg-pink-500 w-6 h-full border-round-lg"></div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="col-12 lg:col-3">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h5>Best Sellers</h5>
                        <div>
                            <Button type="button" icon="pi pi-ellipsis-h" rounded text className="p-button-plain" onClick={(event) => menu10.current?.toggle(event)}></Button>
                            <Menu
                                ref={menu10}
                                popup
                                model={[
                                    { label: 'Update', icon: 'pi pi-fw pi-refresh' },
                                    { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
                                ]}
                            ></Menu>
                        </div>
                    </div>
                    <ul className="m-0 p-0 border-none outline-none list-none">
                        <li className="py-3 px-0">
                            <div className="border-round-sm h-4rem surface-200 transition-transform transition-duration-200 flex align-items-center p-3 mb-2 cursor-pointer hover:surface-100">
                                <img width="32px" height="32px" className="border-circle mr-3" src="/demo/images/product/blue-band.jpg" alt="product" />
                                <span>Blue Band</span>
                                <span className="ml-auto">
                                    <a href="#">
                                        <i className="pi pi-chevron-right text-color-secondary"></i>
                                    </a>
                                </span>
                            </div>

                            <div className="border-round-sm h-4rem surface-200 transition-transform transition-duration-200 flex align-items-center p-3 mb-2 cursor-pointer hover:surface-100">
                                <img width="32px" height="32px" className="border-circle mr-3" src="/demo/images/product/bracelet.jpg" alt="product" />
                                <span>Bracelet</span>
                                <span className="ml-auto">
                                    <a href="#">
                                        <i className="pi pi-chevron-right text-color-secondary"></i>
                                    </a>
                                </span>
                            </div>

                            <div className="border-round-sm h-4rem surface-200 transition-transform transition-duration-200 flex align-items-center p-3 mb-2 cursor-pointer hover:surface-100">
                                <img width="32px" height="32px" className="border-circle mr-3" src="/demo/images/product/black-watch.jpg" alt="product" />
                                <span>Black Watch</span>
                                <span className="ml-auto">
                                    <a href="#">
                                        <i className="pi pi-chevron-right text-color-secondary"></i>
                                    </a>
                                </span>
                            </div>

                            <div className="border-round-sm h-4rem surface-200 transition-transform transition-duration-200 flex align-items-center p-3 mb-2 cursor-pointer hover:surface-100">
                                <img width="32px" height="32px" className="border-circle mr-3" src="/demo/images/product/bamboo-watch.jpg" alt="product" />
                                <span>Bamboo Watch</span>
                                <span className="ml-auto">
                                    <a href="#">
                                        <i className="pi pi-chevron-right text-color-secondary"></i>
                                    </a>
                                </span>
                            </div>

                            <div className="border-round-sm h-4rem surface-200 transition-transform transition-duration-200 flex align-items-center p-3 mb-2 cursor-pointer hover:surface-100">
                                <img width="32px" height="32px" className="border-circle mr-3" src="/demo/images/product/blue-t-shirt.jpg" alt="product" />
                                <span>Blue T-Shirt</span>
                                <span className="ml-auto">
                                    <a href="#">
                                        <i className="pi pi-chevron-right text-color-secondary"></i>
                                    </a>
                                </span>
                            </div>

                            <div className="border-round-sm h-4rem surface-200 transition-transform transition-duration-200 flex align-items-center p-3 mb-2 cursor-pointer hover:surface-100">
                                <img width="32px" height="32px" className="border-circle mr-3" src="/demo/images/product/game-controller.jpg" alt="product" />
                                <span>Game Controller</span>
                                <span className="ml-auto">
                                    <a href="#">
                                        <i className="pi pi-chevron-right text-color-secondary"></i>
                                    </a>
                                </span>
                            </div>

                            <div className="border-round-sm h-4rem surface-200 transition-transform transition-duration-200 flex align-items-center p-3 mb-2 cursor-pointer hover:surface-100">
                                <img width="32px" height="32px" className="border-circle mr-3" src="/demo/images/product/gold-phone-case.jpg" alt="product" />
                                <span>Phone Case</span>
                                <span className="ml-auto">
                                    <a href="#">
                                        <i className="pi pi-chevron-right text-color-secondary"></i>
                                    </a>
                                </span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
