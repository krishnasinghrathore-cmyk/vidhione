import React, { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import AppRoutes from './Router';

function App() {
    const element = useRoutes(AppRoutes);
    console.log('[ROUTER] useRoutes element:', element);

    return <Suspense fallback={<div>Loading...</div>}>{element}</Suspense>;
}

export default App; 