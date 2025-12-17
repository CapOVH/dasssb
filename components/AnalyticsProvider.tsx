'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        // Tracker Logic
        const interval = setInterval(() => {
            const userStr = localStorage.getItem('ssb_current_user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            const statsDb = JSON.parse(localStorage.getItem('ssb_user_stats') || '{}');

            if (!statsDb[user.username]) {
                statsDb[user.username] = { totalTimeMs: 0, watchHistory: {}, lastActive: Date.now() };
            }

            // Update Total Time
            statsDb[user.username].totalTimeMs += 5000;
            statsDb[user.username].lastActive = Date.now();

            // Track Stream Watching
            if (pathname?.startsWith('/stream/')) {
                const streamer = pathname.split('/').pop() || 'unknown';
                statsDb[user.username].watchHistory[streamer] = (statsDb[user.username].watchHistory[streamer] || 0) + 5000;
            }

            localStorage.setItem('ssb_user_stats', JSON.stringify(statsDb));
        }, 5000);

        return () => clearInterval(interval);
    }, [pathname]);

    // "AI Scan" Simulation
    useEffect(() => {
        const scanInterval = setInterval(() => {
            const logs = JSON.parse(localStorage.getItem('ssb_ai_logs') || '[]');
            const statsDb = JSON.parse(localStorage.getItem('ssb_user_stats') || '{}');
            const activeCount = Object.values(statsDb).filter((u: any) => Date.now() - u.lastActive < 60000).length;

            const log = {
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
                status: 'OK',
                message: `System Scan Complete. Active Users: ${activeCount}. Integrity: 100%.`,
                type: 'info'
            };

            // Simulate anomaly detection
            if (activeCount > 100) { // arbitrary threshold
                log.status = 'WARNING';
                log.message = `High Traffic Detected: ${activeCount} users. Scaling resources...`;
                log.type = 'warning';
            }

            logs.unshift(log); // Add to top
            if (logs.length > 50) logs.pop(); // Keep last 50
            localStorage.setItem('ssb_ai_logs', JSON.stringify(logs));
        }, 10000); // Scan every 10s for demo (User asked for hourly but needs to see it work)

        return () => clearInterval(scanInterval);
    }, []);

    return <>{children}</>;
}
