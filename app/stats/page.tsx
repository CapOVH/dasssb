'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

interface StreamerStats {
    name: string;
    slug: string;
    image: string;
    followers: number;
    subscribers: number;
    yearlyViews: number;
    status: 'online' | 'offline';
    ovr: number;
    attributes: {
        rage: number;
        rizz: number;
        luck: number;
        iq: number;
    };
}

const STREAMER_SLUGS = [
    'adinross',
    'cheesur',
    'iziprime',
    'cuffem',
    'shnaggyhose',
    'konvy',
    'markynextdoot',
    'sweatergxd',
];

export default function StatsPage() {
    const [streamers, setStreamers] = useState<StreamerStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllStats = async () => {
            const promises = STREAMER_SLUGS.map(async (slug) => {
                let attempts = 0;
                const maxAttempts = 3;

                while (attempts < maxAttempts) {
                    try {
                        let res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
                            headers: { 'Accept': 'application/json' },
                        });

                        if (!res.ok) {
                            res = await fetch(`https://kick.com/api/v1/channels/${slug}`, {
                                headers: { 'Accept': 'application/json' },
                            });
                        }

                        if (!res.ok) throw new Error(`HTTP ${res.status}`);

                        const data = await res.json();
                        if (!data || !data.user) throw new Error('Invalid data');

                        const profilePic = data.user?.profile_pic || data.user?.profilepic || data.user?.avatar || null;
                        const isLive = data.livestream !== null && data.livestream !== undefined;

                        const followersCount = data.followers_count ||
                            data.user?.followers_count ||
                            data.followersCount ||
                            0;

                        const subscribersCount = data.subscriber_badges?.length ||
                            data.subscribers_count ||
                            data.subscription_count ||
                            0;

                        const totalViews = data.user?.total_views ||
                            data.user?.views_count ||
                            data.views_count ||
                            data.total_views ||
                            0;

                        // Calculate Fake Attributes based on name hash or random consistency
                        const nameHash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const pseudoRandom = (seed: number) => {
                            const x = Math.sin(seed) * 10000;
                            return Math.floor((x - Math.floor(x)) * 100);
                        };

                        const rage = pseudoRandom(nameHash);
                        const rizz = pseudoRandom(nameHash + 1);
                        const luck = pseudoRandom(nameHash + 2);
                        const iq = pseudoRandom(nameHash + 3);

                        // Calculate OVR
                        // Simplified OVR based on views + followers impact (scaled lourithmically maybe, but linear for now)
                        let ovr = Math.min(99, Math.floor((followersCount / 10000) + (subscribersCount / 100) + 60));
                        if (slug === 'adinross') ovr = 99; // Easter egg
                        if (slug === 'xqc') ovr = 98;

                        return {
                            name: data.user?.username || slug,
                            slug: slug,
                            image: profilePic || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
                            followers: followersCount,
                            subscribers: subscribersCount,
                            yearlyViews: Math.floor(totalViews * 0.3),
                            status: isLive ? 'online' : ('offline' as 'online' | 'offline'),
                            ovr: ovr,
                            attributes: { rage, rizz, luck, iq }
                        };
                    } catch (error) {
                        attempts++;
                        if (attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempts - 1)));
                            continue;
                        }

                        // All attempts failed
                        return {
                            name: slug,
                            slug: slug,
                            image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
                            followers: 0,
                            subscribers: 0,
                            yearlyViews: 0,
                            status: 'offline' as 'online' | 'offline',
                            ovr: 0,
                            attributes: { rage: 0, rizz: 0, luck: 0, iq: 0 }
                        };
                    }
                }

                // Fallback (should not be reached due to logic above, but satisfying TS)
                return {
                    name: slug,
                    slug: slug,
                    image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
                    followers: 0,
                    subscribers: 0,
                    yearlyViews: 0,
                    status: 'offline' as 'online' | 'offline',
                    ovr: 0,
                    attributes: { rage: 0, rizz: 0, luck: 0, iq: 0 }
                };
            });

            const results = await Promise.all(promises);
            setStreamers(results);
            setLoading(false);
        };

        fetchAllStats();
        // Update every 30 seconds for live stats
        const interval = setInterval(fetchAllStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const calculateYearlyViews = (data: any) => {
        // Calculate views for current year
        // This is a placeholder - in production you'd track this server-side
        const currentYear = new Date().getFullYear();
        const totalViews = data.user?.total_views || data.user?.views_count || 0;

        // For demo purposes, use a percentage of total views
        // In production, you'd need to track yearly views separately
        return Math.floor(totalViews * 0.3); // Assume 30% of total views are from this year
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    return (
        <>
            <Header />
            <div className="container" style={{ minHeight: '80vh', paddingBottom: '40px' }}>
                <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                    <h1 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#53FC18" strokeWidth="2">
                            <path d="M9 11H15M12 8V14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
                            <circle cx="12" cy="12" r="2" fill="#53FC18" />
                        </svg>
                        Streamer Statistics
                    </h1>
                    <p style={{ color: '#aaa', fontSize: '1.1rem' }}>Live statistics for {new Date().getFullYear()}</p>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                        <div className="pulsating-circle">
                            <div className="circle circle-pulse" style={{ backgroundColor: '#53FC18' }}></div>
                        </div>
                        <span style={{ marginLeft: '10px', color: 'white' }}>Loading Statistics...</span>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {streamers.map((streamer) => (
                            <div key={streamer.slug} className="streamer-card-wrapper">
                                <Link href={`/stream/${streamer.slug}`} style={{ textDecoration: 'none' }}>
                                    <div className={`fut-card ${streamer.status === 'online' ? 'live-border' : ''}`}>

                                        {/* Top Section */}
                                        <div className="card-top">
                                            <div className="card-rating">{streamer.ovr}</div>
                                            <div className="card-pos">STR</div>
                                            <img className="card-flag" src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg" alt="USA" />
                                        </div>

                                        {/* Image */}
                                        <div className="card-image-container">
                                            <img src={streamer.image} alt={streamer.name} className="card-image" />
                                        </div>

                                        {/* Name */}
                                        <div className="card-name">{streamer.name.toUpperCase()}</div>

                                        {/* Stats Divider */}
                                        <div className="card-divider"></div>

                                        {/* Attributes Grid */}
                                        <div className="card-stats">
                                            <div className="stat-row">
                                                <div className="stat"><span className="val">{streamer.attributes.rage}</span> <span className="label">RGE</span></div>
                                                <div className="stat"><span className="val">{streamer.attributes.rizz}</span> <span className="label">RIZ</span></div>
                                            </div>
                                            <div className="stat-row">
                                                <div className="stat"><span className="val">{streamer.attributes.luck}</span> <span className="label">LCK</span></div>
                                                <div className="stat"><span className="val">{streamer.attributes.iq}</span> <span className="label">IQ</span></div>
                                            </div>
                                            <div className="stat-row">
                                                <div className="stat"><span className="val">{formatNumber(streamer.followers)}</span> <span className="label">FOL</span></div>
                                                <div className="stat"><span className="val">{formatNumber(streamer.yearlyViews)}</span> <span className="label">VWS</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Footer />

            <style jsx global>{`
                .streamer-card-wrapper {
                    perspective: 1000px;
                }
                .fut-card {
                    width: 100%;
                    max-width: 300px;
                    height: 480px;
                    background-image: linear-gradient(to bottom right, #e3e3e3, #1a1a1a); 
                    border-radius: 20px;
                    position: relative;
                    margin: 0 auto;
                    box-shadow: -5px 5px 15px rgba(0,0,0,0.5);
                    transition: transform 0.3s ease;
                    cursor: pointer;
                    overflow: hidden;
                    border: 4px solid #d4af37; /* Gold border default */
                }
                .fut-card.live-border {
                     border-color: #53FC18;
                     box-shadow: 0 0 20px rgba(83, 252, 24, 0.4);
                }
                .fut-card:hover {
                    transform: translateY(-10px) rotateX(5deg);
                    z-index: 10;
                }
                
                /* Internal Card Styling */
                .card-top {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    color: gold;
                    text-shadow: 1px 1px 0px #000;
                    z-index: 2;
                }
                .card-rating {
                    font-size: 3rem;
                    font-weight: 900;
                    line-height: 1;
                }
                .card-pos {
                    font-size: 1rem;
                    text-align: center;
                    font-weight: bold;
                }
                .card-flag {
                    width: 30px;
                    margin-top: 5px;
                    border-radius: 4px;
                    box-shadow: 1px 1px 3px rgba(0,0,0,0.5);
                }
                
                .card-image-container {
                    width: 100%;
                    height: 55%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding-top: 20px;
                }
                .card-image {
                    width: 180px;
                    height: 180px;
                    object-fit: cover;
                    border-radius: 50%; /* Circle style for streamers */
                    border: 4px solid #fff;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                }

                .card-name {
                    text-align: center;
                    font-size: 1.8rem;
                    font-weight: 900;
                    color: #fff;
                    text-shadow: 2px 2px 0 #000;
                    margin-top: 5px;
                    font-family: 'Arial', sans-serif;
                    letter-spacing: 1px;
                }

                .card-divider {
                    width: 80%;
                    height: 2px;
                    background: rgba(255,255,255,0.3);
                    margin: 10px auto;
                }

                .card-stats {
                    padding: 0 30px;
                    color: white;
                }
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 1.1rem;
                    font-weight: bold;
                    text-shadow: 1px 1px #000;
                }
                .stat .label {
                    font-weight: normal;
                    font-size: 0.8em;
                    margin-left: 5px;
                    color: #ddd;
                }
            `}</style>
        </>
    );
}
