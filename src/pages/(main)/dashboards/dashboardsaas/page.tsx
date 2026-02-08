'use client';
import React, { useContext, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Chart } from 'primereact/chart';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { ChartData, ChartOptions } from 'chart.js';
import { Knob } from 'primereact/knob';
import { Checkbox } from 'primereact/checkbox';
import { Avatar } from 'primereact/avatar';
import { AvatarGroup } from 'primereact/avatargroup';
import { classNames } from 'primereact/utils';
import { Tag } from 'primereact/tag';
import { Demo } from '@/types/demo';
import { AppTopbarRef } from '@/types/layout';

let chartData: ChartData = {
    labels: ['January', 'February', 'March', 'April', 'May'],
    datasets: [
        {
            label: 'Previous Month',
            borderColor: '#E0E0E0',
            tension: 0.5,
            data: [22, 36, 11, 33, 2]
        },
        {
            label: 'Current Month',
            borderColor: '#6366F1',
            tension: 0.5,
            data: [22, 16, 31, 11, 38]
        }
    ]
};

export default function DashboardSaas() {
    const [chartOptions, setChartOptions] = useState<ChartOptions>({});
    const [completeTask, setCompleteTask] = useState(1);
    const [selectedProjectID, setSelectedProjectID] = useState(1);
    const [selectedTeam, setSelectedTeam] = useState('UX Researchers');
    const [filteredTeamMembers, setFilteredTeamMembers] = useState<Demo.TeamMember[]>([]);
    const { layoutConfig } = useContext(LayoutContext);
    const [dailyTasks, setDailyTasks] = useState<Demo.DailyTask[]>([
        {
            id: 1,
            checked: true,
            label: 'Prepare personas',
            description: 'Create profiles of fictional users representing target audience for product or service.',
            avatar: '/demo/images/avatar/circle/avatar-f-6.png',
            borderColor: 'border-pink-500'
        },
        {
            id: 2,
            checked: false,
            label: 'Prepare a user journey map',
            description: 'Visual representation of steps a user takes to accomplish a goal within product or service.',
            avatar: '/demo/images/avatar/circle/avatar-f-7.png',
            borderColor: 'border-purple-500'
        },
        {
            id: 3,
            checked: false,
            label: 'Prepare wireframes for onboarding screen',
            description: 'Create low-fidelity mockups of onboarding screen. Include layout, hierarchy, functionality.',
            avatar: '/demo/images/avatar/circle/avatar-f-8.png',
            borderColor: 'border-blue-500'
        },
        {
            id: 4,
            checked: false,
            label: 'Review benchmarks',
            description: 'Conduct research on similar products or services to understand market standards and identify opportunities.',
            avatar: '/demo/images/avatar/circle/avatar-f-9.png',
            borderColor: 'border-green-500'
        },
        {
            id: 5,
            checked: false,
            label: 'Let a plan with UI Team',
            description: 'Collaborate with UI design team to create plan for visual design of product or service.',
            avatar: '/demo/images/avatar/circle/avatar-f-10.png',
            borderColor: 'border-yellow-500'
        }
    ]);

    const teamMembers: Demo.TeamMember[] = [
        {
            avatar: '/demo/images/avatar/circle/avatar-f-1.png',
            name: 'Theresa Webb',
            title: 'UX Researchers',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'UX Researchers'
        },
        {
            avatar: '/demo/images/avatar/circle/avatar-f-2.png',
            name: 'Courtney Henry',
            title: 'President of Sales',
            taskCount: 22,
            doneCount: 11,
            sprintCount: 3,
            onProjectsCount: 12,
            team: 'UX Researchers'
        },
        {
            avatar: '/demo/images/avatar/circle/avatar-f-3.png',
            name: 'Kathryn Murphy',
            title: 'Web Designer',
            taskCount: 21,
            doneCount: 33,
            sprintCount: 11,
            onProjectsCount: 44,
            team: 'UX Researchers'
        },
        {
            avatar: '/demo/images/avatar/circle/avatar-f-4.png',
            name: 'Diana Ross',
            title: 'Project Manager',
            taskCount: 34,
            doneCount: 11,
            sprintCount: 45,
            onProjectsCount: 23,
            team: 'UX Researchers'
        },
        {
            avatar: '/demo/images/avatar/circle/avatar-f-5.png',
            name: 'Emily Smith',
            title: 'Software Engineer',
            taskCount: 22,
            doneCount: 3,
            sprintCount: 12,
            onProjectsCount: 1,
            team: 'UX Researchers'
        },
        {
            avatar: '/demo/images/avatar/circle/avatar-f-6.png',
            name: 'Olivia Johnson',
            title: 'Human Resources Manager',
            taskCount: 54,
            doneCount: 23,
            sprintCount: 29,
            onProjectsCount: 14,
            team: 'UX Researchers'
        },
        {
            avatar: '/demo/images/avatar/circle/avatar-f-7.png',
            name: 'Sarah Williams',
            title: 'Marketing Specialist',
            taskCount: 46,
            doneCount: 33,
            sprintCount: 12,
            onProjectsCount: 14,
            team: 'UX Researchers'
        },
        {
            avatar: '/demo/images/avatar/circle/avatar-f-8.png',
            name: 'Madison Davis',
            title: 'Graphic Designer',
            taskCount: 23,
            doneCount: 55,
            sprintCount: 31,
            onProjectsCount: 15,
            team: 'UX Researchers'
        },

        {
            avatar: '/demo/images/avatar/circle/avatar-f-9.png',
            name: 'Abigail Rodriguez',
            title: 'Content Writer',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'UX Designers'
        },

        {
            avatar: '/demo/images/avatar/circle/avatar-f-10.png',
            name: 'Elizabeth Taylor',
            title: 'Customer Support Representative',
            taskCount: 12,
            doneCount: 32,
            sprintCount: 14,
            onProjectsCount: 16,
            team: 'UX Designers'
        },

        {
            avatar: '/demo/images/avatar/circle/avatar-f-11.png',
            name: 'Chloe Anderson',
            title: 'Financial Analyst',
            taskCount: 11,
            doneCount: 17,
            sprintCount: 12,
            onProjectsCount: 14,
            team: 'UI Designers'
        },

        {
            avatar: '/demo/images/avatar/circle/avatar-f-12.png',
            name: 'Sophia Lee',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'UI Designer'
        },

        {
            avatar: '/demo/images/avatar/circle/avatar-f-3.png',
            name: 'Aria Jackson',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'Front-End Developers'
        },

        {
            avatar: '/demo/images/avatar/circle/avatar-f-7.png',
            name: 'Aria Jackson',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'Front-End Developers'
        },

        {
            avatar: '/demo/images/avatar/circle/avatar-f-9.png',
            name: 'John Doe',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'Back-End Developers'
        }
    ];
    const projectList: Demo.ProjectList[] = [
        {
            id: 1,
            title: 'Vidhione Sales',
            totalTasks: 50,
            completedTask: 25
        },
        {
            id: 2,
            title: 'Vidhione Landing',
            totalTasks: 50,
            completedTask: 25
        },
        {
            id: 3,
            title: 'Vidhione SaaS',
            totalTasks: 50,
            completedTask: 25
        },
        {
            id: 4,
            title: 'Vidhione SaaS',
            totalTasks: 50,
            completedTask: 25
        },
        {
            id: 5,
            title: 'Vidhione SaaS',
            totalTasks: 50,
            completedTask: 25
        }
    ];
    const teams: Demo.Team[] = [
        {
            title: 'UX Researchers',
            avatar: ['/demo/images/avatar/circle/avatar-f-1.png', '/demo/images/avatar/circle/avatar-f-6.png', '/demo/images/avatar/circle/avatar-f-11.png', '/demo/images/avatar/circle/avatar-f-12.png'],
            avatarText: '+4',
            badgeClass: 'bg-pink-500'
        },
        {
            title: 'UX Designers',
            avatar: ['/demo/images/avatar/circle/avatar-f-2.png'],
            badgeClass: 'bg-blue-500'
        },
        {
            title: 'UI Designers',
            avatar: ['/demo/images/avatar/circle/avatar-f-3.png', '/demo/images/avatar/circle/avatar-f-8.png'],
            avatarText: '+1',
            badgeClass: 'bg-green-500'
        },
        {
            title: 'Front-End Developers',
            avatar: ['/demo/images/avatar/circle/avatar-f-4.png', '/demo/images/avatar/circle/avatar-f-9.png'],
            badgeClass: 'bg-yellow-500'
        },
        {
            title: 'Back-End Developers',
            avatar: ['/demo/images/avatar/circle/avatar-f-10.png'],
            badgeClass: 'bg-purple-500'
        }
    ];
    const teamFilter = (team: string) => {
        setSelectedTeam(team);
        setFilteredTeamMembers(teamMembers.filter((item) => item.team === team));
    };
    const changeChecked = (task: Demo.DailyTask) => {
        let _dailyTasks = dailyTasks.map((t) => {
            if (t.id === task.id) {
                return { ...t, checked: !t.checked };
            }
            return t;
        });

        setDailyTasks(_dailyTasks);
        setCompleteTask(_dailyTasks.filter((task) => task.checked).length);
    };

    useEffect(() => {
        setFilteredTeamMembers(teamMembers.filter((item) => item.team === selectedTeam));
         
    }, []);

    useEffect(() => {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const surfaceLight = documentStyle.getPropertyValue('--surface-100') || '#f5f5f5';
        setChartOptions({
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        boxWidth: 12,
                        boxHeight: 4
                    },
                    position: 'bottom'
                }
            },
            elements: { point: { radius: 0 } },
            scales: {
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: surfaceLight
                    }
                },
                y: {
                    ticks: {
                        color: textColor,
                        stepSize: 10
                    },
                    grid: {
                        color: surfaceLight
                    }
                }
            }
        });
    }, [layoutConfig]);

    return (
        <div className="grid dashboard mt-1">
            <div className="col-12 md:col-8">
                <div className="card h-full">
                    <div className="p-2 h-full flex flex-column justify-content-between">
                        <div className="flex align-items-center justify-content-between mb-3">
                            <div className="flex gap-3 flex-column justify-content-between w-full md:flex-row md:align-items-center">
                                <div className="flex gap-3 align-items-center">
                                    <div className="text-4xl">👋</div>
                                    <div className="flex flex-column gap-1 text-600">
                                        <span className="text-2xl font-semibold">
                                            Hi,<span className="text-color"> Amy!</span>
                                        </span>
                                        <span>
                                            Team Lead <span className="font-bold text-primary">@UX Designer</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <Button label="Enroll a Ticket" icon="pi pi-send" outlined></Button>
                                    <Button label="Upgrade Your Plan" icon="pi pi-chart-line"></Button>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-column gap-2 text-primary mt-4 md:mt-0">
                            <span className="font-bold text-sm">Done in Current Month</span>
                            <div className="grid grid-nogutter font-medium">
                                <span className="col-6 text-6xl md:col-3 flex align-items-center">
                                    72 <span className="text-base ml-2">tasks</span>
                                </span>
                                <span className="col-6 text-6xl md:col-3 flex align-items-center">
                                    4 <span className="text-base ml-2">production</span>
                                </span>
                                <span className="col-6 text-6xl md:col-3 flex align-items-center">
                                    18 <span className="text-base ml-2">tests</span>
                                </span>
                                <span className="col-6 text-6xl md:col-3 flex align-items-center">
                                    13 <span className="text-base ml-2">meetings</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 md:col-4">
                <div className="h-full bg-primary flex justify-content-between align-items-center pl-5 py-3 border-round-md overflow-hidden">
                    <div className="flex flex-column justify-content-center">
                        <div>
                            <span className="font-bold text-white text-sm">Carry your team on top</span>
                        </div>
                        <div>
                            <h5 className="font-bold text-white mt-1 text-4xl m-0">Upgrade Now</h5>
                        </div>
                        <div>
                            <Button icon="pi pi-database" label="See All Plans" outlined className="bg-white mt-3"></Button>
                        </div>
                    </div>
                    <div>
                        <img className="-mr-3" draggable={false} src="/demo/images/dashboard/saas-card.png" alt="" />
                    </div>
                </div>
            </div>
            <div className="col-12">
                <div className="card flex justify-content-between align-items-center">
                    <div className="p-2 h-full w-full flex flex-column justify-content-between">
                        <div className="flex align-items-center justify-content-between mb-3">
                            <span className="font-semibold text-lg text-900">My Workspace</span>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-4">
                                <div className="flex flex-column gap-3 border-round-md border-1 h-full surface-border py-4">
                                    <div className="flex justify-content-between align-items-center mx-4">
                                        <div className="flex align-items-center gap-3">
                                            <div>
                                                <Knob value={completeTask} showValue={false} size={36} rangeColor="#EEEEEE" readOnly max={5} />
                                            </div>
                                            <div className="flex flex-column justify-content-between gap-1">
                                                <span className="font-bold text-900">My Daily Tasks</span>
                                                <span className="text-color-secondary text-sm">
                                                    {' '}
                                                    <span className="font-bold">{completeTask}</span>/5 Tasks
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <Button icon="pi pi-plus" label="New Task" outlined></Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-column gap-2 h-21rem overflow-auto -mb-4">
                                        {dailyTasks.map((task) => (
                                            <div key={task.id} className="flex justify-content-between p-3 surface-50 cursor-pointer text-color-secondary border-round-md mx-4 hover:surface-card hover:shadow-2">
                                                <div className="flex gap-3">
                                                    <div>
                                                        <Checkbox onChange={() => changeChecked(task)} checked={task.checked} />
                                                    </div>
                                                    <div className="flex flex-column gap-2">
                                                        <span className="font-medium text-sm">{task.label}</span>
                                                        <div className="flex gap-2 align-items-center">
                                                            <i className="pi pi-align-left text-color-secondary"></i>
                                                            <i className="pi pi-file text-color-secondary"></i>
                                                            <i className="pi pi-image text-color-secondary"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="flex align-items-end">
                                                        <AvatarGroup>
                                                            <Avatar image={task.avatar} shape="circle"></Avatar>
                                                            <Avatar label="+2" shape="circle" className="surface-200 text-color-secondary"></Avatar>
                                                        </AvatarGroup>
                                                    </div>
                                                    <div className="flex align-items-center">
                                                        <i className="pi pi-ellipsis-h text-color-secondary"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="flex flex-column gap-3 border-round-md border-1 h-full surface-border p-4">
                                    <div className="flex justify-content-between align-items-center">
                                        <div className="flex align-items-center gap-3">
                                            <div>
                                                <i className="pi pi-chart-bar text-primary text-3xl"></i>
                                            </div>
                                            <div className="flex flex-column justify-content-between gap-1">
                                                <span className="font-bold text-900">My Performance</span>
                                            </div>
                                        </div>
                                        <div className="flex align-items-center gap-1">
                                            <div className="flex align-items-center justify-content-center gap-1 border-round-md p-2 bg-red-100 text-red-400">
                                                <i className="pi pi-arrow-down-right"></i>
                                                <span>-13%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-column gap-2 h-21rem -mb-4 relative">
                                        <Chart height="195" type="line" data={chartData} options={chartOptions}></Chart>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="flex flex-column gap-3 border-round-md border-1 h-full surface-border py-4">
                                    <div className="flex justify-content-between align-items-center mx-4">
                                        <div className="flex align-items-center gap-3">
                                            <div>
                                                <i className="pi pi-calendar text-primary text-3xl"></i>
                                            </div>
                                            <div className="flex flex-column justify-content-between gap-1">
                                                <span className="font-bold text-900">My Calendar</span>
                                                <span className="text-color-secondary text-sm">
                                                    <span className="font-bold">19</span> Events on this month
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex align-items-center gap-1">
                                            <Button icon="pi pi-filter" outlined></Button>
                                            <Button icon="pi pi-plus" outlined></Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-column gap-2 h-21rem overflow-auto -mb-4">
                                        {dailyTasks.map((task) => (
                                            <div key={task.id} className={classNames('flex justify-content-between px-3 py-2 border-left-2 cursor-pointer mx-4 border-round-md surface-50 hover:shadow-2 hover:surface-card', task.borderColor)}>
                                                <div className="flex justify-content-between gap-3">
                                                    <div className="flex flex-column justify-content-center gap-2">
                                                        <span className="font-medium text-base text-color">{task.label}</span>
                                                        <span className="text-color-secondary text-sm">{task.description}</span>
                                                        <span className="flex align-items-center font-medium gap-1 text-color-secondary text-xs">
                                                            <i className="pi pi-clock"></i> 10:30 AM
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex align-items-center">
                                                    <i className="pi pi-ellipsis-h text-color-secondary"></i>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12">
                <div className="card flex justify-content-between align-items-center">
                    <div className="p-2 h-full w-full flex flex-column justify-content-between">
                        <div className="flex align-items-center justify-content-between mb-3">
                            <span className="font-semibold text-lg text-900">Projects Overview</span>
                            <div className="flex align-items-center gap-2">
                                <Button label="Organize Teams" icon="pi pi-sliders-h" outlined></Button>
                                <Button label="New Project" icon="pi pi-plus-circle"></Button>
                            </div>
                        </div>
                        <div className="grid">
                            {projectList.map((project, i) => {
                                return (
                                    <React.Fragment key={project.id}>
                                        {i < 2 && (
                                            <div
                                                className={classNames('col-12 md:col-4', {
                                                    'hidden md:block': i < 1
                                                })}
                                            >
                                                <div
                                                    onClick={() => setSelectedProjectID(project.id)}
                                                    className={classNames('flex flex-column border-1 surface-border justify-content-between p-3 gap-3 cursor-pointer border-round-md', {
                                                        'bg-primary border-0': selectedProjectID === project.id
                                                    })}
                                                >
                                                    <div className="flex justify-content-between align-items-center">
                                                        <div className="flex gap-2 font-bold text-sm align-items-center">
                                                            <i
                                                                className={classNames('pi pi-star-fill', {
                                                                    'text-primary': selectedProjectID !== project.id
                                                                })}
                                                            ></i>
                                                            <span>{project.title}</span>
                                                        </div>
                                                        <div className="flex gap-2 text-sm align-items-center text-xs font-bold">
                                                            <div
                                                                className={classNames('surface-200 p-1 px-2 flex font-medium gap-2 border-round-md', {
                                                                    'bg-primary-600': selectedProjectID === project.id
                                                                })}
                                                            >
                                                                <span
                                                                    className={classNames({
                                                                        'text-color-secondary': selectedProjectID !== project.id
                                                                    })}
                                                                >
                                                                    25 July
                                                                </span>
                                                                <i
                                                                    className={classNames('pi pi-arrow-right', {
                                                                        'text-color-secondary': selectedProjectID !== project.id
                                                                    })}
                                                                ></i>
                                                                <span
                                                                    className={classNames({
                                                                        'text-color-secondary': selectedProjectID !== project.id
                                                                    })}
                                                                >
                                                                    25 Aug
                                                                </span>
                                                            </div>
                                                            <i
                                                                className={classNames('pi pi-ellipsis-h', {
                                                                    'text-color-secondary': selectedProjectID !== project.id
                                                                })}
                                                            ></i>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 align-items-center">
                                                        <span
                                                            className={classNames('text-sm', {
                                                                'text-color-secondary': selectedProjectID !== project.id
                                                            })}
                                                        >
                                                            <span className="font-bold">{project.completedTask}</span>/{project.totalTasks} Tasks
                                                        </span>
                                                        <div
                                                            className={classNames('surface-200 w-full border-round-lg', {
                                                                'bg-primary-700': selectedProjectID === project.id
                                                            })}
                                                        >
                                                            <div
                                                                style={{ height: '6px' }}
                                                                className={classNames('surface-0 w-5 border-round-left-lg', {
                                                                    'bg-primary-700': selectedProjectID !== project.id
                                                                })}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            <div className="col-12 md:col-4">
                                <div className="flex justify-content-between align-items-center p-3 cursor-pointer border-1 surface-border border-round-md h-full">
                                    <div className="flex flex-column gap-2">
                                        <span>Other Projects</span>
                                        <Tag value="+5 Projects"></Tag>
                                    </div>
                                    <i className="pi pi-chevron-down"></i>
                                </div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="border-1 surface-border p-3 border-round-md flex flex-column gap-3">
                                    <div className="flex justify-content-between align-items-center">
                                        <div className="flex flex-column gap-1">
                                            <span className="font-semibold text-900 text-lg">Teams</span>
                                            <span className="text-sm text-color-secondary">18 Members</span>
                                        </div>
                                        <Button label="New Team" icon="pi pi-users"></Button>
                                    </div>
                                    <div className="flex flex-column gap-1">
                                        {teams.map((team, i) => {
                                            return (
                                                <React.Fragment key={i}>
                                                    <div
                                                        key={team.title}
                                                        onClick={() => teamFilter(team.title)}
                                                        className={classNames('flex justify-content-between align-items-center border-1 border-transparent border-round-md p-3 -mx-2 cursor-pointer hover:surface-hover', {
                                                            'bg-primary-50 border-primary-100': selectedTeam === team.title,
                                                            'bg-primary-800 border-primary-100': selectedTeam == team.title && layoutConfig.colorScheme === 'dark'
                                                        })}
                                                    >
                                                        <div className="flex align-items-center gap-3">
                                                            <div style={{ width: '7px', height: '7px' }} className={classNames('border-circle', team.badgeClass)}></div>
                                                            <span>{team.title}</span>
                                                        </div>
                                                        <div className="flex gap-2 align-items-center">
                                                            <AvatarGroup>
                                                                {team.avatar.map((avatar, i) => {
                                                                    return <Avatar key={avatar} image={avatar} shape="circle"></Avatar>;
                                                                })}
                                                                <>{team.avatarText && <Avatar label={team.avatarText} shape="circle" className="surface-200 text-color-secondary" style={{ color: '#ffffff' }}></Avatar>}</>
                                                            </AvatarGroup>
                                                            {selectedTeam === team.title && <i className="pi pi-chevron-right text-primary"></i>}
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 md:col-8">
                                <div className="border-1 surface-border border-round-md h-28rem overflow-y-auto">
                                    {filteredTeamMembers.map((member, i) => {
                                        return (
                                            <React.Fragment key={member.avatar}>
                                                <div className="grid grid-nogutter align-items-center p-2 border-bottom-1 surface-border text-700 cursor-pointer hover:text-color">
                                                    <div className="col-4">
                                                        <div className="flex align-items-center gap-3">
                                                            <Avatar size="large" shape="circle" image={member.avatar}></Avatar>
                                                            <div className="flex flex-column flex-wrap">
                                                                <span className="font-medium">{member.name}</span>
                                                                <span className="text-sm">{member.title}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="flex justify-content-between gap-5 flex-1">
                                                            <div className="flex flex-column" style={{ flexBasis: '100%' }}>
                                                                <span className="font-medium">{member.taskCount}</span>
                                                                <span className="text-sm">Task</span>
                                                            </div>
                                                            <div className="flex flex-column" style={{ flexBasis: '100%' }}>
                                                                <span className="font-medium">{member.doneCount}</span>
                                                                <span className="text-sm">Done</span>
                                                            </div>
                                                            <div className="flex flex-column" style={{ flexBasis: '100%' }}>
                                                                <span className="font-medium">{member.sprintCount}</span>
                                                                <span className="text-sm">Sprint</span>
                                                            </div>
                                                            <div className="flex flex-column" style={{ flexBasis: '100%' }}>
                                                                <span className="font-medium">{member.onProjectsCount}</span>
                                                                <span className="text-sm">On Projects</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-2">
                                                        <div className="flex justify-content-end">
                                                            <Button className="text-900" rounded text icon="pi pi-ellipsis-h"></Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
