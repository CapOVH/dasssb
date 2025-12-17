'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
import UserCard from './UserCard';

interface ChatMessage {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    color: string;
    badge?: string; // URL to badge image
    isSystem?: boolean;
    isHype?: boolean; // Special styling for hype messages
}

interface User {
    username: string;
    id: string;
    createdAt: number;
    color?: string;
    badge?: string;
    verified?: boolean; // Added
    banned?: { until: number; reason: string; }; // Added
    role?: 'admin' | 'user';
}

interface HypeState {
    amount: number;
    active: boolean;
    endsAt: number;
}

interface GlobalChatProps {
    roomId?: string; // Optional room ID (default: 'global')
    embed?: boolean; // If true, renders as a block element (100% w/h) instead of floating
}

const BADGES = [
    { id: 'founder', name: 'SSB Founder', url: '/ssb_logo.png' }, // Default
    { id: 'vip', name: 'VIP', url: 'https://cdn-icons-png.flaticon.com/512/6941/6941697.png' }, // Example crown
    { id: 'verified', name: 'Verified', url: 'https://cdn-icons-png.flaticon.com/512/7595/7595571.png', restricted: true }, // Locked
];

export default function GlobalChat({ roomId = 'global', embed = false }: GlobalChatProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showAuth, setShowAuth] = useState(false);

    // Feature States
    const [showSettings, setShowSettings] = useState(false);
    const [showHypeMenu, setShowHypeMenu] = useState(false);
    const [viewingUser, setViewingUser] = useState<string | null>(null);
    const [hypeState, setHypeState] = useState<HypeState>({ amount: 0, active: false, endsAt: 0 });
    const [slowMode, setSlowMode] = useState(false); // User-local toggle for now (simulation)

    const isAdmin = currentUser?.username.toLowerCase() === 'reese' || currentUser?.role === 'admin';
    const isSuperAdmin = currentUser?.username.toLowerCase() === 'reese';

    const bottomRef = useRef<HTMLDivElement>(null);

    const STORAGE_KEY = `chat_history_${roomId}`;
    const HYPE_KEY = `ssb_hype_${roomId}`;

    // Initialize
    useEffect(() => {
        // Load Messages
        const savedMsg = localStorage.getItem(STORAGE_KEY);
        if (savedMsg) {
            setMessages(JSON.parse(savedMsg));
        } else {
            const displayName = roomId === 'global' ? 'Global' : roomId.replace('stream_', '') + "'s Room";
            setMessages([
                { id: '1', user: 'System', text: `Welcome to ${displayName} Chat!`, timestamp: Date.now(), color: '#53FC18', isSystem: true }
            ]);
        }

        // Load User Session
        const storedUser = localStorage.getItem('ssb_current_user');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }

        // Load Hype State
        const savedHype = localStorage.getItem(HYPE_KEY);
        if (savedHype) {
            setHypeState(JSON.parse(savedHype));
        }
    }, [STORAGE_KEY, roomId, HYPE_KEY]);

    // Listen for storage updates AND Custom Events
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                setMessages(JSON.parse(e.newValue));
            }
            if (e.key === 'ssb_current_user') {
                if (e.newValue) setCurrentUser(JSON.parse(e.newValue));
                else setCurrentUser(null);
            }
            if (e.key === HYPE_KEY && e.newValue) {
                setHypeState(JSON.parse(e.newValue));
            }
        };

        const handleCustomAuth = () => {
            const storedUser = localStorage.getItem('ssb_current_user');
            if (storedUser) setCurrentUser(JSON.parse(storedUser));
            else setCurrentUser(null);
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('ssb_auth_changed', handleCustomAuth);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('ssb_auth_changed', handleCustomAuth);
        };
    }, [STORAGE_KEY, HYPE_KEY]);

    // Hype Timer Check
    useEffect(() => {
        const interval = setInterval(() => {
            if (hypeState.active && Date.now() > hypeState.endsAt) {
                const newState = { amount: 0, active: false, endsAt: 0 };
                setHypeState(newState);
                localStorage.setItem(HYPE_KEY, JSON.stringify(newState));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [hypeState, HYPE_KEY]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen, showSettings, showHypeMenu]);

    const sendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim() || !currentUser) return;

        // Slow Mod Check (Simulated)
        if (slowMode) {
            // In real app, this would block sending. Here we just show logic.
        }

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            user: currentUser.username,
            text: inputValue.trim(),
            timestamp: Date.now(),
            color: currentUser.color || '#ffffff',
            badge: currentUser.badge || BADGES[0].url // Default to Founder
        };

        const updated = [...messages, newMessage].slice(-50);
        setMessages(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        setInputValue('');
    };

    const handleLogin = (user: User) => {
        // Auto-assign Founder Badge if eligible (mock logic: all new users)
        if (!user.badge) user.badge = BADGES[0].url;

        setCurrentUser(user);
        localStorage.setItem('ssb_current_user', JSON.stringify(user));
        window.dispatchEvent(new Event('ssb_auth_changed'));
        setShowAuth(false);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('ssb_current_user');
        window.dispatchEvent(new Event('ssb_auth_changed'));
    };

    // Wallet / Hype
    const deductCoins = (amount: number) => {
        const currentPoints = parseInt(localStorage.getItem('ssb_points') || '0');
        if (currentPoints < amount) return false;

        localStorage.setItem('ssb_points', (currentPoints - amount).toString());
        window.dispatchEvent(new Event('ssbPointsUpdated'));
        return true;
    };

    const handleHype = (amount: number) => {
        if (!deductCoins(amount)) {
            alert("Not enough SSB Coins!");
            return;
        }

        const newAmount = hypeState.amount + amount;
        let isActive = hypeState.active;
        let ends = hypeState.endsAt;

        // Trigger logic
        if (newAmount >= 500 && !isActive) { // Threshold 500 to start
            isActive = true;
            ends = Date.now() + (5 * 60 * 1000); // 5 Mins
        } else if (isActive) {
            ends += 30 * 1000; // Extend by 30s
        }

        const newState = { amount: newAmount, active: isActive, endsAt: ends };
        setHypeState(newState);
        localStorage.setItem(HYPE_KEY, JSON.stringify(newState));

        // Send System Message
        const msg: ChatMessage = {
            id: Date.now().toString(),
            user: 'HYPE TRAIN',
            text: `${currentUser?.username} dropped ${amount} Hype! Choo Choo! 🚂`,
            timestamp: Date.now(),
            color: '#FFD700',
            isSystem: true,
            isHype: true
        };
        const updated = [...messages, msg].slice(-50);
        setMessages(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        setShowHypeMenu(false);
    };

    const updateUserSetting = (updates: Partial<User>) => {
        if (!currentUser) return;
        const newUser = { ...currentUser, ...updates };
        setCurrentUser(newUser);
        localStorage.setItem('ssb_current_user', JSON.stringify(newUser));
        window.dispatchEvent(new Event('ssb_auth_changed'));
    };

    const ChatContent = () => (
        <>
            {/* Overlays */}
            {viewingUser && <UserCard username={viewingUser} currentMessages={messages} onClose={() => setViewingUser(null)} />}

            {/* Hype Bar */}
            {hypeState.active && (
                <div style={{
                    background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                    padding: '8px',
                    textAlign: 'center',
                    color: 'black',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    animation: 'pulse 1s infinite'
                }}>
                    🔥 HYPED BOUT KICKS ACTIVE! ({hypeState.amount}) 🔥
                </div>
            )}

            {/* Header (Embedding check) */}
            <div style={{
                padding: '15px',
                background: '#14171a',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hypeState.active ? '#FFD700' : '#53FC18', boxShadow: `0 0 10px ${hypeState.active ? '#FFD700' : '#53FC18'}` }}></div>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '1px' }}>
                        {embed ? (roomId === 'global' ? 'GLOBAL' : 'ROOM') : 'GLOBAL CHAT'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {!embed && (
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}
                            className="hover:text-white"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    padding: '15px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {messages.map((msg) => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', opacity: slowMode ? 0.8 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                                {/* Badge */}
                                {msg.badge && !msg.isSystem && (
                                    <img src={msg.badge} alt="B" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                                )}

                                {!msg.isSystem && (
                                    <span
                                        onClick={() => setViewingUser(msg.user)}
                                        style={{
                                            color: msg.color,
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        }}
                                        title="View Profile"
                                    >
                                        {msg.user}
                                    </span>
                                )}
                                <span style={{ color: '#444', fontSize: '0.65rem' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div style={{
                                color: msg.isSystem ? (msg.isHype ? 'black' : '#53FC18') : '#ddd',
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                                wordBreak: 'break-word',
                                background: msg.isSystem ? (msg.isHype ? '#FFD700' : 'rgba(83, 252, 24, 0.1)') : 'transparent',
                                padding: msg.isSystem ? '5px 8px' : '0',
                                borderRadius: '4px',
                                borderLeft: msg.isSystem ? (msg.isHype ? '2px solid #FFA500' : '2px solid #53FC18') : 'none',
                                fontWeight: msg.isHype ? 'bold' : 'normal'
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Overlays: Settings & Hype */}

                {showSettings && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '100%',
                        background: '#1A1C1D', padding: '15px', borderTop: '2px solid #53FC18',
                        zIndex: 10, animation: 'slideUp 0.2s'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, color: 'white' }}>Chat Identity</h4>
                            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>▼</button>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '5px' }}>Username Color</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['#ffffff', '#53FC18', '#FF4444', '#8A2BE2', '#00BFFF', '#FFD700'].map(c => (
                                    <div
                                        key={c}
                                        onClick={() => updateUserSetting({ color: c })}
                                        style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, cursor: 'pointer', border: currentUser?.color === c ? '2px solid white' : 'none' }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '5px' }}>Badge</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {BADGES.map(b => {
                                    // @ts-ignore
                                    if (b.restricted && !currentUser?.verified && !isAdmin) return null;
                                    return (
                                        <img
                                            key={b.id}
                                            src={b.url}
                                            title={b.name}
                                            onClick={() => updateUserSetting({ badge: b.url })}
                                            style={{ width: '24px', height: '24px', cursor: 'pointer', opacity: currentUser?.badge === b.url ? 1 : 0.5, border: currentUser?.badge === b.url ? '1px solid white' : 'none', borderRadius: '4px', padding: '2px' }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                            <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Slow Mode</span>
                            <div
                                onClick={() => setSlowMode(!slowMode)}
                                style={{ width: '40px', height: '20px', background: slowMode ? '#53FC18' : '#333', borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                                <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: slowMode ? '22px' : '2px', transition: 'left 0.2s' }} />
                            </div>
                        </div>
                    </div>
                )}

                {showHypeMenu && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '100%',
                        background: '#1A1C1D', padding: '15px', borderTop: '2px solid #FFD700',
                        zIndex: 10, animation: 'slideUp 0.2s'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, color: '#FFD700' }}>Send Hype 🔥</h4>
                            <button onClick={() => setShowHypeMenu(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>▼</button>
                        </div>
                        <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '10px' }}>Spend SSB Coins to trigger Hyped Bout Kicks!</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {[100, 500, 1000, 5000].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => handleHype(amt)}
                                    style={{ background: '#333', border: '1px solid #FFD700', color: '#FFD700', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {amt} Coins
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Footer / Input */}
            {currentUser ? (
                <form onSubmit={sendMessage} style={{
                    padding: '10px',
                    background: '#14171a',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <button type="button" onClick={() => { setShowHypeMenu(false); setShowSettings(!showSettings); }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', filter: 'grayscale(100%) brightness(1.5)' }}>⚙️</button>
                    <button type="button" onClick={() => { setShowSettings(false); setShowHypeMenu(!showHypeMenu); }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>🔥</button>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={`Chat as ${currentUser.username}...`}
                        style={{
                            flex: 1,
                            background: '#0b0e0f',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            padding: '8px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            background: '#53FC18',
                            color: 'black',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0 12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ➤
                    </button>
                </form>
            ) : (
                <div style={{ padding: '10px', background: '#14171a', borderTop: '1px solid #333', textAlign: 'center' }}>
                    <button
                        onClick={() => setShowAuth(true)}
                        style={{ width: '100%', padding: '10px', background: '#8A2BE2', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        🔒 Sign In
                    </button>
                </div>
            )}
        </>
    );

    if (embed) {
        return (
            <>
                <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b0e0f' }}>
                    <ChatContent />
                </div>
            </>
        );
    }

    return (
        <>
            <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />
            {!isOpen && (
                <div onClick={() => setIsOpen(true)} style={{ position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px', background: '#14171a', border: '2px solid #53FC18', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 900, boxShadow: '0 5px 20px rgba(0,0,0,0.5)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="#53FC18" /></svg>
                </div>
            )}
            <div style={{ position: 'fixed', bottom: '90px', right: '20px', width: '350px', height: '500px', background: '#0b0e0f', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 900, display: 'flex', flexDirection: 'column', transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}>
                <ChatContent />
            </div>
            <style jsx>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } }
            `}</style>
        </>
    );
}
