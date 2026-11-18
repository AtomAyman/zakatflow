// Companion modules: separate products (like Wasiyyah) that plug into ZakatFlow.
//
// ZakatFlow V1 ships as the Zakat app only. A companion module lives in its own
// repo and is switched on here with an environment flag. Every module is OFF
// unless its flag is set, so V1 builds never show one. See docs/modules.md.

import type { LucideIcon } from 'lucide-react';
import { ScrollText } from 'lucide-react';

export type ModuleId = 'wasiyyah';

export interface CompanionModule {
    id: ModuleId;
    /** Sidebar label. */
    label: string;
    icon: LucideIcon;
    /**
     * Where the sidebar link goes. An absolute URL opens the companion app;
     * a path starting with "/" is a route inside this app.
     */
    href: string;
    /** True only when the module's flag is set at build time. */
    enabled: boolean;
}

// NEXT_PUBLIC_* values are inlined at build time, so they must be read with
// literal property names (no dynamic process.env[key]).
const flag = (value: string | undefined) => value === 'true' || value === '1';

export const COMPANION_MODULES: CompanionModule[] = [
    {
        id: 'wasiyyah',
        label: 'Wasiyyah',
        icon: ScrollText,
        href: process.env.NEXT_PUBLIC_WASIYYAH_URL || '/dashboard/wasiyyah',
        enabled: flag(process.env.NEXT_PUBLIC_MODULE_WASIYYAH),
    },
];

export function enabledModules(): CompanionModule[] {
    return COMPANION_MODULES.filter((m) => m.enabled);
}

export function isModuleEnabled(id: ModuleId): boolean {
    return COMPANION_MODULES.some((m) => m.id === id && m.enabled);
}

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    external?: boolean;
}

/** Inserts enabled modules into the sidebar, just above Settings. */
export function withModuleNavItems<T extends NavItem>(items: T[]): NavItem[] {
    const extra: NavItem[] = enabledModules().map((m) => ({
        href: m.href,
        label: m.label,
        icon: m.icon,
        external: /^https?:\/\//.test(m.href),
    }));
    if (!extra.length) return items;
    const settingsAt = items.findIndex((i) => i.href === '/dashboard/settings');
    const at = settingsAt === -1 ? items.length : settingsAt;
    return [...items.slice(0, at), ...extra, ...items.slice(at)];
}
