# International markets: accounts, structure and priority

*Research note v0.1, November 2026. Companion to [`accounts.md`](./accounts.md).*
*Figures from secondary sources are marked "verify" and must be checked against official tax authority pages before they go into the rules tables.*

---

## 1. Recommendation

| Tier | Markets | Why |
|---|---|---|
| **Launch** | 🇺🇸 US, 🇨🇦 Canada, 🇬🇧 UK | English-speaking. Large retail-investing Muslim communities. Tax-advantaged accounts are where most savings sit. Established Zakat bodies publish detailed account rulings (NZF UK and NZF Canada pages on pensions, RRSPs and RESPs), which shows people ask. US↔Canada cross-border tax is already modelled |
| **Next** | 🇦🇺 Australia (then 🇳🇿 New Zealand) | English. **Every worker has superannuation**, and "Zakat on super" is a frequent question (NZF Australia and Darul Ifta Australia publish rulings). One main account type plus brokerage, so it's cheap to add |
| **Wait for demand** | 🇫🇷 France, 🇩🇪 Germany, 🇳🇱 Netherlands, 🇧🇪 Belgium, 🇸🇪 Sweden | Large Muslim populations (France ~5.7M and Germany ~5M in Pew's 2016 estimates), but the app would need translating, local company data (ESEF annual reports only), and there's little public demand for Zakat on investment accounts. The account rules themselves are mostly simple (section 4) |
| **Don't target** | 🇲🇾 Malaysia, 🇸🇬 Singapore, Gulf states | Zakat is run by institutions. Malaysia's EPF launched **automatic Zakat deduction** for Shariah savings in October 2026; Singapore's MUIS has a fatwa on CPF; Gulf states have no personal income tax and simpler savings. A private calculator adds little |

**Does anyone outside the US care?** In the UK, Canada and Australia, yes:
- Each has a national Zakat body that has written detailed guidance on pensions, RRSPs, RESPs and super. That kind of guidance gets written because members keep asking.
- Zoya's forum has UK users asking for UK brokers and South African users asking for JSE coverage.

In continental Europe the demand signal is weak. There's little to no Zakat-on-investment content in French or German, and retail investing rates are lower. Revisit if users from those countries start appearing.

---

## 2. How a country plugs in

The account engine (`src/lib/accounts`) needs only **data** for a new country, not new logic:

1. **Account types:**
   - access rules (open / locked until age X / locked with exceptions);
   - charges on early withdrawal;
   - what part is taxable;
   - ownership (own / child / spouse).
2. **Income tax table** for residents.
3. **Non-resident withholding** for cross-border accounts, where relevant.
4. **Currency.**

Zakat on the holdings inside an account uses the same stock and fund engine everywhere. The local-company data source is the part that varies by market.

---

## 3. Australia and New Zealand

| Account | Access | Withdrawal cost | Proposed treatment |
|---|---|---|---|
| 🇦🇺 **Superannuation** (employer, compulsory) | **Locked until preservation age (60** for anyone born after 30 June 1964) and retirement, with limited hardship release | Withdrawals tax-free from 60 | **Locked → not due** (Darul Ifta Australia 2013: *"not compulsory until one can access it"*). NZF Australia notes a view that voluntary contributions are Zakatable yearly. Annual Zakat is available via Approach B |
| 🇦🇺 **Self-managed super fund (SMSF)** | Locked, but the member controls the investments | As above | Same as super; flag it, since control is a factor some scholars weigh |
| 🇦🇺 **Brokerage / CHESS holdings** | Full | Capital gains tax on sale (not deducted) | Holdings method |
| 🇳🇿 **KiwiSaver** | **Locked until 65**, except a first-home withdrawal and hardship | — | Locked → not due, unless planned for a first home (then accessible) **(verify)** |

Stock data: ASX companies need an Australian source. There's no free XBRL feed comparable to the SEC's, so use the proxy or a paid provider. Many Australians hold US ETFs through super, and those are covered.

---

## 4. Europe

Most European wrappers are either **fully accessible with no withdrawal penalty** or **locked pensions**. That's simpler than the US and Canada. The real cost is translation and local company data, not account rules.

| Country | Main accounts | Access and cost **(verify)** | Treatment |
|---|---|---|---|
| 🇫🇷 France | **PEA** (EU equities, cap €150k) | Withdrawal before 5 years closes the plan and gains are taxed (~30% flat); after 5 years only social charges (~17.2%) on gains | Accessible; deduct tax on **gains only** |
| | **Assurance-vie** (the most popular wrapper) | Accessible; tax on the gains part, lower after 8 years | Accessible; deduct tax on gains |
| | **PER** (retirement) | Locked until retirement, except buying a main home or hardship | Locked → not due |
| 🇩🇪 Germany | **Depot** (ordinary brokerage) | Accessible; ~26.4% tax on gains when sold | Holdings method (capital gains not deducted, as in the US) |
| | **Riester / Rürup / bAV** (pensions) | Locked; early use of Riester means repaying subsidies | Locked → not due |
| 🇳🇱 Netherlands | Ordinary accounts (Box 3 taxes a deemed yearly return, not withdrawals) | Accessible, no withdrawal cost | Holdings method |
| | Workplace pension | Locked | Locked → not due |
| 🇸🇪 Sweden | **ISK** (most popular; small flat yearly tax instead of tax on gains) | Accessible, no withdrawal cost | Holdings method |
| | Premium pension (PPM) | Locked | Locked → not due |
| 🇬🇧 UK | Covered in `accounts.md` | | |

Cross-border in Europe mostly means EU citizens moving between EU countries. Pension portability rules vary, so model it later if there's demand.

---

## 5. Where Zakat is run by institutions (not targeted)

| Market | Structure | Zakat practice |
|---|---|---|
| 🇲🇾 Malaysia: EPF/KWSP (compulsory retirement fund) | Locked with partial withdrawals | State fatwas differ on ownership. In **October 2026 EPF launched automatic Zakat deduction** for Simpanan Shariah members |
| 🇸🇬 Singapore: CPF | Locked accounts | MUIS Fatwa Committee ruling on Zakat on CPF savings |
| Gulf (UAE, KSA, Qatar…) | No personal income tax; end-of-service gratuity paid on leaving | Saudi Permanent Committee: no Zakat on the gratuity until received and above Nisab. Expats here mostly hold home-country or US brokerage accounts, which are already covered |

---

## Sources

- NZF Australia, [Zakat on Superannuation](https://www.nzf.org.au/zakat-on-superannuation/)
- Darul Ifta Australia, [Zakat on Superannuation](https://www.fatwa.org.au/zakat-on-superannuation.html)
- Freenance, [Tax-advantaged accounts in Europe compared](https://freenance.io/guides/tax-advantaged-accounts-europe-comparison/); FinancialExpertClass, [ISA, PEA, ISK compared](https://financialexpertclass.com/tax-advantaged-investment-accounts-europe-compared/); New Financial, [Designing savings and investment accounts in the EU](https://www.newfinancial.org/reports/designing-savings-and-investment-accounts-in-the-eu)
- Pew 2016-baseline figures as reported in [Proto Thema](https://en.protothema.gr/2017/11/30/5-facts-about-the-rapidly-growing-muslim-population-in-europe-infographs/)
- The Star, [EPF launches direct Zakat deduction facility](https://www.thestar.com.my/news/nation/2026/10/12/epf-launches-direct-zakat-deduction-facility-for-simpanan-shariah-members); Mufti WP, [Zakat on EPF savings](https://muftiwp.gov.my/en/artikel/al-kafi-li-al-fatawi/2669-al-kafi-846-zakat-on-epf-savings)
- MUIS, [Fatwa on CPF savings](https://www.muis.gov.sg/resources/khutbah-and-religious-advice/fatwa/fatwa-on-cpf-savings--english/)
- Qatar Charity, [Zakat fatwa on end-of-service benefit](https://www.qcharity.org/en/qa/zakat/fatwa/details?Sid=12152)
