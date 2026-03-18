'use client';

import { useState } from 'react';
import { useZakatStore } from '@/lib/store';
import {
    Plus,
    Trash2,
    Home,
    CreditCard,
    X,
    CircleDollarSign,
    Zap,
    Heart,
    Receipt,
    Building2,
    Landmark,
    GraduationCap,
    Pencil,
} from 'lucide-react';
import { type Liability, type LiabilityType, CURRENCIES } from '@/lib/types';
import { v4 as uuid } from 'uuid';
import YearSelector from '@/components/YearSelector';

// ─── Tab & Type Groupings ─────────────────────────────────

type LiabilityTab = 'Bills' | 'Loans';

const LIABILITY_TABS: { key: LiabilityTab; label: string; icon: typeof CreditCard; types: LiabilityType[] }[] = [
    { key: 'Bills', label: 'Bills & Cards', icon: CreditCard, types: ['Credit_Balance', 'Utility_Bills', 'Medical_Bills'] },
    { key: 'Loans', label: 'Loans & Debts', icon: Landmark, types: ['Mortgage', 'Student_Loan', 'Personal_Loan', 'Commercial_Loan', 'Dowry', 'Salary_Service_Fee', 'Other'] },
];

const typeIcons: Record<LiabilityType, typeof Home> = {
    Mortgage: Home,
    Utility_Bills: Zap,
    Medical_Bills: Heart,
    Credit_Balance: CreditCard,
    Personal_Loan: CircleDollarSign,
    Student_Loan: GraduationCap,
    Commercial_Loan: Building2,
    Dowry: Heart,
    Salary_Service_Fee: Receipt,
    Other: CircleDollarSign,
};

const typeLabels: Record<LiabilityType, string> = {
    Mortgage: 'Mortgage / Rent',
    Utility_Bills: 'Utility Bills',
    Medical_Bills: 'Medical Bills',
    Credit_Balance: 'Credit Balance',
    Personal_Loan: 'Personal Loan',
    Student_Loan: 'Student Loan',
    Commercial_Loan: 'Commercial Loan',
    Dowry: 'Dowry (Mahr)',
    Salary_Service_Fee: 'Salary / Fees',
    Other: 'Other',
};

const gradientMap: Record<string, string> = {
    Credit_Balance: 'from-red-400 to-red-600',
    Utility_Bills: 'from-yellow-400 to-yellow-600',
    Medical_Bills: 'from-pink-400 to-pink-600',
    Mortgage: 'from-blue-400 to-blue-600',
    Personal_Loan: 'from-purple-400 to-purple-600',
    Student_Loan: 'from-teal-400 to-teal-600',
    Commercial_Loan: 'from-indigo-400 to-indigo-600',
    Dowry: 'from-rose-400 to-rose-600',
    Salary_Service_Fee: 'from-orange-400 to-orange-600',
    Other: 'from-slate-400 to-slate-600',
};

// ─── Component ────────────────────────────────────────────

export default function LiabilitiesPage() {
    const { addLiability, updateLiability, removeLiability, settings, dashboard, selectedYear, getLiabilitiesForYear } =
        useZakatStore();
    const yearLiabilities = getLiabilitiesForYear(selectedYear);
    const [activeTab, setActiveTab] = useState<LiabilityTab>('Bills');
    const [showForm, setShowForm] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

    const activeTabConfig = LIABILITY_TABS.find((t) => t.key === activeTab)!;
    const filteredLiabilities = yearLiabilities.filter((l) => activeTabConfig.types.includes(l.type));

    const [newType, setNewType] = useState<LiabilityType>(activeTabConfig.types[0]);
    const [newName, setNewName] = useState('');
    const [newTotal, setNewTotal] = useState('');
    const [newMonthly, setNewMonthly] = useState('');
    const [newCurrency, setNewCurrency] = useState(settings.baseCurrency);
    const [newIsImmediate, setNewIsImmediate] = useState(false);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.baseCurrency || 'USD',
            maximumFractionDigits: 0,
        }).format(n);

    const handleTabSwitch = (tab: LiabilityTab) => {
        setActiveTab(tab);
        const tabConfig = LIABILITY_TABS.find((t) => t.key === tab)!;
        setNewType(tabConfig.types[0]);
        setShowForm(false);
        setEditingLiability(null);
    };

    const resetForm = () => {
        setNewName('');
        setNewTotal('');
        setNewMonthly('');
        setNewIsImmediate(false);
    };

    const openFormForTab = () => {
        setEditingLiability(null);
        setNewType(activeTabConfig.types[0]);
        setNewCurrency(settings.baseCurrency);
        resetForm();
        setShowForm(true);
    };

    const openEditModal = (liability: Liability) => {
        setEditingLiability(liability);
        setNewType(liability.type);
        setNewName(liability.name);
        setNewTotal(liability.totalAmount.toString());
        setNewMonthly(liability.monthlyPayment.toString());
        setNewCurrency(liability.currency);
        setNewIsImmediate(liability.isImmediate || false);
        setShowForm(true);
    };

    const handleAdd = () => {
        const liability: Liability = {
            id: uuid(),
            zakatYear: selectedYear,
            type: newType,
            name: newName || typeLabels[newType],
            currency: newCurrency,
            totalAmount: Number(newTotal) || 0,
            monthlyPayment: Number(newMonthly) || 0,
            isImmediate: newIsImmediate,
        };

        addLiability(liability);
        fetch('/api/sheets/liabilities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify(liability),
        }).catch(console.error);

        resetForm();
        setShowForm(false);
    };

    const handleUpdate = () => {
        if (!editingLiability) return;
        const liability: Liability = {
            id: editingLiability.id,
            zakatYear: selectedYear,
            type: newType,
            name: newName || typeLabels[newType],
            currency: newCurrency,
            totalAmount: Number(newTotal) || 0,
            monthlyPayment: Number(newMonthly) || 0,
            isImmediate: newIsImmediate,
        };

        updateLiability(liability);
        fetch('/api/sheets/liabilities', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify(liability),
        }).catch(console.error);

        setEditingLiability(null);
        setShowForm(false);
    };

    const handleDelete = (id: string) => {
        removeLiability(id);
        fetch('/api/sheets/liabilities', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify({ id }),
        }).catch(console.error);
    };

    // Quick toggle immediate — inline without opening modal
    const toggleImmediate = (liability: Liability) => {
        const updated = { ...liability, isImmediate: !liability.isImmediate };
        updateLiability(updated);
        fetch('/api/sheets/liabilities', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify(updated),
        }).catch(console.error);
    };

    // Tab counts & totals
    const tabCounts = LIABILITY_TABS.reduce((acc, tab) => {
        acc[tab.key] = yearLiabilities.filter((l) => tab.types.includes(l.type)).length;
        return acc;
    }, {} as Record<LiabilityTab, number>);

    const tabTotal = filteredLiabilities.reduce((s, l) => s + l.totalAmount, 0);
    const totalDebt = yearLiabilities.reduce((s, l) => s + l.totalAmount, 0);
    const totalMonthly = yearLiabilities.reduce((s, l) => s + l.monthlyPayment, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <CreditCard size={24} className="text-emerald-500" />
                        Liabilities
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground">
                        {yearLiabilities.length} debt{yearLiabilities.length !== 1 ? 's' : ''} in {selectedYear}
                    </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                    <YearSelector />
                    <button
                        onClick={openFormForTab}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Add Debt
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar hide-scrollbar-sm">
                {LIABILITY_TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const count = tabCounts[tab.key];
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabSwitch(tab.key)}
                            className={`flex whitespace-nowrap items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all border ${isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                                : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary/50 hover:text-foreground'
                                }`}
                        >
                            <tab.icon size={16} className={isActive ? 'text-emerald-600 dark:text-emerald-500' : 'opacity-70'} />
                            {tab.label}
                            {count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-secondary text-secondary-foreground'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Madhab notice */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 p-5 shadow-sm">
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <GraduationCap size={16} className="text-blue-600 dark:text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            <strong className="text-blue-600 dark:text-blue-500">{settings.madhab} school:</strong>{' '}
                            {settings.madhab === 'Hanafi'
                                ? 'Deducting 12 months of payments for long-term debts + full amount of immediate debts.'
                                : 'Only immediately due debts are deductible from your zakatable wealth.'}
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-2">
                            Deduction applied: <span className="text-emerald-600 dark:text-emerald-500">{formatCurrency(dashboard.liabilityDeduction)}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab total */}
            {filteredLiabilities.length > 0 && (
                <div className="flex items-center justify-between px-2 text-sm font-semibold text-foreground">
                    <span>{activeTabConfig.label} Total</span>
                    <span>{formatCurrency(tabTotal)}</span>
                </div>
            )}

            {/* Liabilities list for active tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLiabilities.map((liability) => {
                    const Icon = typeIcons[liability.type] || CircleDollarSign;
                    return (
                        <div
                            key={liability.id}
                            className="group rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5 hover:border-emerald-500/30 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20"
                        >
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientMap[liability.type] || 'from-red-400 to-red-600'} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                        <Icon size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-base font-bold text-foreground truncate">{liability.name}</p>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
                                                <button
                                                    onClick={() => openEditModal(liability)}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    title="Edit Liability"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(liability.id)}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    title="Delete Liability"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center mb-3">
                                            <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                                                {typeLabels[liability.type]}
                                            </span>
                                            {/* Clickable immediate toggle */}
                                            <button
                                                onClick={() => toggleImmediate(liability)}
                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border outline-none focus:ring-2 ${liability.isImmediate
                                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20 focus:ring-red-500'
                                                    : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 focus:ring-secondary-foreground/50'
                                                    }`}
                                                title={liability.isImmediate ? 'Click to mark as long-term' : 'Click to mark as immediate'}
                                            >
                                                {liability.isImmediate ? '⚡ Immediate' : '○ Long-term'}
                                            </button>
                                            {liability.currency !== settings.baseCurrency && (
                                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                    {liability.currency}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">Total</p>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {liability.currency} {liability.totalAmount.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">Monthly</p>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {liability.currency} {liability.monthlyPayment.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty state */}
            {filteredLiabilities.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <activeTabConfig.icon size={28} className="text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No {activeTabConfig.label.toLowerCase()} for {selectedYear}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
                        {activeTab === 'Bills' && 'Add credit card balances, utility bills, or medical bills.'}
                        {activeTab === 'Loans' && 'Add mortgages, student loans, personal loans, or other debts.'}
                    </p>
                    <button
                        onClick={openFormForTab}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
                    >
                        <Plus size={16} />
                        Add {activeTabConfig.label.split(' ')[0]}
                    </button>
                </div>
            )}

            {/* Summary */}
            {yearLiabilities.length > 0 && (
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border text-center">
                        <div className="flex flex-col items-center justify-center">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Debt</p>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDebt)}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center pt-6 sm:pt-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Monthly Payments</p>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMonthly)}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center pt-6 sm:pt-0">
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-2">Zakat Deduction</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(dashboard.liabilityDeduction)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Add / Edit Form Modal ───────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingLiability(null); }} />
                    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6 custom-scrollbar">
                        <div className="flex items-center justify-between mb-6 sticky top-0 bg-card z-10 py-2 border-b border-border">
                            <h2 className="text-lg font-semibold text-foreground">
                                {editingLiability ? 'Edit Liability' : `Add ${activeTabConfig.label}`}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingLiability(null); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Type — only show types for current tab */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {activeTabConfig.types.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewType(t)}
                                            className={`px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${newType === t
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                : 'bg-background text-muted-foreground border-border hover:bg-secondary/50'
                                                }`}
                                        >
                                            {typeLabels[t]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={typeLabels[newType]}
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Currency & Amounts Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CURRENCIES.map((cur) => (
                                            <button
                                                key={cur}
                                                type="button"
                                                onClick={() => setNewCurrency(cur)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${newCurrency === cur
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                                                    : 'bg-background text-muted-foreground border-border hover:bg-secondary/50'
                                                    }`}
                                            >
                                                {cur}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Total Amount</label>
                                    <input
                                        type="number"
                                        value={newTotal}
                                        onChange={(e) => setNewTotal(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Monthly Payment</label>
                                    <input
                                        type="number"
                                        value={newMonthly}
                                        onChange={(e) => setNewMonthly(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Immediate toggle */}
                            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-secondary/30 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setNewIsImmediate(!newIsImmediate)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background ${newIsImmediate ? 'bg-emerald-600' : 'bg-muted'}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${newIsImmediate ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-foreground">
                                        Immediate/Short-term Debt
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Deduct entire amount from zakatable wealth
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={editingLiability ? handleUpdate : handleAdd}
                                className="w-full mt-6 py-2.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                {editingLiability ? 'Save Changes' : `Add ${activeTabConfig.label.split(' ')[0]}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
