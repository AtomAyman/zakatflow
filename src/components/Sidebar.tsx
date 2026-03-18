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
    Heart,
    LogOut,
    Menu,
    X,
    Moon,
    Sun,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/assets', label: 'Assets', icon: Wallet },
    { href: '/dashboard/liabilities', label: 'Liabilities', icon: CreditCard },
    { href: '/dashboard/history', label: 'History', icon: History },
    { href: '/dashboard/donations', label: 'Donations', icon: Heart },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-card border border-border shadow-sm lg:hidden text-foreground"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-40 transition-transform duration-300 lg:translate-x-0 shadow-sm ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Theme Toggle */}
                    <div className="px-6 py-6 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Logo size={36} />
                                <div>
                                    <h1 className="text-lg font-bold text-foreground tracking-tight">
                                        NisabFlow
                                    </h1>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                                        The private, precise Zakat dashboard.
                                    </p>
                                </div>
                            </div>
                            {mounted && (
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="p-2 -mr-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                                >
                                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        }`}
                                >
                                    <item.icon size={18} className={isActive ? 'text-primary' : 'text-muted-foreground/70'} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User & Sign Out */}
                    <div className="p-4 mx-4 mb-4 rounded-xl bg-secondary/50 border border-border">
                        <div className="flex items-center gap-3">
                            {session?.user?.image ? (
                                <img
                                    src={session.user.image}
                                    alt=""
                                    className="w-9 h-9 rounded-full ring-2 ring-background shadow-sm"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shadow-sm">
                                    {session?.user?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {session?.user?.name || 'User'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {session?.user?.email}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                title="Sign out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
