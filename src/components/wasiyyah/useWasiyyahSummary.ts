'use client';

import { useEffect, useMemo } from 'react';
import { useZakatStore } from '@/lib/store';
import { useWasiyyahStore } from '@/lib/wasiyyah-store';
import { computeWasiyyahSummary } from '@/lib/wasiyyah-summary';

/** Loads the will once the spreadsheet is known and returns the computed summary. */
export function useWasiyyahSummary() {
    const { assets, liabilities, settings, prices, spreadsheetId, getYearsWithData } = useZakatStore();
    const { data, load, isLoading, loadedFor, saveStatus, error } = useWasiyyahStore();

    useEffect(() => {
        if (spreadsheetId) load();
    }, [spreadsheetId, load]);

    const years = getYearsWithData();
    const yearsKey = years.join(',');
    const summary = useMemo(
        () => computeWasiyyahSummary({ data, assets, liabilities, years, settings, prices }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, assets, liabilities, yearsKey, settings, prices]
    );

    return { summary, data, isReady: !!loadedFor, isLoading, saveStatus, error };
}
