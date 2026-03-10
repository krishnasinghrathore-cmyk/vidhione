import{r as m,j as e,c as o,T as j,B as s,I as x}from"./index-a2e62377.js";import{C as g}from"./checkbox.esm-afaac66b.js";import{C as d}from"./chip.esm-b55d323e.js";import"./index.esm-716d0587.js";import"./index.esm-10fa0e2b.js";const l=i=>{const[a,t]=m.useState("PREVIEW"),c=m.useRef(null),r=async n=>{await navigator.clipboard.writeText(i.code),n.preventDefault()};return e.jsxs("div",{className:"block-section",children:[e.jsxs("div",{className:"block-header",children:[e.jsxs("span",{className:"block-title",children:[e.jsx("span",{children:i.header}),i.new&&e.jsx("span",{className:"badge-new",children:"New"}),i.free&&e.jsx("span",{className:"badge-free",children:"Free"})]}),e.jsxs("div",{className:"block-actions",children:[e.jsx("a",{tabIndex:0,className:o("p-link",{"block-action-active":a==="PREVIEW"}),onClick:()=>t("PREVIEW"),children:e.jsx("span",{children:"Preview"})}),e.jsx("a",{className:o("p-link",{"block-action-active":a==="CODE"}),onClick:()=>t("CODE"),children:e.jsx("span",{children:"Code"})}),e.jsx("a",{ref:c,tabIndex:0,className:"block-action-copy",onClick:r,children:e.jsx("i",{className:"pi pi-copy"})}),e.jsx(j,{target:c,position:"bottom",content:"Copied to clipboard",event:"focus"})]})]}),e.jsxs("div",{className:"block-content",children:[a==="PREVIEW"&&e.jsx("div",{className:i.containerClassName,style:i.previewStyle,children:i.children}),a==="CODE"&&e.jsx("pre",{className:"app-code",children:e.jsx("code",{children:i.code})})]})]})},E=()=>{const[i,a]=m.useState(!1),t=`
    <div className="grid grid-nogutter surface-0 text-800">
        <div className="col-12 md:col-6 p-6 text-center md:text-left flex align-items-center ">
            <section>
                <span className="block text-6xl font-bold mb-1">Create the screens</span>
                <div className="text-6xl text-primary font-bold mb-3">your visitors deserve to see</div>
                <p className="mt-0 mb-4 text-700 line-height-3">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    
                <Button label="Learn More" type="button" className="mr-3" raised />
                <Button label="Live Demo" type="button" outlined />
            </section>
        </div>
        <div className="col-12 md:col-6 overflow-hidden">
            <img src="assets/images/blocks/hero/hero-1.png" alt="hero-1" className="md:ml-auto block md:h-full" style={{ clipPath: 'polygon(8% 0, 100% 0%, 100% 100%, 0 100%)' }} />
        </div>
    </div>
        `,c=`
    <div className="surface-section px-4 py-8 md:px-6 lg:px-8 text-center">
        <div className="mb-3 font-bold text-3xl">
            <span className="text-900">One Product, </span>
            <span className="text-blue-600">Many Solutions</span>
        </div>
        <div className="text-700 mb-6">Ac turpis egestas maecenas pharetra convallis posuere morbi leo urna.</div>
        <div className="grid">
            <div className="col-12 md:col-4 mb-4 px-5">
                <span className="p-3 shadow-2 mb-3 inline-block surface-card" style={{ borderRadius: '10px' }}>
                    <i className="pi pi-desktop text-4xl text-blue-500"></i>
                </span>
                <div className="text-900 text-xl mb-3 font-medium">Built for Developers</div>
                <span className="text-700 line-height-3">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</span>
            </div>
            <div className="col-12 md:col-4 mb-4 px-5">
                <span className="p-3 shadow-2 mb-3 inline-block surface-card" style={{ borderRadius: '10px' }}>
                    <i className="pi pi-lock text-4xl text-blue-500"></i>
                </span>
                <div className="text-900 text-xl mb-3 font-medium">End-to-End Encryption</div>
                <span className="text-700 line-height-3">Risus nec feugiat in fermentum posuere urna nec. Posuere sollicitudin aliquam ultrices sagittis.</span>
            </div>
            <div className="col-12 md:col-4 mb-4 px-5">
                <span className="p-3 shadow-2 mb-3 inline-block surface-card" style={{ borderRadius: '10px' }}>
                    <i className="pi pi-check-circle text-4xl text-blue-500"></i>
                </span>
                <div className="text-900 text-xl mb-3 font-medium">Easy to Use</div>
                <span className="text-700 line-height-3">Ornare suspendisse sed nisi lacus sed viverra tellus. Neque volutpat ac tincidunt vitae semper.</span>
            </div>
            <div className="col-12 md:col-4 mb-4 px-5">
                <span className="p-3 shadow-2 mb-3 inline-block surface-card" style={{ borderRadius: '10px' }}>
                    <i className="pi pi-globe text-4xl text-blue-500"></i>
                </span>
                <div className="text-900 text-xl mb-3 font-medium">Fast & Global Support</div>
                <span className="text-700 line-height-3">Fermentum et sollicitudin ac orci phasellus egestas tellus rutrum tellus.</span>
            </div>
            <div className="col-12 md:col-4 mb-4 px-5">
                <span className="p-3 shadow-2 mb-3 inline-block surface-card" style={{ borderRadius: '10px' }}>
                    <i className="pi pi-github text-4xl text-blue-500"></i>
                </span>
                <div className="text-900 text-xl mb-3 font-medium">Open Source</div>
                <span className="text-700 line-height-3">Nec tincidunt praesent semper feugiat. Sed adipiscing diam donec adipiscing tristique risus nec feugiat. </span>
            </div>
            <div className="col-12 md:col-4 md:mb-4 mb-0 px-3">
                <span className="p-3 shadow-2 mb-3 inline-block surface-card" style={{ borderRadius: '10px' }}>
                    <i className="pi pi-shield text-4xl text-blue-500"></i>
                </span>
                <div className="text-900 text-xl mb-3 font-medium">Trusted Securitty</div>
                <span className="text-700 line-height-3">Mattis rhoncus urna neque viverra justo nec ultrices. Id cursus metus aliquam eleifend.</span>
            </div>
        </div>
    </div>
        `,r=`<div className="surface-ground px-4 py-8 md:px-6 lg:px-8">
        <div className="text-900 font-bold text-6xl mb-4 text-center">Pricing Plans</div>
        <div className="text-700 text-xl mb-6 text-center line-height-3">Lorem ipsum dolor sit, amet consectetur adipisicing elit. Velit numquam eligendi quos.</div>
    
        <div className="grid">
            <div className="col-12 lg:col-4">
                <div className="p-3 h-full">
                    <div className="shadow-2 p-3 h-full flex flex-column surface-card" style="border-radius: "6px"">
                        <div className="text-900 font-medium text-xl mb-2">Basic</div>
                        <div className="text-600">Plan description</div>
                        <hr className="my-3 mx-0 border-top-1 border-none surface-border" />
                        <div className="flex align-items-center">
                            <span className="font-bold text-2xl text-900">$9</span>
                            <span className="ml-2 font-medium text-600">per month</span>
                        </div>
                        <hr className="my-3 mx-0 border-top-1 border-none surface-border" />
                        <ul className="list-none p-0 m-0 flex-grow-1">
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Arcu vitae elementum</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Dui faucibus in ornare</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Morbi tincidunt augue</span>
                            </li>
                        </ul>
                        <hr className="mb-3 mx-0 border-top-1 border-none surface-border mt-auto" />
                        <Button label="Buy Now" className="p-3 w-full mt-auto"></Button>
                    </div>
                </div>
            </div>
    
            <div className="col-12 lg:col-4">
                <div className="p-3 h-full">
                    <div className="shadow-2 p-3 h-full flex flex-column surface-card" style="border-radius: 6px">
                        <div className="text-900 font-medium text-xl mb-2">Premium</div>
                        <div className="text-600">Plan description</div>
                        <hr className="my-3 mx-0 border-top-1 border-none surface-border" />
                        <div className="flex align-items-center">
                            <span className="font-bold text-2xl text-900">$29</span>
                            <span className="ml-2 font-medium text-600">per month</span>
                        </div>
                        <hr className="my-3 mx-0 border-top-1 border-none surface-border" />
                        <ul className="list-none p-0 m-0 flex-grow-1">
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Arcu vitae elementum</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Dui faucibus in ornare</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Morbi tincidunt augue</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Duis ultricies lacus sed</span>
                            </li>
                        </ul>
                        <hr className="mb-3 mx-0 border-top-1 border-none surface-border" />
                        <Button label="Buy Now" className="p-3 w-full"></Button>
                    </div>
                </div>
            </div>
    
            <div className="col-12 lg:col-4">
                <div className="p-3 h-full">
                    <div className="shadow-2 p-3 flex flex-column surface-card" style="border-radius: 6px">
                        <div className="text-900 font-medium text-xl mb-2">Enterprise</div>
                        <div className="text-600">Plan description</div>
                        <hr className="my-3 mx-0 border-top-1 border-none surface-border" />
                        <div className="flex align-items-center">
                            <span className="font-bold text-2xl text-900">$49</span>
                            <span className="ml-2 font-medium text-600">per month</span>
                        </div>
                        <hr className="my-3 mx-0 border-top-1 border-none surface-border" />
                        <ul className="list-none p-0 m-0 flex-grow-1">
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Arcu vitae elementum</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Dui faucibus in ornare</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Morbi tincidunt augue</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Duis ultricies lacus sed</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Imperdiet proin</span>
                            </li>
                            <li className="flex align-items-center mb-3">
                                <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                <span>Nisi scelerisque</span>
                            </li>
                        </ul>
                        <hr className="mb-3 mx-0 border-top-1 border-none surface-border" />
                        <Button label="Buy Now" className="p-3 w-full" outlined></Button>
                    </div>
                </div>
            </div>
        </div>
    </div>`,n=`
    <div className="surface-0 text-700 text-center">
        <div className="text-blue-600 font-bold mb-3"><i className="pi pi-discord"></i>&nbsp;POWERED BY DISCORD</div>
        <div className="text-900 font-bold text-5xl mb-3">Join Our Design Community</div>
        <div className="text-700 text-2xl mb-5">Lorem ipsum dolor sit, amet consectetur adipisicing elit. Velit numquam eligendi quos.</div>
        <Button label="Join Now" icon="pi pi-discord" className="font-bold px-5 py-3 white-space-nowrap" rounded raised />
    </div>
        `,p=`
    <div className="bg-bluegray-900 text-gray-100 p-3 flex justify-content-between lg:justify-content-center align-items-center flex-wrap">
        <div className="font-bold mr-8">🔥 Hot Deals!</div>
        <div className="align-items-center hidden lg:flex">
            <span className="line-height-3">Libero voluptatum atque exercitationem praesentium provident odit.</span>
        </div>
        <a className="flex align-items-center ml-2 mr-8">
            <span className="underline font-bold">Learn More</span>
        </a>
        <a className="flex align-items-center no-underline justify-content-center border-circle text-100 hover:bg-bluegray-700 cursor-pointer transition-colors transition-duration-150" style={{ width: '2rem', height: '2rem' }}>
            <i className="pi pi-times"></i>
        </a>
    </div>
        `,u=`
    <div className="surface-0">
        <ul className="list-none p-0 m-0 flex align-items-center font-medium mb-3">
            <li>
                <a className="text-500 no-underline line-height-3 cursor-pointer">Application</a>
            </li>
            <li className="px-2">
                <i className="pi pi-angle-right text-500 line-height-3"></i>
            </li>
            <li>
                <span className="text-900 line-height-3">Analytics</span>
            </li>
        </ul>
        <div className="flex align-items-start flex-column lg:justify-content-between lg:flex-row">
            <div>
                <div className="font-medium text-3xl text-900">Customers</div>
                <div className="flex align-items-center text-700 flex-wrap">
                    <div className="mr-5 flex align-items-center mt-3">
                        <i className="pi pi-users mr-2"></i>
                        <span>332 Active Users</span>
                    </div>
                    <div className="mr-5 flex align-items-center mt-3">
                        <i className="pi pi-globe mr-2"></i>
                        <span>9402 Sessions</span>
                    </div>
                    <div className="flex align-items-center mt-3">
                        <i className="pi pi-clock mr-2"></i>
                        <span>2.32m Avg. Duration</span>
                    </div>
                </div>
            </div>
            <div className="mt-3 lg:mt-0">
                <Button label="Add" className="mr-2" icon="pi pi-user-plus" outlined />
                <Button label="Save" icon="pi pi-check" />
            </div>
        </div>
    </div>
        `,h=`
    <div className="grid">
        <div className="col-12 md:col-6 lg:col-3">
            <div className="surface-0 shadow-2 p-3 border-1 border-50 border-round">
                <div className="flex justify-content-between mb-3">
                    <div>
                        <span className="block text-500 font-medium mb-3">Orders</span>
                        <div className="text-900 font-medium text-xl">152</div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-blue-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                        <i className="pi pi-shopping-cart text-blue-500 text-xl"></i>
                    </div>
                </div>
                <span className="text-green-500 font-medium">24 new </span>
                <span className="text-500">since last visit</span>
            </div>
        </div>
        <div className="col-12 md:col-6 lg:col-3">
            <div className="surface-0 shadow-2 p-3 border-1 border-50 border-round">
                <div className="flex justify-content-between mb-3">
                    <div>
                        <span className="block text-500 font-medium mb-3">Revenue</span>
                        <div className="text-900 font-medium text-xl">$2.100</div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                        <i className="pi pi-map-marker text-orange-500 text-xl"></i>
                    </div>
                </div>
                <span className="text-green-500 font-medium">%52+ </span>
                <span className="text-500">since last week</span>
            </div>
        </div>
        <div className="col-12 md:col-6 lg:col-3">
            <div className="surface-0 shadow-2 p-3 border-1 border-50 border-round">
                <div className="flex justify-content-between mb-3">
                    <div>
                        <span className="block text-500 font-medium mb-3">Customers</span>
                        <div className="text-900 font-medium text-xl">28441</div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-cyan-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                        <i className="pi pi-inbox text-cyan-500 text-xl"></i>
                    </div>
                </div>
                <span className="text-green-500 font-medium">520  </span>
                <span className="text-500">newly registered</span>
            </div>
        </div>
        <div className="col-12 md:col-6 lg:col-3">
            <div className="surface-0 shadow-2 p-3 border-1 border-50 border-round">
                <div className="flex justify-content-between mb-3">
                    <div>
                        <span className="block text-500 font-medium mb-3">Comments</span>
                        <div className="text-900 font-medium text-xl">152 Unread</div>
                    </div>
                    <div className="flex align-items-center justify-content-center bg-purple-100 border-round" style={{ width: '2.5rem', height: '2.5rem' }}>
                        <i className="pi pi-comment text-purple-500 text-xl"></i>
                    </div>
                </div>
                <span className="text-green-500 font-medium">85 </span>
                <span className="text-500">responded</span>
            </div>
        </div>
    </div>
        `,b=`
    <div className="flex align-items-center justify-content-center">
        <div className="surface-card p-4 shadow-2 border-round w-full lg:w-6">
            <div className="text-center mb-5">
                <img src="assets/images/blocks/logos/hyper.svg" alt="hyper" height={50} className="mb-3" />
                <div className="text-900 text-3xl font-medium mb-3">Welcome Back</div>
                <span className="text-600 font-medium line-height-3">Do not have an account?</span>
                <a className="font-medium no-underline ml-2 text-blue-500 cursor-pointer">Create today!</a>
            </div>
    
            <div>
                <label htmlFor="email" className="block text-900 font-medium mb-2">Email</label>
                <InputText id="email" type="text" placeholder="Email address" className="w-full mb-3" />
    
                <label htmlFor="password" className="block text-900 font-medium mb-2">Password</label>
                <InputText id="password" type="password" placeholder="Password" className="w-full mb-3" />
    
                <div className="flex align-items-center justify-content-between mb-6">
                    <div className="flex align-items-center">
                        <Checkbox id="rememberme" onChange={e => setChecked(e.checked)} checked={checked} className="mr-2" />
                        <label htmlFor="rememberme" className="text-900">Remember me</label>
                    </div>
                    <a className="font-medium no-underline ml-2 text-blue-500 text-right cursor-pointer">Forgot your password?</a>
                </div>
    
                <Button label="Sign In" icon="pi pi-user" className="w-full" />
            </div>
        </div>
    </div>
        `,N=`
    <div className="surface-0">
        <div className="font-medium text-3xl text-900 mb-3">Movie Information</div>
        <div className="text-500 mb-5">Morbi tristique blandit turpis. In viverra ligula id nulla hendrerit rutrum.</div>
        <ul className="list-none p-0 m-0">
            <li className="flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap">
                <div className="text-500 w-6 md:w-2 font-medium">Title</div>
                <div className="text-900 w-full md:w-8 md:flex-order-0 flex-order-1">Heat</div>
                <div className="w-6 md:w-2 flex justify-content-end">
                    <Button label="Edit" icon="pi pi-pencil" text />
                </div>
            </li>
            <li className="flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap">
                <div className="text-500 w-6 md:w-2 font-medium">Genre</div>
                <div className="text-900 w-full md:w-8 md:flex-order-0 flex-order-1">
                    <Chip label="Crime" className="mr-2" />
                    <Chip label="Drama" className="mr-2" />
                    <Chip label="Thriller" />
                </div>
                <div className="w-6 md:w-2 flex justify-content-end">
                    <Button label="Edit" icon="pi pi-pencil" text />
                </div>
            </li>
            <li className="flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap">
                <div className="text-500 w-6 md:w-2 font-medium">Director</div>
                <div className="text-900 w-full md:w-8 md:flex-order-0 flex-order-1">Michael Mann</div>
                <div className="w-6 md:w-2 flex justify-content-end">
                    <Button label="Edit" icon="pi pi-pencil" text />
                </div>
            </li>
            <li className="flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap">
                <div className="text-500 w-6 md:w-2 font-medium">Actors</div>
                <div className="text-900 w-full md:w-8 md:flex-order-0 flex-order-1">Robert De Niro, Al Pacino</div>
                <div className="w-6 md:w-2 flex justify-content-end">
                    <Button label="Edit" icon="pi pi-pencil" text />
                </div>
            </li>
            <li className="flex align-items-center py-3 px-2 border-top-1 border-bottom-1 border-300 flex-wrap">
                <div className="text-500 w-6 md:w-2 font-medium">Plot</div>
                <div className="text-900 w-full md:w-8 md:flex-order-0 flex-order-1 line-height-3">
                    A group of professional bank robbers start to feel the heat from police
                    when they unknowingly leave a clue at their latest heist.</div>
                <div className="w-6 md:w-2 flex justify-content-end">
                    <Button label="Edit" icon="pi pi-pencil" text />
                </div>
            </li>
        </ul>
    </div>
        `,f=`
    <div className="surface-0 p-4 shadow-2 border-round">
        <div className="text-3xl font-medium text-900 mb-3">Card Title</div>
        <div className="font-medium text-500 mb-3">Vivamus id nisl interdum, blandit augue sit amet, eleifend mi.</div>
        <div style={{ height: '150px' }} className="border-2 border-dashed border-300"></div>
    </div>
        `;return e.jsxs(e.Fragment,{children:[e.jsx(l,{header:"Hero",code:t,free:!0,children:e.jsxs("div",{className:"grid grid-nogutter surface-0 text-800",children:[e.jsx("div",{className:"col-12 md:col-6 p-6 text-center md:text-left flex align-items-center ",children:e.jsxs("section",{children:[e.jsx("span",{className:"block text-6xl font-bold mb-1",children:"Create the screens"}),e.jsx("div",{className:"text-6xl text-primary font-bold mb-3",children:"your visitors deserve to see"}),e.jsx("p",{className:"mt-0 mb-4 text-700 line-height-3",children:"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}),e.jsx(s,{label:"Learn More",type:"button",className:"mr-3",raised:!0}),e.jsx(s,{label:"Live Demo",type:"button",outlined:!0})]})}),e.jsx("div",{className:"col-12 md:col-6 overflow-hidden",children:e.jsx("img",{src:"/demo/images/blocks/hero/hero-1.png",alt:"hero-1",className:"md:ml-auto block md:h-full",style:{clipPath:"polygon(8% 0, 100% 0%, 100% 100%, 0 100%)"}})})]})}),e.jsx(l,{header:"Feature",code:c,free:!0,children:e.jsxs("div",{className:"surface-section px-4 py-8 md:px-6 lg:px-8 text-center",children:[e.jsxs("div",{className:"mb-3 font-bold text-3xl",children:[e.jsx("span",{className:"text-900",children:"One Product, "}),e.jsx("span",{className:"text-blue-600",children:"Many Solutions"})]}),e.jsx("div",{className:"text-700 mb-6",children:"Ac turpis egestas maecenas pharetra convallis posuere morbi leo urna."}),e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-4 mb-4 px-5",children:[e.jsx("span",{className:"p-3 shadow-2 mb-3 inline-block surface-card",style:{borderRadius:"10px"},children:e.jsx("i",{className:"pi pi-desktop text-4xl text-blue-500"})}),e.jsx("div",{className:"text-900 text-xl mb-3 font-medium",children:"Built for Developers"}),e.jsx("span",{className:"text-700 line-height-3",children:"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."})]}),e.jsxs("div",{className:"col-12 md:col-4 mb-4 px-5",children:[e.jsx("span",{className:"p-3 shadow-2 mb-3 inline-block surface-card",style:{borderRadius:"10px"},children:e.jsx("i",{className:"pi pi-lock text-4xl text-blue-500"})}),e.jsx("div",{className:"text-900 text-xl mb-3 font-medium",children:"End-to-End Encryption"}),e.jsx("span",{className:"text-700 line-height-3",children:"Risus nec feugiat in fermentum posuere urna nec. Posuere sollicitudin aliquam ultrices sagittis."})]}),e.jsxs("div",{className:"col-12 md:col-4 mb-4 px-5",children:[e.jsx("span",{className:"p-3 shadow-2 mb-3 inline-block surface-card",style:{borderRadius:"10px"},children:e.jsx("i",{className:"pi pi-check-circle text-4xl text-blue-500"})}),e.jsx("div",{className:"text-900 text-xl mb-3 font-medium",children:"Easy to Use"}),e.jsx("span",{className:"text-700 line-height-3",children:"Ornare suspendisse sed nisi lacus sed viverra tellus. Neque volutpat ac tincidunt vitae semper."})]}),e.jsxs("div",{className:"col-12 md:col-4 mb-4 px-5",children:[e.jsx("span",{className:"p-3 shadow-2 mb-3 inline-block surface-card",style:{borderRadius:"10px"},children:e.jsx("i",{className:"pi pi-globe text-4xl text-blue-500"})}),e.jsx("div",{className:"text-900 text-xl mb-3 font-medium",children:"Fast & Global Support"}),e.jsx("span",{className:"text-700 line-height-3",children:"Fermentum et sollicitudin ac orci phasellus egestas tellus rutrum tellus."})]}),e.jsxs("div",{className:"col-12 md:col-4 mb-4 px-5",children:[e.jsx("span",{className:"p-3 shadow-2 mb-3 inline-block surface-card",style:{borderRadius:"10px"},children:e.jsx("i",{className:"pi pi-github text-4xl text-blue-500"})}),e.jsx("div",{className:"text-900 text-xl mb-3 font-medium",children:"Open Source"}),e.jsx("span",{className:"text-700 line-height-3",children:"Nec tincidunt praesent semper feugiat. Sed adipiscing diam donec adipiscing tristique risus nec feugiat. "})]}),e.jsxs("div",{className:"col-12 md:col-4 md:mb-4 mb-0 px-3",children:[e.jsx("span",{className:"p-3 shadow-2 mb-3 inline-block surface-card",style:{borderRadius:"10px"},children:e.jsx("i",{className:"pi pi-shield text-4xl text-blue-500"})}),e.jsx("div",{className:"text-900 text-xl mb-3 font-medium",children:"Trusted Securitty"}),e.jsx("span",{className:"text-700 line-height-3",children:"Mattis rhoncus urna neque viverra justo nec ultrices. Id cursus metus aliquam eleifend."})]})]})]})}),e.jsx(l,{header:"Pricing",code:r,free:!0,children:e.jsxs("div",{className:"surface-ground px-4 py-8 md:px-6 lg:px-8",children:[e.jsx("div",{className:"text-900 font-bold text-6xl mb-4 text-center",children:"Pricing Plans"}),e.jsx("div",{className:"text-700 text-xl mb-6 text-center line-height-3",children:"Lorem ipsum dolor sit, amet consectetur adipisicing elit. Velit numquam eligendi quos."}),e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12 lg:col-4",children:e.jsx("div",{className:"p-3 h-full",children:e.jsxs("div",{className:"shadow-2 p-3 h-full flex flex-column surface-card",style:{borderRadius:"6px"},children:[e.jsx("div",{className:"text-900 font-medium text-xl mb-2",children:"Basic"}),e.jsx("div",{className:"text-600",children:"Plan description"}),e.jsx("hr",{className:"my-3 mx-0 border-top-1 border-none surface-border"}),e.jsxs("div",{className:"flex align-items-center",children:[e.jsx("span",{className:"font-bold text-2xl text-900",children:"$9"}),e.jsx("span",{className:"ml-2 font-medium text-600",children:"per month"})]}),e.jsx("hr",{className:"my-3 mx-0 border-top-1 border-none surface-border"}),e.jsxs("ul",{className:"list-none p-0 m-0 flex-grow-1",children:[e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Arcu vitae elementum"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Dui faucibus in ornare"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Morbi tincidunt augue"})]})]}),e.jsx("hr",{className:"mb-3 mx-0 border-top-1 border-none surface-border mt-auto"}),e.jsx(s,{label:"Buy Now",className:"p-3 w-full mt-auto"})]})})}),e.jsx("div",{className:"col-12 lg:col-4",children:e.jsx("div",{className:"p-3 h-full",children:e.jsxs("div",{className:"shadow-2 p-3 h-full flex flex-column surface-card",style:{borderRadius:"6px"},children:[e.jsx("div",{className:"text-900 font-medium text-xl mb-2",children:"Premium"}),e.jsx("div",{className:"text-600",children:"Plan description"}),e.jsx("hr",{className:"my-3 mx-0 border-top-1 border-none surface-border"}),e.jsxs("div",{className:"flex align-items-center",children:[e.jsx("span",{className:"font-bold text-2xl text-900",children:"$29"}),e.jsx("span",{className:"ml-2 font-medium text-600",children:"per month"})]}),e.jsx("hr",{className:"my-3 mx-0 border-top-1 border-none surface-border"}),e.jsxs("ul",{className:"list-none p-0 m-0 flex-grow-1",children:[e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Arcu vitae elementum"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Dui faucibus in ornare"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Morbi tincidunt augue"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Duis ultricies lacus sed"})]})]}),e.jsx("hr",{className:"mb-3 mx-0 border-top-1 border-none surface-border"}),e.jsx(s,{label:"Buy Now",className:"p-3 w-full"})]})})}),e.jsx("div",{className:"col-12 lg:col-4",children:e.jsx("div",{className:"p-3 h-full",children:e.jsxs("div",{className:"shadow-2 p-3 flex flex-column surface-card",style:{borderRadius:"6px"},children:[e.jsx("div",{className:"text-900 font-medium text-xl mb-2",children:"Enterprise"}),e.jsx("div",{className:"text-600",children:"Plan description"}),e.jsx("hr",{className:"my-3 mx-0 border-top-1 border-none surface-border"}),e.jsxs("div",{className:"flex align-items-center",children:[e.jsx("span",{className:"font-bold text-2xl text-900",children:"$49"}),e.jsx("span",{className:"ml-2 font-medium text-600",children:"per month"})]}),e.jsx("hr",{className:"my-3 mx-0 border-top-1 border-none surface-border"}),e.jsxs("ul",{className:"list-none p-0 m-0 flex-grow-1",children:[e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Arcu vitae elementum"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Dui faucibus in ornare"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Morbi tincidunt augue"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Duis ultricies lacus sed"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Imperdiet proin"})]}),e.jsxs("li",{className:"flex align-items-center mb-3",children:[e.jsx("i",{className:"pi pi-check-circle text-green-500 mr-2"}),e.jsx("span",{children:"Nisi scelerisque"})]})]}),e.jsx("hr",{className:"mb-3 mx-0 border-top-1 border-none surface-border"}),e.jsx(s,{label:"Buy Now",className:"p-3 w-full",outlined:!0})]})})})]})]})}),e.jsx(l,{header:"Call to Action",code:n,containerClassName:"surface-0 px-4 py-8 md:px-6 lg:px-8",free:!0,children:e.jsxs("div",{className:"surface-0 text-700 text-center",children:[e.jsxs("div",{className:"text-blue-600 font-bold mb-3",children:[e.jsx("i",{className:"pi pi-discord"})," POWERED BY DISCORD"]}),e.jsx("div",{className:"text-900 font-bold text-5xl mb-3",children:"Join Our Design Community"}),e.jsx("div",{className:"text-700 text-2xl mb-5",children:"Lorem ipsum dolor sit, amet consectetur adipisicing elit. Velit numquam eligendi quos."}),e.jsx(s,{label:"Join Now",icon:"pi pi-discord",className:"font-bold px-5 py-3 white-space-nowrap",raised:!0,rounded:!0})]})}),e.jsx(l,{header:"Banner",code:p,containerClassName:"surface-0 py-8",free:!0,children:e.jsxs("div",{className:"bg-bluegray-900 text-gray-100 p-3 flex justify-content-between lg:justify-content-center align-items-center flex-wrap",children:[e.jsx("div",{className:"font-bold mr-8",children:"🔥 Hot Deals!"}),e.jsx("div",{className:"align-items-center hidden lg:flex",children:e.jsx("span",{className:"line-height-3",children:"Libero voluptatum atque exercitationem praesentium provident odit."})}),e.jsx("a",{className:"flex align-items-center ml-2 mr-8",children:e.jsx("span",{className:"underline font-bold",children:"Learn More"})}),e.jsx("a",{className:"flex align-items-center no-underline justify-content-center border-circle text-100 hover:bg-bluegray-700 cursor-pointer transition-colors transition-duration-150",style:{width:"2rem",height:"2rem"},children:e.jsx("i",{className:"pi pi-times"})})]})}),e.jsx("div",{className:"block-category-title",children:"Application UI"}),e.jsx(l,{header:"Page Heading",code:u,containerClassName:"surface-0 px-4 py-5 md:px-6 lg:px-8",free:!0,children:e.jsxs("div",{className:"surface-0",children:[e.jsxs("ul",{className:"list-none p-0 m-0 flex align-items-center font-medium mb-3",children:[e.jsx("li",{children:e.jsx("a",{className:"text-500 no-underline line-height-3 cursor-pointer",children:"Application"})}),e.jsx("li",{className:"px-2",children:e.jsx("i",{className:"pi pi-angle-right text-500 line-height-3"})}),e.jsx("li",{children:e.jsx("span",{className:"text-900 line-height-3",children:"Analytics"})})]}),e.jsxs("div",{className:"flex align-items-start flex-column lg:justify-content-between lg:flex-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"font-medium text-3xl text-900",children:"Customers"}),e.jsxs("div",{className:"flex align-items-center text-700 flex-wrap",children:[e.jsxs("div",{className:"mr-5 flex align-items-center mt-3",children:[e.jsx("i",{className:"pi pi-users mr-2"}),e.jsx("span",{children:"332 Active Users"})]}),e.jsxs("div",{className:"mr-5 flex align-items-center mt-3",children:[e.jsx("i",{className:"pi pi-globe mr-2"}),e.jsx("span",{children:"9402 Sessions"})]}),e.jsxs("div",{className:"flex align-items-center mt-3",children:[e.jsx("i",{className:"pi pi-clock mr-2"}),e.jsx("span",{children:"2.32m Avg. Duration"})]})]})]}),e.jsxs("div",{className:"mt-3 lg:mt-0",children:[e.jsx(s,{label:"Add",className:"mr-2",outlined:!0,icon:"pi pi-user-plus"}),e.jsx(s,{label:"Save",icon:"pi pi-check"})]})]})]})}),e.jsx(l,{header:"Stats",code:h,containerClassName:"px-4 py-5 md:px-6 lg:px-8",free:!0,children:e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12 md:col-6 lg:col-3",children:e.jsxs("div",{className:"surface-0 shadow-2 p-3 border-1 border-50 border-round",children:[e.jsxs("div",{className:"flex justify-content-between mb-3",children:[e.jsxs("div",{children:[e.jsx("span",{className:"block text-500 font-medium mb-3",children:"Orders"}),e.jsx("div",{className:"text-900 font-medium text-xl",children:"152"})]}),e.jsx("div",{className:"flex align-items-center justify-content-center bg-blue-100 border-round",style:{width:"2.5rem",height:"2.5rem"},children:e.jsx("i",{className:"pi pi-shopping-cart text-blue-500 text-xl"})})]}),e.jsx("span",{className:"text-green-500 font-medium",children:"24 new "}),e.jsx("span",{className:"text-500",children:"since last visit"})]})}),e.jsx("div",{className:"col-12 md:col-6 lg:col-3",children:e.jsxs("div",{className:"surface-0 shadow-2 p-3 border-1 border-50 border-round",children:[e.jsxs("div",{className:"flex justify-content-between mb-3",children:[e.jsxs("div",{children:[e.jsx("span",{className:"block text-500 font-medium mb-3",children:"Revenue"}),e.jsx("div",{className:"text-900 font-medium text-xl",children:"$2.100"})]}),e.jsx("div",{className:"flex align-items-center justify-content-center bg-orange-100 border-round",style:{width:"2.5rem",height:"2.5rem"},children:e.jsx("i",{className:"pi pi-map-marker text-orange-500 text-xl"})})]}),e.jsx("span",{className:"text-green-500 font-medium",children:"%52+ "}),e.jsx("span",{className:"text-500",children:"since last week"})]})}),e.jsx("div",{className:"col-12 md:col-6 lg:col-3",children:e.jsxs("div",{className:"surface-0 shadow-2 p-3 border-1 border-50 border-round",children:[e.jsxs("div",{className:"flex justify-content-between mb-3",children:[e.jsxs("div",{children:[e.jsx("span",{className:"block text-500 font-medium mb-3",children:"Customers"}),e.jsx("div",{className:"text-900 font-medium text-xl",children:"28441"})]}),e.jsx("div",{className:"flex align-items-center justify-content-center bg-cyan-100 border-round",style:{width:"2.5rem",height:"2.5rem"},children:e.jsx("i",{className:"pi pi-inbox text-cyan-500 text-xl"})})]}),e.jsx("span",{className:"text-green-500 font-medium",children:"520 "}),e.jsx("span",{className:"text-500",children:"newly registered"})]})}),e.jsx("div",{className:"col-12 md:col-6 lg:col-3",children:e.jsxs("div",{className:"surface-0 shadow-2 p-3 border-1 border-50 border-round",children:[e.jsxs("div",{className:"flex justify-content-between mb-3",children:[e.jsxs("div",{children:[e.jsx("span",{className:"block text-500 font-medium mb-3",children:"Comments"}),e.jsx("div",{className:"text-900 font-medium text-xl",children:"152 Unread"})]}),e.jsx("div",{className:"flex align-items-center justify-content-center bg-purple-100 border-round",style:{width:"2.5rem",height:"2.5rem"},children:e.jsx("i",{className:"pi pi-comment text-purple-500 text-xl"})})]}),e.jsx("span",{className:"text-green-500 font-medium",children:"85 "}),e.jsx("span",{className:"text-500",children:"responded"})]})})]})}),e.jsx(l,{header:"Sign-In",code:b,containerClassName:"px-4 py-8 md:px-6 lg:px-8",free:!0,children:e.jsx("div",{className:"flex align-items-center justify-content-center",children:e.jsxs("div",{className:"surface-card p-4 shadow-2 border-round w-full lg:w-6",children:[e.jsxs("div",{className:"text-center mb-5",children:[e.jsx("img",{src:"/demo/images/blocks/logos/hyper.svg",alt:"hyper",height:50,className:"mb-3"}),e.jsx("div",{className:"text-900 text-3xl font-medium mb-3",children:"Welcome Back"}),e.jsx("span",{className:"text-600 font-medium line-height-3",children:"Do not have an account?"}),e.jsx("a",{className:"font-medium no-underline ml-2 text-blue-500 cursor-pointer",children:"Create today!"})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"email",className:"block text-900 font-medium mb-2",children:"Email"}),e.jsx(x,{id:"email",type:"text",placeholder:"Email address",className:"w-full mb-3"}),e.jsx("label",{htmlFor:"password",className:"block text-900 font-medium mb-2",children:"Password"}),e.jsx(x,{id:"password",type:"password",placeholder:"Password",className:"w-full mb-3"}),e.jsxs("div",{className:"flex align-items-center justify-content-between mb-6",children:[e.jsxs("div",{className:"flex align-items-center",children:[e.jsx(g,{id:"rememberme",onChange:v=>a(v.checked),checked:i,className:"mr-2"}),e.jsx("label",{htmlFor:"rememberme",className:"text-900",children:"Remember me"})]}),e.jsx("a",{className:"font-medium no-underline ml-2 text-blue-500 text-right cursor-pointer",children:"Forgot your password?"})]}),e.jsx(s,{label:"Sign In",icon:"pi pi-user",className:"w-full"})]})]})})}),e.jsx(l,{header:"Description List",code:N,containerClassName:"surface-0 px-4 py-8 md:px-6 lg:px-8",free:!0,children:e.jsxs("div",{className:"surface-0",children:[e.jsx("div",{className:"font-medium text-3xl text-900 mb-3",children:"Movie Information"}),e.jsx("div",{className:"text-500 mb-5",children:"Morbi tristique blandit turpis. In viverra ligula id nulla hendrerit rutrum."}),e.jsxs("ul",{className:"list-none p-0 m-0",children:[e.jsxs("li",{className:"flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap",children:[e.jsx("div",{className:"text-500 w-6 md:w-2 font-medium",children:"Title"}),e.jsx("div",{className:"text-900 w-full md:w-8 md:flex-order-0 flex-order-1",children:"Heat"}),e.jsx("div",{className:"w-6 md:w-2 flex justify-content-end",children:e.jsx(s,{label:"Edit",icon:"pi pi-pencil",text:!0})})]}),e.jsxs("li",{className:"flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap",children:[e.jsx("div",{className:"text-500 w-6 md:w-2 font-medium",children:"Genre"}),e.jsxs("div",{className:"text-900 w-full md:w-8 md:flex-order-0 flex-order-1",children:[e.jsx(d,{label:"Crime",className:"mr-2"}),e.jsx(d,{label:"Drama",className:"mr-2"}),e.jsx(d,{label:"Thriller"})]}),e.jsx("div",{className:"w-6 md:w-2 flex justify-content-end",children:e.jsx(s,{label:"Edit",icon:"pi pi-pencil",text:!0})})]}),e.jsxs("li",{className:"flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap",children:[e.jsx("div",{className:"text-500 w-6 md:w-2 font-medium",children:"Director"}),e.jsx("div",{className:"text-900 w-full md:w-8 md:flex-order-0 flex-order-1",children:"Michael Mann"}),e.jsx("div",{className:"w-6 md:w-2 flex justify-content-end",children:e.jsx(s,{label:"Edit",icon:"pi pi-pencil",text:!0})})]}),e.jsxs("li",{className:"flex align-items-center py-3 px-2 border-top-1 border-300 flex-wrap",children:[e.jsx("div",{className:"text-500 w-6 md:w-2 font-medium",children:"Actors"}),e.jsx("div",{className:"text-900 w-full md:w-8 md:flex-order-0 flex-order-1",children:"Robert De Niro, Al Pacino"}),e.jsx("div",{className:"w-6 md:w-2 flex justify-content-end",children:e.jsx(s,{label:"Edit",icon:"pi pi-pencil",text:!0})})]}),e.jsxs("li",{className:"flex align-items-center py-3 px-2 border-top-1 border-bottom-1 border-300 flex-wrap",children:[e.jsx("div",{className:"text-500 w-6 md:w-2 font-medium",children:"Plot"}),e.jsx("div",{className:"text-900 w-full md:w-8 md:flex-order-0 flex-order-1 line-height-3",children:"A group of professional bank robbers start to feel the heat from police when they unknowingly leave a clue at their latest heist."}),e.jsx("div",{className:"w-6 md:w-2 flex justify-content-end",children:e.jsx(s,{label:"Edit",icon:"pi pi-pencil",text:!0})})]})]})]})}),e.jsx(l,{header:"Card",code:f,containerClassName:"px-4 py-8 md:px-6 lg:px-8",free:!0,children:e.jsxs("div",{className:"surface-0 p-4 shadow-2 border-round",children:[e.jsx("div",{className:"text-3xl font-medium text-900 mb-3",children:"Card Title"}),e.jsx("div",{className:"font-medium text-500 mb-3",children:"Vivamus id nisl interdum, blandit augue sit amet, eleifend mi."}),e.jsx("div",{style:{height:"150px"},className:"border-2 border-dashed border-300"})]})})]})};export{E as default};
