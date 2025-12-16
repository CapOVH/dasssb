import React from 'react';

export default function Header() {
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
                <a href="/">
                    {/* Kick Logo */}
                    {/* Kick Logo - New Image */}
                    <div className="flex h-12 w-full items-center justify-center">
                        <img src="/kick-new-logo.png" alt="Kick Logo" style={{ height: '50px', width: 'auto' }} />
                    </div>
                </a>
            </div>

            <a href="/stats" className="header-splash__right">
                <div className="btn--cart" style={{ background: '#53FC18', color: 'black', fontWeight: '900', boxShadow: '0 0 20px rgba(83, 252, 24, 0.4)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11H15M12 8V14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                    </svg>
                    <span>Stats</span>
                </div>
            </a>
        </div>
    );
}
