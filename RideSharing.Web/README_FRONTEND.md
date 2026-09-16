# RideSharing.Web – Phase 2 Frontend

## Run

```bash
cd RideSharing.Web
npm install
ng serve
```

Open: http://localhost:4200

## IMPORTANT: Set API URL

1. Start backend: `dotnet run` in `src/RideSharing.API`
2. Copy the URL from console (e.g. https://localhost:7038)
3. Edit `src/environments/environment.ts`:

```ts
apiUrl: 'https://localhost:7038/api/v1',   // your port here
```

If SSL errors appear, use HTTP:
```ts
apiUrl: 'http://localhost:5280/api/v1',
```

## Pages

- `/` – Home / Dashboard
- `/auth` – Login
- `/auth/register` – Register (Passenger or Driver)

## Includes

- AuthService (login, register, refresh, logout)
- AuthGuard, RoleGuard
- AuthInterceptor (Bearer token + auto refresh)
- Login & Register UI
