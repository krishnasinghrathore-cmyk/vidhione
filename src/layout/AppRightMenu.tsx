import { Sidebar } from 'primereact/sidebar';
import { useContext } from 'react';
import { LayoutContext } from './context/layoutcontext';

const AppProfileSidebar = () => {
    const { layoutState, setLayoutState, layoutConfig } = useContext(LayoutContext);

    const onRightMenuHide = () => {
        setLayoutState((prevLayoutState) => ({
            ...prevLayoutState,
            rightMenuActive: false
        }));
    };

    return (
        <Sidebar visible={layoutState.rightMenuActive} onHide={onRightMenuHide} baseZIndex={1000} position="right" showCloseIcon={false}>
            <div className="p-3">
                <div className="flex flex-column mb-5">
                    <h6 className="pb-2 mb-2 border-bottom-1 surface-border">ONLINE MEMBERS</h6>
                    <div className="flex flex-row flex-wrap gap-1">
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-1.png" alt="avatar-1" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-2.png" alt="avatar-2" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-3.png" alt="avatar-3" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-4.png" alt="avatar-4" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-5.png" alt="avatar-5" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-6.png" alt="avatar-6" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-7.png" alt="avatar-7" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-8.png" alt="avatar-8" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-9.png" alt="avatar-9" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-10.png" alt="avatar-10" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-11.png" alt="avatar-11" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-12.png" alt="avatar-12" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-13.png" alt="avatar-13" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-14.png" alt="avatar-14" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-15.png" alt="avatar-15" />
                        <img className="cursor-pointer" style={{ width: '32px' }} src="/demo/images/avatar/avatar-16.png" alt="avatar-16" />
                    </div>
                    <span className="mt-3">
                        <b className="text-primary">+19</b> Costumers
                    </span>
                </div>

                <div className="flex flex-column mb-5">
                    <h6 className="pb-2 mb-2 border-bottom-1 surface-border">LATEST ACTIVITY</h6>
                    <div className="flex pt-2">
                        <i className="pi pi-images align-self-start p-2 border-1 border-transparent border-circle mr-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.12)' }}></i>
                        <div className="flex flex-column">
                            <span className="font-bold mb-1">New Sale</span>
                            <span className="mb-2 line-height-3">Richard Jones has purchased a blue t-shirt for $79.</span>
                            <span className="flex align-items-center">
                                <img className="mr-2" src="/layout/images/avatar/activity-1.png" alt="" />
                                <small>Emmy Adams, 21.40</small>
                            </span>
                        </div>
                    </div>
                    <div className="flex pt-3">
                        <i className="pi pi-images align-self-start p-2 border-1 border-transparent border-circle mr-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.12)' }}></i>
                        <div className="flex flex-column">
                            <span className="font-bold mb-1">Withdrawal Initiated</span>
                            <span className="mb-2 line-height-3">Your request for withdrawal of $2500 has been initiated.</span>
                            <span className="flex align-items-center">
                                <img className="mr-2" src="/layout/images/avatar/activity-2.png" alt="avatar-2" />
                                <small>Emily Walter, 21.40</small>
                            </span>
                        </div>
                    </div>
                    <div className="flex pt-3">
                        <i className="pi pi-images align-self-start p-2 border-1 border-transparent border-circle mr-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.12)' }}></i>
                        <div className="flex flex-column">
                            <span className="font-bold mb-1">Question Received</span>
                            <span className="mb-2 line-height-3">Jane Davis has posted a new question about your product.</span>
                            <span className="flex align-items-center">
                                <img className="mr-2" src="/layout/images/avatar/activity-3.png" alt="avatar-3" />
                                <small>Jane Davis, 21.45</small>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-column">
                    <h6 className="pb-2 mb-2 border-bottom-1 surface-border">NEXT EVENTS</h6>
                    <ul className="m-0 list-none p-0">
                        <li className="py-3 px-2 border-round-md hover:surface-hover cursor-pointer">
                            <i className="pi pi-eye mr-3"></i>A/B Test
                        </li>
                        <li className="py-3 px-2 border-round-md hover:surface-hover cursor-pointer">
                            <i className="pi pi-video mr-3"></i>Video Shoot
                        </li>
                        <li className="py-3 px-2 border-round-md hover:surface-hover cursor-pointer">
                            <i className="pi pi-sitemap mr-3"></i>Board Meeting
                        </li>
                        <li className="py-3 px-2 border-round-md hover:surface-hover cursor-pointer">
                            <i className="pi pi-compass mr-3"></i>Q4 Planning
                        </li>
                        <li className="py-3 px-2 border-round-md hover:surface-hover cursor-pointer">
                            <i className="pi pi-palette mr-3"></i>Design Training
                        </li>
                    </ul>
                </div>
            </div>
        </Sidebar>
    );
};

export default AppProfileSidebar;
