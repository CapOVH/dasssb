'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MultiviewWidget() {
    const router = useRouter();
    const [active, setActive] = useState(false);

    // This is a placeholder for the actual multiview logic which requires a complex page
    // For now, we'll just show the button that links to a hypothetical /multiview page
    // or opens a modal.

    return (
        <div
            onClick={() => router.push('/multiview')}
            style={{
                position: 'fixed',
                bottom: '80px',
                right: '250px', // Spaced from Versus
                background: '#1a73e8',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '50px',
                cursor: 'pointer',
                zIndex: 900,
                boxShadow: '0 5px 20px rgba(26, 115, 232, 0.5)',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '700',
                fontSize: '1rem',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
            </svg>
            MULTIVIEW
        </div>
    );
}
