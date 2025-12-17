import React, { useEffect, useState } from 'react';
import AuthModal from './AuthModal';

export default function Header() {
    const [ssbPoints, setSsbPoints] = useState(0);
    const [user, setUser] = useState<any>(null);
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        // Load SSB Points
        const loadPoints = () => {
            try {
                const points = localStorage.getItem('ssb_points');
                setSsbPoints(points ? parseInt(points) : 0);
            } catch (e) {
                console.error('Error loading SSB points:', e);
            }
        };

        // Load User
        const loadUser = () => {
            const u = localStorage.getItem('ssb_current_user');
            if (u) setUser(JSON.parse(u));
            else setUser(null);
        };

        loadPoints();
        loadUser();

        // Listen for storage changes
        const handleStorageChange = () => {
            loadPoints();
        };

        const handleAuthChange = () => {
            loadUser();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('ssbPointsUpdated', handleStorageChange);
        window.addEventListener('ssb_auth_changed', handleAuthChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('ssbPointsUpdated', handleStorageChange);
            window.removeEventListener('ssb_auth_changed', handleAuthChange);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('ssb_current_user');
        window.dispatchEvent(new Event('ssb_auth_changed'));
        setUser(null);
    };

    return (
        <div id="ndzn-header" className="container">
            <img src="https://i.imgur.com/pGowI7G.png" className="ndzn-bg" alt="header bg" style={{ display: 'none' }} />

            <a href="https://kick.com" className="header-splash__left" target="_blank" rel="noreferrer">
                <div className="btn--discord" style={{ backgroundColor: '#53FC18', color: 'black' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3H21V21H3V3Z" fill="black" />
                        <path d="M10 6V18H13V13.5L16.5 18H20.5L15.5 12L20.5 6H16.5L13 10.5V6H10Z" fill="#53FC18" />
                    </svg>
                    <span>KICK</span>
                </div>
            </a>


            <div className="header-splash">
                {/* SSB Coins Balance Display */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '10px',
                    background: '#1a1d2e',
                    padding: '6px 15px',
                    borderRadius: '8px',
                    border: '1px solid #2a2d3e',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    cursor: 'pointer'
                }}>
                    <img src="/ssb_logo.png" alt="SSB" style={{ height: '50px', width: 'auto' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                        <span style={{
                            fontFamily: 'Ubuntu, sans-serif',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            letterSpacing: '0.5px'
                        }}>
                            {ssbPoints.toLocaleString()}
                        </span>
                        <span style={{
                            fontFamily: 'Ubuntu, sans-serif',
                            fontSize: '10px',
                            color: '#888',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            SSB Coins
                        </span>
                    </div>
                </div>

                <a href="/">
                    {/* Kick Logo / Home */}
                    <div className="flex h-12 w-full items-center justify-center">
                        <img src="/ssb_logo.png" alt="SSB Logo" style={{ height: '130px', width: 'auto', marginTop: '20px' }} />
                    </div>
                </a>
            </div>

            <div className="header-splash__right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a href="/stats">
                    <div className="btn--cart" style={{ background: '#53FC18', color: 'black', fontWeight: '900', boxShadow: '0 0 20px rgba(83, 252, 24, 0.4)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 11H15M12 8V14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="2" fill="currentColor" />
                        </svg>
                        <span>Stats</span>
                    </div>
                </a>

                {user ? (
                    <button
                        onClick={handleLogout}
                        className="btn--cart"
                        style={{
                            background: '#1a1d2e',
                            color: 'white',
                            fontWeight: 'bold',
                            border: '1px solid #333',
                            cursor: 'pointer',
                            padding: '0 15px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>Logout</span>
                    </button>
                ) : (
                    <button
                        onClick={() => setShowAuth(true)}
                        className="btn--cart"
                        style={{
                            background: '#1a1d2e',
                            color: 'white',
                            fontWeight: 'bold',
                            border: '1px solid #53FC18',
                            cursor: 'pointer',
                            padding: '0 15px',
                            height: '40px'
                        }}
                    >
                        Login
                    </button>
                )}
            </div>

            <AuthModal
                isOpen={showAuth}
                onClose={() => setShowAuth(false)}
                onLogin={(u) => {
                    localStorage.setItem('ssb_current_user', JSON.stringify(u));
                    window.dispatchEvent(new Event('ssb_auth_changed'));
                    setUser(u);
                    setShowAuth(false);
                }}
            />
        </div>
    );
}
