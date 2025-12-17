'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VersusMode() {
    const router = useRouter();
    const [active, setActive] = useState(false);
    const [selectedStreamers, setSelectedStreamers] = useState<string[]>([]);

    // This would ideally pull from the main streamer list or be passed as props
    // For demo, we'll hardcode a few popular ones for the selector
    const availableFighters = [
        { name: 'AdinRoss', slug: 'adinross', image: 'https://files.kick.com/images/user/904404/profile_image/conversion/09168fc3-77cf-4d10-a5d9-249ac0aa6dd7-fullsize.webp' },
        { name: 'xQc', slug: 'xqc', image: 'https://files.kick.com/images/user/9519187/profile_image/conversion/1f114674-3253-48b4-b903-88849647248c-fullsize.webp' },
        { name: 'N3on', slug: 'n3on', image: 'https://files.kick.com/images/user/3866299/profile_image/conversion/3f7e6e88-005a-464a-a64c-7c5e2d837648-fullsize.webp' }
    ];

    const handleSelect = (slug: string) => {
        if (selectedStreamers.includes(slug)) {
            setSelectedStreamers(prev => prev.filter(s => s !== slug));
        } else {
            if (selectedStreamers.length < 2) {
                setSelectedStreamers(prev => [...prev, slug]);
            }
        }
    };

    const startBattle = () => {
        if (selectedStreamers.length === 2) {
            // Navigate to versus page with query params
            const [p1, p2] = selectedStreamers;
            router.push(`/versus?p1=${p1}&p2=${p2}`);
        }
    };

    return (
        <>
            <div
                onClick={() => setActive(!active)}
                style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '30px',
                    background: 'linear-gradient(45deg, #ff0000, #990000)',
                    color: 'white',
                    padding: '15px 30px',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    zIndex: 900,
                    boxShadow: '0 5px 20px rgba(255,0,0,0.5)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: '900',
                    fontSize: '1.2rem',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    border: '2px solid white',
                    transform: active ? 'scale(0.9)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
            >
                ⚔️ VERSUS
            </div>

            {active && (
                <div style={{
                    position: 'fixed',
                    bottom: '150px',
                    right: '30px',
                    width: '350px',
                    background: '#14171a',
                    border: '2px solid #333',
                    borderRadius: '16px',
                    padding: '20px',
                    zIndex: 900,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
                }}>
                    <h3 style={{ color: 'white', margin: '0 0 15px 0', textAlign: 'center' }}>SELECT FIGHTERS</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                        {availableFighters.map(fighter => (
                            <div
                                key={fighter.slug}
                                onClick={() => handleSelect(fighter.slug)}
                                style={{
                                    cursor: 'pointer',
                                    border: selectedStreamers.includes(fighter.slug) ? '2px solid #53FC18' : '2px solid transparent',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                <img src={fighter.image} alt={fighter.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                                {selectedStreamers.includes(fighter.slug) && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(83, 252, 24, 0.3)' }}></div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={startBattle}
                        disabled={selectedStreamers.length !== 2}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: selectedStreamers.length === 2 ? '#53FC18' : '#333',
                            color: selectedStreamers.length === 2 ? 'black' : '#666',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: selectedStreamers.length === 2 ? 'pointer' : 'not-allowed',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s'
                        }}
                    >
                        Start Battle
                    </button>
                </div>
            )}
        </>
    );
}
