# Phase 7 — Angular Dashboard & UX

## What was added
- App shell with responsive top nav + mobile bottom nav
- Role-based dashboard (Passenger / Driver) fed by real APIs
- Notifications page (empty state — no fake data)
- Settings page (account + API URL)
- Toast service + confirm dialog overlays
- Loading / empty / error states on dashboard
- Lazy-loaded routes under `/app/*`
- Public landing at `/`

## Run
```bash
cd RideSharing.Web
npm install
ng serve
```
Open http://localhost:4200

Login → redirects to `/app/dashboard`

## Nav
Dashboard · My Routes · Rides · My Rides · Profile · Vehicle (drivers) · Notifications · Settings

## Notes
- Angular Material / Ionic full packages were not forced (avoids Angular 20 peer conflicts). UI follows Material-inspired components + Tailwind-like design tokens + Ionic-style mobile bottom nav.
- All dashboard widgets call existing backend endpoints; empty states show when APIs return no data.
