import React from 'react';

const Documentation = () => {
    return (
        <div className="card docs">
            <h2>Documentation</h2>
            <h4>Getting Started</h4>
            <p>
                Vidhione is an application template for Vite based on the popular{' '}
                <a href="https://vitejs.dev/" className="font-medium hover:underline text-primary">
                    Vite
                </a>{' '}
                framework. Current versions are Vite v4, React v18, Typescript with PrimeReact v10.
            </p>
            <p>To get started, extract the contents of the zip file, cd to the directory and install the dependencies with npm or yarn.</p>
            <pre className="app-code">
                <code>{`"npm install" or "yarn"`}</code>
            </pre>

            <p>
                Next step is running the application using the start script and navigate to <b>http://localhost:5173/</b> to view the application. That is it, you may now start with the development of your application using the Vidhione template.
            </p>

            <pre className="app-code">
                <code>{`"npm run dev" or "yarn dev"`}</code>
            </pre>
            <h5>Dependencies</h5>
            <p>Dependencies of Vidhione are listed below and needs to be defined at package.json.</p>

            <pre className="app-code">
                <code>
                    {`"primereact": "^9.6.2",                    //required: PrimeReact components
"primeicons": "^6.0.1",                    //required: Icons
"primeflex": "^3.3.0",                     //required: Utility CSS classes`}
                </code>
            </pre>
        </div>
    );
};

export default Documentation;
