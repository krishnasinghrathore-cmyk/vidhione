'use client';
import React, { useContext, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { StyleClass } from 'primereact/styleclass';
import { LayoutContext } from '../../../layout/context/layoutcontext';
import type { ColorScheme, NodeRef, Page } from '@/types';
import { InputText } from 'primereact/inputtext';
import PrimeReact, { PrimeReactContext } from 'primereact/api';
import styles from './landing.module.scss';
import { classNames } from 'primereact/utils';

const LandingPage: Page = () => {
    const { layoutConfig, setLayoutConfig } = useContext(LayoutContext);
    const { changeTheme } = useContext(PrimeReactContext);
    const menuRef = useRef<HTMLAnchorElement>(null);
    const homeRef = useRef<HTMLDivElement>(null);
    const homeButtonRef = useRef<HTMLAnchorElement>(null);
    const parallaxBodyRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);
    const featuresButtonRef = useRef<HTMLAnchorElement>(null);
    const collaborationRef = useRef<HTMLDivElement>(null);
    const collaborationButtonRef = useRef<HTMLAnchorElement>(null);
    const eventsRef = useRef<HTMLDivElement>(null);
    const eventsButtonRef = useRef<HTMLAnchorElement>(null);
    const videoRef = useRef<HTMLDivElement>(null);
    const videoButtonRef = useRef<HTMLAnchorElement>(null);
    const scrollBehavior = (el: React.RefObject<HTMLDivElement>) => {
        el.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToElement = (el: React.RefObject<HTMLDivElement>) => {
        setTimeout(() => {
            el.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }, 200);
    };
    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.currentTarget) event.currentTarget.style.background = 'linear-gradient(110.43deg, rgba(134,140,208,.5) 0.04%, rgba(255,87,89,.5) 100.11%)';
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.currentTarget) event.currentTarget.style.background = 'unset';
    };

    const changeColorScheme = (colorScheme: ColorScheme) => {
        changeTheme?.(layoutConfig.colorScheme, colorScheme, 'theme-link', () => {
            setLayoutConfig((prevState) => ({
                ...prevState,
                colorScheme,
                menuTheme: layoutConfig.colorScheme === 'dark' ? 'dark' : 'light'
            }));
        });
    };

    useEffect(() => {
        changeColorScheme('dark');
        setLayoutConfig((prevState) => ({
            ...prevState,
            menuTheme: 'dark'
        }));
         
    }, []);

    return (
        <div className="surface-ground">
            <div style={{ height: '68px', backdropFilter: 'blur(17px)' }} className="flex justify-content-between align-items-center z-3 px-5 bg-black-alpha-40 top-0 w-full fixed">
                <div className="brand-logo">
                    <img
                        src="/layout/images/logo/vidhione-mark.svg"
                        alt="Vidhione"
                        className="brand-logo-mark"
                    />
                    <span className="brand-wordmark text-white text-2xl">Vidhione</span>
                </div>

                <StyleClass nodeRef={menuRef as NodeRef} selector="@next" enterClassName="hidden" leaveToClassName="hidden" hideOnOutsideClick>
                    <a ref={menuRef} className="cursor-pointer block lg:hidden text-white">
                        <i className="pi pi-bars text-4xl"></i>
                    </a>
                </StyleClass>

                <div id="menu" className="align-items-center flex-grow-1 hidden lg:flex absolute lg:static w-full lg:px-0 z-3 shadow-2 lg:shadow-none fadein" style={{ top: '68px', right: '0%' }}>
                    <ul className="list-none p-3 lg:p-0 m-0 ml-auto flex lg:align-items-center select-none flex-column lg:flex-row cursor-pointer surface-0 lg:bg-transparent">
                        <li>
                            <StyleClass nodeRef={homeButtonRef as NodeRef} selector="#menu" enterClassName="hidden" leaveToClassName="hidden">
                                <a ref={homeButtonRef} className="flex m-0 md:ml-5 px-0 py-3 text-900 line-height-3" href="#home">
                                    <span>HOME</span>
                                </a>
                            </StyleClass>
                        </li>
                        <li>
                            <StyleClass nodeRef={featuresButtonRef as NodeRef} selector="#menu" enterClassName="hidden" leaveToClassName="hidden">
                                <a ref={featuresButtonRef} className="flex m-0 md:ml-5 px-0 py-3 text-900 line-height-3" href="#features" onClick={() => scrollToElement(featuresRef)}>
                                    <span>FEATURES</span>
                                </a>
                            </StyleClass>
                        </li>
                        <li>
                            <StyleClass nodeRef={collaborationButtonRef as NodeRef} selector="#menu" enterClassName="hidden" leaveToClassName="hidden">
                                <a ref={collaborationButtonRef} className="flex m-0 md:ml-5 px-0 py-3 text-900 line-height-3" href="#collaboration" onClick={() => scrollToElement(collaborationRef)}>
                                    <span>COLLABORATION</span>
                                </a>
                            </StyleClass>
                        </li>
                        <li>
                            <StyleClass nodeRef={eventsButtonRef as NodeRef} selector="#menu" enterClassName="hidden" leaveToClassName="hidden">
                                <a ref={eventsButtonRef} className="flex m-0 md:ml-5 px-0 py-3 text-900 line-height-3" href="#events" onClick={() => scrollToElement(eventsRef)}>
                                    <span>EVENTS</span>
                                </a>
                            </StyleClass>
                        </li>
                        <li>
                            <StyleClass nodeRef={videoButtonRef as NodeRef} selector="#menu" enterClassName="hidden" leaveToClassName="hidden">
                                <a ref={videoButtonRef} className="flex m-0 md:ml-5 px-0 py-3 text-900 line-height-3" href="#video" onClick={() => scrollToElement(videoRef)}>
                                    <span>VIDEO</span>
                                </a>
                            </StyleClass>
                        </li>
                        <li>
                            <Button label="LET'S TRY" className="surface-900 text-0 m-0 mt-3 md:mt-0 md:ml-5"></Button>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="h-screen">
                <div style={{ perspective: '101px' }} className="h-screen overflow-x-hidden overflow-y-auto absolute top-0 left-0 right-0 bottom-0">
                    <div className="hidden lg:block absolute top-0 right-0 bottom-0 left-0 parallax__layer__0">
                        <img draggable={false} src="/layout/images/landing/layer-0-opt.jpg" alt="layer-0" className="w-full h-full block absolute bottom-0" />
                    </div>
                    <div className="hidden lg:block absolute top-0 right-0 bottom-0 left-0 parallax__layer__1">
                        <img draggable={false} src="/layout/images/landing/layer-1-opt.png" alt="layer-1" className="w-full block absolute bottom-0" />
                    </div>

                    <div className="hidden lg:flex absolute right-0 bottom-0 left-0 parallax__layer__3 justify-content-center" style={{ top: '27%' }}>
                        <div>
                            <h1 className="m-0 -mb-4 text-4xl text-white">LET&apos;S</h1>
                            <h1 className="m-0 text-white" style={{ fontSize: '15rem' }}>
                                EXPLORE
                            </h1>
                            <div className="flex -mt-4 justify-content-end">
                                <h1 className="m-0 text-white text-4xl">TO VIDHIONE</h1>
                            </div>
                        </div>
                    </div>
                    <div className="hidden lg:block absolute top-0 right-0 bottom-0 left-0 parallax__layer__2">
                        <img draggable={false} src="/layout/images/landing/layer-2-opt.png" alt="layer-2" className="w-full block absolute bottom-0" />
                    </div>

                    <div className="absolute flex justify-content-center align-items-center w-full h-full parallax__layer__3" style={{ top: '112px' }}>
                        <Button
                            label="GET STARTED"
                            onClick={() => scrollToElement(featuresRef)}
                            style={{ backdropFilter: 'blur(7px)' }}
                            className="text-900 bg-white-alpha-20 text-lg px-5 py-3 font-semibold hover:bg-white hover:text-0 border-round-xl border-white-alpha-30 border-1"
                            text
                        ></Button>
                    </div>

                    <div
                        ref={homeRef}
                        className="block lg:hidden h-28rem bg-center bg-no-repeat bg-cover"
                        style={{
                            top: '68px',
                            background: "url('/layout/images/landing/landing-hero-image.jpg')"
                        }}
                    >
                        <div className="flex justify-content-center align-items-center h-full">
                            <div className="flex flex-column">
                                <h1 className="m-0 text-base text-white">LET&apos;S</h1>
                                <h1 className="m-0 text-white">EXPLORE</h1>
                                <div className="flex justify-content-end">
                                    <h1 className="m-0 text-white text-sm">TO VIDHIONE</h1>
                                </div>
                                <div className="flex justify-content-center mt-2">
                                    <Button
                                        label="GET STARTED"
                                        onClick={() => scrollBehavior(parallaxBodyRef)}
                                        style={{ backdropFilter: 'blur(7px)' }}
                                        text
                                        className="text-900 text-xs bg-white-alpha-20 font-semibold hover:bg-white hover:text-0 border-white-alpha-30 border-1"
                                    ></Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div ref={parallaxBodyRef} className="lg:top-100 block absolute left-0 right-0 h-full z-2">
                        <div>
                            <div className="grid grid-nogutter p-2 lg:p-5" style={{ backgroundColor: '#000' }}>
                                <div className="col-6 lg:col-3 flex align-items-center justify-content-center gap-3">
                                    <img draggable={false} src="/layout/images/landing/landing-logo1.png" alt="" />
                                </div>
                                <div className="col-6 lg:col-3 flex align-items-center justify-content-center gap-3">
                                    <img draggable={false} src="/layout/images/landing/landing-logo2.png" alt="" />
                                </div>
                                <div className="col-6 lg:col-3 flex align-items-center justify-content-center gap-3">
                                    <img draggable={false} src="/layout/images/landing/landing-logo3.png" alt="" />
                                </div>
                                <div className="col-6 lg:col-3 flex align-items-center justify-content-center gap-3">
                                    <img draggable={false} src="/layout/images/landing/landing-logo4.png" alt="" />
                                </div>
                            </div>
                        </div>
                        <div ref={featuresRef} className="pt-5" style={{ backgroundColor: '#000' }}>
                            <div className="flex flex-column align-items-center gap-3">
                                <div className="surface-500 text-white text-sm p-2 border-round-lg">FEATURES</div>
                                <span className="text-white text-2xl uppercase">All you need is Vidhione.</span>
                                <h1
                                    className="m-0 text-6xl"
                                    style={{
                                        background: 'linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent'
                                    }}
                                >
                                    VIDHIONE
                                </h1>
                            </div>
                            <div className="flex flex-column align-items-center">
                                <div className="grid pt-6 p-4" style={{ maxWidth: '1200px' }}>
                                    <div className="col-6 lg:col-4">
                                        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="flex justify-content-center flex-column gap-3 border-1 border-50 border-round-2xl p-5 cursor-pointer h-full">
                                            <i className="pi pi-palette text-4xl text-white"></i>
                                            <span className="font-semibold text-white">Creative Design</span>
                                            <span className="text-white">Unleash your brand`&apos;`s full potential with our creative design services.</span>
                                            <span className="text-primary-300 font-medium flex align-items-center">
                                                Learn more <i className="pi pi-arrow-right ml-2"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-6 lg:col-4">
                                        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="flex justify-content-center flex-column gap-3 border-1 border-50 border-round-2xl p-5 cursor-pointer h-full">
                                            <i className="pi pi-mobile text-4xl text-white"></i>
                                            <span className="font-semibold text-white">Responsive Design</span>
                                            <span className="text-white">Make sure your website looks great and functions seamlessly on any device with responsive design.</span>
                                            <span className="text-primary-300 font-medium flex align-items-center">
                                                Learn more <i className="pi pi-arrow-right ml-2"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-6 lg:col-4">
                                        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="flex justify-content-center flex-column gap-3 border-1 border-50 border-round-2xl p-5 cursor-pointer h-full">
                                            <i className="pi pi-sync text-4xl text-white"></i>
                                            <span className="font-semibold text-white">Cross Browser Support</span>
                                            <span className="text-white">Don`&apos;`t let browser compatibility hold you back. Our cross browser support ensures your website works perfectly on all browsers.</span>
                                            <span className="text-primary-300 font-medium flex align-items-center">
                                                Learn more <i className="pi pi-arrow-right ml-2"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-6 lg:col-4">
                                        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="flex justify-content-center flex-column gap-3 border-1 border-50 border-round-2xl p-5 cursor-pointer h-full">
                                            <i className="pi pi-th-large text-4xl text-white"></i>
                                            <span className="font-semibold text-white">Well Organized</span>
                                            <span className="text-white">Our well-organized approach guarantees a smooth design process from start to finish.</span>
                                            <span className="text-primary-300 font-medium flex align-items-center">
                                                Learn more <i className="pi pi-arrow-right ml-2"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-6 lg:col-4">
                                        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="flex justify-content-center flex-column gap-3 border-1 border-50 border-round-2xl text-white p-5 cursor-pointer h-full">
                                            <i className="pi pi-code text-4xl text-white"></i>
                                            <span className="font-semibold text-white">Easy to Product</span>
                                            <span className="text-white">We make product creation easy with straightforward and intuitive processes.</span>
                                            <span className="text-primary-300 font-medium flex align-items-center">
                                                Learn more <i className="pi pi-arrow-right ml-2"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-6 lg:col-4">
                                        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="flex justify-content-center flex-column gap-3 border-1 border-50 border-round-2xl text-white p-5 cursor-pointer h-full">
                                            <i className="pi pi-box text-4xl"></i>
                                            <span className="font-semibold">Top Notch Quality</span>
                                            <span>Expect top notch quality in all of our work, delivering exceptional results every time.</span>
                                            <span className="text-primary-300 font-medium flex align-items-center">
                                                Learn more <i className="pi pi-arrow-right ml-2"></i>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div ref={collaborationRef} style={{ maxWidth: '1200px' }} className="flex flex-column lg:flex-row gap-8 mt-6 py-6 px-4 w-full">
                                    <div className="flex flex-column align-items-end justify-content-center">
                                        <div className="surface-50 text-white text-sm p-2 border-round-lg mb-4">PLAY AS A TEAM</div>
                                        <div>
                                            <h1
                                                className="m-0 text-6xl font-bold text-right"
                                                style={{
                                                    background: 'linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent'
                                                }}
                                            >
                                                COLLABORATION
                                            </h1>
                                            <p className="text-white text-right mt-3">
                                                The Earth is a very small stage in a vast cosmic arena. Think of the rivers of blood spilled by all those generals and emperors so that, in glory and triumph, they could become the momentary masters of
                                                a fraction of a dot.
                                            </p>
                                        </div>
                                    </div>
                                    <img draggable={false} src="/layout/images/landing/collaboration-image.png" alt="" />
                                </div>
                                <div ref={eventsRef} style={{ maxWidth: '1200px' }} className="flex flex-column lg:flex-row gap-8 mt-6 py-6 px-4 w-full">
                                    <img draggable={false} src="/layout/images/landing/easyfollow-image.png" alt="" />
                                    <div className="flex flex-column align-items-start justify-content-center">
                                        <div className="surface-50 text-white text-sm p-2 border-round-lg mb-4">EVENTS</div>
                                        <div>
                                            <h1
                                                className="m-0 text-6xl font-bold"
                                                style={{
                                                    background: 'linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent'
                                                }}
                                            >
                                                EASY FOLLOW
                                            </h1>
                                            <p className="text-white mt-2">
                                                It has been said that astronomy is a humbling and character-building experience. There is perhaps no better demonstration of the folly of human conceits than this distant image of our tiny world.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div ref={videoRef} style={{ maxWidth: '1200px' }} className="flex gap-4 mt-6 py-6 flex-column align-items-center w-full">
                                    <div className="surface-50 text-white text-sm p-2 border-round-lg">VIDEO</div>
                                    <h1
                                        className="m-0 text-6xl font-bold"
                                        style={{
                                            background: 'linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent'
                                        }}
                                    >
                                        SHOWREELS
                                    </h1>
                                    <div className="mt-3 relative">
                                        <iframe className="border-none border-round-lg z-3 max-w-full" width="600" height="400" src="https://www.youtube.com/embed/tgbNymZ7vqY" frameBorder="0" allowFullScreen></iframe>
                                        <div className="absolute z-0" style={{ top: '-50px', left: '-50px' }}>
                                            <img draggable={false} className="opacity-40" src="/layout/images/landing/landing-ellipse.png" alt="" />
                                        </div>
                                        <div className="absolute z-0" style={{ bottom: '-50px', right: '-50px', filter: 'blur(4px)' }}>
                                            <img draggable="false" className="opacity-40" src="/layout/images/landing/landing-ellipse2.png" alt="" />
                                        </div>
                                        <div className="absolute z-0" style={{ bottom: '-50px', right: '10px', filter: 'blur(4px)' }}>
                                            <img draggable="false" className="opacity-40" src="/layout/images/landing/landing-ellipse2.png" alt="" />
                                        </div>
                                    </div>
                                </div>
                                <div className="py-6 px-4 mt-6 w-full flex justify-content-center">
                                    <div
                                        className="p-5 flex flex-column gap-3 align-items-start justify-content-between lg:flex-row lg:align-items-center border-round-2xl w-full"
                                        style={{
                                            background: 'linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%)',
                                            maxWidth: '1200px'
                                        }}
                                    >
                                        <div className="flex flex-column gap-2">
                                            <h1 className="m-0 text-white font-bold text-2xl">NEWSLETTER</h1>
                                            <p className="m-0 text-white">Sign up for our newsletter and stay up-to-date on the latest features and updates for our platform.</p>
                                        </div>
                                        <div className="flex align-items-center gap-2">
                                            <InputText placeholder="Email Address" className={classNames('bg-transparent border-white border-round-md', styles['p-inputtext'])} />
                                            <Button text className={classNames('text-white border-1 border-white border-round-md h-full', styles['p-button'], styles['join-button'])} label="JOIN" />
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full px-4" style={{ maxWidth: '1200px' }}>
                                    <div className="grid gap-3 lg:gap-0 lg:grid-nogutter pb-6">
                                        <div className="col-12 lg:col-3">
                                            <div className="w-full text-white flex flex-column gap-3">
                                                <h1 className="m-0 font-medium text-sm text-500">CONTACT US</h1>
                                                <div className="flex gap-5">
                                                    <a href="#">
                                                        <i className="pi pi-github text-white text-2xl"></i>
                                                    </a>
                                                    <a href="#">
                                                        <i className="pi pi-twitter text-white text-2xl"></i>
                                                    </a>
                                                    <a href="#">
                                                        <i className="pi pi-linkedin text-white text-2xl"></i>
                                                    </a>
                                                </div>
                                                <p className="m-0 text-base lg:text-sm">
                                                    (415) 931-1624 794 Mcallister <br />
                                                    St San Francisco, 94102
                                                </p>
                                                <span className="text-base lg:text-sm">©Copyright 202X</span>
                                            </div>
                                        </div>
                                        <div className="col-12 lg:col-3">
                                            <div className="w-full text-white flex flex-column gap-3">
                                                <h1 className="m-0 font-medium text-sm text-500">ABOUT US</h1>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Our Values</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Our Team</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Our History</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Career & Join Us</span>
                                                </a>
                                            </div>
                                        </div>
                                        <div className="col-12 lg:col-3">
                                            <div className="w-full text-white flex flex-column gap-3">
                                                <h1 className="m-0 font-medium text-sm text-500">SITE MAP</h1>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Dashboard</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">CRUD</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Invoice</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Help </span>
                                                </a>
                                            </div>
                                        </div>
                                        <div className="col-12 lg:col-3">
                                            <div className="w-full text-white flex flex-column gap-3">
                                                <h1 className="m-0 font-medium text-sm text-500">CALENDAR</h1>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Widgets</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Documentation</span>
                                                </a>
                                                <a href="#">
                                                    <span className="text-base lg:text-sm block text-white">Buy Now</span>
                                                </a>
                                            </div>
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

export default LandingPage;
