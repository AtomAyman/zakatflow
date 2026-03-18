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
    type RetirementAccountType,
    type CryptoIntent,
    type ZakatMethod,
    type WeightUnit,
    CURRENCIES,
} from '@/lib/types';
import { calculateRetirementNetAccessible } from '@/lib/tax-data';
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
    const [retirementAccountType, setRetirementAccountType] = useState<RetirementAccountType>('Taxable_401k');
    const [zakatMethod, setZakatMethod] = useState<ZakatMethod>('Market');
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
        setRetirementAccountType('Taxable_401k');
        setZakatMethod('Market');
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
        setRetirementAccountType(asset.retirementAccountType || 'Taxable_401k');
        setZakatMethod(asset.zakatMethod || 'Market');
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
            zakatMethod: newType === 'Stock' && stockHoldingType === 'Long_Term'
                ? zakatMethod
                : newType === 'Stock' ? 'Market' : 'Market',
            valuationPercent:
                newType === 'Stock' && stockHoldingType === 'Long_Term'
                    ? zakatMethod === 'Passive_Proxy' ? 30
                        : zakatMethod === 'Commodity_ETF' ? 100
                            : Number(newValuation) || 100
                    : Number(newValuation) || 100,
            isJewelry: isGoldSilver ? isJewelry : undefined,
            isETF: isGoldSilver ? isETF : undefined,
            weightGrams: isGoldSilver && !isETF ? weightGrams : undefined,
            weightUnit: isGoldSilver && !isETF ? weightUnit : undefined,
            goldPurity: newType === 'Gold' ? goldPurity : undefined,
            stockHoldingType: newType === 'Stock' ? stockHoldingType : undefined,
            zakatableAssetPercent:
                (newType === 'Stock' && stockHoldingType === 'Long_Term')
                    ? (zakatMethod === 'Passive_Proxy' ? 30
                        : zakatMethod === 'Commodity_ETF' ? 100
                            : Number(zakatableAssetPercent) || 40)
                    : (newType === 'Retirement' && retirementType === 'Voluntary')
                        ? Number(zakatableAssetPercent) || 40
                        : undefined,
            retirementType: newType === 'Retirement' ? retirementType : undefined,
            retirementAccountType: newType === 'Retirement' && retirementType === 'Voluntary'
                ? retirementAccountType : undefined,
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
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Assets</h1>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        {yearAssets.length} asset{yearAssets.length !== 1 ? 's' : ''} in {selectedYear}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <YearSelector showCopyPrompt={false} />
                    <button
                        onClick={openFormForTab}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Add Asset
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex flex-wrap gap-2">
                {ASSET_TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const count = tabCounts[tab.key];
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabSwitch(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${isActive
                                ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                                : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {count > 0 && (
                                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Per-tab zakat summary */}
            {filteredAssets.length > 0 && (
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm px-5 py-4">
                    <div className="grid grid-cols-3 gap-4 text-center divide-x divide-border">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Gross Value</p>
                            <p className="text-lg font-bold text-foreground">{formatCurrency(tabTotal)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Net Zakatable</p>
                            <p className="text-lg font-bold text-foreground">{formatCurrency(tabNetZakatable)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Zakat Due (2.5%)</p>
                            <p className="text-lg font-bold text-primary">{formatCurrency(tabZakatDue)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset list for active tab */}
            <div className="space-y-4">
                {filteredAssets.map((asset) => {
                    const Icon = typeIcons[asset.type] || DollarSign;
                    const assetZakat = asset.netZakatableValue > 0 ? asset.netZakatableValue * 0.025 : 0;
                    return (
                        <div
                            key={asset.id}
                            className="group rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5 hover:border-primary/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientMap[asset.type] || 'from-gray-400 to-gray-600'} flex items-center justify-center shadow-lg flex-shrink-0`}
                                >
                                    <Icon size={20} className="text-white drop-shadow-sm" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className="text-base font-semibold text-foreground truncate tracking-tight">{asset.name}</p>
                                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground font-medium border border-border">
                                            {typeLabels[asset.type]}
                                        </span>
                                        {asset.isETF && (
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-xs text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">ETF</span>
                                        )}
                                        {asset.weightGrams && !asset.isETF && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                                                {asset.weightGrams.toFixed(2)}g
                                                {asset.goldPurity && asset.goldPurity < 24 ? ` · ${asset.goldPurity}K` : ''}
                                            </span>
                                        )}
                                        {asset.currency !== settings.baseCurrency && (
                                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-xs text-indigo-600 dark:text-indigo-400 font-medium border border-indigo-500/20">{asset.currency}</span>
                                        )}
                                        {asset.isJewelry && (
                                            <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-xs text-pink-600 dark:text-pink-400 font-medium border border-pink-500/20">Jewelry</span>
                                        )}
                                        {asset.retirementType === 'Mandatory' && (
                                            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-xs text-orange-600 dark:text-orange-400 font-medium border border-orange-500/20">Mandatory (exempt)</span>
                                        )}
                                        {asset.cryptoIntent === 'Platform_Token' && (
                                            <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-xs text-violet-600 dark:text-violet-400 font-medium border border-violet-500/20">Platform Token (exempt)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                        <span className="font-medium text-foreground">{settings.baseCurrency} {((asset as any)._computedGross || asset.grossValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        {assetZakat > 0 && (
                                            <span className="text-primary font-medium">Zakat: {formatCurrency(assetZakat)}</span>
                                        )}
                                        {asset.valuationPercent < 100 && <span>{asset.valuationPercent}% zakatable</span>}
                                        {asset.stockHoldingType === 'Long_Term' && <span>Long-term ({asset.zakatableAssetPercent ?? 40}%)</span>}
                                        {asset.debtStrength && <span>{asset.debtStrength} debt</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => openEditModal(asset)}
                                        className="p-2.5 rounded-lg text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(asset.id)}
                                        className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty state */}
            {filteredAssets.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <activeTabConfig.icon size={28} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No {activeTab.toLowerCase()} assets for {selectedYear}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        {activeTab === 'Money' && 'Add cash, bank accounts, or debts owed to you.'}
                        {activeTab === 'Stocks' && 'Add stocks, cryptocurrency, retirement accounts, or merchandise.'}
                        {activeTab === 'Gold & Silver' && 'Add physical gold, silver, or precious metal ETFs.'}
                    </p>
                </div>
            )}

            {/* Zakat breakdown by section */}
            {yearAssets.length > 0 && (
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="text-sm font-medium text-muted-foreground tracking-wide mb-5">
                        Zakat Breakdown by Section
                    </h3>
                    <div className="space-y-4">
                        {tabBreakdown.filter((t) => t.gross > 0).map((t) => (
                            <div key={t.key} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <t.icon size={18} className="text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Gross {formatCurrency(t.gross)} → <span className="font-medium text-foreground">Net {formatCurrency(t.net)}</span>
                                    </p>
                                </div>
                                <p className="text-base font-bold text-primary">{formatCurrency(t.zakat)}</p>
                            </div>
                        ))}
                        <div className="border-t border-border/50 pt-4 mt-4 flex items-center justify-between">
                            <p className="text-sm font-semibold text-muted-foreground">Total Zakat on Assets</p>
                            <p className="text-xl font-black text-primary">
                                {formatCurrency(tabBreakdown.reduce((s, t) => s + t.zakat, 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Overall summary */}
            {yearAssets.length > 0 && (
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                    <div className="grid grid-cols-3 gap-4 text-center divide-x divide-border">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Gross Assets</p>
                            <p className="text-xl font-bold text-foreground">{formatCurrency(dashboard.totalGrossAssets)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Deductions</p>
                            <p className="text-xl font-bold text-destructive">{formatCurrency(dashboard.totalDeductions)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Net Zakatable</p>
                            <p className="text-xl font-bold text-primary">{formatCurrency(dashboard.totalNetZakatableAssets)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Add / Edit Form Modal ───────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingAsset(null); }} />
                    <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-card border border-border shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-foreground">
                                {editingAsset ? 'Edit Asset' : `Add ${activeTab} Asset`}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingAsset(null); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Type — only show types for current tab */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {activeTabConfig.types.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => { setNewType(t); setIsETF(false); setWeightInput(''); }}
                                            className={`px-2 py-2.5 rounded-lg text-xs font-semibold transition-all border ${newType === t
                                                ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                                                : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
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
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
                                                <label className="block text-xs text-muted-foreground mb-2">Currency</label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {CURRENCIES.map((cur) => (
                                                        <button key={cur} type="button" onClick={() => setNewCurrency(cur)}
                                                            className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${newCurrency === cur
                                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                                        >{cur}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-muted-foreground mb-2">ETF Value ({newCurrency})</label>
                                                <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-xs text-muted-foreground mb-2">Weight Unit</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {WEIGHT_UNITS.map((u) => (
                                                        <button key={u.value} type="button" onClick={() => setWeightUnit(u.value)}
                                                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${weightUnit === u.value
                                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                                        >{u.label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-muted-foreground mb-2">
                                                    Weight ({WEIGHT_UNITS.find((u) => u.value === weightUnit)?.label || weightUnit})
                                                </label>
                                                <input type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
                                                />
                                                {weightInput && (
                                                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                                        = {(Number(weightInput) * (WEIGHT_UNITS.find((u) => u.value === weightUnit)?.toGrams ?? 1)).toFixed(2)} grams
                                                    </p>
                                                )}
                                            </div>
                                            {newType === 'Gold' && (
                                                <div>
                                                    <label className="block text-xs text-muted-foreground mb-2">Purity</label>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {GOLD_PURITIES.map((p) => (
                                                            <button key={p.value} type="button" onClick={() => setGoldPurity(p.value)}
                                                                className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${goldPurity === p.value
                                                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                    : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                                            >{p.label}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {computedValue !== null && (
                                                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4 mt-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Scale size={14} className="text-amber-600 dark:text-amber-400" />
                                                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Live Value</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-foreground">
                                                        ${computedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
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
                                        <label className="text-xs font-medium text-muted-foreground">
                                            This is jewelry
                                            {settings.madhab !== 'Hanafi' && ' (exempt for your madhab)'}
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* ═══ NON GOLD/SILVER: Currency + Value ═══ */}
                            {(!['Gold', 'Silver'].includes(newType) || (['Gold', 'Silver'].includes(newType) && isETF)) && (
                                <>
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-2 font-medium">Currency</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {CURRENCIES.map((cur) => (
                                                <button key={cur} type="button" onClick={() => setNewCurrency(cur)}
                                                    className={`px-2 py-2 rounded-xl text-[10px] font-semibold transition-all ${newCurrency === cur
                                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                                                        : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                                >{cur}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-2 font-medium">Value ({newCurrency})</label>
                                        <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="0"
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all shadow-sm"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Stock-specific — Zoya methodology */}
                            {newType === 'Stock' && (
                                <div className="space-y-4">
                                    <label className="block text-xs text-muted-foreground font-medium">Holding Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => { setStockHoldingType('Short_Term'); setZakatMethod('Market'); }}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${stockHoldingType === 'Short_Term'
                                                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                        >Active (&lt;1 year)</button>
                                        <button type="button" onClick={() => setStockHoldingType('Long_Term')}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${stockHoldingType === 'Long_Term'
                                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                        >Passive (&gt;1 year)</button>
                                    </div>

                                    {stockHoldingType === 'Short_Term' && (
                                        <p className="text-[10px] text-orange-300/60 bg-orange-500/5 p-2 rounded-lg">
                                            Active holdings are treated like cash. <strong>Full market value × 2.5%</strong> is your Zakat.
                                        </p>
                                    )}

                                    {stockHoldingType === 'Long_Term' && (
                                        <>
                                            <label className="block text-xs text-muted-foreground mt-2 font-medium">Zakat Calculation Method</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {([
                                                    { val: 'Manual' as ZakatMethod, label: 'Manual %', desc: 'Enter exact current assets ratio' },
                                                    { val: 'Passive_Proxy' as ZakatMethod, label: 'Proxy 30%', desc: 'Scholar-approved approximation' },
                                                    { val: 'Commodity_ETF' as ZakatMethod, label: 'Commodity ETF', desc: '100% of market value' },
                                                ]).map((m) => (
                                                    <button key={m.val} type="button"
                                                        onClick={() => setZakatMethod(m.val)}
                                                        className={`p-2 rounded-xl text-center transition-all ${
                                                            zakatMethod === m.val
                                                                ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'
                                                        }`}
                                                    >
                                                        <p className="text-[10px] font-semibold">{m.label}</p>
                                                        <p className={`text-[8px] mt-0.5 ${zakatMethod === m.val ? 'text-violet-600/70 dark:text-violet-400/70' : 'text-muted-foreground'}`}>{m.desc}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {zakatMethod === 'Manual' && (
                                                <div>
                                                    <label className="block text-xs text-muted-foreground mb-2 font-medium">Zakatable Current Assets %</label>
                                                    <input type="number" value={zakatableAssetPercent}
                                                        onChange={(e) => setZakatableAssetPercent(e.target.value)} placeholder="40"
                                                        className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all shadow-sm"
                                                    />
                                                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                                        Current Assets × (Shares Owned / Outstanding) × 2.5%
                                                    </p>
                                                </div>
                                            )}
                                            {zakatMethod === 'Passive_Proxy' && (
                                                <p className="text-[10px] text-violet-300/60 bg-violet-500/5 p-2 rounded-lg">
                                                    Scholar-approved: <strong>30% of market value</strong> used as proxy for current assets when data is unavailable.
                                                </p>
                                            )}
                                            {zakatMethod === 'Commodity_ETF' && (
                                                <p className="text-[10px] text-amber-300/60 bg-amber-500/5 p-2 rounded-lg">
                                                    Commodity ETFs hold physical goods. <strong>100% of market value</strong> is zakatable.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Retirement-specific */}
                            {newType === 'Retirement' && (
                                <div className="space-y-4">
                                    <label className="block text-xs text-muted-foreground font-medium">Retirement Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setRetirementType('Mandatory')}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${retirementType === 'Mandatory'
                                                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                        >Mandatory (pension)</button>
                                        <button type="button" onClick={() => setRetirementType('Voluntary')}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${retirementType === 'Voluntary'
                                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                        >Voluntary (401k/IRA)</button>
                                    </div>
                                    {retirementType === 'Mandatory' && (
                                        <p className="text-[10px] text-orange-300/60 bg-orange-500/5 p-2 rounded-lg">
                                            Per the ruling: mandatory retirement funds are <strong>not zakatable</strong> until received by the employee.
                                        </p>
                                    )}
                                    {retirementType === 'Voluntary' && (
                                        <>
                                            {/* Account Type */}
                                            <label className="block text-xs text-muted-foreground font-medium mt-2">Account Type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {([
                                                    { val: 'Taxable_401k' as RetirementAccountType, label: '401(k) / IRA', tag: 'Taxable' },
                                                    { val: 'Taxable_RRSP' as RetirementAccountType, label: 'RRSP (Canada)', tag: 'Taxable' },
                                                    { val: 'NonTaxable_Roth' as RetirementAccountType, label: 'Roth IRA', tag: 'Tax-Free' },
                                                    { val: 'NonTaxable_TFSA' as RetirementAccountType, label: 'TFSA (Canada)', tag: 'Tax-Free' },
                                                    { val: 'NonTaxable_Brokerage' as RetirementAccountType, label: 'Brokerage', tag: 'Tax-Free' },
                                                ]).map((a) => (
                                                    <button key={a.val} type="button"
                                                        onClick={() => setRetirementAccountType(a.val)}
                                                        className={`p-2 rounded-xl text-left transition-all ${
                                                            retirementAccountType === a.val
                                                                ? a.val.startsWith('Taxable')
                                                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 shadow-sm'
                                                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-sm'
                                                                : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'
                                                        }`}
                                                    >
                                                        <p className="text-[10px] font-semibold">{a.label}</p>
                                                        <p className={`text-[8px] mt-0.5 font-medium ${a.val.startsWith('Taxable') ? 'text-red-600/70 dark:text-red-400/70' : 'text-emerald-600/70 dark:text-emerald-400/70'}`}>{a.tag}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Tax Preview for taxable accounts */}
                                            {retirementAccountType?.startsWith('Taxable') && (
                                                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 space-y-1">
                                                    <p className="text-[10px] font-medium text-red-400/80">Tax Deduction Preview</p>
                                                    {(() => {
                                                        const gross = Number(newValue) || 0;
                                                        const result = calculateRetirementNetAccessible(
                                                            gross,
                                                            settings.incomeLevel ?? 75000,
                                                            settings.stateProvince,
                                                            settings.isUnderRetirementAge !== false,
                                                            retirementAccountType
                                                        );
                                                        return (
                                                            <>
                                                                <div className="flex justify-between text-[10px]">
                                                                    <span className="text-white/30">Early withdrawal penalty</span>
                                                                    <span className="text-red-400/70">{(result.penalty * 100).toFixed(0)}%</span>
                                                                </div>
                                                                <div className="flex justify-between text-[10px]">
                                                                    <span className="text-white/30">Est. marginal tax</span>
                                                                    <span className="text-red-400/70">{(result.taxRate * 100).toFixed(1)}%</span>
                                                                </div>
                                                                <div className="flex justify-between text-[10px] font-semibold pt-1 border-t border-white/[0.06]">
                                                                    <span className="text-white/50">Net accessible</span>
                                                                    <span className="text-white/70">{formatCurrency(result.netAccessible)}</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    <p className="text-[8px] text-white/15 mt-1">Configure income & state in Settings</p>
                                                </div>
                                            )}

                                            {retirementAccountType && !retirementAccountType.startsWith('Taxable') && (
                                                <p className="text-[10px] text-emerald-300/60 bg-emerald-500/5 p-2 rounded-lg">
                                                    Tax-free account — full value is zakatable with no penalty deductions.
                                                </p>
                                            )}

                                            <div className="mt-4">
                                                <label className="block text-xs text-muted-foreground mb-2 font-medium">Zakatable Assets %</label>
                                                <input type="number" value={zakatableAssetPercent} onChange={(e) => setZakatableAssetPercent(e.target.value)} placeholder="40"
                                                    className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-sm"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Crypto intent */}
                            {newType === 'Crypto' && (
                                <div className="space-y-3">
                                    <label className="block text-xs text-muted-foreground font-medium">Intent</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Currency', 'Resale', 'Platform_Token'] as CryptoIntent[]).map((i) => (
                                            <button key={i} type="button" onClick={() => setCryptoIntent(i)}
                                                className={`px-2 py-2 rounded-xl text-[10px] font-semibold transition-all ${cryptoIntent === i
                                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                    : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
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
                                    <label className="block text-xs text-muted-foreground font-medium">Debt Strength</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Strong', 'Intermediate', 'Weak'] as const).map((s) => (
                                            <button key={s} type="button" onClick={() => setDebtStrength(s)}
                                                className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all ${debtStrength === s
                                                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                                                    : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'}`}
                                            >{s}</button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {debtStrength === 'Strong' && 'Debt for merchandise or loaned cash — zakatable immediately.'}
                                        {debtStrength === 'Intermediate' && 'Debt for non-trade goods — zakatable only after received.'}
                                        {debtStrength === 'Weak' && 'Inheritance, mahr, wages not yet received — zakatable only after received.'}
                                    </p>
                                </div>
                            )}

                            {/* Valuation % */}
                            {!isGoldSilver && newType !== 'Retirement' && newType !== 'Crypto' && newType !== 'Debt_Receivable' && (
                                <div className="mt-4">
                                    <label className="block text-xs text-muted-foreground font-medium mb-2">Zakatable % (default 100%)</label>
                                    <input type="number" value={newValuation} onChange={(e) => setNewValuation(e.target.value)} placeholder="100"
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all shadow-sm"
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
