# Face Web

Full-stack npm workspace monorepo with a NestJS API and a Next.js web app.

## Workspaces

- `apps/api` - NestJS backend
- `apps/web` - Next.js frontend
- `packages/shared` - shared TypeScript types

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

The API runs on `http://localhost:3001` by default.
The web app runs on the default Next.js development port, usually
`http://localhost:3000`.

## Useful Commands

```bash
npm run dev:api
npm run dev:web
npm run build
npm run lint
npm run test
```
