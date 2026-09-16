# Phase 8 — Google Maps & GPS

## Backend
- `UserLocations` table (not on Users)
- `IMapsService` / `GoogleMapsService` (key from config/env)
- `ILocationService` / `LocationService`
- `LocationsController`: me, route, nearby-drivers, search
- Privacy: live tracking only on active ride states; share modes

## Config (never commit real keys)
```bash
# User secrets (API project)
dotnet user-secrets set "GoogleMaps:ApiKey" "YOUR_KEY" --project src/RideSharing.API

# Or environment variable
set GOOGLE_MAPS_API_KEY=YOUR_KEY
```

appsettings.json has empty `GoogleMaps:ApiKey`. Without a key, Haversine distance/ETA still works.

## Migration
```bash
dotnet ef migrations add AddUserLocations --project src/RideSharing.Persistence --startup-project src/RideSharing.API
dotnet ef database update --project src/RideSharing.Persistence --startup-project src/RideSharing.API
```

If migration history is broken, create table manually in SSMS from entity shape.

## Frontend
- `MapComponent`, `RouteMapComponent`, `DriverMapComponent`
- `GeolocationService`, `LocationApiService`
- Page: `/app/gps` or `/gps`
- Set `environment.googleMapsApiKey` locally for interactive Google map tiles

## Test checklist
1. Allow location permission → coords + accuracy + timestamp
2. Share location to API
3. Source/destination → route distance + ETA
4. Nearby drivers (needs another user sharing location)
5. Deny permission → error state
6. No API key → fallback estimate still returns distance/ETA
