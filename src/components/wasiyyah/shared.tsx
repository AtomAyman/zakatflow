'use client';

import { type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { CURRENCIES } from '@/lib/types';
import { fracToString, type Fraction } from '@/lib/faraid-engine';

export const inputClass =
    'w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all';

export const newId = () => uuid();

export function useMoney(currency: string) {
    const fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 0,
    });
    return (n: number) => fmt.format(Number.isFinite(n) ? n : 0);
}

export const madhabLabel = (m: string) => (m === 'Shafi' ? "Shafi'i" : m);

export const pct = (x: number) => `${(x * 100).toFixed(x * 100 < 10 ? 2 : 1)}%`;
export const fracLabel = (f: Fraction) => fracToString(f);

export function Section({
    title,
    description,
    icon: Icon,
    action,
    children,
}: {
    title: string;
    description?: ReactNode;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div className="flex items-start gap-3 min-w-0">
                    {Icon && (
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon size={18} className="text-emerald-600 dark:text-emerald-500" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-foreground">{title}</h2>
                        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
            {children}
        </label>
    );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function NumberInput({
    value,
    onChange,
    ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    value: number;
    onChange: (n: number) => void;
}) {
    return (
        <input
            type="number"
            inputMode="decimal"
            min={0}
            {...rest}
            value={value === 0 ? '' : value}
            placeholder={rest.placeholder ?? '0'}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            className={`${inputClass} ${rest.className ?? ''}`}
        />
    );
}

export function Select<T extends string>({
    value,
    onChange,
    options,
    className = '',
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string; disabled?: boolean }[] | { label: string; options: { value: T; label: string; disabled?: boolean }[] }[];
    className?: string;
}) {
    const grouped = options.length > 0 && 'options' in options[0];
    return (
        <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`${inputClass} ${className}`}>
            {grouped
                ? (options as { label: string; options: { value: T; label: string; disabled?: boolean }[] }[]).map((g) => (
                    <optgroup key={g.label} label={g.label}>
                        {g.options.map((o) => (
                            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                        ))}
                    </optgroup>
                ))
                : (options as { value: T; label: string; disabled?: boolean }[]).map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                ))}
        </select>
    );
}

export function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const list = CURRENCIES.includes(value as (typeof CURRENCIES)[number]) ? [...CURRENCIES] : [value, ...CURRENCIES];
    return <Select value={value} onChange={onChange} options={list.map((c) => ({ value: c, label: c }))} />;
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
            <Plus size={15} />
            {children}
        </button>
    );
}

export function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="p-2 rounded-md text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors self-end"
        >
            <Trash2 size={15} />
        </button>
    );
}

export function EmptyRow({ children }: { children: ReactNode }) {
    return (
        <p className="rounded-lg border border-dashed border-border bg-background/50 px-4 py-6 text-center text-sm text-muted-foreground">
            {children}
        </p>
    );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
    const styles = {
        info: 'border-blue-500/20 bg-blue-500/5 text-foreground',
        warn: 'border-amber-500/30 bg-amber-500/10 text-foreground',
        danger: 'border-red-500/30 bg-red-500/10 text-foreground',
    }[tone];
    return <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${styles}`}>{children}</div>;
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: ReactNode }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer select-none">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-secondary border border-border'}`}
            >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span>
                <span className="block text-sm font-medium text-foreground">{label}</span>
                {hint && <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>}
            </span>
        </label>
    );
}

/** Generic editor for a list of simple records rendered as responsive inline rows. */
export function RowList<T extends { id: string }>({
    items,
    onChange,
    render,
    empty,
    itemLabel,
}: {
    items: T[];
    onChange: (items: T[]) => void;
    render: (item: T, set: (patch: Partial<T>) => void) => ReactNode;
    empty: ReactNode;
    itemLabel: string;
}) {
    if (items.length === 0) return <EmptyRow>{empty}</EmptyRow>;
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.id} className="flex gap-2 rounded-lg border border-border bg-background/40 p-3">
                    <div className="flex-1 min-w-0">
                        {render(item, (patch) => onChange(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i))))}
                    </div>
                    <RemoveButton label={`Remove ${itemLabel}`} onClick={() => onChange(items.filter((i) => i.id !== item.id))} />
                </div>
            ))}
        </div>
    );
}
