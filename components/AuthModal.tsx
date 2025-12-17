'use client';

import React, { useState, useEffect } from 'react';

interface User {
    username: string;
    id: string;
    createdAt: number;
    color?: string;
    badge?: string;
    verified?: boolean;
    banned?: { until: number; reason: string; };
}

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (user: User) => void;
}

// Basic "AI" Protection - Slur/Bad word filter
const BANNED_WORDS = ['admin', 'mod', 'system', 'root', 'fuck', 'shit', 'nigger', 'faggot', 'retard', 'cunt', 'dick', 'pussy']; // Add more as needed

export const checkUsernameValidation = (username: string): { valid: boolean; error?: string } => {
    const lower = username.toLowerCase();

    if (lower.length < 3) return { valid: false, error: 'Username must be at least 3 characters.' };
    if (lower.length > 16) return { valid: false, error: 'Username must be under 16 characters.' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, error: 'Only letters, numbers, and underscores allowed.' };

    // "AI" Scan
    for (const word of BANNED_WORDS) {
        if (lower.includes(word)) return { valid: false, error: 'Username contains restricted content.' };
    }

    return { valid: true };
};

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'signup'>('signup');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState(''); // Simulated password
    const [error, setError] = useState<string | null>(null);

    // Generate Random Username
    const generateRandom = () => {
        const adjs = ['Cool', 'Super', 'Pro', 'Cyber', 'Neon', 'Hyper', 'Mega', 'Ultra'];
        const nouns = ['Gamer', 'Winner', 'Striker', 'Ninja', 'Pilot', 'Wizard', 'King', 'Queen'];
        const num = Math.floor(Math.random() * 9999);
        const rand = `${adjs[Math.floor(Math.random() * adjs.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
        setUsername(rand);
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        const validation = checkUsernameValidation(username);
        if (!validation.valid) {
            setError(validation.error || 'Invalid username');
            return;
        }

        // Mock Database Operations
        const usersFn = () => {
            const stored = localStorage.getItem('ssb_users_db');
            return stored ? JSON.parse(stored) : {};
        };
        const users = usersFn();

        if (mode === 'signup') {
            // Check Uniqueness
            if (users[username.toLowerCase()]) {
                setError('Username strictly taken. Please choose another.');
                return;
            }

            // Create User
            const newUser: User = {
                username: username, // Preserve case for display
                id: `user_${Date.now()}`,
                createdAt: Date.now()
            };

            // Save to "DB"
            users[username.toLowerCase()] = { ...newUser, password }; // Simple password storage
            localStorage.setItem('ssb_users_db', JSON.stringify(users));

            onLogin(newUser);
            onClose();

        } else {
            // Login
            const userRecord = users[username.toLowerCase()];
            if (!userRecord) {
                setError('User does not exist.');
                return;
            }
            if (userRecord.password !== password) {
                setError('Incorrect password.');
                return;
            }

            // CHECK BAN STATUS
            if (userRecord.banned) {
                if (userRecord.banned.until > Date.now()) {
                    const date = new Date(userRecord.banned.until).toLocaleString();
                    setError(`⛔ Account Suspended until ${date}. Reason: ${userRecord.banned.reason}`);
                    return;
                } else {
                    // Ban expired, remove it
                    delete userRecord.banned;
                    localStorage.setItem('ssb_users_db', JSON.stringify(users));
                }
            }

            onLogin({
                username: userRecord.username,
                id: userRecord.id,
                createdAt: userRecord.createdAt,
                color: userRecord.color,
                badge: userRecord.badge,
                verified: userRecord.verified,
                banned: userRecord.banned
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: '#14171a',
                border: '2px solid #53FC18',
                borderRadius: '16px',
                padding: '30px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 0 30px rgba(83, 252, 24, 0.2)'
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px', fontFamily: "'Ubuntu', sans-serif" }}>
                    {mode === 'signup' ? 'Create Secure Account' : 'Welcome Back'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {error && (
                        <div style={{ background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <label style={{ color: '#ccc', fontSize: '0.9rem' }}>Username</label>
                            {mode === 'signup' && (
                                <button type="button" onClick={generateRandom} style={{ background: 'none', border: 'none', color: '#53FC18', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    🎲 Generate Function
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: '#0b0e0f', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none' }}
                            placeholder="Enter unique username"
                        />
                    </div>

                    <div>
                        <label style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: '#0b0e0f', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none' }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            background: '#53FC18',
                            color: 'black',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            marginTop: '10px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {mode === 'signup' ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: '#888' }}>
                    {mode === 'signup' ? 'Already have an account? ' : 'New to SSB? '}
                    <button
                        onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); }}
                        style={{ background: 'none', border: 'none', color: '#53FC18', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>

            </div>
        </div>
    );
}
