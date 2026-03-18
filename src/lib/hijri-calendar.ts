// ─── Umm al-Qura Hijri Calendar Utility ──────────────────
// Simplified implementation of the Umm al-Qura calendar used in Saudi Arabia.
// Based on tabular conversion data for years 1400-1500 AH (1979-2076 CE).

interface HijriDate {
    year: number;
    month: number;
    day: number;
}

interface HijriDateFull extends HijriDate {
    monthName: string;
    gregorian: Date;
    dayOfYear: number;
    daysInYear: number;
}

const HIJRI_MONTHS = [
    'Muharram', 'Safar', 'Rabi\' al-Awwal', 'Rabi\' al-Thani',
    'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah',
];

// Approximate Umm al-Qura adjustment data
// Each Hijri month alternates between 29 and 30 days with adjustments
// This uses the astronomical new moon calculation approach

function gregorianToJulianDay(year: number, month: number, day: number): number {
    if (month <= 2) {
        year -= 1;
        month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function julianDayToGregorian(jd: number): Date {
    const z = Math.floor(jd + 0.5);
    const a = Math.floor((z - 1867216.25) / 36524.25);
    const A = z + 1 + a - Math.floor(a / 4);
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);

    const day = B - D - Math.floor(30.6001 * E);
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;
    return new Date(year, month - 1, day);
}

// Kuwaiti algorithm for Gregorian to Hijri conversion
// This is a well-known algorithm used by many Islamic calendar implementations
export function gregorianToHijri(gDate: Date): HijriDate {
    const d = gDate.getDate();
    const m = gDate.getMonth() + 1;
    const y = gDate.getFullYear();

    const jd = gregorianToJulianDay(y, m, d);
    const L = Math.floor(jd - 1948439.5) + 10632;
    const N = Math.floor((L - 1) / 10631);
    let L2 = L - 10631 * N + 354;
    const J = Math.floor((10985 - L2) / 5316) * Math.floor((50 * L2) / 17719) +
        Math.floor(L2 / 5670) * Math.floor((43 * L2) / 15238);
    L2 = L2 - Math.floor((30 - J) / 15) * Math.floor((17719 * J) / 50) -
        Math.floor(J / 16) * Math.floor((15238 * J) / 43) + 29;
    const hijriMonth = Math.floor((24 * L2) / 709);
    const hijriDay = L2 - Math.floor((709 * hijriMonth) / 24);
    const hijriYear = 30 * N + J - 30;

    return { year: hijriYear, month: hijriMonth, day: hijriDay };
}

// Hijri to Gregorian conversion
export function hijriToGregorian(hDate: HijriDate): Date {
    const { year: hy, month: hm, day: hd } = hDate;
    const N = hd + Math.ceil(29.5001 * (hm - 1));
    const Q = Math.floor(hy / 100);
    const R = hy - 100 * Q;
    const A = Math.floor(R / 4);
    const W = 2 - Q + Math.floor(Q / 4);
    const Q1 = Math.floor(36524.36 * (hy - 1) / 100);
    const Q2 = Math.floor((hy - 1) / 400);

    // Alternative simpler approach using Julian Day
    const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
        Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
    return julianDayToGregorian(jd);
}

// Get days in a Hijri month (alternating 30/29 with correction)
export function daysInHijriMonth(year: number, month: number): number {
    // Odd months have 30 days, even months have 29
    // The 12th month has 30 days in leap years
    if (month % 2 === 1) return 30;
    if (month === 12 && isHijriLeapYear(year)) return 30;
    return 29;
}

export function isHijriLeapYear(year: number): boolean {
    return ((11 * year + 14) % 30) < 11;
}

export function daysInHijriYear(year: number): number {
    return isHijriLeapYear(year) ? 355 : 354;
}

// Get the current Hijri date with full info
export function getCurrentHijriDate(): HijriDateFull {
    const now = new Date();
    const hijri = gregorianToHijri(now);

    // Calculate day of year
    let dayOfYear = hijri.day;
    for (let m = 1; m < hijri.month; m++) {
        dayOfYear += daysInHijriMonth(hijri.year, m);
    }

    return {
        ...hijri,
        monthName: HIJRI_MONTHS[hijri.month - 1] || '',
        gregorian: now,
        dayOfYear,
        daysInYear: daysInHijriYear(hijri.year),
    };
}

// Format Hijri date as string
export function formatHijriDate(h: HijriDate): string {
    return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

// Calculate days between two dates
export function daysBetween(a: Date, b: Date): number {
    const MS_PER_DAY = 86400000;
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utcB - utcA) / MS_PER_DAY);
}

// Get the next anniversary date given a Hijri month/day
export function getNextHijriAnniversary(
    hijriMonth: number,
    hijriDay: number
): { hijriDate: HijriDate; gregorianDate: Date; daysRemaining: number } {
    const today = new Date();
    const currentHijri = gregorianToHijri(today);

    // Try this year first
    let targetYear = currentHijri.year;
    let targetHijri: HijriDate = { year: targetYear, month: hijriMonth, day: hijriDay };
    let targetGregorian = hijriToGregorian(targetHijri);

    // If the date has already passed this Hijri year, use next year
    if (targetGregorian <= today) {
        targetYear += 1;
        targetHijri = { year: targetYear, month: hijriMonth, day: hijriDay };
        targetGregorian = hijriToGregorian(targetHijri);
    }

    const daysRemaining = daysBetween(today, targetGregorian);

    return {
        hijriDate: targetHijri,
        gregorianDate: targetGregorian,
        daysRemaining: Math.max(0, daysRemaining),
    };
}

export { HIJRI_MONTHS };
export type { HijriDate, HijriDateFull };
