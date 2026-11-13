'use client';

import { useMemo, useRef, useState } from 'react';
import { useZakatStore } from '@/lib/store';
import type { AssetType, LiabilityType } from '@/lib/types';
import {
    draftsFromParsed,
    draftToAsset,
    draftToHistory,
    draftToLiability,
    holdingDraft,
    balanceDraft,
    parseImportFile,
    parseStatementText,
    type DraftContext,
    type DraftRow,
    type ImportKind,
} from '@/lib/import';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Image as ImageIcon, Lock, Upload } from 'lucide-react';

const ASSET_LABELS: Record<AssetType, string> = {
    Cash: 'Cash', Bank: 'Bank account', Stock: 'Stocks', Crypto: 'Crypto', Retirement: 'Retirement',
    Gold: 'Gold', Silver: 'Silver', Merchandise: 'Merchandise', Debt_Receivable: 'Money owed to you',
};
const LIABILITY_LABELS: Record<LiabilityType, string> = {
    Mortgage: 'Mortgage', Utility_Bills: 'Bills', Medical_Bills: 'Medical bills', Credit_Balance: 'Credit card',
    Personal_Loan: 'Loan', Student_Loan: 'Student loan', Commercial_Loan: 'Business loan', Dowry: 'Mahr',
    Salary_Service_Fee: 'Wages owed', Other: 'Other debt',
};
const KIND_LABELS: Record<ImportKind, string> = {
    holdings: 'Brokerage holdings',
    balances: 'Account balances or a net-worth / Zakat sheet',
    zakat_years: 'Past Zakat years',
};

const TEMPLATES: Record<ImportKind, string> = {
    holdings: 'Account,Symbol,Exchange,Quantity,Market value,Currency\nRRSP,VFV,TSX,12.5,1820.40,CAD\nBrokerage,AAPL,NASDAQ,3,630.00,USD\n',
    balances: 'Account,Type,Balance,Currency\nTD Chequing,Bank,4210.55,CAD\nGold jewellery,Gold,8000,CAD\nVisa,Credit card,-420.10,CAD\n',
    zakat_years: 'Year,Total assets,Total liabilities,Nisab,Zakat due,Zakat paid,Notes\n2024,90000,5000,7500,2125,2125,Local masjid\n',
};

type Status =
    | { step: 'pick' }
    | { step: 'reading'; message: string }
    | { step: 'review'; source: string; kind: ImportKind | 'screenshot'; warnings: string[]; skipped: number }
    | { step: 'saving'; done: number; total: number }
    | { step: 'done'; added: number; failed: number };

export default function ImportPage() {
    const { selectedYear, settings, assets, liabilities, history, addAsset, addLiability } = useZakatStore();
    const [status, setStatus] = useState<Status>({ step: 'pick' });
    const [drafts, setDrafts] = useState<DraftRow[]>([]);
    const [zakatYear, setZakatYear] = useState(selectedYear);
    const [error, setError] = useState<string | null>(null);
    const fileText = useRef<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const ctx = (): DraftContext => ({
        zakatYear,
        baseCurrency: settings.baseCurrency || 'USD',
        existingAssets: assets,
        existingLiabilities: liabilities,
        existingHistory: history,
    });

    const readCsv = (text: string, name: string, kind?: ImportKind) => {
        const parsed = parseImportFile(text, kind);
        if ('error' in parsed) { setError(parsed.error); setStatus({ step: 'pick' }); return; }
        setDrafts(draftsFromParsed(parsed, ctx()));
        setStatus({ step: 'review', source: name, kind: parsed.kind, warnings: parsed.warnings, skipped: parsed.skipped.length });
    };

    const onFile = async (file: File) => {
        setError(null);
        if (file.type.startsWith('image/')) {
            setStatus({ step: 'reading', message: 'Loading the on-device reader…' });
            try {
                const { readImageText } = await import('@/lib/import/ocr');
                const text = await readImageText(file, (p) =>
                    setStatus({ step: 'reading', message: `${p.status} ${Math.round(p.progress * 100)}%` }));
                const s = parseStatementText(text);
                const c = ctx();
                const rows: DraftRow[] = [...s.holdings.map((h) => holdingDraft(h, c)), ...s.balances.map((b) => balanceDraft(b, c))];
                rows.forEach((r) => { if (r.target !== 'history') r.notes.unshift('Read from a screenshot; check the amount.'); });
                if (rows.length === 0) {
                    setError('No amounts could be read from that screenshot. Try a sharper one, or a CSV export.');
                    setStatus({ step: 'pick' });
                    return;
                }
                setDrafts(rows);
                setStatus({
                    step: 'review', source: file.name, kind: 'screenshot', skipped: 0,
                    warnings: s.unread.length ? [`${s.unread.length} lines had no amount and were left out.`] : [],
                });
            } catch (e) {
                console.error(e);
                setError('The screenshot reader could not start. Check your connection the first time you use it, then try again.');
                setStatus({ step: 'pick' });
            }
            return;
        }
        const text = await file.text();
        fileText.current = text;
        readCsv(text, file.name);
    };

    const update = (key: string, patch: Partial<DraftRow>) =>
        setDrafts((ds) => ds.map((d) => (d.key === key ? ({ ...d, ...patch } as DraftRow) : d)));

    const changeType = (d: DraftRow, value: string) => {
        if (d.target === 'history') return;
        const [side, type] = value.split(':');
        const common = { key: d.key, include: d.include, label: d.label, duplicateOf: d.duplicateOf, notes: d.notes, value: d.value, currency: d.currency, confident: true };
        const next: DraftRow = side === 'liability'
            ? { ...common, target: 'liability', type: type as LiabilityType }
            : { ...common, target: 'asset', type: type as AssetType, ticker: d.target === 'asset' ? d.ticker : undefined, quantity: d.target === 'asset' ? d.quantity : undefined };
        setDrafts((ds) => ds.map((x) => (x.key === d.key ? next : x)));
    };

    const selected = useMemo(() => drafts.filter((d) => d.include), [drafts]);
    const missingValue = selected.some((d) => d.target !== 'history' && !(d.value > 0));

    const save = async () => {
        const store = useZakatStore.getState();
        const headers = { 'Content-Type': 'application/json', 'x-spreadsheet-id': store.spreadsheetId || '' };
        let done = 0, failed = 0;
        setStatus({ step: 'saving', done, total: selected.length });
        // One at a time, so rows land in the Sheet in order and a failure is visible.
        for (const d of selected) {
            try {
                if (d.target === 'asset') {
                    const asset = draftToAsset(d, zakatYear);
                    const res = await fetch('/api/sheets/assets', { method: 'POST', headers, body: JSON.stringify(asset) });
                    if (!res.ok) throw new Error(await res.text());
                    addAsset(asset);
                } else if (d.target === 'liability') {
                    const liability = draftToLiability(d, zakatYear);
                    const res = await fetch('/api/sheets/liabilities', { method: 'POST', headers, body: JSON.stringify(liability) });
                    if (!res.ok) throw new Error(await res.text());
                    addLiability(liability);
                } else {
                    const entry = draftToHistory(d);
                    const res = await fetch('/api/sheets/history', { method: 'POST', headers, body: JSON.stringify(entry) });
                    if (!res.ok) throw new Error(await res.text());
                    useZakatStore.getState().setHistory([...useZakatStore.getState().history, entry]);
                }
                done++;
            } catch (e) {
                console.error('Import row failed', d.label, e);
                failed++;
            }
            setStatus({ step: 'saving', done: done + failed, total: selected.length });
        }
        setStatus({ step: 'done', added: done, failed });
    };

    const downloadTemplate = (kind: ImportKind) => {
        const blob = new Blob([TEMPLATES[kind]], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `zakatflow-${kind.replace('_', '-')}-template.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const reset = () => { setDrafts([]); setError(null); fileText.current = null; setStatus({ step: 'pick' }); };

    const years = Array.from(new Set([selectedYear, String(new Date().getFullYear()), String(new Date().getFullYear() - 1)])).sort().reverse();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Import</h1>
                <p className="text-sm font-medium text-muted-foreground">
                    Bring in holdings, account balances or past Zakat years from a CSV export, a spreadsheet or a screenshot.
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <Lock size={12} /> Files and screenshots are read in your browser. Nothing is saved until you add rows to your Sheet.
                </p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300 flex gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {status.step === 'pick' && (
                <>
                    <button
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
                        className="w-full rounded-xl border-2 border-dashed border-border bg-card p-10 text-center hover:border-emerald-500 transition-colors"
                    >
                        <Upload className="mx-auto mb-3 text-muted-foreground" size={28} />
                        <p className="font-semibold text-foreground">Drop a file or screenshot, or click to choose</p>
                        <p className="text-xs text-muted-foreground mt-1">CSV or TSV from your broker, bank, finance app or old Zakat sheet · PNG or JPG screenshot</p>
                    </button>
                    <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,text/csv,image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(Object.keys(KIND_LABELS) as ImportKind[]).map((k) => (
                            <div key={k} className="rounded-xl border border-border bg-card p-4">
                                <FileSpreadsheet size={16} className="text-muted-foreground mb-2" />
                                <p className="text-sm font-semibold text-foreground">{KIND_LABELS[k]}</p>
                                <button onClick={() => downloadTemplate(k)} className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline">
                                    <Download size={12} /> Download a template
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Moving from another app? Export its accounts, balances or holdings as CSV and drop the file here. Column names are matched for you, and you review every row before it is saved.
                    </p>
                </>
            )}

            {status.step === 'reading' && (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <ImageIcon className="mx-auto mb-3 text-muted-foreground" size={24} />
                    <p className="text-sm text-foreground">Reading your screenshot on this device…</p>
                    <p className="text-xs text-muted-foreground mt-1">{status.message}</p>
                </div>
            )}

            {status.step === 'review' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
                        <div>
                            <p className="text-xs text-muted-foreground">File</p>
                            <p className="text-sm font-medium text-foreground">{status.source}</p>
                        </div>
                        <label className="text-xs text-muted-foreground">
                            What it holds
                            <select
                                className="block mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                                value={status.kind}
                                disabled={status.kind === 'screenshot'}
                                onChange={(e) => fileText.current && readCsv(fileText.current, status.source, e.target.value as ImportKind)}
                            >
                                {status.kind === 'screenshot' && <option value="screenshot">Screenshot</option>}
                                {(Object.keys(KIND_LABELS) as ImportKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                            </select>
                        </label>
                        {status.kind !== 'zakat_years' && (
                            <label className="text-xs text-muted-foreground">
                                Add to Zakat year
                                <select className="block mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                                    value={zakatYear} onChange={(e) => setZakatYear(e.target.value)}>
                                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </label>
                        )}
                        <button onClick={reset} className="ml-auto text-sm text-muted-foreground hover:text-foreground">Choose another file</button>
                    </div>

                    {(status.warnings.length > 0 || status.skipped > 0) && (
                        <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                            {status.warnings.map((w) => <p key={w}>{w}</p>)}
                            {status.skipped > 0 && <p>{status.skipped} rows were left out (totals, cash lines or rows without a value).</p>}
                        </div>
                    )}

                    <div className="rounded-xl border border-border bg-card overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="p-3 w-8"></th>
                                    <th className="p-3 text-left">Name</th>
                                    <th className="p-3 text-left">{status.kind === 'zakat_years' ? 'Year' : 'Type'}</th>
                                    <th className="p-3 text-right">{status.kind === 'zakat_years' ? 'Zakat paid' : 'Value'}</th>
                                    <th className="p-3 text-left">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drafts.map((d) => (
                                    <tr key={d.key} className={`border-b border-border last:border-0 ${d.include ? '' : 'opacity-50'}`}>
                                        <td className="p-3">
                                            <input type="checkbox" checked={d.include} onChange={(e) => update(d.key, { include: e.target.checked })} />
                                        </td>
                                        <td className="p-3">
                                            <input className="w-full bg-transparent text-foreground" value={d.label}
                                                onChange={(e) => update(d.key, { label: e.target.value })} />
                                            {d.duplicateOf && <span className="text-[10px] text-muted-foreground">Already in your Sheet</span>}
                                        </td>
                                        <td className="p-3">
                                            {d.target === 'history' ? (
                                                <span className="text-foreground">{d.year}</span>
                                            ) : (
                                                <select
                                                    className={`rounded-md border bg-background px-2 py-1 text-sm text-foreground ${d.confident ? 'border-border' : 'border-amber-500'}`}
                                                    value={`${d.target}:${d.type}`}
                                                    onChange={(e) => changeType(d, e.target.value)}
                                                >
                                                    <optgroup label="Assets">
                                                        {(Object.keys(ASSET_LABELS) as AssetType[]).map((t) => <option key={t} value={`asset:${t}`}>{ASSET_LABELS[t]}</option>)}
                                                    </optgroup>
                                                    <optgroup label="Debts">
                                                        {(Object.keys(LIABILITY_LABELS) as LiabilityType[]).map((t) => <option key={t} value={`liability:${t}`}>{LIABILITY_LABELS[t]}</option>)}
                                                    </optgroup>
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {d.target === 'history' ? (
                                                <span className="text-foreground">{(d.zakatPaid ?? d.zakatDue ?? 0).toLocaleString()}</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1">
                                                    <input type="number" step="0.01" className="w-28 text-right rounded-md border border-border bg-background px-2 py-1 text-foreground"
                                                        value={d.value} onChange={(e) => update(d.key, { value: Number(e.target.value) })} />
                                                    <span className="text-xs text-muted-foreground">{d.currency}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground">{d.notes.join(' ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Stocks are added with the 30% estimate; switch each to the filings method on the Assets page.
                        </p>
                        <button
                            disabled={selected.length === 0 || missingValue}
                            onClick={save}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add {selected.length} to my Sheet
                        </button>
                    </div>
                    {missingValue && <p className="text-xs text-amber-700 dark:text-amber-400 text-right">Enter a value for every ticked row first.</p>}
                </div>
            )}

            {status.step === 'saving' && (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-foreground">
                    Adding to your Sheet… {status.done} of {status.total}
                </div>
            )}

            {status.step === 'done' && (
                <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
                    <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
                    <p className="text-sm text-foreground">Added {status.added} {status.added === 1 ? 'row' : 'rows'} to your Sheet.</p>
                    {status.failed > 0 && <p className="text-xs text-red-600">{status.failed} could not be saved; they are listed in the browser console.</p>}
                    <button onClick={reset} className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">Import another file</button>
                </div>
            )}
        </div>
    );
}
