import React from 'react';

export default function Footer() {
    return (
        <div id="ndzn-footer">
            <div className="ndzn-footer__img-container">
                {/* Footer background */}
                <img className="ndzn-footer__img" src="https://i.imgur.com/YIyxwhp.png" alt="Footer Background" />
            </div>
            <div className="container">
                <div className="footer-left">
                    <div className="footer-left__logo">
                        {/* Small Kick Logo */}
                        <img src="/kick-new-logo.png" alt="Footer logo" style={{ height: '50px', width: 'auto' }} />
                    </div>
                    <div className="footer-left__text">
                        <span>2026 SSB Statistics - All Rights Reserved</span>
                        <span>We are not affiliated with Kick.com</span>
                    </div>
                </div>
                <div className="footer-right">
                    <button className="btn--scroll" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.375 9.53125L10 3.90625L15.625 9.53125M10 4.6875V16.0938" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                        <span>BACK TO TOP</span>
                    </button>
                </div>
            </div>
            <div className="footer-tm">
                <a id="tm" href="https://kick.com/" target="_blank" rel="noreferrer"><span>design by</span> reese</a>
            </div>
        </div>
    );
}
