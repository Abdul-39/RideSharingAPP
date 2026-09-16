# Phase 5 — Ride Request and Smart Matching

## APIs
- POST /api/v1/ride-requests
- GET /api/v1/ride-requests/my
- GET /api/v1/ride-requests/{id}
- POST /api/v1/ride-requests/{id}/cancel
- POST /api/v1/ride-requests/{id}/match   ← run ranked matching
- GET /api/v1/ride-requests/{id}/matches
- POST /api/v1/ride-requests/matches/{matchId}/respond  { "accept": true|false }

## Matching score (ranked, not random)
Match Score =
  Source Proximity (25) + Destination Proximity (25) + Route Similarity (20)
  + Time Compatibility (20) + Verification (5) + Preference/Capacity (5)

Hard filters: seats, gender, time tolerance (±15 default), driver available, max 5km source/dest.

## Migration
```bash
dotnet ef migrations add AddRideRequestsAndMatches \
  --project src/RideSharing.Persistence \
  --startup-project src/RideSharing.API \
  --context RideSharingDbContext

dotnet ef database update \
  --project src/RideSharing.Persistence \
  --startup-project src/RideSharing.API \
  --context RideSharingDbContext
```

## Unit tests
```bash
dotnet test tests/RideSharing.Application.Tests
```

## Angular
- /rides — my requests
- /rides/find — create + match
- /rides/:id/matches — ranked results, accept/reject

No GPS tracking or payments in this phase.
