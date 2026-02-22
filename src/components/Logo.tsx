'use client';

export default function Logo({ size = 40 }: { size?: number }) {
    return (
        <div
            className="rounded-xl flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                width={size}
                height={size}
            >
                <defs>
                    <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#065F46" />
                        <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D97706" />
                        <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="38" fill="none" stroke="url(#emerald)" strokeWidth="3" opacity="0.4" strokeDasharray="4 4" />
                <g fill="none" stroke="url(#emerald)" strokeWidth="5" strokeLinejoin="round">
                    <rect x="25" y="25" width="50" height="50" rx="4" />
                    <rect x="25" y="25" width="50" height="50" rx="4" transform="rotate(45 50 50)" />
                </g>
                <circle cx="50" cy="50" r="15" fill="url(#gold)" />
                <path d="M50 41 C50 41, 45 48, 45 53 A5 5 0 0 0 55 53 C55 48, 50 41, 50 41 Z" fill="#FFFFFF" />
            </svg>
        </div>
    );
}
