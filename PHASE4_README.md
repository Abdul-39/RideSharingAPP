# Phase 4 — Route and Daily Schedule Management

No matching yet — only route + schedule CRUD for daily commuters.

## APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/routes` | Create route + schedule(s) |
| GET | `/api/v1/routes/my` | My routes |
| GET | `/api/v1/routes/{id}` | Get one (owner/admin) |
| PUT | `/api/v1/routes/{id}` | Update route + schedules |
| DELETE | `/api/v1/routes/{id}` | Soft-delete route + schedules |

## Request body example

```json
{
  "sourceLatitude": 31.4697,
  "sourceLongitude": 74.2728,
  "sourceAddress": "DHA Phase 5, Lahore",
  "destinationLatitude": 31.5204,
  "destinationLongitude": 74.3587,
  "destinationAddress": "Gulberg III, Lahore",
  "preferredDepartureTime": "08:00",
  "maximumTimeToleranceMinutes": 15,
  "isActive": true,
  "schedules": [
    {
      "monday": true,
      "tuesday": true,
      "wednesday": true,
      "thursday": true,
      "friday": true,
      "saturday": false,
      "sunday": false,
      "isActive": true
    }
  ]
}
```

## Validation
- Lat: -90..90, Lng: -180..180
- Addresses required
- Departure time HH:mm
- Tolerance 0–120 minutes
- Each schedule must have ≥1 day

## Angular
- `/routes` — list
- `/routes/add` — create with days
- `/routes/edit/:id` — edit

## No new migration required
Uses existing `Routes` and `RideSchedules` tables from Phase 1.

## Test
1. Login
2. Add route Home→Office, Mon–Fri, 08:00, ±15
3. List my routes
4. Edit / delete
5. Another user cannot access your route id
