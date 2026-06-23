# PRD — eFootball League/Cup Manager

## Problem Statement (original)
Existing FastAPI + React + MongoDB app to manage an eFootball league. Iterations:
1. Mobile refresh bug: refreshing/first-open bounced users to the team-building (onboarding) screen — must start on home and keep the current tab on refresh.
2. Mobile homepage: standings & fixtures required horizontal scroll. Add a small live preview that fits the screen; tapping expands into a vertically-scrolled section.
3. New "Cup" (Kupa) mode alongside existing "League" (Turnuva) mode (UCL-style knockout, no group stage).
4. Deliver the full system as a zip (including .env) over chat.

## Tech Stack
- Backend: FastAPI (`/app/backend/server.py`), MongoDB (motor), JWT auth, Cloudinary, web-push.
- Frontend: React (CRA + craco), Tailwind, lucide-react, sonner, html2canvas, react-router v7.

## User Personas
- Admin (neco): creates league/cup, enters results, manages teams/users/magazine.
- Manager (user): owns a team, builds squad, views standings/fixtures or cup bracket.

## Core Requirements (static)
- League mode unchanged: double round-robin, standings, fixtures, day summary.
- Cup mode: random 2-by-2 draw; odd team → one bye (auto-advance); single match; draw → admin picks penalty winner; winners auto-paired (UCL bracket) only after the whole round finishes; magazine "N. Tur Atlayanları" auto-published per completed round + "Şampiyon" on final; tournament summary PNG (bracket + top-scoring team + champion).
- Mobile: no horizontal overflow anywhere; preview-first sections.

## Implemented (2026-06-23)
- FIX: `AuthContext.refreshUser` loads team BEFORE setting user → no more onboarding bounce on mobile refresh. Verified with slow-network sim.
- Cup engine (backend): `mode` on tournament; endpoints `/admin/cup/draw`, `/admin/cup/reset`, `/admin/cup/match/{id}/result`, `/cup/bracket`, `/cup/summary`; `create_cup_round`, `maybe_advance_round`, byes, penalty winner, magazine auto-publish, champion detection, top-scorer-team. 16/16 backend tests passed.
- Frontend: responsive `StandingsTable` (cols collapse on mobile), `FixtureScroll` vertical mode + `MatchRow`, `HomeSections` (ExpandableSection + previews), `CupBracket` (round tabs + summary PNG modal), Dashboard branches league/cup with mobile preview-first layout, Admin mode selector (Turnuva/Kupa) + `CupTab` results entry with penalty radio + conditional tabs.
- Verified at 390px: zero horizontal overflow on league dashboard, cup dashboard, and admin cup tab.

## Delivery
- Zip (with .env): /app/frontend/public/premier-ligi-kupa.zip → https://homepage-anchor.preview.emergentagent.com/premier-ligi-kupa.zip

## Backlog / Next
- P2: filter magazine per-tournament (currently global — pre-existing behavior).
- P2: make auto-advance push notifications opt-in to avoid spam during rapid result entry.
- P2: optional two-leg cup format; structured error codes for i18n.
