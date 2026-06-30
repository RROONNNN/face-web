# Web Admin Portal Plan

This plan is based on the repository state inspected on 2026-06-23. No frontend feature code has been created.

## 1. Current Tooling And Setup

### Package Manager And Workspace

- Package manager: npm, confirmed by `package-lock.json` lockfile version 3.
- Workspace tool: npm workspaces via root `package.json`.
- Workspaces:
  - `apps/api` -> `@face-web/api`
  - `apps/web` -> `@face-web/web`
  - `packages/shared` -> `@face-web/shared`
- No pnpm, Yarn, Turbo, or Nx workspace config was found.

### Root Scripts

| Script | Command |
| --- | --- |
| `npm run dev` | Runs API and web concurrently |
| `npm run dev:api` | Runs Nest API watch mode |
| `npm run dev:web` | Runs Next dev server |
| `npm run build` | Builds API then web |
| `npm run build:api` | Builds API only |
| `npm run build:web` | Builds web only |
| `npm run lint` | Lints API then web |
| `npm run test` | Runs API tests |
| `npm run test:e2e` | Runs API e2e tests |
| `npm run format` | Runs API Prettier format script |

### API Tooling

- Framework: NestJS 11.
- Database: PostgreSQL via TypeORM.
- Validation: `class-validator` and `class-transformer`, wired globally in `apps/api/src/main.ts`.
- Scheduling: `@nestjs/schedule`.
- Tests: Jest with `ts-jest`.
- API default port: `3001`.
- API global prefix: `/api`.
- CORS: `origin: true`, `credentials: true`.

API scripts:

| Script | Command |
| --- | --- |
| `build` | `nest build` |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` |
| `start:dev` | `nest start --watch` |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` |
| `test` | `jest` |
| `typeorm` | `typeorm-ts-node-commonjs -d src/database/data-source.ts` |
| `migration:*` | TypeORM generate/run/revert |
| `seed:admin` | Seeds an admin user |

### Web Tooling

- Framework: Next.js `^16.2.2` with App Router.
- React: `^19.2.0`.
- Web default API env var: `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- `next.config.ts` sets Turbopack root to the monorepo root.
- Existing web app is still a minimal scaffold with `src/app/layout.tsx`, `src/app/page.tsx`, and `globals.css`.

Web scripts:

| Script | Command |
| --- | --- |
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint .` |

### Linting, Formatting, TypeScript

- Root Prettier config: single quotes and trailing commas.
- API ESLint: flat config using `@eslint/js`, `typescript-eslint` type-checked rules, `eslint-plugin-prettier/recommended`, Node/Jest globals. Prettier rule is currently off.
- Web ESLint: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- API TypeScript:
  - `module` and `moduleResolution`: `nodenext`
  - `target`: `ES2023`
  - decorators enabled
  - `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`, `noFallthroughCasesInSwitch`
  - `isolatedModules`, `declaration`, `incremental`
- Web TypeScript:
  - strict mode enabled
  - `moduleResolution: "bundler"`
  - `jsx: "react-jsx"`
  - path alias `@/* -> ./src/*`
  - Next TypeScript plugin enabled
- Shared package currently exports only a small set of leave and pagination types.

## 2. Backend Modules And API Endpoints

All endpoint paths below include the global `/api` prefix.

### Module Inventory

| Module | Purpose |
| --- | --- |
| `AppModule` | Root Nest module, config, TypeORM, global interceptors/filter, logger middleware |
| `AuthModule` | Login, refresh, logout, admin registration, JWT guard, role guard |
| `UsersModule` | Admin employee listing, detail, update, deactivate |
| `DepartmentsModule` | Department CRUD and default shift mapping |
| `ShiftsModule` | Shift CRUD, shift assignments, assignment generation |
| `AttendanceModule` | Check-in/out, offline sync, admin manual adjustments, attendance listing, end-of-day finalize |
| `LeaveModule` | Employee leave requests and admin approval/rejection |
| `HolidaysModule` | Holiday CRUD and Excel import |
| `Common` | Query DTO, pagination meta, interceptors, exception filter |
| `Config` | Database and JWT config |
| `Database` | Migrations and seeds |

### Root

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api` | Public | Returns `AppService.getHello()` string inside success envelope |

### Auth

| Method | Path | Auth | Body / Query | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | `{ employeeCode, password }` | Login |
| `POST` | `/api/auth/register` | Bearer + admin | `CreateUserDto` | Create employee/admin user |
| `POST` | `/api/auth/refresh` | Public | `{ refreshToken }` | Rotate refresh token and return new access token |
| `POST` | `/api/auth/logout` | Bearer | `{ userId, refreshToken? }` | Revoke matching refresh token, or all active tokens for `userId` |

### Users

Controller-level auth: Bearer token required, admin role required.

| Method | Path | Query / Body | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/users` | `page`, `limit`, `search`, `departmentId`, `accountRole`, `isActive`, `sortBy`, `sortOrder` | Paginated employees/admins |
| `GET` | `/api/users/:id` | UUID path param | User detail |
| `PATCH` | `/api/users/:id` | partial `CreateUserDto` | Update user |
| `PATCH` | `/api/users/:id/deactivate` | UUID path param | Soft deactivate user |

There is no `POST /api/users`; user creation is through `POST /api/auth/register`.

### Departments

Current controller has no `AuthGuard` or role guard.

| Method | Path | Query / Body | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/departments` | `page`, `limit`, `search`, `isActive`, `sortBy`, `sortOrder` | Paginated departments |
| `GET` | `/api/departments/:id` | UUID path param | Department detail |
| `POST` | `/api/departments` | `{ code, name, description?, isActive?, defaultShiftId }` | Create department |
| `PATCH` | `/api/departments/:id` | partial create body | Update department |

### Shifts

Current controller has no `AuthGuard` or role guard.

| Method | Path | Query / Body | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/shifts` | `page`, `limit`, `search`, `isActive`, `sortBy`, `sortOrder` | Paginated shifts with work periods |
| `POST` | `/api/shifts` | `{ name, lateGraceMinutes?, isActive?, workPeriods[] }` | Create shift |
| `PATCH` | `/api/shifts/:id` | partial shift body | Update shift |
| `PATCH` | `/api/shifts/:id/deactivate` | UUID path param | Soft deactivate shift |
| `GET` | `/api/shifts/assignments` | `page`, `limit`, `employeeId`, `shiftId`, `workDate`, `dateFrom`, `dateTo`, `source`, `sortBy`, `sortOrder` | Paginated shift assignments |
| `POST` | `/api/shifts/assignments` | `{ employeeId, shiftId, workDate, note? }` | Upsert one assignment |
| `POST` | `/api/shifts/assignments/generate` | query `startDate?`, `endDate?`, `employeeId?` | Generate department-default assignments |

### Attendance

Controller-level auth: Bearer token required. Role varies by route.

| Method | Path | Roles | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/attendance/check-in` | employee, admin | `{ employeeId, occurredAt, source, faceSimilarity?, latitude?, longitude?, deviceId? }` | Check in |
| `POST` | `/api/attendance/check-out` | employee, admin | same as check-in | Check out |
| `POST` | `/api/attendance/sync/check-in-out` | employee, admin | array of sync events with `localId` and `isCheckIn` | Offline check-in/check-out sync |
| `POST` | `/api/attendance/manual/check-in` | admin | `{ employeeId, workDate, occurredAt, faceSimilarity?, latitude?, longitude?, note? }` | Admin manual check-in |
| `POST` | `/api/attendance/manual/check-out` | admin | `{ employeeId, workDate, occurredAt, latitude?, longitude?, note? }` | Admin manual check-out |
| `GET` | `/api/attendance` | admin | `employeeId?`, `date?`, `status?`, `page`, `limit` | Paginated attendance records |
| `POST` | `/api/attendance/admin/finalize-day` | admin | `{ workDate }` | Mark pending records absent and checked-in records missing checkout |

### Leave

Controller-level auth: Bearer token required.

| Method | Path | Roles | Query / Body | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/leave` | employee | `{ startDate, endDate, reason, partialDays?, departmentShiftId }` | Employee creates leave request |
| `GET` | `/api/leave/me` | employee | `status?`, `employeeId?`, `fromDate?`, `toDate?`, `page`, `limit` | Employee's leave requests |
| `GET` | `/api/leave` | admin | same query | Admin leave request list |
| `GET` | `/api/leave/:id` | admin, employee | UUID path param | Leave request detail |
| `PUT` | `/api/leave/:id/cancel` | employee | UUID path param | Employee cancels pending request |
| `PUT` | `/api/leave/:id/approve` | admin | UUID path param | Admin approves pending request |
| `PUT` | `/api/leave/:id/reject` | admin | `{ reason }` | Admin rejects pending request |

### Holidays

Current controller has no `AuthGuard` or role guard.

| Method | Path | Query / Body | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/holidays` | `page`, `limit`, `year`, `search`, `sortBy`, `sortOrder` | Paginated holidays |
| `GET` | `/api/holidays/:id` | UUID path param | Holiday detail |
| `POST` | `/api/holidays` | `{ date, name, description? }` | Create holiday |
| `PATCH` | `/api/holidays/:id` | partial create body | Update holiday |
| `DELETE` | `/api/holidays/:id` | UUID path param | Delete holiday, `204 No Content` |
| `POST` | `/api/holidays/import` | multipart `file`, xlsx/xls, max 5 MB | Bulk import holidays |

## 3. Authentication Flow

### Login

Request:

```json
{
  "employeeCode": "ADMIN001",
  "password": "secret"
}
```

Successful response payload inside the common envelope:

```json
{
  "accessToken": "jwt",
  "refreshToken": "raw-refresh-token",
  "user": {
    "id": "uuid",
    "employeeCode": "ADMIN001",
    "name": "System Admin",
    "accountRole": "admin"
  }
}
```

The JWT access token payload contains:

```ts
{
  sub: string;
  employeeCode: string;
  role: 'admin' | 'employee';
}
```

`AuthGuard` expects:

```http
Authorization: Bearer <accessToken>
```

and maps the verified token to:

```ts
{
  id: payload.sub,
  employeeCode: payload.employeeCode,
  roles: [payload.role]
}
```

### Refresh

- Endpoint: `POST /api/auth/refresh`.
- Body: `{ refreshToken }`.
- Refresh tokens are random raw tokens returned to the client and stored hashed in the database.
- On refresh, the old refresh token is revoked and a new refresh token is created.
- Response shape matches login: new `accessToken`, new `refreshToken`, and `user`.

### Logout

- Endpoint: `POST /api/auth/logout`.
- Requires Bearer access token.
- Body: `{ userId, refreshToken? }`.
- If `refreshToken` is supplied, the service revokes the matching active token for `userId`.
- If `refreshToken` is omitted, the service revokes all active refresh tokens for `userId`.

Frontend note: the API trusts `userId` from the body rather than deriving it from the authenticated token. Treat this as an API gap before production use.

### Current User Endpoint

No current-user endpoint was found. There is no `GET /api/auth/me` or `GET /api/users/me`.

Frontend fallback for the first PR can decode the access token or use the `user` object returned by login/refresh, but a real admin portal should get session state from a server-verified endpoint.

### Roles

Roles are defined by `AccountRole`:

- `admin`
- `employee`

Admin-only routes currently include users, auth register, admin attendance listing/manual actions/finalize, and admin leave review routes. Some admin-domain controllers are currently unguarded and are listed in the gaps section.

## 4. Common API Response And Error Formats

### Success Envelope

`TransformInterceptor` wraps controller return values:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-06-23T00:00:00.000Z"
}
```

Paginated endpoints return:

```json
{
  "success": true,
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  },
  "timestamp": "2026-06-23T00:00:00.000Z"
}
```

### Error Envelope

`AllExceptionsFilter` replies with:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation message",
  "timestamp": "2026-06-23T00:00:00.000Z",
  "path": "/api/example"
}
```

Validation errors with multiple messages are flattened into one comma-separated string.

### Error Handling Caveat

`ErrorsInterceptor` converts non-`HttpException` errors into `502 Bad Gateway` with message `Something went wrong`. Some code paths throw plain `Error`, for example login when the employee code is missing and holiday import when no file is uploaded. Those will not preserve their original message/status.

## 5. Pagination, Filtering, Sorting, Dates, Validation

### Pagination

Most list endpoints use:

- `page`: integer, min 1, default 1.
- `limit`: integer, min 1, default 20.
- Leave list also caps `limit` at 100.
- Pagination response meta: `{ page, limit, total, totalPages }`.

### Filtering

Common filters:

- `search`: trimmed string, partial case-insensitive matching where implemented.
- Boolean filters like `isActive` accept query strings `"true"` and `"false"`.
- UUID filters use `IsUUID` and/or `ParseUUIDPipe`.

Endpoint-specific filters:

- Users: `departmentId`, `accountRole`, `isActive`.
- Departments: `isActive`.
- Shifts: `isActive`.
- Shift assignments: `employeeId`, `shiftId`, `workDate`, `dateFrom`, `dateTo`, `source`.
- Attendance: `employeeId`, `date`, `status`.
- Leave: `status`, `employeeId`, `fromDate`, `toDate`.
- Holidays: `year`, `search`.

### Sorting

Sort order is uppercase only:

- `ASC`
- `DESC`

Sort fields:

- Common `QueryDto`: `name`, `code`, `createdAt`.
- Users: `name`, `employeeCode`, `createdAt`.
- Holidays: `date`, `name`, `createdAt`.
- Shift assignments: `workDate`, `createdAt`.
- Attendance and leave currently have fixed service-level ordering and no `sortBy` query.

### Date And Time Formats

- Date-only values are generally `YYYY-MM-DD`.
- Leave DTOs enforce strict `YYYY-MM-DD` with regex.
- Shift work period times are `HH:mm`, 24-hour format.
- Attendance event `occurredAt` is ISO date-time accepted by `IsDateString`.
- API timestamps and persisted `timestamptz` values serialize as ISO strings.
- Application timezone defaults to `Asia/Ho_Chi_Minh`.
- Some cutoff logic uses `APP_TZ_OFFSET`, default `+07:00`.
- Holiday Excel import accepts `YYYY-MM-DD`, `dd/mm/yyyy`, and Excel serial dates.

### Validation

Global `ValidationPipe` settings:

- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

Frontend forms should submit only DTO-supported fields. Unknown properties cause validation errors rather than being ignored.

## 6. Proposed Admin Portal Sitemap

This sitemap uses only currently available APIs.

- `/login`
  - Admin login via `POST /api/auth/login`.
- `/`
  - Redirect authenticated admins to `/dashboard`; redirect unauthenticated users to `/login`.
- `/dashboard`
  - Daily attendance operations overview backed by `GET /api/attendance/admin/dashboard`.
- `/employees`
  - Employee/admin table from `GET /api/users`.
  - Filters: search, department, role, active status.
- `/employees/new`
  - Create employee/admin through `POST /api/auth/register`.
- `/employees/[id]`
  - Detail and edit from `GET /api/users/:id`, `PATCH /api/users/:id`, `PATCH /api/users/:id/deactivate`.
- `/departments`
  - Department list and create/edit using departments APIs.
- `/departments/[id]`
  - Department detail/edit.
- `/shifts`
  - Shift list and create/edit/deactivate.
- `/shifts/[id]`
  - Shift detail/edit work periods.
- `/shift-assignments`
  - Assignment calendar/table from `GET /api/shifts/assignments`.
  - Manual assignment via `POST /api/shifts/assignments`.
  - Generate assignments via `POST /api/shifts/assignments/generate`.
- `/attendance`
  - Attendance records from `GET /api/attendance`.
  - Manual check-in/check-out actions.
  - Finalize day action.
- `/leave-requests`
  - Admin list from `GET /api/leave`.
  - Approve/reject pending requests.
- `/leave-requests/[id]`
  - Request detail from `GET /api/leave/:id`.
- `/holidays`
  - Holiday list/create/edit/delete and Excel import.
- `/settings/session`
  - Local session display and logout. This should become a real account/session page after a current-user endpoint exists.

## 7. Recommended Frontend Architecture

### Application Shape

- Keep `apps/web` as a Next.js App Router application.
- Use route groups:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(admin)/layout.tsx`
  - `src/app/(admin)/dashboard/page.tsx`
  - feature routes under `(admin)`.
- For Next.js 16, use `proxy.ts` at app root for route protection if middleware/proxy-based redirects are needed.
- Use Server Components for read-heavy pages where possible.
- Use Server Actions for form mutations where practical.
- Use small client components for tables, filters, dialogs, date pickers, and optimistic UI.

### API Client

- Add a typed API client under `src/lib/api/`.
- Normalize the common envelope into either `data` or a typed error.
- Keep endpoint-specific query builders, because filters and sorting are not fully uniform.
- Centralize auth token attachment and refresh handling.
- Prefer server-side API calls for admin pages so access tokens can be kept out of browser JavaScript if the auth storage model is moved to HTTP-only cookies.

### Auth Storage

Recommended production direction:

- Store refresh token in an HTTP-only, secure cookie through a Next route handler or server action.
- Keep access token short-lived and either server-side only or in memory.
- Add a backend current-user endpoint before relying on persisted client user state.

Pragmatic first implementation if backend remains unchanged:

- Store tokens in a client session layer with clear logout behavior.
- Rehydrate user from login/refresh response.
- Decode JWT only as a temporary display/routing fallback, not as authorization truth.

### State And UI

- Start with URL search params for table pagination/filter/sort state.
- Use feature folders, for example:
  - `src/features/auth`
  - `src/features/users`
  - `src/features/departments`
  - `src/features/shifts`
  - `src/features/attendance`
  - `src/features/leave`
  - `src/features/holidays`
- Add shared primitives under `src/components/ui` only as they are needed.
- Put generated or hand-written API types in `src/lib/api/types.ts`, then later migrate reusable DTOs to `packages/shared` once API contracts stabilize.
- Build route-level `error.tsx`, `loading.tsx`, and `not-found.tsx` for the admin shell.

### Validation Strategy

- Mirror backend DTO constraints in frontend schemas.
- Use `YYYY-MM-DD` for date-only inputs and ISO date-time strings for attendance events.
- Prevent submitting unknown/empty fields where the backend rejects them.

## 8. Feature Implementation Order

Each item is intentionally small enough for one PR.

1. [x] Web foundation: admin route groups, base layout, environment config, API envelope/error utilities.
2. [x] Login/logout flow: login page, token/session persistence, protected admin routes, refresh request helper.
3. [x] Admin shell: sidebar/topbar, route loading/error boundaries.
4. [x] Users list: `/employees` table with pagination, search, role/department/active filters.
5. [x] User create: `/employees/new` using `POST /api/auth/register`.
6. [x] User detail/edit/deactivate: `/employees/[id]`.
7. [x] Shifts list and detail: list shifts, create/edit shift, work period editor, deactivate.
8. [x] Departments list and edit: department CRUD with default shift selector.
9. [x] Shift assignments list: filters by employee/shift/date/source.
10. [x] Shift assignment actions: upsert assignment and generate assignments for a date range.
11. Attendance list: filters by employee/date/status and record detail display.
12. Attendance admin actions: manual check-in, manual check-out, finalize day.
13. Leave request list: admin filters and status-focused table.
14. Leave request review: detail page, approve, reject with reason.
15. Holidays list and CRUD.
16. Holiday Excel import.
17. Shared API type extraction: move stable enums/interfaces into `packages/shared` and consume from web.
18. Production auth hardening PR after backend gaps are resolved.
19. [x] Dashboard: daily attendance operations summary backed by the dedicated admin dashboard API.

## 9. API Gaps Or Inconsistencies Blocking Frontend

### Blocking Or High Priority

- Missing current-user endpoint. The admin portal needs `GET /api/auth/me` or equivalent to verify a restored session and role after reload.
- Departments, shifts, and holidays controllers are unguarded. These are admin portal management surfaces and should require Bearer auth plus admin role before frontend production use.
- Logout takes `userId` from the request body instead of the authenticated token. A logged-in caller can request logout for a different `userId` if they know it.
- Access and refresh tokens are returned only in JSON. This is workable for a first UI but not ideal for a secure web admin portal. A cookie-compatible auth flow or BFF route-handler strategy is recommended.

### Non-Blocking But Should Be Fixed

- Some invalid credential paths throw plain `Error`, which becomes `502 Something went wrong` instead of `401 Invalid employee code or password`.
- Holiday import missing-file and file-filter errors can become generic `502` because they are plain errors.
- `DELETE /api/holidays/:id` uses `204 No Content` while the global transform interceptor generally wraps responses. The actual client behavior should be verified.
- `POST /api/attendance/admin/finalize-day` returns `void`, so the success envelope has no useful operation result.
- Admin check-in DTO accepts `faceSimilarity`; admin check-out DTO does not. This may be intentional, but the check-in/check-out forms will be asymmetric.
- Attendance list has only exact `date`, not date range.
- Leave and attendance list endpoints do not expose sort query parameters.
- Missing `GET /api/shifts/:id`. The frontend currently resolves shift detail pages from the paginated shift list as a workaround; a dedicated detail endpoint is needed for robust deep links.
- `packages/shared` leave `CreateLeaveRequest` is missing `departmentShiftId`, while API `CreateLeaveRequestDto` requires it.
- User create is under `POST /api/auth/register`, while user management otherwise lives under `/api/users`. This is workable but inconsistent for frontend mental model.
- User update service logic has an explicit branch for unassigning `departmentId` with `null`, but `UpdateUserDto` inherits `IsUUID` from create and may reject null before service code runs. Verify desired behavior before building an "unassign department" UI.

## Files Inspected

- `package.json`
- `package-lock.json`
- `.prettierrc`
- `README.md`
- `docker-compose.yml`
- `apps/api/package.json`
- `apps/api/eslint.config.mjs`
- `apps/api/tsconfig.json`
- `apps/api/tsconfig.build.json`
- `apps/api/nest-cli.json`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/app.controller.ts`
- `apps/api/src/config/database.config.ts`
- `apps/api/src/config/jwt.config.ts`
- `apps/api/src/common/dto/query.dto.ts`
- `apps/api/src/common/dto/pagination-meta.dto.ts`
- `apps/api/src/common/interfaces/paginated-response.interface.ts`
- `apps/api/src/common/interceptors/transform.interceptor.ts`
- `apps/api/src/common/interceptors/errors.interceptor.ts`
- `apps/api/src/common/filters/all-exceptions.filter.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/users/*`
- `apps/api/src/modules/departments/*`
- `apps/api/src/modules/shifts/*`
- `apps/api/src/modules/attendance/*`
- `apps/api/src/modules/leave/*`
- `apps/api/src/modules/holidays/*`
- `apps/web/package.json`
- `apps/web/eslint.config.mjs`
- `apps/web/tsconfig.json`
- `apps/web/next.config.ts`
- `apps/web/.env.local.example`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `packages/shared/package.json`
- `packages/shared/src/index.ts`

## Proposed Feature Order

1. [x] Foundation and API client.
2. [x] Login/logout and protected routes.
3. [x] Admin shell.
4. [x] Users list.
5. [x] User create.
6. [x] User detail/edit/deactivate.
7. [x] Shifts.
8. [x] Departments.
9. [x] Shift assignments list.
10. [x] Shift assignment actions.
11. Attendance list.
12. Attendance admin actions.
13. Leave request list.
14. Leave request review.
15. Holidays CRUD.
16. Holiday import.
17. Shared types extraction.
18. Production auth hardening.
19. [x] Dashboard.
