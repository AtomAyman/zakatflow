# How NisabFlow calculates Zakat on stocks and funds

*Methodology v0.1 (draft for scholar review). Last updated November 2026.*

> **Status:** This is a draft. Items marked **[Scholar review]** are proposed
> defaults that our reviewing scholar has not yet approved. Nothing in this
> document is a fatwa; where scholars differ, we explain the options.

---

## 1. The short version

- **Shares you trade or plan to sell within a year:** Zakat is due on their **full market value**, the same as cash.
- **Shares you hold long-term:** Zakat is due only on **your share of the company's Zakatable assets**: its cash, short-term investments, money owed to it, and stock-in-trade (inventory). Buildings, machinery, patents and other fixed assets are not Zakatable.
- **ETFs and mutual funds:** we look inside the fund, apply the rule above to every company it holds, and add the results up in proportion to what the fund holds.
- **When a company's figures aren't available**, we use the widely accepted scholarly estimate: **30% of market value** is treated as Zakatable.
- **Every figure shows where it came from.** Each holding is labelled as *Calculated*, *Check*, *Estimated* or *Your figure* (section 4), with a link to the company filing we used.

---

## 2. Long-term holdings: the calculation

### 2.1 What counts as a Zakatable company asset

We read these lines from the company's most recent balance sheet:

| Counted | Not counted |
|---|---|
| Cash and cash equivalents | Property, plant and equipment |
| Short-term investments and marketable securities | Goodwill, patents, brands and other intangibles |
| Receivables: money customers and others owe the company **[Scholar review]** | Long-term investments |
| Inventory: raw materials, work in progress, finished goods | Prepaid expenses, deferred tax and other current assets that are not cash, money owed or goods for sale |

### 2.2 The formula

**Proposed default: your share of the company's Zakatable assets [Scholar review]**

```
Zakatable assets per share = Company's Zakatable assets ÷ Shares outstanding
Your Zakatable amount      = Shares you own × Zakatable assets per share
Zakat due                  = Your Zakatable amount × 2.5%   (2.577% on a Gregorian year)
```

This follows AAOIFI Shari'ah Standard 35 and Sheikh Joe Bradford's *Simple Zakat Guide*, and it doesn't depend on the share price. We **cap the Zakatable amount at the market value of your holding**. A bank or a distressed company can hold more liquid assets than its whole market value, and we won't ask you to pay Zakat on more than you own.

**Alternative: asset ratio applied to market value**

```
Zakatable ratio     = Company's Zakatable assets ÷ Company's total assets
Your Zakatable amount = Market value of your holding × Zakatable ratio
```

This is the method in our reference Fiqh guide. It gives a higher figure for companies whose share price is far above their book value, such as large technology companies. You can pick it under *Settings → Calculation method*.

**Not deducted by default: the company's short-term debts [Scholar review]**

Some scholars subtract the company's current liabilities from its Zakatable assets. This often brings the result to zero, because many large companies owe more short-term than they hold. It's offered as the *AAOIFI net* method under *Settings → Calculation method*.

### 2.3 Which balance sheet we use

- The **latest quarterly or annual report filed on or before your Zakat date.** A report filed after your Zakat date is never used, even if it covers an earlier period. Last year's calculation therefore always reproduces exactly.
- All figures come from the **same balance-sheet date**.
- If the report is in another currency (for example CAD or GBP), we convert using the exchange rate on your Zakat date.

---

## 3. ETFs and mutual funds

1. We read the fund's **most recent published holdings**. US funds report these to the SEC every quarter; Canadian and UK funds publish holdings files on the issuer's website.
2. Each holding is calculated as in section 2, then weighted by its share of the fund.
3. When a fund holds other funds, we look through those too.
4. Non-stock holdings:

| Holding inside the fund | Treatment |
|---|---|
| Cash | 100% Zakatable |
| Gold, silver or other commodities | 100% of market value |
| Bonds and other debt **[Scholar review]** | 100% of market value (treated as money owed) |
| Derivatives and swaps (leveraged or inverse funds) | Fund is *Estimated* at 30% |
| Holdings we can't identify | That portion is *Estimated* at 30% |

The fund's label shows how much was calculated. For example: *"Calculated: 94% of this fund from company filings, 6% estimated."*

Special cases:
- **SPY, DIA and similar older index funds** don't publish holdings in the standard SEC format. We use the holdings of an equivalent fund that tracks the same index.
- **Gold ETFs** (for example GLD, IAU) are treated as gold: 100% of market value.
- **Bitcoin and other crypto ETFs** follow the app's crypto rule for currency-like coins: 100% of market value.

---

## 4. How each holding is labelled

| Label | Meaning | When it happens |
|---|---|---|
| **Calculated** | Exact figure from the company's own filing, with a link | Filing is no more than about 7 months old and passes our checks |
| **Calculated – check** | Calculated, but please look | Filing is older than 13 months, figures fail a cross-check, or the stock may be an ADR with a share ratio |
| **Estimated** | 30% of market value | No usable filing, unsupported market, bank or insurer (see 5.1), leveraged fund |
| **Your figure** | You entered your own Zakatable % | Shown with your note, and flagged for review each year |

The summary screen shows totals for each label, for example: *"$48,200 calculated · $3,100 estimated · $0 your figures"*.

---

## 5. Edge cases

### 5.1 Banks and insurers [Scholar review]
Their balance sheets aren't split into short-term and long-term items, and most of their assets are loans. Until our scholar rules on them, banks and insurers are **Estimated at 30%**. Other financial companies that do split their balance sheet (such as health insurers) are calculated and labelled *Check*.

### 5.2 REITs
Rental property isn't Zakatable, so a REIT's Zakatable share is usually small: mostly its cash and money owed to it. We calculate it normally and label it *Check*.

### 5.3 Companies with very little operating business
Shell companies, SPACs and early-stage mining explorers hold mostly cash. Their calculated figure can approach 100% of market value. That is correct, not an error.

### 5.4 Foreign companies and ADRs
Foreign companies that report to the SEC usually do so **once a year**, so their figures can be up to about 15 months old. An ADR may represent more or fewer than one ordinary share. Under the default method we apply the ADR ratio when we know it, and otherwise label the holding *Check*.

### 5.5 Multiple share classes
For companies like Alphabet (GOOG/GOOGL) or Berkshire Hathaway (BRK.A/BRK.B), shares outstanding include all classes.

### 5.6 New listings, delisted and very small companies
If no usable report exists, the holding is *Estimated*.

### 5.7 Preferred shares and individual bonds
These aren't common equity. They're entered as their own asset types, not under this method.

### 5.8 Dividends
Dividends you've received are cash. They count in your cash balance, not here.

---

## 6. Coverage

| Market | Source | Status |
|---|---|---|
| US stocks (NYSE, Nasdaq, OTC companies that file reports) | SEC EDGAR XBRL filings | **Live** |
| Canadian and other foreign companies that also file with the SEC (e.g. Enbridge, Shopify, CNQ, AstraZeneca, Shell) | SEC filings (10-K/10-Q, 40-F, 20-F, 6-K) | **Live** (6-K quarterly reports planned) |
| US ETFs and mutual funds | SEC N-PORT holdings | Planned |
| Canadian and UK ETFs | Issuer holdings files | Planned |
| TSX-listed companies that don't file with the SEC | Companies' own published financial statements | Planned for the largest companies; others *Estimated* |
| TSX Venture, LSE AIM and other small caps | — | *Estimated*, or *Your figure* |
| LSE Main Market companies without a US listing | Annual reports in standard ESEF format (filings.xbrl.org) | Planned |
| Other international markets | — | *Estimated*, or *Your figure* |

---

## 7. Entering your own figure

You may have a figure from your scholar or your own reading of a company's report.

- On any holding, tap **"Use my own figure"** and enter one number: the **Zakatable % of this holding**. You can add an optional note, such as *"from the 2026 annual report"*.
- If you don't know the percentage, **"Work it out from the report"** asks for the four figures in section 2.1 (cash, short-term investments, receivables, inventory) plus shares outstanding, and calculates it for you.
- Your figure applies **to that holding for that Zakat year only**. Next year we'll show the new calculated figure next to yours and ask which to keep.
- Your figure and note are stored only in **your own Google Sheet**.

**What we deliberately don't offer:** per-line switches (receivables on/off, liabilities on/off) for each holding. Those choices are made once, in *Settings → Calculation method*, from a short list of methods with names and explanations:

| Method | Summary |
|---|---|
| **NisabFlow default** **[Scholar review]** | Your share of the company's Zakatable assets (section 2.2) |
| **Asset ratio** | Our reference guide's ratio applied to market value |
| **AAOIFI net** | Default method, minus the company's short-term debts |
| **Simple 30%** | 30% of market value for every long-term holding |

---

## 8. Where the data comes from

- **US and SEC-reporting companies:** the SEC's public EDGAR XBRL "company facts" data, read directly from each company's 10-K, 10-Q, 20-F or 40-F.
- **Funds:** SEC Form N-PORT. Canadian and UK funds: issuer holdings files.
- **Prices:** the previous day's closing price, used only to cap the Zakatable amount at your holding's value and to show percentages. You can always use the value from your brokerage statement instead.
- **Privacy:** the app downloads the company data to your device and does the matching there. We never learn which stocks you own.

---

## 9. Open questions for scholar review

1. Default method: share of Zakatable assets (2.2, default) or asset ratio applied to market value (2.2, alternative)?
2. Should receivables count as Zakatable?
3. Should the company's short-term debts be deducted?
4. How should banks and insurers be treated?
5. Should bonds and other debt inside funds count at 100%?
6. Should the Zakatable amount be capped at the holding's market value?
