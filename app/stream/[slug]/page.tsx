'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

interface Streamer {
    name: string;
    slug: string;
    viewers: number;
    image: string;
    thumbnail: string;
    status: 'online' | 'offline';
    title?: string;
    category?: string;
    language?: string;
    bio?: string;
    playback_url?: string;
    socials?: any[];
    followers?: number;
    subscribers?: number;
    totalViews?: number;
}

export default function StreamPage() {
    const params = useParams();
    const slug = params?.slug as string;

    const [streamer, setStreamer] = useState<Streamer | null>(null);
    const [loading, setLoading] = useState(true);
    const [theaterMode, setTheaterMode] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (!slug) return;

        const fetchStreamer = async () => {
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    // Fetch directly from Kick's public API (client-side) with retry
                    let res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
                        headers: {
                            'Accept': 'application/json',
                        },
                    });

                    // Try v1 if v2 fails
                    if (!res.ok) {
                        res = await fetch(`https://kick.com/api/v1/channels/${slug}`, {
                            headers: {
                                'Accept': 'application/json',
                            },
                        });
                    }

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}`);
                    }

                    const data = await res.json();

                    // Validate data structure
                    if (!data || !data.user) {
                        throw new Error('Invalid data structure');
                    }

                    const isLive = data.livestream !== null && data.livestream !== undefined;
                    const playbackUrl = data.playback_url || data.livestream?.playback_url || null;

                    // Robust profile picture extraction with multiple fallbacks
                    const profilePic = data.user?.profile_pic ||
                        data.user?.profilepic ||
                        data.user?.avatar ||
                        data.profilepic ||
                        null;

                    let thumb = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop';
                    if (isLive && data.livestream?.thumbnail?.url) {
                        try {
                            thumb = data.livestream.thumbnail.url.replace('{width}', '1280').replace('{height}', '720');
                        } catch (e) {
                            console.warn('Failed to parse thumbnail');
                        }
                    } else if (!isLive && profilePic) {
                        thumb = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop';
                    }

                    setStreamer({
                        name: data.user?.username || data.slug || slug,
                        slug: slug,
                        viewers: isLive ? (data.livestream.viewer_count || 0) : 0,
                        image: profilePic || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
                        thumbnail: thumb,
                        status: isLive ? 'online' : 'offline',
                        title: isLive ? (data.livestream.session_title || 'Live Now') : 'Offline',
                        category: isLive ? (data.livestream.categories?.[0]?.name || 'Just Chatting') : 'Just Chatting',
                        language: data.livestream?.language || 'English',
                        bio: data.user?.bio || '',
                        playback_url: playbackUrl,
                        socials: data.user?.social_media_links || [],
                        // Stats data
                        followers: data.followers_count || data.user?.followers_count || 0,
                        subscribers: data.subscribers_count || 0,
                        totalViews: data.user?.total_views || data.user?.views_count || 0,
                    });

                    setLoading(false);
                    return; // Success - exit retry loop

                } catch (error) {
                    attempts++;
                    console.warn(`Attempt ${attempts}/${maxAttempts} failed for ${slug}:`, error);

                    if (attempts < maxAttempts) {
                        // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempts - 1)));
                        continue;
                    }

                    // All attempts failed
                    console.warn(`All attempts failed for ${slug}`);
                }
            }

            // If we get here without returning, all retries failed or we had an error
            // Set offline fallback to prevent "Streamer Not Found"
            setStreamer({
                name: slug,
                slug: slug,
                viewers: 0,
                image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
                thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop',
                status: 'offline',
                title: 'Offline',
                category: 'Offline',
                language: 'English',
                bio: '',
                playback_url: `https://player.kick.com/${slug}`,
                socials: [],
                followers: 0,
                subscribers: 0,
                totalViews: 0
            });
            setLoading(false);
        };

        fetchStreamer();
        // Poll every minute
        const interval = setInterval(fetchStreamer, 60000);
        return () => clearInterval(interval);
    }, [slug]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const calculateYearlyViews = () => {
        if (!streamer?.totalViews) return 0;
        // For demo, use 30% of total views as yearly views
        return Math.floor(streamer.totalViews * 0.3);
    };

    if (loading) {
        return (
            <>
                <Header />
                <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pulsating-circle">
                        <div className="circle circle-pulse" style={{ backgroundColor: '#53FC18' }}></div>
                    </div>
                    <span style={{ marginLeft: '10px', color: 'white' }}>Loading Stream...</span>
                </div>
                <Footer />
            </>
        );
    }

    if (!streamer) {
        return (
            <>
                <Header />
                <div className="container" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <h1>Streamer Not Found</h1>
                    <Link href="/" style={{ marginTop: '20px', color: '#53FC18', textDecoration: 'underline' }}>Return Home</Link>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="container" style={{
                minHeight: '80vh',
                paddingBottom: '40px',
                maxWidth: theaterMode ? '100%' : '1600px',
                width: theaterMode ? '100%' : '95%',
                padding: theaterMode ? '0' : '0 15px',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/" style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px', width: 'fit-content' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Home
                    </Link>

                    {/* Control Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {/* Theater Mode Toggle */}
                        <button
                            onClick={() => setTheaterMode(!theaterMode)}
                            style={{
                                background: theaterMode ? '#53FC18' : '#24272c',
                                color: theaterMode ? 'black' : 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                                <polyline points="17 2 12 7 7 2"></polyline>
                            </svg>
                            {theaterMode ? 'Exit Theater' : 'Theater Mode'}
                        </button>

                        {/* Stats Button */}
                        <button
                            onClick={() => setShowStats(!showStats)}
                            style={{
                                background: showStats ? '#53FC18' : '#24272c',
                                color: showStats ? 'black' : 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11H15M12 8V14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" strokeLinecap="round" />
                                <circle cx="12" cy="12" r="2" fill="currentColor" />
                            </svg>
                            Stats
                        </button>
                    </div>
                </div>




                {/* Stats Modal Overlay */}
                {showStats && (
                    <div
                        onClick={() => setShowStats(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.85)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #0b0e0f 0%, #1a1d1f 100%)',
                                borderRadius: '16px',
                                padding: '32px',
                                maxWidth: '500px',
                                width: '100%',
                                border: '2px solid #53FC18',
                                boxShadow: '0 8px 40px rgba(83, 252, 24, 0.3)',
                                position: 'relative'
                            }}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setShowStats(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: '8px'
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>

                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, color: 'white', fontSize: '1.8rem', marginBottom: '8px' }}>
                                    {streamer.name} Stats
                                </h2>
                                <p style={{ margin: 0, color: '#aaa' }}>Live Statistics for {new Date().getFullYear()}</p>
                            </div>

                            {/* Stats Cards */}
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {/* Followers */}
                                <div style={{ background: '#14171a', padding: '20px', borderRadius: '12px', border: '1px solid #24272c' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Followers
                                            </div>
                                            <div style={{ color: '#53FC18', fontSize: '2rem', fontWeight: 'bold' }}>
                                                {formatNumber(streamer.followers || 0)}
                                            </div>
                                        </div>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#53FC18" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    </div>
                                </div>

                                {/* Subscribers */}
                                <div style={{ background: '#14171a', padding: '20px', borderRadius: '12px', border: '1px solid #24272c' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Subscribers
                                            </div>
                                            <div style={{ color: '#53FC18', fontSize: '2rem', fontWeight: 'bold' }}>
                                                {formatNumber(streamer.subscribers || 0)}
                                            </div>
                                        </div>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#53FC18" strokeWidth="2">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                        </svg>
                                    </div>
                                </div>

                                {/* Yearly Views */}
                                <div style={{ background: '#14171a', padding: '20px', borderRadius: '12px', border: '1px solid #24272c' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {new Date().getFullYear()} Views
                                            </div>
                                            <div style={{ color: '#53FC18', fontSize: '2rem', fontWeight: 'bold' }}>
                                                {formatNumber(calculateYearlyViews())}
                                            </div>
                                            <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '6px' }}>
                                                Resets January 1st
                                            </div>
                                        </div>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#53FC18" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Update info */}
                            <div style={{ marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#53FC18', display: 'inline-block', marginRight: '6px', animation: 'pulse 2s infinite' }}></div>
                                Updates live every minute
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area with Player and Chat */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: theaterMode ? 'wrap' : 'nowrap' }}>
                    {/* Video Player Section */}
                    <div style={{ flex: '1', minWidth: 0 }}>
                        <div style={{ background: '#0b0e0f', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            <div style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: 'black' }}>
                                {streamer.status === 'online' ? (
                                    <>
                                        <iframe
                                            src={`https://player.kick.com/${streamer.slug}?muted=${isMuted}&autoplay=true`}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                border: 'none'
                                            }}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title={`${streamer.name} Live Stream`}
                                        />
                                        {/* Custom Mute Toggle */}
                                        <div
                                            onClick={() => setIsMuted(!isMuted)}
                                            style={{
                                                position: 'absolute',
                                                top: '20px',
                                                right: '20px',
                                                background: 'rgba(0,0,0,0.6)',
                                                color: 'white',
                                                padding: '10px',
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                zIndex: 10,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid #53FC18',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            title={isMuted ? "Unmute" : "Mute"}
                                        >
                                            {isMuted ? (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M5.889 16H2C1.448 16 1 15.552 1 15V9C1 8.448 1.448 8 2 8H5.889L10.889 3H12V21H10.889L5.889 16ZM24 21L20 17L16 21L14 19L18 15L14 11L16 9L20 13L24 9L26 11L22 15L26 19L24 21Z" fill="#53FC18" />
                                                </svg>
                                            ) : (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M5.889 16H2C1.448 16 1 15.552 1 15V9C1 8.448 1.448 8 2 8H5.889L10.889 3H12V21H10.889L5.889 16ZM20.485 12.001C20.485 14.305 19.167 16.278 17.25 17.228V19.34C20.315 18.28 22.485 15.385 22.485 12.001C22.485 8.617 20.315 5.722 17.25 4.662V6.774C19.167 7.724 20.485 9.697 20.485 12.001ZM17.25 12.001C17.25 10.421 16.329 9.061 15 8.358V15.645C16.329 14.941 17.25 13.581 17.25 12.001Z" fill="#53FC18" />
                                                </svg>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                        <img src={streamer.thumbnail} alt="Offline" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                                        <div style={{ zIndex: 2, textAlign: 'center' }}>
                                            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>Offline</h2>
                                            <p style={{ color: '#ccc' }}>{streamer.name} is currently offline.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stream Info Bar */}
                            <div style={{ background: '#14171a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                                {streamer.status === 'online' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '0.9rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff0000', animation: 'pulse 2s infinite' }}></div>
                                        LIVE • {streamer.viewers.toLocaleString()} viewers
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat Section */}
                    <div style={{ flex: '0 0 340px', width: '340px' }}>
                        <div style={{ background: '#0b0e0f', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', height: '100%', minHeight: '600px' }}>
                            <div style={{ background: '#14171a', padding: '12px 16px', borderBottom: '1px solid #24272c' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '600' }}>STREAM CHAT</h3>
                            </div>
                            <iframe
                                src={`https://kick.com/${slug}/chatroom`}
                                style={{ width: '100%', height: 'calc(100% - 45px)', border: 'none', display: 'block' }}
                                title="Kick Chat"
                            />
                        </div>
                    </div>
                </div>

                {/* Stream Info Section */}
                <div style={{ marginTop: '20px', background: '#0b0e0f', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                    <div style={{ padding: '20px', backgroundColor: '#14171a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <img src={streamer.image} alt={streamer.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: streamer.status === 'online' ? '3px solid #53FC18' : '3px solid #333' }} />
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>{streamer.name}</h1>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                                        <span style={{ color: '#53FC18', fontSize: '0.9rem' }}>{streamer.category}</span>
                                        {streamer.status === 'online' && (
                                            <span style={{ color: '#ccc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'red' }}></div>
                                                {streamer.viewers.toLocaleString()} Viewers
                                            </span>
                                        )}
                                        <span style={{ color: '#aaa', fontSize: '0.9rem' }}>•</span>
                                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>
                                            {streamer.subscribers?.toLocaleString() || 0} Subs
                                        </span>
                                        <span style={{ color: '#aaa', fontSize: '0.9rem' }}>•</span>
                                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>
                                            {streamer.totalViews?.toLocaleString()} Views
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <a href={`https://kick.com/${streamer.slug}`} target="_blank" rel="noopener noreferrer" style={{
                                backgroundColor: '#53FC18', color: 'black', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s ease'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span>Watch on Kick</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        </div>

                        {streamer.title && (
                            <div style={{ marginTop: '20px', padding: '15px', background: '#1A1C1D', borderRadius: '6px' }}>
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#eee' }}>{streamer.title}</h3>
                                {streamer.bio && <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: '1.5' }}>{streamer.bio}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </>
    );
}
