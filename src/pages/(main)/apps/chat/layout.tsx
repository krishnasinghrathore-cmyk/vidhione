'use client';

import { Outlet } from 'react-router-dom';
import { ChatProvider } from '../../../../demo/components/apps/chat/context/chatcontext';

export default function ChatLayout() {
    return (
        <ChatProvider>
            <Outlet />
        </ChatProvider>
    );
}
