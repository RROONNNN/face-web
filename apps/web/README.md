# Face Web Admin Portal

Next.js admin portal for the attendance backend in `apps/api`.

## Environment

Create `apps/web/.env.local` from `.env.local.example`:

```bash
API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

`API_BASE_URL` is used only by server-side Next.js code. The public socket URL
is used by the dashboard realtime listener.

## Development

From the repository root:

```bash
npm run dev
```

Or run the apps separately:

```bash
npm run dev:api
npm run dev:web
```

The API runs on `http://localhost:3001` and the web app runs on
`http://localhost:3000`.

## Seed Data

Run backend migrations and seed data before using the portal. Attendance manual
creation depends on at least one active shift; if no active shift exists, create
one under **Shifts** and activate it before adding attendance events.

## Verification

```bash
npm run lint -w @face-web/web
npm run build -w @face-web/web
```
