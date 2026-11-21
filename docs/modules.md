# Companion modules (V1 = Zakat, V2 = Wasiyyah)

ZakatFlow V1 ships as the complete Zakat app and nothing else. Wasiyyah, the
Islamic will planner, is its own product in its own repo (AtomAyman/wasiyyah).
It joins ZakatFlow in V2, once scholar review of the will rules is done. The
idea is a family of tools that connect, the way QuickBooks tools do, rather
than one app that does everything.

This file describes the small set of hooks left in ZakatFlow so V2 can plug in
without reworking the Zakat code. None of them changes V1 behaviour.

## 1. Module registry and feature flag

`src/lib/modules/registry.ts` lists companion modules. Each one is off unless
its build-time flag is set.

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_MODULE_WASIYYAH` | unset (off) | `true` or `1` shows the Wasiyyah link in the sidebar |
| `NEXT_PUBLIC_WASIYYAH_URL` | `/dashboard/wasiyyah` | Where the link goes. An absolute URL opens the separate Wasiyyah app in a new tab; a path is a route inside ZakatFlow |

Use `isModuleEnabled('wasiyyah')` anywhere else a module needs a switch.

## 2. Sidebar slot

`Sidebar.tsx` passes its items through `withModuleNavItems()`, which inserts
enabled modules just above Settings. With every flag off the list is the same
as before.

## 3. Wealth snapshot (the shared data contract)

`src/lib/modules/wealth-snapshot.ts` exports `buildWealthSnapshot()` and the
`WealthSnapshot` type: base currency, madhab, the Zakat year used, each asset's
full value and each liability's outstanding amount, all in the base currency,
plus totals. It is versioned (`WEALTH_SNAPSHOT_VERSION`).

Rules:

- It is read-only. Wasiyyah reads the snapshot; ZakatFlow never reads will data.
- It reports full values, not Zakatable values. Estate planning needs what the
  person owns; Zakat percentages stay inside the Zakat engine.
- Any change to the shape bumps the version, and Wasiyyah checks the version
  before using it.

## 4. Shared Google Sheet

Both products keep data in the user's own Google Sheet. The Wasiyyah prototype
stored its data in a tab named `Wasiyyah` (Key | Value JSON rows), created
lazily. ZakatFlow must not create, read or change that tab, and Wasiyyah must
not touch the Zakat tabs. That keeps the two products separable: either can be
used without the other.

## What stays out of V1

No will screens, no faraid (inheritance) engine, no estate API route and no
`Wasiyyah` tab code live in this repo. The prototype that was built on branch
`claude/focused-mayer-e62g3h` (commit 17c9645) moves to AtomAyman/wasiyyah.

## How V2 connects

1. Wasiyyah imports `WealthSnapshot` (copied type or a shared package) and
   asks ZakatFlow for one, either in-process if it is mounted as a route, or
   through a small export the user triggers if it runs as a separate app.
2. Set `NEXT_PUBLIC_MODULE_WASIYYAH=true` (and `NEXT_PUBLIC_WASIYYAH_URL` if it
   is a separate app) in the ZakatFlow deployment.
3. Nothing else in ZakatFlow needs to change.
