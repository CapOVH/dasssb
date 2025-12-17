'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '../../components/Header';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const AVAILABLE_CHANNELS = [
    'adinross', 'xqc', 'n3on', 'trainwreckstv', 'roshtein', 'iceposeidon'
];

export default function MultiviewPage() {
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

    const toggleChannel = (slug: string) => {
        if (selectedChannels.includes(slug)) {
            setSelectedChannels(prev => prev.filter(s => s !== slug));
        } else {
            if (selectedChannels.length < 4) {
                setSelectedChannels(prev => [...prev, slug]);
            }
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0b0e0f', display: 'flex', flexDirection: 'column' }}>
            <Header />

            {/* Selection Bar */}
            <div style={{ background: '#14171a', padding: '15px', borderBottom: '1px solid #333', display: 'flex', gap: '20px', alignItems: 'center', overflowX: 'auto' }}>
                <span style={{ color: 'white', fontWeight: 'bold' }}>ADD STREAM:</span>
                {AVAILABLE_CHANNELS.map(slug => (
                    <button
                        key={slug}
                        onClick={() => toggleChannel(slug)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: selectedChannels.includes(slug) ? '#53FC18' : '#333',
                            color: selectedChannels.includes(slug) ? 'black' : 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}
                    >
                        {slug} {selectedChannels.includes(slug) ? '✓' : '+'}
                    </button>
                ))}
                <span style={{ marginLeft: 'auto', color: '#666' }}>{selectedChannels.length}/4 Selected</span>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: selectedChannels.length > 1 ? '1fr 1fr' : '1fr', gridTemplateRows: selectedChannels.length > 2 ? '1fr 1fr' : '1fr', background: 'black' }}>
                {selectedChannels.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: '1/-1', color: '#444' }}>
                        <h2>SELECT A CHANNEL TO START WATCHING</h2>
                    </div>
                ) : (
                    selectedChannels.map(slug => (
                        <div key={slug} style={{ position: 'relative', border: '1px solid #333', minHeight: '400px' }}>
                            <iframe
                                src={`https://player.kick.com/${slug}?autoplay=true&muted=true`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                allow="autoplay; fullscreen"
                            />
                            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '4px', pointerEvents: 'none' }}>
                                {slug}
                            </div>
                            <button
                                onClick={() => toggleChannel(slug)}
                                style={{ position: 'absolute', top: 10, right: 10, background: 'red', color: 'white', border: 'none', width: '30px', height: '30px', cursor: 'pointer', borderRadius: '4px' }}
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
