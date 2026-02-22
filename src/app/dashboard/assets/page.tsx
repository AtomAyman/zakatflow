'use client';

import { useState, useMemo } from 'react';
import { useZakatStore } from '@/lib/store';
import {
    DollarSign,
    Plus,
    Trash2,
    X,
    Landmark,
    TrendingUp,
    Bitcoin,
    ShieldCheck,
    Gem,
    Package,
    FileText,
    Scale,
    Banknote,
    BarChart3,
    Pencil,
} from 'lucide-react';
import {
    type Asset,
    type AssetType,
    type StockHoldingType,
    type RetirementType,
    type CryptoIntent,
    type WeightUnit,
    CURRENCIES,
} from '@/lib/types';
import { v4 as uuid } from 'uuid';
import YearSelector from '@/components/YearSelector';

// ─── Tab & Type Groupings ─────────────────────────────────

type AssetTab = 'Money' | 'Stocks' | 'Gold & Silver';

const ASSET_TABS: { key: AssetTab; label: string; icon: typeof DollarSign; types: AssetType[] }[] = [
    { key: 'Money', label: 'Money', icon: Banknote, types: ['Cash', 'Bank', 'Debt_Receivable'] },
    { key: 'Stocks', label: 'Investments', icon: BarChart3, types: ['Stock', 'Crypto', 'Retirement', 'Merchandise'] },
    { key: 'Gold & Silver', label: 'Gold & Silver', icon: Gem, types: ['Gold', 'Silver'] },
];

const typeIcons: Record<AssetType, typeof DollarSign> = {
    Cash: DollarSign,
    Bank: Landmark,
    Stock: TrendingUp,
    Crypto: Bitcoin,
    Retirement: ShieldCheck,
    Gold: Gem,
    Silver: Gem,
    Merchandise: Package,
    Debt_Receivable: FileText,
};

const typeLabels: Record<AssetType, string> = {
    Cash: 'Cash / Hand',
    Bank: 'Bank Account',
    Stock: 'Stocks',
    Crypto: 'Cryptocurrency',
    Retirement: 'Retirement',
    Gold: 'Gold',
    Silver: 'Silver',
    Merchandise: 'Merchandise',
    Debt_Receivable: 'Debt Receivable',
};

const WEIGHT_UNITS: { value: WeightUnit; label: string; toGrams: number }[] = [
    { value: 'grams', label: 'Grams (g)', toGrams: 1 },
    { value: 'troy_oz', label: 'Troy Oz', toGrams: 31.1035 },
    { value: 'tola', label: 'Tola', toGrams: 11.6638038 },
];

const GOLD_PURITIES = [
    { value: 24, label: '24K (Pure)' },
    { value: 22, label: '22K' },
    { value: 21, label: '21K' },
    { value: 18, label: '18K' },
    { value: 14, label: '14K' },
];

const gradientMap: Record<string, string> = {
    Cash: 'from-emerald-400 to-emerald-600',
    Bank: 'from-blue-400 to-blue-600',
    Stock: 'from-purple-400 to-purple-600',
    Crypto: 'from-amber-400 to-amber-600',
    Retirement: 'from-red-400 to-red-600',
    Gold: 'from-yellow-400 to-yellow-600',
    Silver: 'from-slate-300 to-slate-500',
    Merchandise: 'from-pink-400 to-pink-600',
    Debt_Receivable: 'from-cyan-400 to-cyan-600',
};

// ─── Component ────────────────────────────────────────────

export default function AssetsPage() {
    const { addAsset, updateAsset, removeAsset, settings, dashboard, prices, selectedYear, getAssetsForYear } = useZakatStore();
    const yearAssets = getAssetsForYear(selectedYear);
    const [activeTab, setActiveTab] = useState<AssetTab>('Money');
    const [showForm, setShowForm] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    // Form state
    const activeTabConfig = ASSET_TABS.find((t) => t.key === activeTab)!;
    const filteredAssets = yearAssets.filter((a) => activeTabConfig.types.includes(a.type));

    const [newType, setNewType] = useState<AssetType>(activeTabConfig.types[0]);
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newCurrency, setNewCurrency] = useState(settings.baseCurrency);
    const [newValuation, setNewValuation] = useState('100');
    const [isJewelry, setIsJewelry] = useState(false);
    const [isETF, setIsETF] = useState(false);
    const [weightInput, setWeightInput] = useState('');
    const [weightUnit, setWeightUnit] = useState<WeightUnit>('grams');
    const [goldPurity, setGoldPurity] = useState(24);
    const [stockHoldingType, setStockHoldingType] = useState<StockHoldingType>('Short_Term');
    const [zakatableAssetPercent, setZakatableAssetPercent] = useState('40');
    const [retirementType, setRetirementType] = useState<RetirementType>('Voluntary');
    const [cryptoIntent, setCryptoIntent] = useState<CryptoIntent>('Currency');
    const [debtStrength, setDebtStrength] = useState<'Strong' | 'Weak' | 'Intermediate'>('Strong');

    const isGoldSilver = newType === 'Gold' || newType === 'Silver';

    const computedValue = useMemo(() => {
        if (!isGoldSilver || isETF || !weightInput) return null;
        const unitInfo = WEIGHT_UNITS.find((u) => u.value === weightUnit);
        if (!unitInfo) return null;
        const grams = Number(weightInput) * unitInfo.toGrams;
        const pricePerGram = newType === 'Gold' ? prices.goldPerGram : prices.silverPerGram;
        const purityMult = newType === 'Gold' ? goldPurity / 24 : 1;
        return grams * pricePerGram * purityMult;
    }, [isGoldSilver, isETF, weightInput, weightUnit, goldPurity, newType, prices]);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.baseCurrency || 'USD',
            maximumFractionDigits: 0,
        }).format(n);

    // When switching tabs, reset the form type to the first type in that tab
    const handleTabSwitch = (tab: AssetTab) => {
        setActiveTab(tab);
        const tabConfig = ASSET_TABS.find((t) => t.key === tab)!;
        setNewType(tabConfig.types[0]);
        setShowForm(false);
        setEditingAsset(null);
    };

    const resetForm = () => {
        setNewName('');
        setNewValue('');
        setNewValuation('100');
        setIsJewelry(false);
        setIsETF(false);
        setWeightInput('');
        setWeightUnit('grams');
        setGoldPurity(24);
        setStockHoldingType('Short_Term');
        setZakatableAssetPercent('40');
        setRetirementType('Voluntary');
        setCryptoIntent('Currency');
        setDebtStrength('Strong');
    };

    const openFormForTab = () => {
        setEditingAsset(null);
        setNewType(activeTabConfig.types[0]);
        setNewCurrency(settings.baseCurrency);
        resetForm();
        setShowForm(true);
    };

    const openEditModal = (asset: Asset) => {
        setEditingAsset(asset);
        setNewType(asset.type);
        setNewName(asset.name);
        setNewValue(asset.grossValue.toString());
        setNewCurrency(asset.currency);
        setNewValuation(asset.valuationPercent.toString());
        setIsJewelry(asset.isJewelry || false);
        setIsETF(asset.isETF || false);
        setStockHoldingType(asset.stockHoldingType || 'Short_Term');
        setZakatableAssetPercent((asset.zakatableAssetPercent ?? 40).toString());
        setRetirementType(asset.retirementType || 'Voluntary');
        setCryptoIntent(asset.cryptoIntent || 'Currency');
        setDebtStrength(asset.debtStrength || 'Strong');
        if (asset.weightGrams && !asset.isETF) {
            const unit = asset.weightUnit || 'grams';
            const unitInfo = WEIGHT_UNITS.find((u) => u.value === unit);
            setWeightUnit(unit);
            setWeightInput((asset.weightGrams / (unitInfo?.toGrams ?? 1)).toString());
        } else {
            setWeightInput('');
            setWeightUnit('grams');
        }
        setGoldPurity(asset.goldPurity || 24);
        setShowForm(true);
    };

    const buildAssetFromForm = (id: string): Asset => {
        let grossValue = Number(newValue) || 0;
        let weightGrams: number | undefined;

        if (isGoldSilver && !isETF && weightInput) {
            const unitInfo = WEIGHT_UNITS.find((u) => u.value === weightUnit);
            weightGrams = Number(weightInput) * (unitInfo?.toGrams ?? 1);
            const pricePerGram = newType === 'Gold' ? prices.goldPerGram : prices.silverPerGram;
            const purityMult = newType === 'Gold' ? goldPurity / 24 : 1;
            grossValue = weightGrams * pricePerGram * purityMult;
        }

        return {
            id,
            zakatYear: selectedYear,
            type: newType,
            name: newName || typeLabels[newType],
            currency: isGoldSilver && !isETF ? 'USD' : newCurrency,
            grossValue,
            zakatMethod: 'Market',
            valuationPercent: Number(newValuation) || 100,
            isJewelry: isGoldSilver ? isJewelry : undefined,
            isETF: isGoldSilver ? isETF : undefined,
            weightGrams: isGoldSilver && !isETF ? weightGrams : undefined,
            weightUnit: isGoldSilver && !isETF ? weightUnit : undefined,
            goldPurity: newType === 'Gold' ? goldPurity : undefined,
            stockHoldingType: newType === 'Stock' ? stockHoldingType : undefined,
            zakatableAssetPercent:
                (newType === 'Stock' && stockHoldingType === 'Long_Term') ||
                    (newType === 'Retirement' && retirementType === 'Voluntary')
                    ? Number(zakatableAssetPercent) || 40
                    : undefined,
            retirementType: newType === 'Retirement' ? retirementType : undefined,
            cryptoIntent: newType === 'Crypto' ? cryptoIntent : undefined,
            debtStrength: newType === 'Debt_Receivable' ? debtStrength : undefined,
            deductibleTaxPenalty: 0,
            netZakatableValue: 0,
        };
    };

    const handleAdd = () => {
        const asset = buildAssetFromForm(uuid());
        addAsset(asset);
        fetch('/api/sheets/assets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify(asset),
        }).catch(console.error);
        resetForm();
        setShowForm(false);
    };

    const handleUpdate = () => {
        if (!editingAsset) return;
        const asset = buildAssetFromForm(editingAsset.id);
        updateAsset(asset);
        fetch('/api/sheets/assets', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify(asset),
        }).catch(console.error);
        setEditingAsset(null);
        setShowForm(false);
    };

    const handleDelete = (id: string) => {
        removeAsset(id);
        fetch('/api/sheets/assets', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
            },
            body: JSON.stringify({ id }),
        }).catch(console.error);
    };

    // Tab counts
    const tabCounts = ASSET_TABS.reduce((acc, tab) => {
        acc[tab.key] = yearAssets.filter((a) => tab.types.includes(a.type)).length;
        return acc;
    }, {} as Record<AssetTab, number>);

    // Per-tab zakat breakdown
    const tabTotal = filteredAssets.reduce((s, a) => s + ((a as any)._computedGross || a.grossValue), 0);
    const tabNetZakatable = filteredAssets.reduce((s, a) => s + a.netZakatableValue, 0);
    const tabZakatDue = tabNetZakatable > 0 ? tabNetZakatable * 0.025 : 0;

    // All-tab zakat breakdown for summary
    const tabBreakdown = ASSET_TABS.map((tab) => {
        const tabAssets = yearAssets.filter((a) => tab.types.includes(a.type));
        const gross = tabAssets.reduce((s, a) => s + ((a as any)._computedGross || a.grossValue), 0);
        const net = tabAssets.reduce((s, a) => s + a.netZakatableValue, 0);
        return { key: tab.key, label: tab.label, icon: tab.icon, gross, net, zakat: net > 0 ? net * 0.025 : 0 };
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Assets</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {yearAssets.length} asset{yearAssets.length !== 1 ? 's' : ''} in {selectedYear}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <YearSelector />
                    <button
                        onClick={openFormForTab}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98]"
                    >
                        <Plus size={14} />
                        Add Asset
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2">
                {ASSET_TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const count = tabCounts[tab.key];
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabSwitch(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                                : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-white/30'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Per-tab zakat summary */}
            {filteredAssets.length > 0 && (
                <div className="rounded-xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] px-5 py-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Gross Value</p>
                            <p className="text-base font-bold text-white">{formatCurrency(tabTotal)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Net Zakatable</p>
                            <p className="text-base font-bold text-amber-400">{formatCurrency(tabNetZakatable)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Zakat Due (2.5%)</p>
                            <p className="text-base font-bold text-emerald-400">{formatCurrency(tabZakatDue)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset list for active tab */}
            <div className="space-y-3">
                {filteredAssets.map((asset) => {
                    const Icon = typeIcons[asset.type] || DollarSign;
                    const assetZakat = asset.netZakatableValue > 0 ? asset.netZakatableValue * 0.025 : 0;
                    return (
                        <div
                            key={asset.id}
                            className="group rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-5 hover:border-white/[0.12] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientMap[asset.type] || 'from-gray-400 to-gray-600'} flex items-center justify-center shadow-lg flex-shrink-0`}
                                >
                                    <Icon size={16} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <p className="text-sm font-semibold text-white truncate">{asset.name}</p>
                                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] text-white/40 font-medium">
                                            {typeLabels[asset.type]}
                                        </span>
                                        {asset.isETF && (
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] text-blue-400 font-medium">ETF</span>
                                        )}
                                        {asset.weightGrams && !asset.isETF && (
                                            <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-[10px] text-yellow-400 font-medium">
                                                {asset.weightGrams.toFixed(2)}g
                                                {asset.goldPurity && asset.goldPurity < 24 ? ` · ${asset.goldPurity}K` : ''}
                                            </span>
                                        )}
                                        {asset.currency !== settings.baseCurrency && (
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] text-blue-400 font-medium">{asset.currency}</span>
                                        )}
                                        {asset.isJewelry && (
                                            <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-[10px] text-yellow-400 font-medium">Jewelry</span>
                                        )}
                                        {asset.retirementType === 'Mandatory' && (
                                            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-[10px] text-orange-400 font-medium">Mandatory (exempt)</span>
                                        )}
                                        {asset.cryptoIntent === 'Platform_Token' && (
                                            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-[10px] text-orange-400 font-medium">Platform Token (exempt)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-white/30">
                                        <span>{settings.baseCurrency} {((asset as any)._computedGross || asset.grossValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        {assetZakat > 0 && (
                                            <span className="text-emerald-400/60">Zakat: {formatCurrency(assetZakat)}</span>
                                        )}
                                        {asset.valuationPercent < 100 && <span>{asset.valuationPercent}% zakatable</span>}
                                        {asset.stockHoldingType === 'Long_Term' && <span>Long-term ({asset.zakatableAssetPercent ?? 40}%)</span>}
                                        {asset.debtStrength && <span>{asset.debtStrength} debt</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => openEditModal(asset)}
                                        className="p-2 rounded-lg text-white/20 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(asset.id)}
                                        className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty state */}
            {filteredAssets.length === 0 && (
                <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] border-dashed p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <activeTabConfig.icon size={24} className="text-emerald-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white/70 mb-2">
                        No {activeTab.toLowerCase()} assets for {selectedYear}
                    </h3>
                    <p className="text-sm text-white/30 mb-4 max-w-sm mx-auto">
                        {activeTab === 'Money' && 'Add cash, bank accounts, or debts owed to you.'}
                        {activeTab === 'Stocks' && 'Add stocks, cryptocurrency, retirement accounts, or merchandise.'}
                        {activeTab === 'Gold & Silver' && 'Add physical gold, silver, or precious metal ETFs.'}
                    </p>
                </div>
            )}

            {/* Zakat breakdown by section */}
            {yearAssets.length > 0 && (
                <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-5">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
                        Zakat Breakdown by Section
                    </h3>
                    <div className="space-y-3">
                        {tabBreakdown.filter((t) => t.gross > 0).map((t) => (
                            <div key={t.key} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                    <t.icon size={14} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white/70">{t.label}</p>
                                    <p className="text-[10px] text-white/30">
                                        Gross {formatCurrency(t.gross)} → Net {formatCurrency(t.net)}
                                    </p>
                                </div>
                                <p className="text-sm font-bold text-emerald-400">{formatCurrency(t.zakat)}</p>
                            </div>
                        ))}
                        <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
                            <p className="text-xs font-semibold text-white/50">Total Zakat on Assets</p>
                            <p className="text-base font-bold text-emerald-400">
                                {formatCurrency(tabBreakdown.reduce((s, t) => s + t.zakat, 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Overall summary */}
            {yearAssets.length > 0 && (
                <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-5">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Gross Assets</p>
                            <p className="text-lg font-bold text-white">{formatCurrency(dashboard.totalGrossAssets)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Deductions</p>
                            <p className="text-lg font-bold text-amber-400">{formatCurrency(dashboard.totalDeductions)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Net Zakatable</p>
                            <p className="text-lg font-bold text-emerald-400">{formatCurrency(dashboard.totalNetZakatableAssets)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Add / Edit Form Modal ───────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingAsset(null); }} />
                    <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-[#1a1d27] border border-white/[0.08] shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-white">
                                {editingAsset ? 'Edit Asset' : `Add ${activeTab} Asset`}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingAsset(null); }} className="p-2 rounded-lg hover:bg-white/10 text-white/40">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Type — only show types for current tab */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {activeTabConfig.types.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => { setNewType(t); setIsETF(false); setWeightInput(''); }}
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

                            {/* ═══ GOLD/SILVER: ETF Toggle + Weight/Value Input ═══ */}
                            {isGoldSilver && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => setIsETF(!isETF)}
                                            className={`w-10 h-6 rounded-full transition-all relative ${isETF ? 'bg-blue-500' : 'bg-white/10'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isETF ? 'left-5' : 'left-1'}`} />
                                        </button>
                                        <label className="text-xs text-white/50">
                                            This is a {newType} ETF (enter dollar value directly)
                                        </label>
                                    </div>

                                    {isETF ? (
                                        <>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-2">Currency</label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {CURRENCIES.map((cur) => (
                                                        <button key={cur} type="button" onClick={() => setNewCurrency(cur)}
                                                            className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${newCurrency === cur
                                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                                        >{cur}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-2">ETF Value ({newCurrency})</label>
                                                <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-2">Weight Unit</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {WEIGHT_UNITS.map((u) => (
                                                        <button key={u.value} type="button" onClick={() => setWeightUnit(u.value)}
                                                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${weightUnit === u.value
                                                                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                                                : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                                        >{u.label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-2">
                                                    Weight ({WEIGHT_UNITS.find((u) => u.value === weightUnit)?.label || weightUnit})
                                                </label>
                                                <input type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-yellow-500/40 transition-all"
                                                />
                                                {weightInput && (
                                                    <p className="text-[10px] text-white/20 mt-1">
                                                        = {(Number(weightInput) * (WEIGHT_UNITS.find((u) => u.value === weightUnit)?.toGrams ?? 1)).toFixed(2)} grams
                                                    </p>
                                                )}
                                            </div>
                                            {newType === 'Gold' && (
                                                <div>
                                                    <label className="block text-xs text-white/40 mb-2">Purity</label>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {GOLD_PURITIES.map((p) => (
                                                            <button key={p.value} type="button" onClick={() => setGoldPurity(p.value)}
                                                                className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${goldPurity === p.value
                                                                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                                                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                                            >{p.label}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {computedValue !== null && (
                                                <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Scale size={14} className="text-yellow-400" />
                                                        <span className="text-xs text-yellow-400 font-medium">Live Value</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-white">
                                                        ${computedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-[10px] text-white/30 mt-1">
                                                        {newType === 'Gold' ? `Gold $${prices.goldPerGram.toFixed(2)}/g` : `Silver $${prices.silverPerGram.toFixed(2)}/g`}
                                                        {newType === 'Gold' && goldPurity < 24 && ` · ${goldPurity}K (${((goldPurity / 24) * 100).toFixed(0)}% pure)`}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Jewelry toggle */}
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => setIsJewelry(!isJewelry)}
                                            className={`w-10 h-6 rounded-full transition-all relative ${isJewelry ? 'bg-yellow-500' : 'bg-white/10'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isJewelry ? 'left-5' : 'left-1'}`} />
                                        </button>
                                        <label className="text-xs text-white/50">
                                            This is jewelry
                                            {settings.madhab !== 'Hanafi' && ' (exempt for your madhab)'}
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* ═══ NON GOLD/SILVER: Currency + Value ═══ */}
                            {!isGoldSilver && (
                                <>
                                    <div>
                                        <label className="block text-xs text-white/40 mb-2">Currency</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {CURRENCIES.map((cur) => (
                                                <button key={cur} type="button" onClick={() => setNewCurrency(cur)}
                                                    className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${newCurrency === cur
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                                >{cur}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/40 mb-2">Value ({newCurrency})</label>
                                        <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="0"
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Stock-specific */}
                            {newType === 'Stock' && (
                                <div className="space-y-3">
                                    <label className="block text-xs text-white/40">Holding Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['Short_Term', 'Long_Term'] as StockHoldingType[]).map((t) => (
                                            <button key={t} type="button" onClick={() => setStockHoldingType(t)}
                                                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${stockHoldingType === t
                                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                            >{t === 'Short_Term' ? 'Short-term (100%)' : 'Long-term (partial)'}</button>
                                        ))}
                                    </div>
                                    {stockHoldingType === 'Long_Term' && (
                                        <div>
                                            <label className="block text-xs text-white/40 mb-2">Zakatable Assets % of Company</label>
                                            <input type="number" value={zakatableAssetPercent} onChange={(e) => setZakatableAssetPercent(e.target.value)} placeholder="40"
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-500/40 transition-all"
                                            />
                                            <p className="text-[10px] text-white/20 mt-1">Only cash, raw materials, inventory, receivables are zakatable. Check the company&apos;s annual report.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Retirement-specific */}
                            {newType === 'Retirement' && (
                                <div className="space-y-3">
                                    <label className="block text-xs text-white/40">Retirement Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setRetirementType('Mandatory')}
                                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${retirementType === 'Mandatory'
                                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                                : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                        >Mandatory (pension)</button>
                                        <button type="button" onClick={() => setRetirementType('Voluntary')}
                                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${retirementType === 'Voluntary'
                                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                                : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                        >Voluntary (401k/IRA)</button>
                                    </div>
                                    {retirementType === 'Mandatory' && (
                                        <p className="text-[10px] text-orange-300/60 bg-orange-500/5 p-2 rounded-lg">
                                            Per the ruling: mandatory retirement funds are <strong>not zakatable</strong> until received by the employee.
                                        </p>
                                    )}
                                    {retirementType === 'Voluntary' && (
                                        <div>
                                            <label className="block text-xs text-white/40 mb-2">Zakatable Assets % (like long-term stock)</label>
                                            <input type="number" value={zakatableAssetPercent} onChange={(e) => setZakatableAssetPercent(e.target.value)} placeholder="40"
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/40 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Crypto intent */}
                            {newType === 'Crypto' && (
                                <div className="space-y-3">
                                    <label className="block text-xs text-white/40">Intent</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Currency', 'Resale', 'Platform_Token'] as CryptoIntent[]).map((i) => (
                                            <button key={i} type="button" onClick={() => setCryptoIntent(i)}
                                                className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${cryptoIntent === i
                                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                            >{i === 'Platform_Token' ? 'Platform' : i}</button>
                                        ))}
                                    </div>
                                    {cryptoIntent === 'Platform_Token' && (
                                        <p className="text-[10px] text-orange-300/60 bg-orange-500/5 p-2 rounded-lg">
                                            Platform tokens used within their platform (not for resale) are <strong>not zakatable</strong>.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Debt receivable strength */}
                            {newType === 'Debt_Receivable' && (
                                <div className="space-y-3">
                                    <label className="block text-xs text-white/40">Debt Strength</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Strong', 'Intermediate', 'Weak'] as const).map((s) => (
                                            <button key={s} type="button" onClick={() => setDebtStrength(s)}
                                                className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${debtStrength === s
                                                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}
                                            >{s}</button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-white/20">
                                        {debtStrength === 'Strong' && 'Debt for merchandise or loaned cash — zakatable immediately.'}
                                        {debtStrength === 'Intermediate' && 'Debt for non-trade goods — zakatable only after received.'}
                                        {debtStrength === 'Weak' && 'Inheritance, mahr, wages not yet received — zakatable only after received.'}
                                    </p>
                                </div>
                            )}

                            {/* Valuation % */}
                            {!isGoldSilver && newType !== 'Retirement' && newType !== 'Crypto' && newType !== 'Debt_Receivable' && (
                                <div>
                                    <label className="block text-xs text-white/40 mb-2">Zakatable % (default 100%)</label>
                                    <input type="number" value={newValuation} onChange={(e) => setNewValuation(e.target.value)} placeholder="100"
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                    />
                                </div>
                            )}

                            <button
                                onClick={editingAsset ? handleUpdate : handleAdd}
                                disabled={isGoldSilver && !isETF && !weightInput}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {editingAsset ? 'Save Changes' : 'Add Asset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
