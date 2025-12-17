'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

interface StreamData {
    slug: string;
    name: string;
    image: string;
    isLive: boolean;
}

interface VoteData {
    p1: number;
    p2: number;
    total: number;
}

function VersusContent() {
    const searchParams = useSearchParams();
    const p1Slug = searchParams.get('p1');
    const p2Slug = searchParams.get('p2');

    const [stream1, setStream1] = useState<StreamData>();
    const [stream2, setStream2] = useState<StreamData>();
    const [loading, setLoading] = useState(true);

    // UI States
    const [showChat1, setShowChat1] = useState(false);
    const [showChat2, setShowChat2] = useState(false);
    const [showPrediction, setShowPrediction] = useState(true);

    // Real user-based prediction state
    const [voted, setVoted] = useState(false);
    const [votedFor, setVotedFor] = useState<string>('');
    const [voteData, setVoteData] = useState<VoteData>({ p1: 0, p2: 0, total: 0 });

    // Sort slugs to ensure unique key regardless of order (A vs B === B vs A)
    const sortedSlugs = [p1Slug, p2Slug].sort();
    const VOTE_KEY = `versus_votes_${sortedSlugs[0]}_vs_${sortedSlugs[1]}`;
    const USER_VOTE_KEY = `user_vote_${sortedSlugs[0]}_vs_${sortedSlugs[1]}`;
    const BET_STATUS_KEY = `bet_status_${sortedSlugs[0]}_vs_${sortedSlugs[1]}`;

    const fetchStreamData = async (slug: string): Promise<StreamData> => {
        try {
            console.log(`[VERSUS] Fetching stream data for: ${slug}`);

            // Use ONLY the internal API route - never call Kick directly
            const res = await fetch(`/api/kick/${slug}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!res.ok) {
                console.error(`[VERSUS] API returned ${res.status} for ${slug}`);
                throw new Error(`API returned ${res.status}`);
            }

            const data = await res.json();

            console.log(`[VERSUS] Received data for ${slug}:`, {
                username: data.user?.username,
                hasProfilePic: !!data.user?.profile_pic,
                isLive: !!data.livestream
            });

            // Validate data
            if (!data || !data.user) {
                console.error(`[VERSUS] Invalid data structure for ${slug}`);
                throw new Error('Invalid data structure');
            }

            const isLive = data.livestream !== null && data.livestream !== undefined;

            // Always ensure we have a profile picture
            const profilePic = data.user.profile_pic ||
                `https://ui-avatars.com/api/?name=${slug}&background=53FC18&color=000&size=300`;

            const streamData: StreamData = {
                slug,
                name: data.user.username || slug,
                image: profilePic,
                isLive
            };

            console.log(`[VERSUS] Stream data ready for ${slug}:`, streamData);
            return streamData;

        } catch (error) {
            console.error(`[VERSUS] Error fetching ${slug}:`, error);

            // Return fallback data instead of null
            return {
                slug,
                name: slug,
                image: `https://ui-avatars.com/api/?name=${slug}&background=53FC18&color=000&size=300`,
                isLive: false
            };
        }
    };

    const loadVotes = () => {
        try {
            const storedVotes = localStorage.getItem(VOTE_KEY);
            if (storedVotes) {
                setVoteData(JSON.parse(storedVotes));
            }

            const userVote = localStorage.getItem(USER_VOTE_KEY);
            if (userVote) {
                setVoted(true);
                setVotedFor(userVote);
            }
        } catch (e) {
            console.error('Error loading votes:', e);
        }
    };

    const awardSSBPoints = (points: number) => {
        try {
            const currentPoints = parseInt(localStorage.getItem('ssb_points') || '0');
            const newPoints = currentPoints + points;
            localStorage.setItem('ssb_points', newPoints.toString());

            // Dispatch custom event to update header in real-time
            window.dispatchEvent(new Event('ssbPointsUpdated'));
        } catch (e) {
            console.error('Error awarding SSB points:', e);
        }
    };

    const saveVote = (streamerSlug: string) => {
        try {
            const newVoteData = { ...voteData };

            if (streamerSlug === p1Slug) {
                newVoteData.p1 += 1;
            } else {
                newVoteData.p2 += 1;
            }
            newVoteData.total += 1;

            localStorage.setItem(VOTE_KEY, JSON.stringify(newVoteData));
            localStorage.setItem(USER_VOTE_KEY, streamerSlug);

            setVoteData(newVoteData);
            setVoted(true);
            setVotedFor(streamerSlug);

            // Award 1 SSB Coin for entry
            awardSSBPoints(1);

            // Set pending status
            localStorage.setItem(BET_STATUS_KEY, 'pending');
            console.log(`[BETS] New bet placed on ${streamerSlug}`);
        } catch (e) {
            console.error('Error saving vote:', e);
        }
    };

    useEffect(() => {
        if (p1Slug && p2Slug) {
            console.log('[VERSUS] Initializing versus mode:', { p1: p1Slug, p2: p2Slug });

            const loadStreams = async () => {
                const [s1, s2] = await Promise.all([
                    fetchStreamData(p1Slug),
                    fetchStreamData(p2Slug)
                ]);

                // Health check - verify data is valid
                const isS1Valid = s1 && s1.name && s1.image;
                const isS2Valid = s2 && s2.name && s2.image;

                console.log('[VERSUS] Health Check:', {
                    stream1: { valid: isS1Valid, name: s1?.name, hasImage: !!s1?.image, isLive: s1?.isLive },
                    stream2: { valid: isS2Valid, name: s2?.name, hasImage: !!s2?.image, isLive: s2?.isLive }
                });

                // If data looks invalid, try one more time after a short delay
                if (!isS1Valid || !isS2Valid) {
                    console.warn('[VERSUS] Data validation failed, retrying in 1 second...');
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const [retry1, retry2] = await Promise.all([
                        !isS1Valid ? fetchStreamData(p1Slug) : s1,
                        !isS2Valid ? fetchStreamData(p2Slug) : s2
                    ]);

                    setStream1(retry1);
                    setStream2(retry2);
                } else {
                    setStream1(s1);
                    setStream2(s2);
                }

                // Check payouts after data load if we have a pending bet
                if (localStorage.getItem(USER_VOTE_KEY) && localStorage.getItem(BET_STATUS_KEY) === 'pending') {
                    const votedForSlug = localStorage.getItem(USER_VOTE_KEY);
                    const targetStreamer = [s1, s2].find(s => s.slug === votedForSlug);
                    const otherStreamer = [s1, s2].find(s => s.slug !== votedForSlug);

                    // Helper: Check win condition (Target offline = WIN)
                    // "whoever ends there stream first is the goal"

                    if (targetStreamer && !targetStreamer.isLive) {
                        // WINNER: Target ended stream first
                        awardSSBPoints(100);
                        localStorage.setItem(BET_STATUS_KEY, 'paid');
                        setTimeout(() => {
                            alert(`🏆 PREDICTION WON!\n\n${targetStreamer.name} ended their stream!\nYou won 100 SSB Coins!`);
                        }, 1000);
                    } else if (otherStreamer && !otherStreamer.isLive) {
                        // LOSER: The OTHER person ended stream first, so you lost
                        localStorage.setItem(BET_STATUS_KEY, 'lost');
                        console.log('[BETS] Opponent ended stream first, bet lost.');
                    }
                }

                setLoading(false);
                console.log('[VERSUS] Loading complete');
            };

            loadStreams();
            loadVotes();
        }
    }, [p1Slug, p2Slug]);

    const handleVote = (streamerSlug: string) => {
        if (!voted && canVote) {
            saveVote(streamerSlug);
        }
    };

    const getVotePercentage = (streamer: 'p1' | 'p2') => {
        if (voteData.total === 0) return 50;
        return Math.round((voteData[streamer] / voteData.total) * 100);
    };

    if (loading) return <div style={{ color: 'white', padding: '50px', textAlign: 'center', minHeight: '100vh', background: '#0b0e0f' }}>LOADING VERSUS MODE...</div>;
    if (!stream1 || !stream2) return <div style={{ color: 'white', minHeight: '100vh', background: '#0b0e0f', padding: '50px' }}>Error loading streams.</div>;

    const p1Percentage = getVotePercentage('p1');
    const p2Percentage = getVotePercentage('p2');

    // Allow voting at all times, relying on visual confirmation from the player
    const canVote = true;

    return (
        <div style={{ minHeight: '100vh', background: '#0b0e0f' }}>
            <Header />

            <div className="container" style={{ padding: '20px', maxWidth: '1800px', margin: '0 auto' }}>
                {/* Control Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        color: 'white',
                        fontFamily: "'Impact', sans-serif",
                        letterSpacing: '2px',
                        margin: 0,
                        background: 'linear-gradient(45deg, #ff0000, #ff6600)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        ⚔️ VERSUS MODE
                    </h1>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowPrediction(!showPrediction)}
                            style={{
                                background: showPrediction ? '#8A2BE2' : '#24272c',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.3s'
                            }}
                        >
                            🔮 {showPrediction ? 'Hide' : 'Show'} Prediction
                        </button>
                    </div>
                </div>

                {/* Main Grid Layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: showPrediction ? '1fr 400px 1fr' : '1fr 1fr',
                    gap: '20px',
                    alignItems: 'start',
                    transition: 'all 0.3s'
                }}>
                    {/* Stream 1 */}
                    <div className="stream-section">
                        <div className="stream-header">
                            <img src={stream1.image} alt={stream1.name} className="avatar" />
                            <div style={{ flex: 1 }}>
                                <h2 className="name">{stream1.name}</h2>
                                {stream1.isLive && <span className="status">🔴 LIVE</span>}
                            </div>
                            <button
                                onClick={() => setShowChat1(!showChat1)}
                                className="chat-btn"
                            >
                                💬 Chat
                            </button>
                        </div>

                        <div className="player-wrapper">
                            <div className="player-container">
                                <iframe
                                    src={`https://player.kick.com/${stream1.slug}?muted=false&autoplay=true`}
                                    className="player-iframe"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={`${stream1.name} Stream`}
                                />
                            </div>
                        </div>

                        {showChat1 && (
                            <div className="chat-container">
                                <div className="chat-header">STREAM CHAT</div>
                                <iframe
                                    src={`https://kick.com/${stream1.slug}/chatroom`}
                                    className="chat-iframe"
                                    title="Chat"
                                />
                            </div>
                        )}
                    </div>

                    {/* Prediction Card */}
                    {showPrediction && (
                        <div className="prediction-card" style={{ opacity: canVote ? 1 : 0.6 }}>
                            <div className="prediction-header">
                                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔮</div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.4rem', fontWeight: 'bold' }}>
                                    Community Prediction
                                </h3>
                                <p style={{ color: '#888', fontSize: '0.9rem', margin: '10px 0 0 0' }}>
                                    Who will end stream first?
                                </p>

                                {!canVote && (
                                    <div style={{
                                        marginTop: '15px',
                                        padding: '12px',
                                        background: 'rgba(255, 68, 68, 0.1)',
                                        border: '2px solid #ff4444',
                                        borderRadius: '10px',
                                        color: '#ff6666',
                                        fontSize: '0.85rem',
                                        textAlign: 'center'
                                    }}>
                                        ⚠️ Both streamers must be LIVE to vote
                                    </div>
                                )}
                            </div>

                            <div className="total-votes">
                                <div className="votes-number">{voteData.total}</div>
                                <div className="votes-label">Total Votes</div>
                            </div>

                            {/* SSB Coins Reward Info */}
                            <div style={{
                                padding: '12px',
                                background: 'rgba(83, 252, 24, 0.1)',
                                border: '2px solid rgba(83, 252, 24, 0.3)',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                justifyContent: 'center'
                            }}>
                                <img src="/ssb_logo.png" alt="SSB" style={{ height: '24px', width: 'auto' }} />
                                <span style={{ color: '#53FC18', fontWeight: 'bold', fontSize: '1rem' }}>
                                    +100 SSB Coins
                                </span>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>for voting!</span>
                            </div>

                            {!voted ? (
                                <div className="voting-section">
                                    <p className="voting-instruction">Cast your free vote below:</p>
                                    <button
                                        onClick={() => handleVote(stream1.slug)}
                                        className="vote-btn vote-p1"
                                        disabled={!canVote}
                                        style={{ opacity: canVote ? 1 : 0.5, cursor: canVote ? 'pointer' : 'not-allowed' }}
                                    >
                                        <span className="vote-name">{stream1.name}</span>
                                        <span className="vote-count">{voteData.p1} votes</span>
                                    </button>
                                    <button
                                        onClick={() => handleVote(stream2.slug)}
                                        className="vote-btn vote-p2"
                                        disabled={!canVote}
                                        style={{ opacity: canVote ? 1 : 0.5, cursor: canVote ? 'pointer' : 'not-allowed' }}
                                    >
                                        <span className="vote-name">{stream2.name}</span>
                                        <span className="vote-count">{voteData.p2} votes</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="vote-results">
                                    <div className="voted-for">
                                        ✅ You voted for: <strong>{votedFor === stream1.slug ? stream1.name : stream2.name}</strong>
                                    </div>

                                    <div className="vote-bar-container">
                                        <div className="vote-bar-header">
                                            <span>{stream1.name}</span>
                                            <span>{p1Percentage}% ({voteData.p1})</span>
                                        </div>
                                        <div className="vote-bar">
                                            <div className="vote-bar-fill green" style={{ width: `${p1Percentage}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="vote-bar-container">
                                        <div className="vote-bar-header">
                                            <span>{stream2.name}</span>
                                            <span>{p2Percentage}% ({voteData.p2})</span>
                                        </div>
                                        <div className="vote-bar">
                                            <div className="vote-bar-fill red" style={{ width: `${p2Percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stream 2 */}
                    <div className="stream-section">
                        <div className="stream-header">
                            <img src={stream2.image} alt={stream2.name} className="avatar" />
                            <div style={{ flex: 1 }}>
                                <h2 className="name">{stream2.name}</h2>
                                {stream2.isLive && <span className="status">🔴 LIVE</span>}
                            </div>
                            <button
                                onClick={() => setShowChat2(!showChat2)}
                                className="chat-btn"
                            >
                                💬 Chat
                            </button>
                        </div>

                        <div className="player-wrapper">
                            <div className="player-container">
                                <iframe
                                    src={`https://player.kick.com/${stream2.slug}?muted=false&autoplay=true`}
                                    className="player-iframe"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={`${stream2.name} Stream`}
                                />
                            </div>
                        </div>

                        {showChat2 && (
                            <div className="chat-container">
                                <div className="chat-header">STREAM CHAT</div>
                                <iframe
                                    src={`https://kick.com/${stream2.slug}/chatroom`}
                                    className="chat-iframe"
                                    title="Chat"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />

            <style jsx>{`
                .stream-section {
                    background: #14171a;
                    border: 2px solid #333;
                    border-radius: 12px;
                    padding: 20px;
                    transition: all 0.3s;
                }
                .stream-section:hover {
                    border-color: #53FC18;
                    box-shadow: 0 0 30px rgba(83, 252, 24, 0.2);
                }
                .stream-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                .avatar {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    border: 3px solid #53FC18;
                    object-fit: cover;
                }
                .name {
                    color: white;
                    margin: 0;
                    font-size: 1.8rem;
                    font-weight: bold;
                }
                .status {
                    display: inline-block;
                    padding: 6px 14px;
                    background: #ff0000;
                    color: white;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: bold;
                    margin-top: 5px;
                }
                .chat-btn {
                    background: #8A2BE2;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 1rem;
                    transition: all 0.3s;
                }
                .chat-btn:hover {
                    background: #9d4eed;
                    transform: translateY(-2px);
                }
                
                .player-wrapper {
                    background: #0b0e0f;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    margin-bottom: 15px;
                }
                .player-container {
                    position: relative;
                    padding-top: 56.25%;
                    background: black;
                }
                .player-iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                .offline-screen {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0b0e0f 0%, #1a1d1f 100%);
                }

                .chat-container {
                    background: #0b0e0f;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    height: 600px;
                }
                .chat-header {
                    background: #14171a;
                    padding: 12px;
                    color: white;
                    font-weight: bold;
                    text-align: center;
                    border-bottom: 2px solid #333;
                }
                .chat-iframe {
                    width: 100%;
                    height: calc(100% - 45px);
                    border: none;
                    display: block;
                }

                .prediction-card {
                    background: linear-gradient(135deg, #1a1d2e 0%, #14171a 100%);
                    border: 3px solid #8A2BE2;
                    border-radius: 20px;
                    padding: 30px;
                    box-shadow: 0 10px 50px rgba(138, 43, 226, 0.3);
                    position: sticky;
                    top: 20px;
                    max-height: calc(100vh - 40px);
                    overflow-y: auto;
                    transition: opacity 0.3s;
                }
                .prediction-header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .total-votes {
                    text-align: center;
                    padding: 20px;
                    background: rgba(138, 43, 226, 0.15);
                    border-radius: 12px;
                    margin-bottom: 25px;
                    border: 1px solid #8A2BE2;
                }
                .votes-number {
                    fontSize: 3rem;
                    fontWeight: bold;
                    color: #8A2BE2;
                    lineHeight: 1;
                }
                .votes-label {
                    fontSize: 0.9rem;
                    color: #888;
                    textTransform: uppercase;
                    marginTop: 8px;
                    letterSpacing: 1px;
                }

                .voting-section {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .voting-instruction {
                    color: #aaa;
                    text-align: center;
                    font-size: 1rem;
                    margin: 0 0 10px 0;
                }
                .vote-btn {
                    padding: 18px;
                    border: none;
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .vote-btn:disabled {
                    cursor: not-allowed;
                }
                .vote-name {
                    font-size: 1.2rem;
                }
                .vote-count {
                    font-size: 0.9rem;
                    opacity: 0.85;
                }
                .vote-p1 {
                    background: linear-gradient(135deg, #53FC18, #2ea40c);
                    color: black;
                }
                .vote-p1:hover:not(:disabled) {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(83, 252, 24, 0.5);
                }
                .vote-p2 {
                    background: linear-gradient(135deg, #ff4444, #cc0000);
                    color: white;
                }
                .vote-p2:hover:not(:disabled) {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(255, 68, 68, 0.5);
                }

                .vote-results {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .voted-for {
                    background: rgba(83, 252, 24, 0.1);
                    border: 2px solid #53FC18;
                    padding: 15px;
                    border-radius: 10px;
                    color: white;
                    text-align: center;
                    font-size: 1rem;
                }
                .voted-for strong {
                    color: #53FC18;
                    font-size: 1.1rem;
                }
                .vote-bar-container {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .vote-bar-header {
                    display: flex;
                    justify-content: space-between;
                    color: white;
                    font-size: 0.95rem;
                    font-weight: bold;
                }
                .vote-bar {
                    width: 100%;
                    height: 24px;
                    background: #333;
                    border-radius: 12px;
                    overflow: hidden;
                }
                .vote-bar-fill {
                    height: 100%;
                    transition: width 1s ease;
                    border-radius: 12px;
                }
                .vote-bar-fill.green {
                    background: linear-gradient(90deg, #53FC18, #2ea40c);
                }
                .vote-bar-fill.red {
                    background: linear-gradient(90deg, #ff4444, #cc0000);
                }
            `}</style>
        </div>
    );
}

export default function VersusPage() {
    return (
        <Suspense fallback={<div style={{ color: 'white', padding: '50px', textAlign: 'center', minHeight: '100vh', background: '#0b0e0f' }}>PREPARING BATTLEGROUND...</div>}>
            <VersusContent />
        </Suspense>
    );
}
