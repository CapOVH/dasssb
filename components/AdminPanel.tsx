'use client';

import React, { useState, useEffect } from 'react';

interface User {
    username: string;
    id: string;
    verified?: boolean;
    banned?: { until: number; reason: string; };
    color?: string;
    badge?: string;
    role?: 'admin' | 'user';
}

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentUsername?: string;
}

export default function AdminPanel({ isOpen, onClose, currentUsername }: AdminPanelProps) {
    // ...
    const toggleAdmin = (username: string) => {
        const u = { ...users[username.toLowerCase()] };
        if (!u) return;

        u.role = u.role === 'admin' ? 'user' : 'admin';
        const newDb = { ...users, [username.toLowerCase()]: u };
        saveUsers(newDb);
    };

    // ...


    const [users, setUsers] = useState<Record<string, User>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // Load Users
    useEffect(() => {
        if (!isOpen) return;
        const loadUsers = () => {
            try {
                const db = JSON.parse(localStorage.getItem('ssb_users_db') || '{}');
                setUsers(db);
            } catch (e) { console.error(e); }
        };
        loadUsers();
        // Poll for updates?
        const interval = setInterval(loadUsers, 5000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const saveUsers = (newUsers: Record<string, User>) => {
        setUsers(newUsers);
        localStorage.setItem('ssb_users_db', JSON.stringify(newUsers));
        // Force update login state if needed?
    };

    const handleBan = (username: string, durationHours: number, reason: string) => {
        const u = { ...users[username.toLowerCase()] }; // Clone
        if (!u) return;

        u.banned = {
            until: Date.now() + (durationHours * 60 * 60 * 1000),
            reason: reason
        };

        const newDb = { ...users, [username.toLowerCase()]: u };
        saveUsers(newDb);
        alert(`Banned ${u.username} for ${durationHours} hours.`);
    };

    const handleUnban = (username: string) => {
        const u = { ...users[username.toLowerCase()] };
        if (!u) return;

        delete u.banned;
        const newDb = { ...users, [username.toLowerCase()]: u };
        saveUsers(newDb);
        alert(`Unbanned ${u.username}.`);
    };

    const toggleVerify = (username: string) => {
        const u = { ...users[username.toLowerCase()] };
        if (!u) return;

        u.verified = !u.verified;
        // If verifying, maybe force badge?
        if (u.verified) u.badge = 'https://cdn-icons-png.flaticon.com/512/7595/7595571.png'; // Blue check

        const newDb = { ...users, [username.toLowerCase()]: u };
        saveUsers(newDb);
    };

    const filteredUsers = Object.values(users).filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            background: '#0d1117',
            zIndex: 100,
            display: 'flex', flexDirection: 'column',
            borderRight: '1px solid #333'
        }}>
            {/* Header */}
            <div style={{ padding: '15px', background: '#1c0404', borderBottom: '2px solid #ff4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                    <h3 style={{ margin: 0, color: '#ff4444', textTransform: 'uppercase' }}>Admin Panel</h3>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px', background: '#0d1117' }}>
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px', background: '#010409', border: '1px solid #333', color: 'white', borderRadius: '4px', outline: 'none' }}
                />
            </div>

            {/* User List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {filteredUsers.map(user => (
                    <div key={user.username} style={{
                        background: '#161b22',
                        marginBottom: '8px',
                        padding: '10px',
                        borderRadius: '6px',
                        border: selectedUser === user.username ? '1px solid #ff4444' : '1px solid #333',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div onClick={() => setSelectedUser(selectedUser === user.username ? null : user.username)} style={{ flex: 1, cursor: 'pointer' }}>
                            <div style={{ fontWeight: 'bold', color: user.username.toLowerCase() === 'reese' ? '#ff4444' : (user.color || 'white') }}>
                                {user.username}
                                {user.verified && <span style={{ marginLeft: '5px' }}>☑️</span>}
                                {user.banned && <span style={{ marginLeft: '5px', color: 'red', fontSize: '0.8rem' }}>[BANNED]</span>}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>ID: {user.id.slice(-6)}</div>
                        </div>

                        {selectedUser === user.username && user.username.toLowerCase() !== 'reese' && (
                            <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => handleBan(user.username, 1, 'Admin Action')} style={{ background: '#333', color: 'white', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>1h</button>
                                    <button onClick={() => handleBan(user.username, 24, 'Admin Action')} style={{ background: '#333', color: 'white', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>24h</button>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => handleUnban(user.username)} style={{ background: '#2ea043', color: 'white', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>Unban</button>
                                    <button onClick={() => toggleVerify(user.username)} style={{ background: '#1f6feb', color: 'white', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>{user.verified ? 'Unverify' : 'Verify'}</button>
                                </div>
                                {currentUsername?.toLowerCase() === 'reese' && (
                                    <button onClick={() => toggleAdmin(user.username)} style={{ background: user.role === 'admin' ? '#FF4444' : '#FFD700', color: 'black', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                        {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
