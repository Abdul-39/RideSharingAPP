# Phase 9 — SignalR Real-Time

## Hub
- URL: `/hubs/ride`
- JWT: query `access_token` or accessTokenFactory
- Group: `ride-{rideId}` (participants only)

## Client methods
- JoinRide, LeaveRide, SendLocation

## Server events
- ReceiveRideStatus, ReceiveLocation, ReceiveNotification, JoinedRide

## Angular
```bash
npm install
# uses @microsoft/signalr
```

## Test
1. Driver + Passenger open same ride detail
2. See "Live updates connected"
3. Confirm / arriving / start / complete updates the other browser live
