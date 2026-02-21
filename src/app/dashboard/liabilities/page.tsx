'use client';

import { useState } from 'react';
import { useZakatStore } from '@/lib/store';
import {
    Plus,
    Trash2,
    Home,
    GraduationCap,
    CreditCard,
    X,
    CircleDollarSign,
    Zap,
    Heart,
    Receipt,
    Building2,
} from 'lucide-react';
import { type Liability, type LiabilityType, CURRENCIES } from '@/lib/types';
import { v4 as uuid } from 'uuid';
import YearSelector from '@/components/YearSelector';

const typeIcons: Record<LiabilityType, typeof Home> = {
    Mortgage: Home,
    Utility_Bills: Zap,
    Medical_Bills: Heart,
    Credit_Balance: CreditCard,
    Personal_Loan: CircleDollarSign,
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
    Commercial_Loan: 'Commercial Loan',
    Dowry: 'Dowry (Mahr)',
    Salary_Service_Fee: 'Salary / Fees',
    Other: 'Other',
};

export default function LiabilitiesPage() {
    const { addLiability, removeLiability, settings, dashboard, selectedYear, getLiabilitiesForYear } =
        useZakatStore();
    const yearLiabilities = getLiabilitiesForYear(selectedYear);
    const [showForm, setShowForm] = useState(false);
    const [newType, setNewType] = useState<LiabilityType>('Mortgage');
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

        // Save to sheet
        fetch('/api/sheets/liabilities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify(liability),
        }).catch(console.error);

        setNewName('');
        setNewTotal('');
        setNewMonthly('');
        setNewIsImmediate(false);
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

    const totalDebt = yearLiabilities.reduce((s, l) => s + l.totalAmount, 0);
    const totalMonthly = yearLiabilities.reduce((s, l) => s + l.monthlyPayment, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Liabilities</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {yearLiabilities.length} debt{yearLiabilities.length !== 1 ? 's' : ''} in {selectedYear}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <YearSelector />
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98]"
                    >
                        <Plus size={14} />
                        Add Debt
                    </button>
                </div>
            </div>

            {/* Madhab notice */}
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
                <p className="text-xs text-purple-300">
                    <strong>{settings.madhab} school:</strong>{' '}
                    {settings.madhab === 'Hanafi'
                        ? 'Deducting 12 months of payments for long-term debts + full amount of immediate debts.'
                        : 'Only immediately due debts are deductible from your zakatable wealth.'}
                </p>
                <p className="text-xs text-purple-300/60 mt-1">
                    Deduction applied: <strong>{formatCurrency(dashboard.liabilityDeduction)}</strong>
                </p>
            </div>

            {/* Liabilities list */}
            <div className="space-y-3">
                {yearLiabilities.map((liability) => {
                    const Icon = typeIcons[liability.type] || CircleDollarSign;

                    return (
                        <div
                            key={liability.id}
                            className="group rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-5 hover:border-white/[0.12] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                    <Icon size={16} className="text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {liability.name}
                                        </p>
                                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] text-white/40 font-medium">
                                            {typeLabels[liability.type]}
                                        </span>
                                        {liability.isImmediate && (
                                            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-[10px] text-red-400 font-medium">
                                                Immediate
                                            </span>
                                        )}
                                        {liability.currency !== settings.baseCurrency && (
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] text-blue-400 font-medium">
                                                {liability.currency}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-white/30">
                                        <span>Total: {liability.currency} {liability.totalAmount.toLocaleString()}</span>
                                        <span>Monthly: {liability.currency} {liability.monthlyPayment.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(liability.id)}
                                    className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty state */}
            {yearLiabilities.length === 0 && (
                <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] border-dashed p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <CreditCard size={24} className="text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white/70 mb-2">
                        No debts for {selectedYear}
                    </h3>
                    <p className="text-sm text-white/30 mb-4 max-w-sm mx-auto">
                        Add mortgages, utility bills, credit balances, personal loans, or other debts for Madhab-specific deductions.
                    </p>
                </div>
            )}

            {/* Summary */}
            {yearLiabilities.length > 0 && (
                <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-5">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                                Total Debt
                            </p>
                            <p className="text-lg font-bold text-white">
                                {totalDebt.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                                Monthly Payments
                            </p>
                            <p className="text-lg font-bold text-white">
                                {totalMonthly.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                                Zakat Deduction
                            </p>
                            <p className="text-lg font-bold text-emerald-400">
                                {formatCurrency(dashboard.liabilityDeduction)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add form modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowForm(false)}
                    />
                    <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-[#1a1d27] border border-white/[0.08] shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-white">
                                Add Liability
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="p-2 rounded-lg hover:bg-white/10 text-white/40"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(typeLabels) as LiabilityType[]).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewType(t)}
                                            className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${newType === t
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'
                                                }`}
                                        >
                                            {typeLabels[t]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={typeLabels[newType]}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            {/* Currency */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Currency</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {CURRENCIES.map((cur) => (
                                        <button
                                            key={cur}
                                            type="button"
                                            onClick={() => setNewCurrency(cur)}
                                            className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${newCurrency === cur
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'
                                                }`}
                                        >
                                            {cur}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">
                                    Total Amount
                                </label>
                                <input
                                    type="number"
                                    value={newTotal}
                                    onChange={(e) => setNewTotal(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            {/* Monthly */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">
                                    Monthly Payment
                                </label>
                                <input
                                    type="number"
                                    value={newMonthly}
                                    onChange={(e) => setNewMonthly(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            {/* Immediate toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setNewIsImmediate(!newIsImmediate)}
                                    className={`w-10 h-6 rounded-full transition-all relative ${newIsImmediate ? 'bg-emerald-500' : 'bg-white/10'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newIsImmediate ? 'left-5' : 'left-1'
                                            }`}
                                    />
                                </button>
                                <label className="text-xs text-white/50">
                                    This is an immediate/short-term debt (due now)
                                </label>
                            </div>

                            <button
                                onClick={handleAdd}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98]"
                            >
                                Add Liability
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
