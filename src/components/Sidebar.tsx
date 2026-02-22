'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    Settings,
    Wallet,
    CreditCard,
    History,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import { useState } from 'react';
import Logo from '@/components/Logo';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/assets', label: 'Assets', icon: Wallet },
    { href: '/dashboard/liabilities', label: 'Liabilities', icon: CreditCard },
    { href: '/dashboard/history', label: 'History', icon: History },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-surface/80 backdrop-blur-xl border border-white/10 lg:hidden"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full w-72 bg-surface/60 backdrop-blur-2xl border-r border-white/[0.06] z-40 transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="px-6 py-8">
                        <div className="flex items-center gap-3">
                            <Logo size={40} />
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
                                    ZakatFlow
                                </h1>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">
                                    Sheet-Backed Dashboard
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/5'
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <item.icon size={18} className={isActive ? 'text-emerald-400' : ''} />
                                    {item.label}
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User & Sign Out */}
                    <div className="p-4 mx-3 mb-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            {session?.user?.image ? (
                                <img
                                    src={session.user.image}
                                    alt=""
                                    className="w-8 h-8 rounded-full ring-2 ring-emerald-500/30"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white/80 truncate">
                                    {session?.user?.name || 'User'}
                                </p>
                                <p className="text-[10px] text-white/40 truncate">
                                    {session?.user?.email}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                                title="Sign out"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
