'use client';

import Image from 'next/image';

export default function Logo({ size = 40 }: { size?: number }) {
    return (
        <Image
            src="/ZakatFlow_Logo_Clear.png"
            alt="NisabFlow"
            width={size}
            height={size}
            className="object-contain"
            priority
        />
    );
}
