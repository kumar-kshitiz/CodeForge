# Team competition realtime updates

Run `npm run dev --workspace=team-competition-service` (or the root development command).
REST and Socket.IO share the existing service port, default 3002. No extra service is required.

The web client connects using WebSocket transport at `/socket.io/`, passing its access JWT
in `auth.token`. The server verifies the signature and expiry and assigns a private user room.
Connections are closed when the access token expires. A new auth-store token creates a new connection.
No public room-join or game-state-write socket events are accepted.

Committed match changes publish identifiers through Redis Pub/Sub. Each service instance sends
`match:changed` (`matchId`, `deleted`) only to affected users. Clients fetch fresh state through
the authenticated REST endpoints. Reconnect and window focus resynchronize state. A 15-second
refresh runs while disconnected; connected clients reconcile at most once per minute when idle.
Commands such as joining, drafting, and submitting answers still use validated REST routes.

Live matches get server-side deadline timers, restored when a participant reconnects. Timers
are in process: after a restart with no connected users, expiry is finalized on the next access.
Redis Pub/Sub is not durable; resynchronization recovers missed notifications.
Production requires Redis. Development retains the existing single-process memory fallback.

Set `FRONTEND_URL` to the exact allowed browser origin and share `JWT_ACCESS_SECRET` with the API.
Set the frontend's `NEXT_PUBLIC_TEAM_COMPETITION_URL` to the public service origin.
Production proxies must forward WebSocket Upgrade requests for `/socket.io/` and use TLS (wss).
Redis broadcasts let sockets connect to different replicas; WebSocket-only transport does not
require polling-session stickiness.

Verification: build the service, then run `node --test tests/realtime.test.cjs` from this directory.
The test uses real WebSocket clients with a stubbed store; it checks auth, origin restrictions,
user isolation, reconnect, deletion events, token expiry, and deadline scheduling.
