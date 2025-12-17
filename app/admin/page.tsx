'use client';
import AdvancedAdminDashboard from '../../components/AdvancedAdminDashboard';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('ssb_current_user');
        if (!userStr) {
            router.push('/');
            return;
        }
        const user = JSON.parse(userStr);
        if (user.username.toLowerCase() !== 'reese' && user.role !== 'admin') {
            router.push('/');
            return;
        }
        setAuthorized(true);
    }, []);

    if (!authorized) return <div style={{ background: '#090a0b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#53FC18', fontFamily: 'monospace' }}>AUTHENTICATING CREDENTIALS...</div>;

    return <AdvancedAdminDashboard isOpen={true} onClose={() => router.push('/')} />;
}
