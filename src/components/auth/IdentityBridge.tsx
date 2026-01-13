'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

export default function IdentityBridge() {
    const { data: session, status } = useSession();
    const processingRef = useRef(false);

    useEffect(() => {
        if (status === 'authenticated' && session?.user && !processingRef.current) {
            const identityKey = session.user.id || session.user.email || 'unknown';
            const hasClaimed = localStorage.getItem('identity_claimed_for') === identityKey;

            if (!hasClaimed) {
                processingRef.current = true;

                // Call Claim Endpoint
                fetch('/api/identity/claim', { method: 'POST' })
                    .then(async (res) => {
                        if (res.ok) {
                            const data = await res.json();
                            console.log('✅ Identity check:', data);
                            localStorage.setItem('identity_claimed_for', identityKey);

                            // Only reload if a merge actually happened to update WS context
                            if (data.merged) {
                                console.log('🔄 Merged guest session, reloading context...');
                                localStorage.removeItem('wsToken');
                                window.location.reload();
                            }
                        }
                    })
                    .catch(err => console.error('Identity claim failed', err))
                    .finally(() => {
                        processingRef.current = false;
                    });
            }
        }
    }, [status, session]);

    return null; // This component is logical only
}
