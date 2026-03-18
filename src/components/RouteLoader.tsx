'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function RouteLoader() {
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const prevPathRef = useRef(pathname);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (pathname !== prevPathRef.current) {
            prevPathRef.current = pathname;
            setLoading(true);
            setProgress(0);

            // Simulate rapid progress
            let p = 0;
            const step = () => {
                p += Math.random() * 30 + 10;
                if (p >= 90) p = 90;
                setProgress(p);
            };
            step();
            timerRef.current = setTimeout(() => {
                step();
                timerRef.current = setTimeout(() => {
                    setProgress(100);
                    timerRef.current = setTimeout(() => {
                        setLoading(false);
                        setProgress(0);
                    }, 300);
                }, 200);
            }, 150);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [pathname]);

    if (!loading && progress === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
            <div
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 shadow-sm shadow-emerald-500/50"
                style={{
                    width: `${progress}%`,
                    transition: progress === 0
                        ? 'none'
                        : progress === 100
                            ? 'width 200ms ease-out, opacity 300ms ease-out'
                            : 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: progress === 100 ? 0 : 1,
                }}
            />
        </div>
    );
}
