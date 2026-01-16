'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

import AnnouncementModal from '../AnnouncementModal';

export default function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <AnnouncementModal />
        </SessionProvider>
    );
}
