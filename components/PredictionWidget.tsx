'use client';

import React, { useState, useEffect } from 'react';

// Re-define interface locally to match page.tsx
interface Streamer {
    name: string;
    slug: string;
    viewers: number;
    image: string;
    thumbnail: string;
    status: 'online' | 'offline';
    title?: string;
}

interface PredictionEvent {
    id: string;
    p1: Streamer;
    p2: Streamer;
    expiry: number; // Timestamp
}

interface PredictionWidgetProps {
    streamers: Streamer[];
}

export default function PredictionWidget({ streamers }: PredictionWidgetProps) {
    const [prediction, setPrediction] = useState<PredictionEvent | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [userVote, setUserVote] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [payoutMessage, setPayoutMessage] = useState<string | null>(null);

    const DURATION_MS = 20 * 60 * 1000; // 20 minutes

    const awardSSBPoints = (points: number) => {
        try {
            const currentPoints = parseInt(localStorage.getItem('ssb_points') || '0');
            const newPoints = currentPoints + points;
            localStorage.setItem('ssb_points', newPoints.toString());
            window.dispatchEvent(new Event('ssbPointsUpdated'));
        } catch (e) {
            console.error(e);
        }
    };

    // Initialize or load prediction
    useEffect(() => {
        const checkPrediction = () => {
            const now = Date.now();
            const storedPred = localStorage.getItem('ssb_active_prediction');

            if (storedPred) {
                const parsed: PredictionEvent = JSON.parse(storedPred);

                // Check if expired
                if (now > parsed.expiry) {
                    // Start new one? Only if we have live streamers
                    generateNewPrediction();
                } else {
                    setPrediction(parsed);
                    // Check if user already voted
                    const vote = localStorage.getItem(`ssb_prediction_vote_${parsed.id}`);
                    if (vote) setUserVote(vote);

                    // Check if dismissed
                    if (localStorage.getItem(`ssb_prediction_dismissed_${parsed.id}`)) {
                        setVisible(false);
                    } else {
                        setVisible(true);
                    }
                }
            } else {
                generateNewPrediction();
            }
        };

        const generateNewPrediction = () => {
            const onlineStreamers = streamers.filter(s => s.status === 'online');

            // Need at least 2 online streamers
            if (onlineStreamers.length < 2) {
                setPrediction(null);
                setVisible(false);
                return;
            }

            // Pick 2 random
            const idx1 = Math.floor(Math.random() * onlineStreamers.length);
            let idx2 = Math.floor(Math.random() * onlineStreamers.length);
            while (idx2 === idx1) {
                idx2 = Math.floor(Math.random() * onlineStreamers.length);
            }

            const newPred: PredictionEvent = {
                id: `pred_${Date.now()}`,
                p1: onlineStreamers[idx1],
                p2: onlineStreamers[idx2],
                expiry: Date.now() + DURATION_MS
            };

            localStorage.setItem('ssb_active_prediction', JSON.stringify(newPred));
            setPrediction(newPred);
            setUserVote(null);
            setVisible(true); // New prediction always starts visible
        };

        // Run check only if streamers are loaded
        if (streamers.length > 0) {
            checkPrediction();
        }
    }, [streamers]);

    // Timer & Payout Check Loop
    useEffect(() => {
        if (!prediction) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = prediction.expiry - now;

            if (diff <= 0) {
                // Expired
                setTimeLeft('Ended');
                // Could trigger regeneration here or wait for page interactions
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${m}m ${s}s`);
            }

            // CHECK PAYOUT (Check if target went offline)
            if (userVote) {
                // Only check payout if not already paid/lost for this ID (could store status separately)
                const betStatus = localStorage.getItem(`ssb_prediction_status_${prediction.id}`);

                if (betStatus === 'pending') {
                    // Find current status of the streamers from props
                    // Note: 'streamers' prop updates periodically in parent
                    const targetSlug = userVote;
                    const opponentSlug = userVote === prediction.p1.slug ? prediction.p2.slug : prediction.p1.slug;

                    const target = streamers.find(s => s.slug === targetSlug);
                    const opponent = streamers.find(s => s.slug === opponentSlug);

                    if (target && target.status === 'offline') {
                        // WIN!
                        awardSSBPoints(100);
                        localStorage.setItem(`ssb_prediction_status_${prediction.id}`, 'paid');
                        setPayoutMessage(`🏆 YOU WON! ${target.name} went offline! (+100 Coins)`);
                        setTimeout(() => setPayoutMessage(null), 5000);
                        setVisible(true); // Pop back up to show victory
                    } else if (opponent && opponent.status === 'offline') {
                        // LOSS
                        localStorage.setItem(`ssb_prediction_status_${prediction.id}`, 'lost');
                    }
                }
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [prediction, streamers, userVote]);

    const handleVote = (slug: string) => {
        if (!prediction) return;

        // Spam check handled by UI state userVote, but double check storage
        if (localStorage.getItem(`ssb_prediction_vote_${prediction.id}`)) return;

        localStorage.setItem(`ssb_prediction_vote_${prediction.id}`, slug);
        localStorage.setItem(`ssb_prediction_status_${prediction.id}`, 'pending');
        setUserVote(slug);

        // Free entry - no cost
        // Maybe award 1 point for participation?
        awardSSBPoints(1);
    };

    const handleDismiss = () => {
        if (!prediction) return;
        setVisible(false);
        localStorage.setItem(`ssb_prediction_dismissed_${prediction.id}`, 'true');
    };

    if (!visible || !prediction) return null;

    return (
        <>
            {/* Payout Notification */}
            {payoutMessage && (
                <div style={{
                    position: 'fixed',
                    top: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(45deg, #53FC18, #2ea40c)',
                    color: 'black',
                    padding: '15px 30px',
                    borderRadius: '50px',
                    fontWeight: 'bold',
                    boxShadow: '0 5px 20px rgba(83, 252, 24, 0.4)',
                    zIndex: 10000,
                    animation: 'fadeInOut 5s forwards'
                }}>
                    {payoutMessage}
                </div>
            )}

            {/* Widget */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '20px',
                width: '320px',
                background: '#14171a',
                border: '1px solid #333', // Subtle border initially
                borderTop: '4px solid #8A2BE2', // Color accent
                borderRadius: '12px',
                padding: '15px',
                zIndex: 800,
                boxShadow: '0 5px 20px rgba(0,0,0,0.6)',
                transform: visible ? 'translateY(0)' : 'translateY(150%)',
                transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                fontFamily: "'Inter', sans-serif"
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔮</span>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>LIVE PREDICTION</div>
                            <div style={{ fontSize: '0.7rem', color: '#8A2BE2' }}>Who ends first? • Free Entry</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {timeLeft}
                        <button
                            onClick={handleDismiss}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '0 5px',
                                lineHeight: '1'
                            }}
                            className="hover:text-white"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Matchup */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', background: '#0b0e0f', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'center', width: '40%' }}>
                        <img src={prediction.p1.image} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #333' }} alt="" />
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prediction.p1.name}</div>
                    </div>
                    <div style={{ color: '#666', fontWeight: 'bold', fontSize: '0.8rem' }}>VS</div>
                    <div style={{ textAlign: 'center', width: '40%' }}>
                        <img src={prediction.p2.image} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #333' }} alt="" />
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prediction.p2.name}</div>
                    </div>
                </div>

                {/* Actions */}
                {!userVote ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => handleVote(prediction.p1.slug)}
                            style={{ flex: 1, padding: '8px', background: '#24272c', border: '1px solid #333', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition: 'all 0.2s' }}
                            className="hover:bg-[#333]"
                        >
                            Vote {prediction.p1.name}
                        </button>
                        <button
                            onClick={() => handleVote(prediction.p2.slug)}
                            style={{ flex: 1, padding: '8px', background: '#24272c', border: '1px solid #333', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition: 'all 0.2s' }}
                            className="hover:bg-[#333]"
                        >
                            Vote {prediction.p2.name}
                        </button>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '6px', border: '1px solid rgba(138, 43, 226, 0.3)' }}>
                        <div style={{ color: '#8A2BE2', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            Bet Placed on {userVote === prediction.p1.slug ? prediction.p1.name : prediction.p2.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>
                            You win 100 Coins if they go offline first!
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
