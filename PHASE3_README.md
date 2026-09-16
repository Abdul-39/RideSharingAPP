# Phase 3 — User, Driver & Vehicle Management

Built on your Phase 1 + Phase 2 project. Existing configs preserved.

## New API endpoints

### Users (Authorize)
- `GET  /api/v1/users/me`
- `PUT  /api/v1/users/me`
- `POST /api/v1/users/profile-image`  (multipart file field: `file`)

### Drivers (Authorize Roles: Driver, Admin)
- `GET  /api/v1/drivers/me`
- `PUT  /api/v1/drivers/me`

### Vehicles (Authorize)
- `GET    /api/v1/vehicles`           — my vehicles
- `GET    /api/v1/vehicles?all=true`  — all (Admin only)
- `GET    /api/v1/vehicles/types`     — Car, Bike, Van
- `GET    /api/v1/vehicles/{id}`      — owner or Admin
- `POST   /api/v1/vehicles`           — Driver/Admin
- `PUT    /api/v1/vehicles/{id}`      — owner or Admin
- `DELETE /api/v1/vehicles/{id}`      — owner or Admin (soft delete)

## Security
- Passenger cannot modify another user’s vehicle (ownership check + Forbid)
- Admin can manage all vehicles
- Driver-only endpoints protected by `[Authorize(Roles = "Driver,Admin")]`

## New DB objects
- Table: `DriverProfiles`
- Seed data: VehicleTypes Car, Bike, Van

## Migration commands

```bash
dotnet ef migrations add AddDriverProfilesAndVehicleTypeSeed \
  --project src/RideSharing.Persistence \
  --startup-project src/RideSharing.API \
  --context RideSharingDbContext

dotnet ef database update \
  --project src/RideSharing.Persistence \
  --startup-project src/RideSharing.API \
  --context RideSharingDbContext
```

## Angular pages
- `/profile` — edit name, phone, gender, DOB, image
- `/driver-profile` — license, experience, availability (Driver role)
- `/vehicles` — list / delete
- `/vehicles/add` — create
- `/vehicles/edit/:id` — update

## Test
1. Login as Driver
2. Update profile
3. Save driver profile
4. Add vehicle
5. Edit / delete own vehicle
6. Login as Passenger → try POST vehicle → 403
