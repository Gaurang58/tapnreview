# 09 Role test report

**Date:** 6 November 2026. **Where:** local server (`npm run dev:webpack`, http://localhost:3000) against the real Supabase project, with the four demo logins. Each role was signed in through the real sign-in form in the browser, then every page and download was requested as that person.

## Result in one line

All four roles see exactly what they should and nothing else. One small fault was found (wrong status code for hidden stores) and fixed. No data leaked in any case.

## What each role can reach

`200` = opens, `404` = hidden (the page does not exist for that person).

| Page / download | Admin | Area manager (Area 1) | Bureau manager (West Bridgford) | Staff (West Bridgford) |
| --- | --- | --- | --- | --- |
| Overview | 200 | 200 | 200 | 200 |
| Insights | 200 | 200 | 200 | 200 |
| Tags | 200 | 200 | 200 | **404** |
| People | 200 | 200 | 200 | **404** |
| Areas and stores | 200 | 200 | **404** | **404** |
| Audit log | 200 | 200 | **404** | **404** |
| Daily CSV / by-store CSV | 200 / 200 | 200 / 200 | 200 / 200 | 200 / 200 |
| Live feed | 200 | 200 | 200 | 200 |
| Menu shown | Overview, Tags, Areas and stores, People, Insights, Audit log | same as Admin | Overview, Tags, People, Insights | Overview, Insights |

## What data each role sees

| Role | Stores in the by-store CSV | Store pages |
| --- | --- | --- |
| Admin | 12 (all three areas) | all 12 open |
| Area manager | 4 (Derby, Leicester, Nottingham Bulwell, Nottingham West Bridgford) | those 4 open; Liverpool and Birmingham (other areas) are 404 |
| Bureau manager | 1 (West Bridgford) | West Bridgford opens; Bulwell, Derby, Liverpool are 404 |
| Staff | 1 (West Bridgford) | West Bridgford opens, with no buttons or forms on it; Bulwell and Liverpool are 404 |

Other things confirmed:

- The Bureau manager's invitation form offers only the **Staff** role and only **their own store**; their Tags form offers only their own store.
- The sidebar shows each person's name and role badge.
- **Sign out** from the dashboard lands on the home page. It is now pinned to the bottom of the screen and stays visible however far the page is scrolled (checked after scrolling 1,570 px down a 2,337 px page).
- Admin figures agree across screens (Overview, both CSVs and Insights, from the earlier milestone 9 check).

## Problem found and fixed

**Hidden stores returned "200 OK" instead of 404.** For a store outside someone's scope (for example an Area manager opening a Liverpool store link), the page showed "not found" and contained no data, but the HTTP status was 200 because the loading skeleton starts streaming before the permission check. Same cause as the earlier Audit log fault. The check now runs in a layout first. Re-tested: in-scope stores 200, out-of-scope stores 404, a malformed address 404.

## Automated checks run the same day

| Check | Result |
| --- | --- |
| Unit tests | 56 passed |
| Database rule checks (local throwaway database) | all passed |
| Live-API access tests (the four roles against the real database) | 23 passed |
| Typecheck, lint, production build | clean |

## Not covered by this run

- Writes through the screens (creating a store, inviting a person) were not clicked through for every role. The database rules for those are covered by the 95 database checks and the 23 live-API tests, which include creating, renaming and retiring a tag as a Bureau manager and refusing all writes from Staff.
- Phone-width behaviour of the dashboard for each role was checked in earlier milestones, not in this run.
- Everything above was on the local server. The live site has not been tested with sign-in.
