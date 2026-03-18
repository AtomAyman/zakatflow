import { NextResponse } from 'next/server';

/**
 * POST /api/email/remind
 * Sends Zakat anniversary reminders via Resend.
 *
 * Body: {
 *   to: string             // recipient email
 *   type: '30day' | '7day' | 'dayof' | 'receipt'
 *   data: {
 *     name?: string
 *     anniversaryDate?: string
 *     zakatDue?: number
 *     currency?: string
 *     donations?: { date: string; amount: number; recipient: string }[]
 *   }
 * }
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'NisabFlow <noreply@nisabflow.app>';

const subjects: Record<string, string> = {
    '30day': '🕌 30 Days Until Your Zakat Anniversary',
    '7day': '⏰ 7 Days Until Your Zakat Anniversary',
    dayof: '🌙 Today is Your Zakat Anniversary',
    receipt: '✅ Zakat Payment Confirmation',
};

function buildHtml(type: string, data: Record<string, unknown>): string {
    const name = (data.name as string) || 'there';
    const currency = (data.currency as string) || 'USD';

    const formatMoney = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(n);

    const base = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0a0a14; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; color: white; letter-spacing: -0.5px;">NisabFlow</h1>
        <p style="margin: 8px 0 0; font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px;">The private, precise Zakat dashboard.</p>
      </div>
      <div style="padding: 32px;">`;

    const footer = `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="font-size: 10px; color: rgba(255,255,255,0.2);">
            You're receiving this because you have a NisabFlow account. 
            <br/>Manage reminders in Settings.
          </p>
        </div>
      </div>
    </div>`;

    if (type === 'receipt') {
        const donations = (data.donations as Array<{ date: string; amount: number; recipient: string }>) || [];
        const total = donations.reduce((s, d) => s + d.amount, 0);
        const rows = donations
            .map(
                (d) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; color: rgba(255,255,255,0.5);">${d.date}</td>
            <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; color: rgba(255,255,255,0.5);">${d.recipient}</td>
            <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; color: #10b981; text-align: right;">${formatMoney(d.amount)}</td>
          </tr>`
            )
            .join('');

        return `${base}
        <h2 style="margin: 0 0 8px; font-size: 18px; color: white;">Assalamu Alaikum ${name},</h2>
        <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6;">
          Your Zakat payments have been recorded. May Allah accept your purification.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <thead>
            <tr>
              <th style="padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.25); border-bottom: 1px solid rgba(255,255,255,0.08);">Date</th>
              <th style="padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.25); border-bottom: 1px solid rgba(255,255,255,0.08);">Recipient</th>
              <th style="padding: 8px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.25); border-bottom: 1px solid rgba(255,255,255,0.08);">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 8px; font-size: 14px; font-weight: 600; color: white;">Total</td>
              <td style="padding: 12px 8px; font-size: 14px; font-weight: 600; color: #10b981; text-align: right;">${formatMoney(total)}</td>
            </tr>
          </tfoot>
        </table>
        ${footer}`;
    }

    // Reminder emails (30day / 7day / dayof)
    const zakatDue = formatMoney((data.zakatDue as number) || 0);
    const daysLabel =
        type === '30day' ? '30 days' : type === '7day' ? '7 days' : 'today';
    const urgencyColor =
        type === 'dayof' ? '#f59e0b' : type === '7day' ? '#f97316' : '#10b981';

    return `${base}
      <h2 style="margin: 0 0 8px; font-size: 18px; color: white;">Assalamu Alaikum ${name},</h2>
      <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6;">
        Your Zakat anniversary is <strong style="color: ${urgencyColor};">${daysLabel}</strong> away${data.anniversaryDate ? ` (${data.anniversaryDate})` : ''}.
      </p>
      <div style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.15); border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(16,185,129,0.5);">Estimated Zakat Due</p>
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #10b981;">${zakatDue}</p>
      </div>
      <p style="color: rgba(255,255,255,0.3); font-size: 13px; line-height: 1.6;">
        Review your assets and make any final updates on your <a href="https://nisabflow.app/dashboard" style="color: #10b981;">NisabFlow Dashboard</a>.
      </p>
      ${footer}`;
}

export async function POST(request: Request) {
    if (!RESEND_API_KEY) {
        return NextResponse.json(
            { error: 'Resend API key not configured. Add RESEND_API_KEY to .env' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { to, type, data } = body;

        if (!to || !type || !subjects[type]) {
            return NextResponse.json(
                { error: 'Missing required fields: to, type' },
                { status: 400 }
            );
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [to],
                subject: subjects[type],
                html: buildHtml(type, data || {}),
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: err }, { status: res.status });
        }

        const result = await res.json();
        return NextResponse.json({ success: true, id: result.id });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
