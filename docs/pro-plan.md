# ZakatFlow Pro: plan and account-linking decision

Status: draft for Ayman, Nov 13, 2026. Nothing here is live; no billing, no aggregator account, no secrets.

## The rule

ZakatFlow is a Zakat app, not a finance app. **Everything needed to calculate Zakat correctly is free, forever.** Pro sells time saved, never accuracy. If a feature changes the Zakat number, it is free. If it only makes getting there faster or nicer, it can be Pro.

A second test for every idea: *would a Zakat app need this, or only a budgeting app?* Anything that only a budgeting or net-worth app needs is out of scope, Pro or not.

## What was said before

- Nov 8 (build session, Ayman): "I'm also thinking we can offer the google sheets privacy focused or a lite version but then we can also do one that has the plaid integrations and stuff you can easliy link stuff ina. few taps give your opinion in it."
- The reply recommended "Lite first", with Plaid later as an opt-in "Connected" mode, likely paid. The Nov 8 Notion brief records this as a recommendation; it was never confirmed or rejected.
- Nov 8 (Ayman): "If we are providing for free our runtime costs should also be minimal to none."
- Nov 9 (Ayman) asked about connecting TurboTax or Wealthsimple; the answer was not worth it (no TurboTax API, Wealthsimple only through Plaid/SnapTrade), and he moved on.
- CSV/Excel import is already filed as app issue #10.

So nothing was decided against Plaid or a paid tier. This plan turns the old recommendation into a concrete free/Pro line.

## Free vs Pro

| Free (core, always) | Pro (convenience) |
| --- | --- |
| Every asset and liability type, all madhab settings | Linked brokerages that pull holdings automatically (aggregator cost per user) |
| Gold/silver Nisab with live prices | Emailed Hawl reminders (opt-in; we must store an email and a date) |
| Exact stock Zakat from company filings | Household: separate Zakat for spouse and children in one place |
| ETF, mutual fund and 401(k) look-through | Polished PDF Zakat statement with filing evidence |
| Tax- and penalty-aware retirement accounts (US, CA, UK) | Donation ledger with receipts and the eight recipient categories |
| Choose your scholar's method, ruling cited on each line | Year-over-year Zakat comparison |
| Hawl countdown + calendar (.ics) download | |
| Record Zakat paid against Zakat due | |
| Import holdings from a brokerage CSV, parsed in the browser | |
| Every year kept in your own Google Sheet; export everything | |

Source of truth in code: `src/lib/plan.ts`. A core feature set to Pro throws at load time.

Deliberately **free** although they could be sold: the filings engine and fund look-through (they *are* the accuracy), method choice (gating a fiqh choice behind a payment is wrong), CSV import (it is the zero-cost way to get holdings in), and history (it is the user's own data in their own Sheet).

### Out of scope (drifts into general finance)

- Daily net-worth or Nisab tracking, budgets, spending categories, bank transaction feeds.
- Investment performance, gains, rebalancing, halal screening (Zoya/Musaffa do that).
- Wasiyyah (Islamic will) is a separate product decision. It reuses the asset inventory, but it is estate planning, not Zakat. Park it until Pro exists.

## Account linking: recommendation

**Not yet.** Ship CSV import in the free tier first. Revisit linking once there are paying Pro users, and then start with SnapTrade, not Plaid.

Why:

1. **Zakat is a once-a-year snapshot.** Users need positions on one date (their Hawl date), not a live feed. Every major brokerage in Canada, the US and the UK can export a holdings CSV, which gives the same positions with no aggregator, no server and no cost.
2. **Per-stock Zakat needs positions (ticker + quantity), not balances.** Bank-only open banking (UK) and Canada's open-banking regime don't give that today. Only investment aggregators do.
3. **Every aggregator breaks "we never see your data".** The aggregator's token has to live on our server and holdings pass through it. That is acceptable as a clearly labelled opt-in, not as the default.
4. **Cost.** Linking has a real monthly cost per user, which is exactly the kind of thing that is fair to charge for, but it needs paying users first.

### Options compared (checked Nov 12, 2026, from vendor pages; prices can change)

| Provider | Positions? | Canada / US / UK | Cost for a tiny app | Notes |
| --- | --- | --- | --- | --- |
| **CSV import** (built) | Yes | All three | $0 | Parsed in the browser; nothing leaves the device. |
| **SnapTrade** | Yes | Wealthsimple, Questrade, Trading 212, Fidelity, IBKR, Robinhood and others (45+ brokerages) | Free for development (5 connections); Launch plan $100/month + $1–2 per connected user/month | Brokerage-focused, fits Zakat best. Best first linked provider. |
| **Plaid Investments** | Yes (ticker, quantity, cost basis) | US + Canada only; UK/EU is sales-only | Pay-as-you-go with no minimum, but prices shown only after a Production application; free Trial of 10 Items | Monthly fee per linked account while a token exists. Strongest in US banks and 401(k)s. |
| **Flinks** | Not stated | Canada | From $500/month, 1-year contract, no pay-as-you-go | Ruled out on cost. |
| **UK open banking** (GoCardless Bank Account Data, TrueLayer, Yapily) | No (bank accounts) | UK | GoCardless has a free tier; others pay-as-you-go | Can launch under the provider's licence. Gives cash balances only, which users can type in. |
| **Canada open banking** (Consumer-Driven Banking) | In scope, not live | Canada | Accreditation C$2,500 + C$10,000+/year | Regulations proposed June 2026, not in force. Watch, don't build. |
| **MX** | Not checked | US-focused | Sales-led | Not looked at in depth; enterprise pricing. |

Break-even sketch for SnapTrade: $100/month platform + ~$1/user/month. At a Pro price of about $30/year, roughly 70 paying users cover it.

### When we do add linking

- Fetch on demand, write straight to the user's Sheet, never persist holdings.
- Store only the aggregator connection token, encrypted, with one-tap disconnect that revokes it at the provider.
- Label it plainly before connecting: "Linked mode: we hold a read-only connection to your broker. Your holdings still live only in your Sheet."
- Plan entitlement must come from the server (signed), never from the user's Sheet.

## Ideas from Sure (we-promise/sure), read Nov 13, 2026

Sure is AGPL-3.0, so ideas only, no code.

- Own-key broker connections with no aggregator: Trading 212 (API key, positions endpoint), IBKR Flex Web Service (token + query id), Questrade (personal refresh token, positions endpoint; single-use tokens that expire in 7 days). Free to run. Not yet checked whether these allow browser (CORS) calls; if not, a stateless pass-through.
- CSV import: number format choice, comma/semicolon separator, date-format detection, downloadable template, a check step and dry-run summary, an exchange code column.
- Frankfurter (keyless ECB FX rates) to replace the Yahoo FX call.
- Not taken: trade-history holdings reconstruction, AI PDF statement reading (privacy), budgets/categories/bank feeds.

## Code foundation on this branch

- `src/lib/plan.ts`: `Plan`, the feature catalogue (free vs Pro, core vs convenience), `hasFeature()`, `getPlan()` (always `free`; `NEXT_PUBLIC_PRO_PREVIEW=1` for local preview).
- `src/lib/import/types.ts`: one `HoldingsSource` interface for file imports (browser) and linked accounts (server), all returning `ImportedHolding[]` for the user to review.
- `src/lib/import/csv.ts`: generic brokerage CSV parser (finds the header row, maps columns by name, reports skipped rows).
- `src/lib/import/index.ts`: source registry and `availableSources(plan, region)`.

Not wired into the UI yet. Next steps, in order:

1. Import screen on Assets: pick CSV → review table → map each row to a Stock asset with the Filings method → save to Sheet.
2. Broker presets only where the generic parser fails (test with real Wealthsimple, Questrade, Fidelity, Vanguard, Trading 212 exports).
3. Pro billing and entitlement (only when the first Pro feature is ready).
4. SnapTrade as the first `LinkedHoldingsSource`, behind `linkedBrokerages`.

## Decisions for Ayman

1. Is linking "not yet, CSV first" right, or do you want linking in the first Pro release?
2. Pricing model: annual subscription, pay-what-you-can, or a one-time Pro unlock per Zakat year?
3. Does the free/Pro table match your line? In particular: emailed reminders and household as Pro.
4. Wasiyyah: in ZakatFlow Pro later, or its own product?
