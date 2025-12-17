'use client';

import React, { useState, useEffect } from 'react';

interface UserStats {
    totalTimeMs: number;
    watchHistory: Record<string, number>;
    lastActive: number;
}

interface UserProfile {
    username: string;
    id: string;
    verified?: boolean;
    banned?: { until: number; reason: string; };
    role?: 'admin' | 'user';
    color?: string;
    badge?: string;
}

interface AiLog {
    id: number;
    time: string;
    status: string;
    message: string;
    type: 'info' | 'warning' | 'error';
}

export default function AdvancedAdminDashboard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [stats, setStats] = useState<Record<string, UserStats>>({});
    const [users, setUsers] = useState<Record<string, UserProfile>>({});
    const [logs, setLogs] = useState<AiLog[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system'>('overview');
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const load = () => {
            setStats(JSON.parse(localStorage.getItem('ssb_user_stats') || '{}'));
            setUsers(JSON.parse(localStorage.getItem('ssb_users_db') || '{}'));
            setLogs(JSON.parse(localStorage.getItem('ssb_ai_logs') || '[]'));

            const curr = localStorage.getItem('ssb_current_user');
            if (curr) setCurrentUser(JSON.parse(curr));
        };

        load();
        const interval = setInterval(load, 2000); // Live Updates (Faster for admin)
        return () => clearInterval(interval);
    }, [isOpen]);

    const saveUsers = (newUsers: Record<string, UserProfile>) => {
        setUsers(newUsers);
        localStorage.setItem('ssb_users_db', JSON.stringify(newUsers));
    };

    // Actions
    const handleBan = (username: string, durationHours: number) => {
        const u = { ...users[username.toLowerCase()] };
        if (!u) return;

        // Safety Check: Admins cannot ban Admins
        if (u.role === 'admin') {
            alert(`⛔ ACCESS DENIED: You cannot ban another Admin (${u.username}).`);
            return;
        }

        u.banned = { until: Date.now() + (durationHours * 3600000), reason: 'Admin Console Action' };
        saveUsers({ ...users, [username.toLowerCase()]: u });
    };

    const handleUnban = (username: string) => {
        const u = { ...users[username.toLowerCase()] };
        if (!u) return;
        delete u.banned;
        saveUsers({ ...users, [username.toLowerCase()]: u });
    };

    const toggleVerify = (username: string) => {
        const u = { ...users[username.toLowerCase()] };
        if (!u) return;
        u.verified = !u.verified;
        if (u.verified) u.badge = 'https://cdn-icons-png.flaticon.com/512/7595/7595571.png';
        saveUsers({ ...users, [username.toLowerCase()]: u });
    };

    const toggleAdmin = (username: string) => {
        const u = { ...users[username.toLowerCase()] };
        if (!u) return;
        u.role = u.role === 'admin' ? 'user' : 'admin';
        saveUsers({ ...users, [username.toLowerCase()]: u });
    };

    if (!isOpen) return null;

    const totalWatchTime = Object.values(stats).reduce((acc, curr) => acc + curr.totalTimeMs, 0);
    const activeResult = Object.values(stats).filter(u => Date.now() - u.lastActive < 300000); // 5 mins

    // Format Helpers
    const fmtTime = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${h}h ${m}m`;
    };

    const selectedUserProfile = selectedUser ? users[selectedUser.toLowerCase()] : null;
    const selectedUserStats = selectedUser ? stats[selectedUser] : null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: '#090a0b', zIndex: 20000,
            color: '#a0a0a0', fontFamily: 'monospace',
            display: 'flex', flexDirection: 'column'
        }}>
            {/* Top Bar */}
            <div style={{
                height: '60px', borderBottom: '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 25px', background: '#050505'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h2 style={{ color: '#53FC18', margin: 0, letterSpacing: '2px' }}>SSB_ADMIN_CONSOLE_V2</h2>
                    <span style={{
                        background: '#1a331a', color: '#53FC18', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
                        animation: 'pulse 2s infinite'
                    }}>
                        ● SYSTEM ONLINE
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem' }}>AI_SCAN_INTERVAL: 10s</div>
                    <button onClick={onClose} style={{ background: '#333', border: 'none', color: 'white', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}>EXIT TERMINAL</button>
                </div>
            </div>

            {/* Sidebar & Content Layout */}
            <div style={{ flex: 1, display: 'flex' }}>

                {/* Sidebar Navigation */}
                <div style={{ width: '250px', borderRight: '1px solid #333', background: '#0b0c0d', display: 'flex', flexDirection: 'column' }}>
                    {['overview', 'users', 'system'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab as any); setSelectedUser(null); }}
                            style={{
                                padding: '20px', textAlign: 'left', background: activeTab === tab ? '#161b22' : 'transparent',
                                border: 'none', borderBottom: '1px solid #1a1a1a', color: activeTab === tab ? '#53FC18' : '#888',
                                cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px',
                                borderLeft: activeTab === tab ? '4px solid #53FC18' : '4px solid transparent'
                            }}
                        >
                            &gt; {tab}
                        </button>
                    ))}
                </div>

                {/* Main View */}
                <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>

                    {activeTab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            <Card title="TOTAL SITE TIME" value={fmtTime(totalWatchTime)} color="#53FC18" />
                            <Card title="ACTIVE USERS" value={activeResult.length.toString()} color="#00BFFF" />
                            <Card title="AI LOGS PARSED" value={logs.length.toString()} color="#FFD700" />
                            <Card title="SECURITY THREATS" value="0" color="#FF4444" />

                            {/* AI Feed */}
                            <div style={{ gridColumn: '1 / -1', background: '#000', border: '1px solid #333', padding: '15px', fontFamily: 'monospace' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '0.9rem' }}>// LIVE_AI_LOGS_STREAM</h3>
                                <div style={{ height: '200px', overflowY: 'auto' }}>
                                    {logs.map(log => (
                                        <div key={log.id} style={{ marginBottom: '4px', fontSize: '0.8rem', color: log.type === 'warning' ? '#FFA500' : '#444' }}>
                                            <span style={{ color: '#666' }}>[{log.time}]</span> :: {log.message}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
                            {/* User List */}
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <input style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: 'white', marginBottom: '10px' }} placeholder="Search user..." />
                                {Object.keys(users).map(username => (
                                    <div key={username}
                                        onClick={() => setSelectedUser(username)}
                                        style={{
                                            padding: '10px', borderBottom: '1px solid #222', cursor: 'pointer',
                                            display: 'flex', justifyContent: 'space-between',
                                            background: selectedUser === username ? '#161b22' : 'transparent',
                                            color: users[username].role === 'admin' ? '#FFD700' : 'white'
                                        }}
                                    >
                                        <span>{username} {users[username].verified && '☑️'}</span>
                                        <span style={{ color: '#666' }}>{stats[username] ? fmtTime(stats[username].totalTimeMs) : '0m'}</span>
                                    </div>
                                ))}
                            </div>

                            {/* User Detail Panel */}
                            {selectedUser && (
                                <div style={{ flex: 1, background: '#111', border: '1px solid #333', padding: '20px', overflowY: 'auto' }}>
                                    <h2 style={{ borderBottom: '1px solid #53FC18', paddingBottom: '10px', color: '#53FC18', display: 'flex', justifyContent: 'space-between' }}>
                                        {selectedUserProfile?.username}
                                        {selectedUserProfile?.banned && <span style={{ color: 'red', fontSize: '1rem' }}> [BANNED]</span>}
                                    </h2>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '20px 0' }}>
                                        <button onClick={() => toggleVerify(selectedUser)} style={{ padding: '10px', background: '#1f6feb', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                                            {selectedUserProfile?.verified ? 'REVOKE VERIFY' : 'GRANT VERIFY'}
                                        </button>
                                        {selectedUserProfile?.banned ? (
                                            <button onClick={() => handleUnban(selectedUser)} style={{ padding: '10px', background: '#2ea043', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>UNBAN USER</button>
                                        ) : (
                                            <button onClick={() => handleBan(selectedUser, 24)} style={{ padding: '10px', background: '#FF4444', border: 'none', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}>BAN 24H</button>
                                        )}
                                        {currentUser?.username.toLowerCase() === 'reese' && (
                                            <button onClick={() => toggleAdmin(selectedUser)} style={{ gridColumn: '1 / -1', padding: '10px', background: selectedUserProfile?.role === 'admin' ? '#333' : '#FFD700', border: '1px solid #FFD700', color: selectedUserProfile?.role === 'admin' ? 'white' : 'black', cursor: 'pointer', fontWeight: 'bold' }}>
                                                {selectedUserProfile?.role === 'admin' ? 'REVOKE ADMIN' : 'MAKE ADMIN'}
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ margin: '20px 0' }}>
                                        <p>Role: <strong style={{ color: selectedUserProfile?.role === 'admin' ? '#FFD700' : 'white' }}>{selectedUserProfile?.role || 'User'}</strong></p>
                                        <p>Total Time Online: <span style={{ color: 'white' }}>{selectedUserStats ? fmtTime(selectedUserStats.totalTimeMs) : '0m'}</span></p>
                                        <p>Last Active: <span style={{ color: 'white' }}>{selectedUserStats ? new Date(selectedUserStats.lastActive).toLocaleString() : 'N/A'}</span></p>
                                    </div>

                                    <h3>Watch History</h3>
                                    {selectedUserStats?.watchHistory && Object.entries(selectedUserStats.watchHistory).map(([streamer, time]) => (
                                        <div key={streamer} style={{ marginBottom: '5px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                <span>{streamer}</span>
                                                <span>{fmtTime(time)}</span>
                                            </div>
                                            <div style={{ height: '4px', background: '#333', marginTop: '2px' }}>
                                                <div style={{ height: '100%', width: `${Math.min(100, (time / (selectedUserStats.totalTimeMs || 1)) * 100)}%`, background: '#00BFFF' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div style={{ textAlign: 'center', marginTop: '50px' }}>
                            <h1>SYSTEM INTEGRITY: 100%</h1>
                            <p>AI Neural Net is actively scanning all chat traffic and user patterns.</p>
                            <img src="https://media.tenor.com/images/1c7d24263543d227z/hacking-terminal.gif" style={{ opacity: 0.5, maxWidth: '400px' }} />
                        </div>
                    )}

                </div>
            </div>
            <style jsx>{`
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}

const Card = ({ title, value, color }: any) => (
    <div style={{ background: '#111', border: `1px solid #333`, padding: '20px', borderTop: `3px solid ${color}` }}>
        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>{title}</div>
        <div style={{ fontSize: '2rem', color: 'white' }}>{value}</div>
    </div>
);
