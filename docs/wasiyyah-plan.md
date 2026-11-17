# Wasiyyah (Islamic Will) — Feature Plan

## Goal

Help a user plan their estate according to Islamic inheritance law (faraid). The feature
lives alongside the Zakat dashboard and reuses its assets, liabilities, madhab setting and
currency conversion. Data stays in the user's own Google Sheet, the same as everything else.

The output is planning plus a printable draft. It is **not** a legally executed will. The
page says plainly that a secular will valid in the user's jurisdiction is still needed, and
that a scholar should review the result.

## How an estate is distributed (the order the engine follows)

1. **Funeral and burial costs** (tajhiz), at a modest, sunnah level.
2. **Debts.** Debts to people come first. Debts owed to Allah (unpaid zakat, kaffarah,
   fidya, an unperformed obligatory hajj) are next. The Hanafi school pays these only if
   the deceased bequeathed them, and then from the one-third bequest allowance. The other
   schools pay them from the estate like any other debt.
3. **Wasiyyah (bequests).** At most one third of what remains after steps 1 and 2. Bequests
   cannot go to someone who already inherits a fixed share unless the other heirs consent.
4. **Mirath.** The rest goes to the heirs by their fixed shares (fard), then to the
   residuary heirs (asaba). Shares are scaled down proportionally (awl) when they add up to
   more than the estate, and the surplus is returned proportionally (radd) when they add up
   to less and there is no residuary heir.

## Data model (`src/lib/wasiyyah-types.ts`)

- `testator`: name, gender (decides husband vs. wives), date of birth, address, jurisdiction.
- `relatives[]`: each person has a name, a relation (an `HeirKey` such as `son`,
  `fullSister` or `maternalGrandmother`), and an optional note. The engine works from the
  count per relation, and the UI shows each named person's share.
- `estateItems[]`: things the Zakat assets list doesn't cover, such as the home, vehicles,
  property, a business, life insurance or personal effects. Each item has a value and a
  currency.
- `includeZakatAssets` and `includeLiabilities`: whether to pull in the gross assets and
  liabilities of the latest Zakat year, so nothing is entered twice.
- `debts[]`: what is owed to creditors, plus obligations to Allah (zakat, kaffarah, fidya,
  hajj, deferred mahr).
- `funeral`: an estimated cost, burial location, and wishes such as ghusl, janazah and a
  sunnah burial.
- `bequests[]`: who receives it (charity, waqf or a person who is not an heir) and a fixed
  amount or a percentage. The total is capped at one third.
- `executors[]`, `guardians[]` (for minor children), `witnesses[]`, and a personal message
  or advice (nasiha) to the family.

**Storage:** a `Wasiyyah` tab in the primary and backup sheets, with `Key | Value (JSON)`
rows, one row per section. The tab is created the first time it is needed, so existing
users need no migration. The code is kept in separate files (`wasiyyah-sheets.ts`,
`wasiyyah-store.ts`, `/api/sheets/wasiyyah`) so it doesn't collide with the stock work
happening in `store.ts` and `sheets.ts`.

## Faraid engine (`src/lib/faraid-engine.ts`)

A pure TypeScript module with exact fraction arithmetic.

- **Heirs covered:** husband, wives (up to 4), father, mother, paternal grandfather,
  maternal and paternal grandmothers, sons, daughters, son's sons and son's daughters, full,
  paternal and maternal brothers and sisters, full and paternal nephews (brother's sons),
  full and paternal uncles, and full and paternal cousins (uncle's sons).
- **Blocking (hajb):**
  - The father blocks the grandfather and the siblings.
  - The mother blocks both grandmothers.
  - A son blocks the son's children.
  - Two or more daughters block son's daughters, unless a son's son is present to make
    them residuaries.
  - Any descendant, the father or the grandfather blocks maternal siblings.
  - Further down, residuary heirs are taken strictly by priority.
- **Special cases:**
  - Daughter with son's daughter: the son's daughter takes 1/6 to complete two thirds.
  - Full sister with paternal sister: the paternal sister takes 1/6.
  - Sisters become residuaries alongside daughters (asaba ma'a al-ghayr).
  - The two Umar cases (umariyyatan): with a spouse and both parents, the mother takes one
    third of the remainder.
  - The shared case (mushtaraka): the Shafi'i and Maliki schools let full siblings share
    the third with maternal siblings. The Hanafi and Hanbali schools do not.
  - The Hanbali school lets the paternal grandmother inherit even when the father is alive.
  - Two or more siblings reduce the mother to 1/6, even when the siblings themselves are
    blocked.
- **Awl and radd:** both are applied. Radd skips the spouse.
- **Warnings for things the engine doesn't model yet:**
  - The grandfather together with siblings outside the Hanafi school (the Shafi'i, Maliki
    and Hanbali schools follow Zayd's rule of sharing).
  - Distant kindred (dhawu al-arham).
  - An estate with no heir besides the spouse.
  - Heirs who are excluded (non-Muslim, a killer) or whose status is unclear (missing
    persons, unborn children). The user removes these from the list.

## UI (`/dashboard/wasiyyah`)

The page has tabs.

1. **Overview:** a waterfall of the estate (gross, minus funeral, minus debts, minus
   bequests, leaving the inheritance), share bars for each heir, a checklist of what's done,
   and warnings.
2. **Family:** add relatives. Each one shows live whether they are blocked or how large
   their share is, and why ("1/6 because the deceased has children").
3. **Estate:** the extra items, plus switches to bring in the Zakat assets and liabilities.
4. **Debts and obligations.**
5. **Bequests:** a live meter showing how much of the one-third limit is used, and a
   warning if a bequest goes to an heir.
6. **Instructions:** executors, guardians, funeral wishes, witnesses, and the personal
   message.
7. **Document:** a printable draft will (the `/dashboard/wasiyyah/document` route with
   print CSS), made from all of the above.

## Phases

- **Phase 1 (this branch):** the types, the faraid engine with tests, the sheet storage and
  API, the store, and the page with all the tabs and the printable draft. Adds a sidebar
  link.
- **Phase 2:**
  - Zayd's rule of sharing for the grandfather with siblings (Shafi'i, Maliki and Hanbali).
  - Distribution to distant kindred (dhawu al-arham).
  - A choice of radd policy (some modern fatwas allow radd to the spouse).
  - Per-heir amounts in a second currency.
  - Assigning specific assets to specific heirs (takharuj).
- **Phase 3:**
  - Yearly review reminders through the existing `/api/email/remind`.
  - Sharing a read-only copy with the executor.
  - Jurisdiction templates (US, Canada, UK) for the secular "mirror will".
