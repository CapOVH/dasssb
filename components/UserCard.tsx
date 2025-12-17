'use client';

import React, { useState, useEffect } from 'react';

interface ChatMessage {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    color: string;
    badge?: string;
}

interface UserCardProps {
    username: string;
    currentMessages: ChatMessage[];
    onClose: () => void;
}

export default function UserCard({ username, currentMessages, onClose }: UserCardProps) {
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        try {
            const db = JSON.parse(localStorage.getItem('ssb_users_db') || '{}');
            const user = db[username.toLowerCase()];
            if (user) {
                setUserData(user);
            } else {
                // Fallback for mock users or errors
                setUserData({ username, createdAt: Date.now(), color: '#fff' });
            }
        } catch (e) {
            console.error(e);
        }
    }, [username]);

    if (!userData) return null;

    const userMessages = currentMessages.filter(m => m.user === username).slice(-10).reverse(); // Last 10 messages

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: '#161b22',
                border: `2px solid ${userData.color || '#53FC18'}`,
                borderRadius: '12px',
                padding: '20px',
                width: '85%',
                maxWidth: '300px',
                boxShadow: `0 0 20px ${userData.color || '#53FC18'}40`,
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                {/* Close X */}
                <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>×</button>

                {/* Profile Header */}
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#0b0e0f', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${userData.color || '#53FC18'}` }}>
                        {userData.badge ? (
                            <img src={userData.badge} alt="B" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ fontSize: '2rem' }}>👤</span>
                        )}
                    </div>
                    <h3 style={{ margin: 0, color: userData.color || 'white', fontSize: '1.2rem' }}>{userData.username || username}</h3>
                    {userData.verified && <span style={{ color: '#00BFFF', fontSize: '0.8rem' }}>☑️ Verified Account</span>}
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '5px' }}>
                        Joined: {new Date(userData.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666' }}>
                        ID: {userData.id?.slice(-8) || 'Unknown'}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#ccc', fontSize: '0.9rem' }}>Recent Messages</h4>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {userMessages.length > 0 ? userMessages.map(msg => (
                            <div key={msg.id} style={{ fontSize: '0.8rem', color: '#aaa', background: '#0b0e0f', padding: '6px', borderRadius: '4px' }}>
                                <span style={{ color: '#666', marginRight: '5px', fontSize: '0.7rem' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.text}
                            </div>
                        )) : (
                            <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.8rem' }}>No recent messages in this session.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
