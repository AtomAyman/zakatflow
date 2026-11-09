# Zakat on investment accounts: retirement, education, savings and pensions

*Methodology v0.1 (draft for scholar review). Last updated November 2026.*
*Companion to [`stocks-and-funds.md`](./stocks-and-funds.md).*

> Most people hold their stocks and ETFs **inside** accounts such as a 401(k),
> RRSP, TFSA or ISA, not in a plain brokerage account. This document covers how
> the **account** changes the Zakat on the investments in it.
>
> **Fiqh source of truth:** *A Guide to Zakāt* by Muftī Mohammed Wahaajuddin
> (Tawheed Center, 2021), cited as **"the Guide"**. Where the Guide rules, we
> follow it. Rulings from other bodies (NZF, Sh. Joe Bradford and others) are
> listed for comparison, and as the basis of the optional approaches in
> section 2. Items marked **[Confirm with Muftī]** aren't addressed in the
> Guide, which itself lists retirement accounts as *"[after consulting with a
> muftī]"*.

---

## 1. Two separate questions

For any account, the Zakat calculation answers two questions in order:

**1. The account question: can you get the money, and what would it cost you?**
If you can't withdraw, or withdrawing costs tax and penalties, scholars differ on whether Zakat is due now, later, or on a reduced amount (section 2).

**2. The holdings question: what is Zakatable about what's inside?**
This is the same for every account. Cash is 100% Zakatable. Long-term stocks and funds use the company-assets method in `stocks-and-funds.md`. Actively traded holdings are 100% Zakatable.

```
Zakatable amount for an account
  = Zakatable value of the holdings      (question 2: per holding, from filings or estimate)
  × (1 − cost of withdrawing today)      (question 1: tax + penalty, as a % of the balance)
  × whether Zakat is due this year       (question 1: per the approach chosen in section 2)
```

**Example:** a $100,000 401(k), all in an S&P 500 fund, owner aged 40, 22% federal tax bracket, 5% state tax.

| Step | Amount |
|---|---|
| Zakatable value of the holdings (look-through, say 21%) | $21,000 |
| Cost of withdrawing today: 10% penalty + 22% federal + 5% state = 37% | × 0.63 |
| Zakatable amount | $13,230 |
| Zakat at 2.5% | **$330.75** |

The same 401(k) using the flat 30% estimate and no tax deduction would give $750, more than double.

---

## 2. Accounts you can't freely access: the three scholarly approaches

This is the biggest point of difference among scholars. We show the user **one setting** (*Settings → Retirement accounts*) with three named choices:

| Approach | What it means | Held by (examples) |
|---|---|---|
| **A. Pay yearly (the Guide)** | Voluntary accounts such as 401(k)s and IRAs are long-term investments, Zakatable every year on their Zakatable holdings. Employer-controlled pensions you can't access are not Zakatable until received. | **The Guide**: *"Voluntary retirement plans like 401(k)s and IRAs are treated as long term investments"*; NZF Canada, Assad Wealth / Sh. Navaid Aziz, Zakat Foundation of America |
| **B. Work it out yearly, pay when you get access** | Calculate Zakat every year as in A, but it may be paid later. The app keeps a running total to pay when you get the money. Paying yearly is still preferred. | NZF UK: *"it is permissible to wait until funds are realised upon retirement and then pay the Zakat that has been noted down from previous years"* |
| **C. Not due until you can withdraw without penalty** | No Zakat while a penalty applies. Once you reach penalty-free age, pay yearly on what's accessible. | Sh. Joe Bradford: *"Zakat is not due on your retirement account … until it is time to cash out without penalty"*; also NZF Canada for fully locked funds |

**Default: A, the Guide.** B and C are offered for users whose own scholar follows those views. Choosing B or C changes only *when* Zakat is due, not how it's calculated, so the app can switch between them without the user re-entering anything.

**Employer-controlled pensions** (the Guide's "mandatory retirement accounts": pensions, cash-balance plans and similar, where the employee has no access) are **not Zakatable until received, and no Zakat is owed for prior years**: *"There is no zakāt due on the sum until it is received by the employee, and there is no zakāt due on the years prior to his being given the sum."* This applies under every approach.

---

## 3. What withdrawing would cost

| Component | How we estimate it |
|---|---|
| Early-withdrawal penalty | Fixed by account type and the owner's age (sections 4–6) |
| Income tax on the withdrawal | **Proposed default:** the real tax the withdrawal would add, using 2026 brackets for the user's income and residence (section 3.1). A large withdrawal crosses several brackets, so one marginal rate is inaccurate **[Confirm with Muftī]**: the Guide doesn't address deducting withdrawal tax or penalties. NZF Canada, Assad Wealth and the Zakat Foundation of America do deduct them. NZF Canada uses the RRSP **withholding** rate instead (10/20/30%; 5/10/15% in Quebec). Withholding is only a prepayment of tax, so it understates the real cost for higher earners and overstates it for lower earners. We'll show the withholding figure as a note. |
| Tax-free portions | Roth contributions, TFSA, ISA, 25% UK pension lump sum and similar portions have no tax |
| Grants that must be repaid | RESP (CESG), RDSP (grants and bonds within 10 years), Lifetime ISA bonus: deducted, because you'd lose them |
| Vesting | Unvested employer contributions are excluded entirely (they aren't yours yet) |

We deduct only costs that are certain on the Zakat date: tax, penalties and grant repayments. Brokerage fees are ignored because they're immaterial.

---

**Product decision (November 2026):** early-withdrawal penalties and income tax **are deducted**. The Guide doesn't address this, and NZF Canada, Assad Wealth and the Zakat Foundation of America all deduct them.

**Salary and existing tax:** the user enters their salary and tax region once. Their existing tax is worked out from that, so each withdrawal is taxed only on what it **adds** on top of the salary.

**All accounts together:** the app assumes **every account is cashed out on the Zakat date**. Taxable withdrawals are stacked on one income, and the resulting tax is shared across the accounts in proportion to each one's taxable amount. A non-US Ontario resident earning C$100k with an FHSA (C$40k, not for a home), TFSA (C$35k), 401(k) (US$20k) and RRSP (C$30k):

| Account | In hand, each alone | In hand, all together |
|---|---|---|
| FHSA | 68.5% | 64.8% |
| TFSA | 100% | 100% |
| 401(k) | 59.9% | 54.8% |
| RRSP | 69.7% | 64.8% |

If the FHSA is for a first home, it's tax-free and drops out of the stack, which lowers the tax on the others.

### 3.1 Tax residency and accounts in another country

Where you **live** for tax purposes can change what you'd get from an account more than the account itself. The app asks once, in Settings:
- country and state/province of tax residence;
- whether you're a **US citizen or green-card holder** (the US taxes these people wherever they live);
- age and other income this year.

**How tax is estimated:**
1. **Charges tied to the account** apply wherever you live and aren't credited abroad:
   - the US 10% (or 20%/25%) additional taxes;
   - RESP grant repayment and the 20% extra tax on growth;
   - the Lifetime ISA 25% charge.

   Whether Canada credits the US 10% is disputed, so we treat it as not credited.
2. **The account's country** withholds tax if you aren't resident there:
   - US: 30% on a lump sum paid to a non-resident non-citizen (treaty rates such as 15% cover only periodic payments);
   - Canada: 25% non-resident tax on RRSP/RRIF lump sums;
   - UK pensions: usually taxed only where you live.
3. **Your country of residence** taxes the withdrawal as income: the tax on your income plus the withdrawal, minus the tax on your income alone, using 2026 brackets. It gives a credit for the foreign tax. In effect **you pay the higher of the two countries' tax**, plus the charges in step 1.

**Example:** a $100,000 401(k), owner aged 40 with C$90,000 other income, living in Ontario, not a US citizen.

| | Amount |
|---|---|
| US 10% early-withdrawal tax | −$10,000 |
| US 30% non-resident withholding | −$30,000 |
| Extra Canadian tax after the credit for the US $30,000 | ≈ −$6,100 |
| **In hand** | **≈ $53,900 (53.9%)** |

Each holding is then scaled to its in-hand share before its own Zakatable % applies:

| Holding | Value | In hand (53.9%) | Zakatable % | Zakat |
|---|---|---|---|---|
| NVDA | $20,000 | $10,787 | 47.2% (from filings) | $127.28 |
| AAPL | $30,000 | $16,180 | 38.3% (from filings) | $154.92 |
| MU | $10,000 | $5,393 | 30% (estimated) | $40.45 |
| Gold ETF | $20,000 | $10,787 | 100% | $269.67 |
| Cash | $20,000 | $10,787 | 100% | $269.67 |
| **Total** | **$100,000** | **$53,934** | | **$861.99** |

The same account for a Texas resident leaves about $66,600 in hand (Zakat ≈ $1,065).

Cross-border results are labelled **approximate**. Tax treaties have exceptions we don't model (for example, a Canadian resident can transfer a 401(k) lump sum into an RRSP). The user can always enter their own expected in-hand amount instead.

## 4. United States

| Account | Access | Cost of withdrawing early | Proposed treatment (Approach A) |
|---|---|---|---|
| **Taxable brokerage** | Full | Capital gains tax only when you sell; not deducted | Holdings method, no deduction |
| **401(k), 403(b), TSP** (traditional) | Usually only after leaving the employer, at 55+ (the "rule of 55"), at 59½, or for hardship | 10% penalty before 59½ + income tax | Holdings × (1 − penalty − tax). Unvested match excluded. If the plan allows no withdrawal at all while employed, the user can mark it **Locked** (section 7) |
| **Roth 401(k)** | As above | Contributions: no tax. Earnings: tax + 10% penalty unless qualified | Contribution portion with no deduction; earnings with the deduction |
| **457(b)** (governmental) | After leaving the employer | **No 10% penalty**, income tax only | Holdings × (1 − tax) |
| **Traditional IRA, SEP IRA, rollover IRA** | Full (it's your account) | 10% penalty before 59½ + tax | Holdings × (1 − penalty − tax) |
| **SIMPLE IRA** | Full | **25%** penalty in the first 2 years, then 10%, + tax | As above with the higher penalty |
| **Roth IRA** | Full | Contributions: **always tax- and penalty-free**. Earnings: tax + 10% unless 59½ and 5 years | Contributions with no deduction; earnings with the deduction. Bradford's simpler option: pay on the whole Roth and treat the extra as prepaid Zakat |
| **HSA** | Full | Non-medical use before 65: **20%** penalty + tax. Medical use: free | Holdings × (1 − 20% − tax) **[Confirm with Muftī]**: some may argue no deduction applies, since medical spending is tax-free |
| **529 plan** (owner: parent) | Full for the account owner | Non-qualified withdrawal: tax + **10%** on **earnings only**; contributions come back tax-free | Contributions with no deduction; earnings with the deduction. **Owner's** Zakat (the parent's) |
| **Coverdell ESA** | Withdrawals belong to the beneficiary (the child) | Tax + 10% on earnings if not used for education | Child's wealth; see section 8 **[Confirm with Muftī]** |
| **UTMA / UGMA** | Irrevocable gift to the child; the custodian manages it | — | Child's wealth; see section 8 |
| **Defined-benefit pension** (traditional pension, cash balance plan) | None until payout | — | **Not Zakatable** until received, with no Zakat for prior years (the Guide, "Zakāt on Retirement Accounts"; NZF UK, IFG and Bradford agree). Payments become cash when received |
| **Deferred annuity** | Surrender allowed | Surrender charges + 10% before 59½ on earnings + tax | Surrender value × (1 − penalty − tax) on the earnings part **[Confirm with Muftī]** |
| **Employee stock: unvested RSUs, unexercised options** | — | — | **Not Zakatable** (Bradford: not yet owned). Once vested or exercised, they're regular shares |
| **ESPP shares** | Full once purchased | — | Regular shares |
| **Social Security** | None | — | Not Zakatable |

**What's inside US workplace plans** (affects question 2):
- **Target-date funds:** looked through, including the funds they hold.
- **Collective investment trusts (CITs):** many 401(k) "funds" are CITs, which don't file holdings with the SEC. We map them to the equivalent public fund (for example, a Vanguard target-date trust to the matching Vanguard target-date mutual fund); otherwise they're estimated.
- **TSP funds** map to their indexes: **C** = S&P 500; **S** = US extended market; **I** = international; **F** = US bond index; **G** = Treasury securities, treated as cash at 100% **[Confirm with Muftī]**.
- **Stable value funds:** treated as cash at 100% **[Confirm with Muftī]**.

---

## 5. Canada

| Account | Access | Cost of withdrawing early | Proposed treatment (Approach A) |
|---|---|---|---|
| **Non-registered (cash/margin)** | Full | Capital gains only when you sell; not deducted | Holdings method, no deduction |
| **TFSA** | Full | None | Holdings method, **no deduction** (NZF Canada, Assad) |
| **RRSP, spousal RRSP** (owned by the annuitant: a spousal RRSP is the **spouse's** Zakat, per the Guide's ownership rule for spouses) | Full | Income tax (withholding 10/20/30%, Quebec 5/10/15% + provincial) | Holdings × (1 − marginal tax). NZF Canada: *"In the case of RRSP you can also deduct withdrawal tax"* |
| **Group RRSP** | Depends on the employer: often accessible, sometimes restricted while employed | As RRSP | As RRSP, or **Locked** if restricted |
| **RRIF** | Full | Tax on the withdrawal (no withholding on the annual minimum, but it's still taxable) | Holdings × (1 − marginal tax) |
| **FHSA** | Full | Qualifying first-home withdrawal: **tax-free**. Otherwise taxed as income | If the user plans to buy a home: no deduction. Otherwise: × (1 − marginal tax) |
| **LIRA, locked-in RRSP, LIF, DC pension (RPP), DPSP before vesting** | **Locked** until retirement age (limited unlocking: small balances, hardship, 50% at 55+ in some provinces) | Not withdrawable | **Not Zakatable while locked** (NZF Canada, Assad: Hanafi view). Any unlockable portion is treated as RRSP |
| **RESP** (owner: subscriber, usually a parent) | Contributions can be withdrawn by the subscriber | Grants (CESG/CLB) **repaid**; growth taxed + **20%** extra (12% in Quebec) | **Subscriber's** Zakat on contributions (+ growth after tax and the 20%), **excluding grants**. NZF Canada: *"Zakat on RESP = Total RESP Value minus Early Withdrawal deductions"*, worked example deducting the grant |
| **RDSP** (owner: the disabled beneficiary) | Withdrawals allowed, but grants and bonds from the last 10 years must be repaid | Repayment + tax on the growth part | **Beneficiary's** wealth (section 8). Deduct the grants and bonds that would be repaid **[Confirm with Muftī]** |
| **CPP / QPP, OAS** | None | — | Not Zakatable (Assad: *"not Zakat-able until you actually receive the payments"*) |
| **Defined-benefit pension** | None | — | Not Zakatable until received |

**What's inside Canadian workplace plans:** group RRSPs and DC pensions often hold insurers' segregated funds (Sun Life, Manulife, Canada Life), which don't publish full holdings. We map to the fund's stated benchmark where possible; otherwise we use the asset-mix estimates in section 9.

---

## 6. United Kingdom

| Account | Access | Cost | Proposed treatment |
|---|---|---|---|
| **General investment account** | Full | — | Holdings method |
| **Stocks & Shares ISA, Cash ISA** | Full | None | Holdings method, **no deduction** |
| **Lifetime ISA** | Full | **25% withdrawal charge** unless for a first home, at 60+ or terminal illness | × (1 − 25%) unless the user plans a qualifying use |
| **Junior ISA, Child Trust Fund** | **Locked until 18**; belongs to the child | — | Child's wealth (section 8); while locked, treated as **Locked** |
| **Workplace DC pension, SIPP, personal pension** | **Locked until 55** (rising to **57 from April 2028**) | After access: 25% tax-free, the rest taxed as income | **NZF UK / Al-Qalam:** Zakatable yearly on the Zakatable share of the fund, and *"permissible to wait until funds are realised"*, which is Approach B. Before access, tax isn't deducted in NZF's method **[Confirm with Muftī]** |
| **Defined-benefit (final salary, CARE, NHS, Teachers')** | None | — | **Not Zakatable** (NZF UK: *"Zakat is not due on defined benefit schemes"*) |
| **State Pension** | None | — | Not Zakatable (NZF UK: *"You can ignore the state pension"*) |

UK pensions are the one case where the leading UK body (NZF) holds that locked funds are still Zakatable, with payment allowed to wait. This is why the Retirement accounts setting matters. A UK user following NZF should pick **B**.

---

## 7. Marking an account as Locked

For accounts with no withdrawal right at all, the user ticks **"I can't withdraw from this account"**. Examples: a 401(k) at a plan that forbids withdrawals while employed, a LIRA, a Junior ISA, or a UK pension before 55.

- Under **A** or **C**: not Zakatable this year. Shown as *"Locked – not due"*.
- Under **B**: calculated and added to the running *"Zakat to pay when you get access"* total.

We set the default per account type (a LIRA starts as Locked; an IRA never can be). The user only changes it when their plan is unusual.

---

## 8. Accounts belonging to children or dependants

Junior ISAs, UTMA/UGMA accounts, Coverdell ESAs and RDSPs legally belong to the child or beneficiary, not the parent.

**The Guide:** Zakat is obligatory only on a Muslim who is *"Sane, Mature, Free"*, so **no Zakat is due on a child's wealth** until they reach maturity (the Hanafi position). The app therefore:

- shows these accounts in a separate **"Held for [child's name]"** section, *Not due (minor)*;
- never adds them to the parent's Zakat;
- on the child's maturity date (entered once), starts calculating them as the child's own Zakat, against the child's own Nisab.

For comparison, NZF Canada follows the majority view that *"the guardians of the Zakatable wealth should pay Zakat on the child's behalf"*. We don't offer this as a setting, to keep the app simple.

**Ownership follows the Guide's rule for spouses and joint accounts:** what belongs to whom is decided by ownership, not by who has permission to use it.
- RESPs and 529 plans are owned by the parent or subscriber, so they count in the parent's Zakat.
- A spousal RRSP belongs to the spouse.
- Joint accounts are split by each person's contribution, or 50/50 if that can't be told apart.

## 9. Fallback when we can't see inside a fund

When a workplace or insurer fund publishes only an asset mix (equity, bonds, property, cash), we use NZF UK's published estimates, which come from reviewing the top 20 UK pension funds of each type. They're more accurate than a flat 30%:

| Fund type | Zakatable share |
|---|---|
| Equity fund | 27% |
| Shariah equity fund | 26% |
| Mixed-asset fund | 50% |
| Direct property fund | 15% |
| Bonds, gilts, fixed income | 100% **[Confirm with Muftī]** |
| Cash, money market | 100% |

Unknown funds use 30% (the stock-holding default). The label is always *Estimated*.

---

## 10. What this means for the app

To stay simple:

**Two global settings, both set once:**
1. *Calculation method* for stocks (`stocks-and-funds.md`, section 7).
2. *Retirement accounts* approach: A, B or C, with a one-line explanation and who holds each view.

**Adding an account** asks only:
1. Country and **account type**, from a list per country.
2. The **holdings**, either entered or imported from a statement.
3. Only the questions that type needs:

| Account type | Extra questions |
|---|---|
| Roth IRA, Roth 401(k), 529, RESP | Total contributions so far |
| 401(k), DC pension | Vested balance, if different |
| RESP, RDSP, Lifetime ISA | Grants or bonus received |
| 401(k), group RRSP | "Can you withdraw?", only where it varies by plan |
| FHSA, 529, Lifetime ISA | Planned use, only where it changes the tax |

Age, tax bracket and province or state come from Settings and are entered once.

**Each account card shows the working**, for example: *"$100,000 → $21,000 Zakatable holdings → after 37% early-withdrawal cost → $13,230 → Zakat $330.75"*.

**Per-account override:** *"Use my own figure"*, the same as for holdings: one number plus a note.

**Data model changes** (replacing today's `RetirementAccountType`): `Account { country, type, owner: self | spouse | child, holdings[], cash, contributions?, vestedBalance?, grantsReceived?, locked?, plannedUse? }`. Penalty and tax rules live in a versioned rules table per country and year, so annual tax changes are a data update, not a code change.

---

## 11. Open questions for scholar review

1. ~~Should the early-withdrawal penalty and income tax be deducted?~~ **Decided: yes**, using the actual tax the withdrawal would add (section 3).
2. Workplace plans that forbid any withdrawal while employed: Zakatable like an IRA, or treated like the Guide's mandatory pensions (not due until received)?
3. UK defined-contribution pensions locked until 55/57: Zakatable yearly (as NZF UK holds), or not due until access?
4. Should the HSA 20% penalty be deducted when the money may be spent on medical care?
5. How should bonds, gilts, stable value funds and G Fund be treated: 100% Zakatable?
6. Deferred annuities: Zakatable at surrender value?

---

## Sources

- **Source of truth:** Muftī Mohammed Wahaajuddin, *A Guide to Zakāt* (Tawheed Center, 2021): conditions of Zakat (sane, mature, free); joint and spousal ownership; mandatory retirement accounts not Zakatable until received; 401(k)s and IRAs as long-term investments; debts receivable; deductible liabilities
- National Zakat Foundation (UK), [Does Zakat need to be paid on pension assets?](https://nzf.org.uk/knowledge/pensions/): DB not Zakatable; DC Zakatable on the Zakatable share; delay permitted; fund-type estimates; state pension ignored
- NZF Canada: [RRSP and TFSA](https://www.nzfcanada.com/zakat-faq/how-do-i-calculate-zakat-on-my-retirement-savings-rrsp-and-tfsa), [RESPs](https://www.nzfcanada.com/zakat-faq/how-do-i-calculate-zakat-on-resps), [pension without access](https://www.nzfcanada.com/zakat-faq/do-i-pay-zakat-on-a-pension-fund-if-i-do-not-have-access-to-it), [shares and investments](https://www.nzfcanada.com/zakat-faq/how-do-i-calculate-zakat-on-shares-and-investments)
- Sh. Joe Bradford: [Do I pay Zakat on 401k and IRA?](https://joebradford.net/pay-zakat-on-401k/) (incl. Roth), [Zakat on pensions](https://joebradford.net/zakat-pension-retirement-plans-2/), [Zakat on stocks and investments](https://joebradford.net/zakat-on-stocks-and-investments-a-complete-guide-for-brokerage-accounts/) (CRI method, 30% estimate, unvested equity)
- Assad Wealth Management (Sh. Navaid Aziz webinar), [The Ultimate Guide to Calculating Zakat on Investments in Canada](https://www.assadwealth.ca/insights/zakat-guide): TFSA, RRSP, LIRA, RESP, group plans, CPP/OAS
- Islamic Finance Guru, [Calculate Zakat on Pensions](https://www.islamicfinanceguru.com/articles/calculate-zakat-on-pensions-sipps-final-salary-pensions)
- Zakat Foundation of America, [Is Zakat owed on 401(k) plans and IRAs?](https://www.zakat.org/is-zakat-owed-on-401k-plans-and-individual-retirement-accounts-ira) (page blocked automated reading; summarised from search results only)
