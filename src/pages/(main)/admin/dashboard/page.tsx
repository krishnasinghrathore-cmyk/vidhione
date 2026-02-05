'use client';
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminDashboardPage() {
    return <Navigate to="/admin/tenants" replace />;
}

