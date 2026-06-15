# Face Recognition Attendance System - Implementation Plan

## 1. Requirement Analysis

### Main Business Goals

- Build a centralized attendance backend for a face-recognition attendance system.
- Support offline-first mobile attendance capture and later sync to the backend.
- Give admins a web portal for employee, shift, attendance, leave, geofence, face data, dashboard, and report management.
- Keep employee access mobile-only; employees do not use the web portal.
- Preserve historical attendance correctness by storing shift snapshots on check-in and check-out records.
- Generate attendance tables and reports from raw `CheckIn` and `CheckOut` records instead of maintaining a separate attendance table.

### Main User Roles

- `admin`
  - Uses the web portal.
  - Full access to employee management, shifts, manual attendance, leave approval, reports, geofence configuration, face data review, and realtime dashboard.
  - Can sync face data and receive newer face data from the backend.
- `employee`
  - Uses the mobile app only.
  - Can log in, check in, check out, sync offline records, update face data, sync face data, and create leave requests.
  - Cannot access admin-only web APIs.

### Main Features

- Authentication
  - Login by `employeeCode` and password.
  - JWT access token plus refresh token.
  - Logout invalidates refresh session.
  - Admin seed account.
- Employee management
  - Auto-generate sequential employee codes like `EMP00001`.
  - Create employee account with default password equal to employee code.
  - List, search, filter, view, and update employee records.
- Shift management
  - Company-wide shifts.
  - Exactly one active shift at a time.
  - Active shift is stored on check-in and check-out events as a historical snapshot.
- Attendance
  - Direct mobile check-in/check-out.
  - Offline sync for arrays of local records.
  - Manual admin check-in/check-out creation.
  - Admin update/delete of raw check-in/check-out records.
  - Aggregated attendance query from earliest check-in and latest check-out per employee and work date.
- Geofencing
  - Single company-wide geofence config.
  - Validate location for every mobile/sync event.
  - Do not block out-of-zone events; mark `isOutOfZone=true`.
  - Manual records may omit location and skip geofence validation.
- Face data
  - One face data record per employee.
  - Store embeddings, image URL, and updated timestamp.
  - Sync newer local data into the backend and return newer/missing server data for admins.
- Leave requests
  - Employees create leave requests from mobile.
  - Admins approve or reject.
  - No push notifications; status changes are persisted only.
- Reports
  - Monthly reports for all employees or one employee.
  - Individual employee monthly report.
  - Metrics include work days, work hours, leave days, late count, early leave count, and out-of-zone count.
- Realtime dashboard
  - HTTP endpoint for employees currently present today.
  - Socket.io event `attendance:update` emitted on new check-in/check-out.
- Frontend
  - Initialize only a basic Next.js app.
  - Provide backend connection configuration and minimal API client foundation.
  - Do not design detailed screens, UI components, page flows, or frontend state management in this implementation phase.

### Core Entities

- `User`
  - Represents both admin and employee accounts.
  - Fields: `id`, `employeeCode`, `name`, `passwordHash`, `accountRole`, `department`, `jobTitle`, `phone`, `email`, `dateOfBirth`, timestamps.
- `Shift`
  - Fields: `id`, `name`, `startTime`, `endTime`, `isActive`, timestamps.
- `CheckIn`
  - Fields: `id`, `employeeId`, `shiftId`, `workDate`, `time`, `latitude`, `longitude`, `method`, `imagePath`, `isOutOfZone`, `createdById`, timestamps.
- `CheckOut`
  - Same structure as `CheckIn`.
- `FaceData`
  - Fields: `id`, `employeeId`, `listFaceEmbedding`, `imageUrl`, `updatedTime`, timestamps.
- `LeaveRequest`
  - Fields: `id`, `employeeId`, `startDate`, `endDate`, `reason`, `status`, `reviewedById`, `reviewedAt`, optional rejection reason, timestamps.
- `GeoConfig`
  - Singleton row with `centerLat`, `centerLon`, `radiusMeters`, timestamps.
- `RefreshToken`
  - Recommended supporting entity for secure refresh-token rotation and logout.
  - Fields: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdAt`.

### Important Workflows

#### Login and Session

1. Client sends `employeeCode` and `password`.
2. Backend finds active user by employee code.
3. Backend verifies bcrypt password hash.
4. Backend issues short-lived access token and refresh token.
5. Backend stores only a hash of the refresh token.
6. Refresh rotates refresh tokens.
7. Logout revokes the current refresh token or session.

#### Employee Creation

1. Admin submits employee profile.
2. Backend generates the next employee code transactionally.
3. Backend hashes the default password equal to employee code.
4. Backend stores the user with `accountRole=employee`.
5. Response returns employee profile and employee code, never password hash.

#### Shift Activation

1. Admin creates or updates shifts.
2. When activating a shift, backend runs a transaction.
3. Backend sets all shifts to inactive.
4. Backend sets the selected shift to active.
5. New check-ins/check-outs store that shift id as their snapshot.

#### Direct Check-In and Check-Out

1. Authenticated employee submits `empId`, `time`, `lat`, `lon`, optional `imagePath`.
2. Backend verifies the authenticated user can create the record:
   - Employee can only submit for themself.
   - Admin can submit through manual/admin paths only.
3. Backend resolves active shift.
4. Backend normalizes `workDate`.
5. Backend checks geofence and sets `isOutOfZone`.
6. Backend stores raw event with `method=mobile`.
7. Backend emits `attendance:update` over Socket.io.

#### Offline Sync

1. Mobile sends an array of local check-in or check-out records.
2. Backend validates each item independently.
3. Backend checks for near-duplicate records before inserting:
   - same employee id.
   - same event type, checked separately in `CheckIn` or `CheckOut`.
   - existing event time within 5 seconds of the incoming event time.
4. If a near-duplicate exists, backend treats the item as already synced successfully and does not insert another raw event.
5. Successful non-duplicate items are stored with `method=sync`.
6. Failed items are not stored.
7. Response returns only failed `localId` values.
8. `localId` is not persisted.

#### Manual Attendance

1. Admin submits employee id, time, and work date with optional location.
2. Backend verifies employee exists.
3. Backend stores `method=manual` and `createdById`.
4. If location is missing, geofence validation is skipped.
5. If location exists, geofence validation can still mark out-of-zone.

#### Attendance Aggregation

1. Query starts from employees, not from check-in/check-out records, so absent employees can appear.
2. For each employee and work date:
   - earliest check-in is selected.
   - latest check-out is selected.
   - approved leave is checked.
3. Status is derived:
   - `present`: both check-in and check-out exist.
   - `partial`: only one side exists.
   - `absent`: neither side exists and no approved leave covers the date.
4. Approved leave is exposed as separate leave information, not as an `unknown` status.
5. Late is calculated by comparing earliest check-in time to the stored check-in shift.
6. Early leave is calculated by comparing latest check-out time to the stored check-out shift.

#### Face Data Sync

1. Client submits face data records.
2. Backend upserts records only when submitted `updatedTime` is newer than the stored value.
3. If caller is admin, backend returns server records missing from the submitted list or newer than submitted values.
4. If caller is employee, backend only updates allowed employee-owned face data unless admin semantics are explicitly required.

#### Leave Review

1. Employee creates pending leave request.
2. Admin lists leave requests by status and employee.
3. Admin approves or rejects.
4. Backend stores reviewer and review timestamp.
5. Reports count approved leave days.

#### Realtime Dashboard

1. Dashboard queries `GET /dashboard/present`.
2. Backend returns employees checked in today without a later checkout today.
3. On new check-in/check-out, backend emits `attendance:update`.
4. Web can subscribe later; this plan only prepares backend support and basic frontend connection config.

### Assumptions

- PostgreSQL is the source of truth. Requirement fields that mention `ObjectId` are translated to PostgreSQL `uuid` primary keys.
- The mobile app is out of scope for this repository.
- The web app is admin-only, but detailed admin screens are out of scope for this planning phase.
- User and employee are one table/entity because the requirement names `User (employee)` and stores account role on that record.
- `employeeCode` is generated by a PostgreSQL sequence and formatted in application code.
- `workDate` is stored as a PostgreSQL `date` column rather than a timestamp. This avoids time-of-day ambiguity for daily grouping.
- Shift times are stored as PostgreSQL `time` columns, not strings, even though the API accepts `HH:mm`.
- Face embeddings are stored as `jsonb` for the first implementation. A vector extension can be considered later if similarity search becomes a backend requirement.
- `imagePath` and `imageUrl` are stored as strings only. File upload/storage is not required unless confirmed.
- Refresh tokens are persisted hashed to support logout and token rotation.
- Soft delete is not required unless later requested. Audit history is preserved by keeping raw check-in/check-out rows.
- Reports treat approved leave separately via `leaveDays`. Whether daily attendance status should expose `leave` in addition to `absent` needs confirmation.

### Unclear Requirements and Questions Needing Confirmation

The runtime does not expose the requested `vscode_askQuestions` tool, so these are captured here with recommended answers instead of blocking implementation planning.

1. What timezone defines a work date?
   - Recommended answer: use a configurable company timezone, default `Asia/Ho_Chi_Minh`, then store `workDate` as the local business date. The requirement says UTC start of day, but shift rules using `HH:mm` are business-local and can become incorrect around timezone boundaries.
2. Should mobile direct check-in/check-out trust `empId` from the request?
   - Recommended answer: ignore or validate it against the authenticated user. Employees should only create attendance for their own account.
3. Should offline sync be idempotent?
   - Confirmed answer: no persisted `clientEventId` is needed. Detect duplicates by comparing the same employee id and same event type with an existing event time within 5 seconds. When matched, treat the incoming item as already synced successfully and do not insert a duplicate.
4. What does `unknown` attendance status mean?
   - Confirmed answer: remove `unknown`. Supported attendance statuses are `present`, `partial`, and `absent`; approved leave is represented separately from status.
5. Are weekends and holidays working days?
   - Confirmed direction: use Monday-Friday as the base working-week rule and add a Vietnamese holiday provider. Implement a holiday calendar service that can collect Vietnamese public holidays from a selected public API, cache them by year, and exclude those dates from report working-day counts.
6. Does rejected leave need a rejection reason?
   - Recommended answer: store `reviewNote` or `rejectionReason` because the reject endpoint accepts `{reason}`.
7. Can one employee have multiple check-ins/check-outs in a day?
   - Recommended answer: yes. Keep all raw records for audit, aggregate earliest check-in and latest check-out.
8. Can an admin update another admin or create admin users?
   - Recommended answer: not in MVP. Seed one admin and manage employees only unless role management is explicitly added.
9. Should geofence absence block check-in/check-out?
   - Recommended answer: no. Requirement explicitly says mark out-of-zone only.
10. Should face sync be available to all employees or admin only?
    - Recommended answer: employees can update/sync their own face data; admin can sync and receive all newer/missing employee face data.

## 2. Target Architecture

### Repository Shape

Current repository already matches the requested monorepo direction:

```text
face-web/
  apps/
    api/      # NestJS backend
    web/      # Next.js frontend
  packages/
    shared/   # shared TypeScript contracts and enums
```

Recommended additions:

```text
apps/api/src/
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    types/
    utils/
  config/
    app.config.ts
    database.config.ts
    jwt.config.ts
    validation.ts
  database/
    data-source.ts
    migrations/
    seeds/
  modules/
    auth/
    users/
    shifts/
    attendance/
    geofence/
    face/
    leave/
    reports/
    dashboard/

apps/web/src/
  app/
  lib/
    api.ts
    env.ts

packages/shared/src/
  enums/
  contracts/
  index.ts
```

### Modular Monolith Boundaries

- Each backend business capability is a NestJS module.
- Modules communicate through service APIs inside the same process, not through HTTP.
- Shared cross-cutting concerns stay in `common`.
- Database entities live inside the owning module unless a shared database convention is preferred. For this project, keep entities near modules for feature ownership.
- Reporting and dashboard modules may read from attendance, leave, shifts, and users but should not own their mutations.

### Backend Module Responsibilities

- `AuthModule`
  - Login, refresh, logout.
  - JWT signing and verification.
  - Password hashing.
  - Access token guard, refresh token handling, role guard.
- `UsersModule`
  - Employee CRUD.
  - Employee code generation.
  - Admin seed support.
- `ShiftsModule`
  - Shift CRUD.
  - Transactional activation.
  - Active shift lookup.
- `AttendanceModule`
  - Check-in/check-out direct creation.
  - Offline sync.
  - Manual attendance.
  - Raw event update/delete.
  - Attendance aggregation query.
  - Geofence validation integration.
  - Dashboard event publishing.
- `GeofenceModule`
  - Singleton geofence configuration.
  - Distance calculation service.
- `FaceModule`
  - Face data update, sync, list, delete.
- `LeaveModule`
  - Leave creation, listing, approval, rejection.
- `ReportsModule`
  - Monthly report aggregation.
  - Individual employee report.
  - Working-day calculation using weekends plus Vietnamese public holidays.
- `DashboardModule`
  - Present-today endpoint.
  - Socket.io gateway.
- `HolidayCalendarModule`
  - Fetch Vietnamese public holidays from a selected public API.
  - Cache holidays by year for report calculations.
  - Provide fallback behavior when the external provider is unavailable.

## 3. Backend Implementation Plan

### Foundation

- Install backend dependencies:
  - `@nestjs/config`
  - `@nestjs/typeorm`
  - `typeorm`
  - `pg`
  - `@nestjs/jwt`
  - `bcrypt`
  - `@nestjs/websockets`
  - `@nestjs/platform-socket.io`
  - optional: `helmet`, `cookie-parser`, `joi` or Zod for env validation.
- Configure global middleware and app bootstrap:
  - CORS for web origin.
  - global `ValidationPipe` with transform and whitelist.
  - global exception filter and response transform already exist; keep or refine them.
  - config validation at boot.
- Add environment files:
  - `apps/api/.env.example`
  - `apps/web/.env.local.example` update if needed.
- Add TypeORM `DataSource` for CLI migrations.
- Set `synchronize=false` and use migrations for schema changes.

### Authentication and Authorization

- JWT payload shape:

```ts
type AccessTokenPayload = {
  sub: string;
  employeeCode: string;
  role: 'admin' | 'employee';
};
```

- Access control:
  - `JwtAuthGuard` validates bearer token.
  - `RolesGuard` checks `@Roles('admin')`.
  - `CurrentUser` decorator exposes authenticated identity.
- Refresh token strategy:
  - Generate opaque refresh token or signed refresh JWT.
  - Store hash in `refresh_tokens`.
  - Rotate on refresh.
  - Revoke on logout.

### Employee Code Generation

- Use PostgreSQL sequence:
  - `employee_code_seq`.
  - Format next value as `EMP${value.padStart(5, '0')}`.
- Generate inside user creation transaction.
- Add unique index on `employeeCode`.

### Database Entities

Recommended PostgreSQL types:

- IDs: `uuid`, generated by database or TypeORM.
- Dates:
  - `workDate`, `startDate`, `endDate`, `dateOfBirth`: `date`.
  - event `time`, token expiry, reviewed timestamps: `timestamptz`.
- Shift times: `time`.
- Embeddings: `jsonb`.
- Enums: TypeORM enum columns or varchar with check constraints. Prefer enum columns for clear constraints.

Recommended indexes:

- `users(employeeCode)` unique.
- `users(accountRole)`.
- `users(department)`.
- `shifts(isActive)` partial unique index where `isActive=true`.
- `check_ins(employeeId, workDate)`.
- `check_ins(workDate)`.
- `check_outs(employeeId, workDate)`.
- `check_outs(workDate)`.
- `face_data(employeeId)` unique.
- `leave_requests(employeeId, startDate, endDate)`.
- `leave_requests(status)`.

### Attendance Aggregation

Implement aggregation in a dedicated service, not directly inside the controller.

Recommended query strategy:

- For a single date:
  - query target employees by filters.
  - left join aggregated subqueries:
    - earliest check-in per employee/work date.
    - latest check-out per employee/work date.
    - approved leave covering the date.
  - calculate status and metrics in TypeScript for readability.
- For monthly reports:
  - generate business dates in the requested month.
  - aggregate raw records per employee/date.
  - apply leave coverage.
  - sum metrics.

Important behavior:

- Keep raw rows immutable enough for audit, but admin update/delete is required. Treat update/delete as admin audit operations and consider adding `updatedById` later.
- For late/early calculations, use the shift stored on the selected event row.
- If check-in and check-out reference different shift ids, use check-in shift for late and check-out shift for early leave.

### Geofence Calculation

- Store singleton geofence row.
- Use Haversine distance calculation.
- If no geofence config exists:
  - Recommended MVP behavior: mark `isOutOfZone=false` and log warning.
  - Alternative: seed default config and require configuration before production.

### Face Data Storage

- Use `jsonb` for `listFaceEmbedding`.
- Validate shape as `number[][]` in DTO.
- Enforce one record per employee.
- For sync:
  - Load server records for submitted employee ids.
  - Upsert only if submitted timestamp is newer.
  - For admin response, return records missing from client set or newer than submitted timestamp.

### Leave and Report Rules

- Store approved leave as inclusive date range.
- Count leave days by intersection with working days in report month.
- Base working day rule: Monday-Friday.
- Exclude Vietnamese public holidays from working-day counts.
- Add `HolidayCalendarService` with a provider interface so the system can fetch Vietnamese holidays from a selected public API and cache the yearly calendar in PostgreSQL or application cache.
- If the holiday provider is temporarily unavailable, use the latest cached holiday calendar. For an uncached year, fall back to Monday-Friday and log the missing holiday source.

### Realtime

- Use NestJS WebSocket gateway with Socket.io.
- Authenticate socket connections using access token.
- Admin-only subscription.
- Attendance service emits domain event after successful check-in/check-out.
- Gateway broadcasts `attendance:update`.

## 4. API Plan

### General API Conventions

- Base prefix: `/api` recommended, unless existing clients require root paths.
- Request validation: DTOs with `class-validator`.
- Response shape: align with existing transform interceptor or standardize before implementation.
- Errors:
  - `400` validation/business input error.
  - `401` unauthenticated.
  - `403` unauthorized role.
  - `404` entity not found.
  - `409` uniqueness or state conflict.

### Auth Endpoints

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Employee Endpoints

- `POST /employees`
- `GET /employees`
- `GET /employees/:id`
- `PUT /employees/:id`

### Shift Endpoints

- `POST /shifts`
- `GET /shifts`
- `PUT /shifts/:id`
- `PUT /shifts/:id/activate`
- `DELETE /shifts/:id`

### Attendance Endpoints

- `POST /attendance/checkIn`
- `POST /attendance/checkOut`
- `POST /attendance/sync/checkIn`
- `POST /attendance/sync/checkOut`
- `POST /attendance/manual/checkIn`
- `POST /attendance/manual/checkOut`
- `PUT /attendance/checkIn/:id`
- `PUT /attendance/checkOut/:id`
- `DELETE /attendance/checkIn/:id`
- `DELETE /attendance/checkOut/:id`
- `GET /attendance`

### Geofence Endpoints

- `GET /config/geofence`
- `PUT /config/geofence`

### Face Endpoints

- `PUT /face/employee/:empId`
- `POST /face/sync`
- `GET /face`
- `DELETE /face/:empId`

### Leave Endpoints

- `POST /leave`
- `GET /leave`
- `PUT /leave/:id/approve`
- `PUT /leave/:id/reject`

### Report and Dashboard Endpoints

- `GET /reports/monthly`
- `GET /reports/employee/:id`
- `GET /dashboard/present`
- Socket.io namespace `/` with `attendance:update`.

## 5. Frontend Plan

The frontend is intentionally minimal.

### Include

- Keep Next.js app initialized under `apps/web`.
- Add or confirm environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

- Add a minimal typed API helper:
  - base URL resolution.
  - JSON request helper.
  - bearer token parameter support for later admin screens.
- Add shared type imports from `@face-web/shared` when backend contracts stabilize.
- Keep default page simple, such as a health/status placeholder that can later call the API.

### Exclude

- No admin dashboard design.
- No detailed page routing.
- No component library decision.
- No frontend auth flow implementation.
- No global state management.
- No attendance tables, forms, or report UI.

## 6. Shared Package Plan

Use `packages/shared` for stable contracts that both apps can consume:

- Enums:
  - `AccountRole`
  - `AttendanceMethod`
  - `LeaveStatus`
  - `AttendanceStatus`: `present | partial | absent`
- API DTO-like response types after backend DTOs settle.
- Common date/month string types if useful:
  - `IsoDateString`
  - `IsoDateTimeString`
  - `YearMonthString`

Avoid placing backend-only TypeORM entities or NestJS decorators in the shared package.

## 7. Database Migration and Seed Plan

### Migration Order

1. Enable UUID support if needed.
2. Create enum types.
3. Create users table.
4. Create refresh tokens table.
5. Create shifts table and active shift partial unique index.
6. Create geofence config table.
7. Create check-ins table.
8. Create check-outs table.
9. Create face data table.
10. Create leave requests table.
11. Create indexes.
12. Create employee code sequence.

### Seed Data

- Admin user:
  - `employeeCode`: choose a fixed code such as `ADMIN001` or `EMP00000`.
  - `accountRole`: `admin`.
  - password from env, or default to employee code for local development only.
- Initial active shift:
  - Name: `Office hours`.
  - `08:00` to `17:00`.
  - `isActive=true`.
- Initial geofence:
  - Optional placeholder values for local development.

## 8. Testing Plan

### Unit Tests

- Auth password verification and token rotation.
- Employee code generation.
- Shift activation transaction behavior.
- Geofence distance calculation.
- Work date normalization.
- Attendance status derivation.
- Late and early calculation.
- Face sync newer-than logic.
- Leave day counting.
- Vietnamese holiday exclusion from report working-day counts.

### Integration Tests

- Employee creation persists hashed default password.
- Login, refresh, logout.
- Admin-only endpoint protection.
- Direct check-in/check-out with geofence marking.
- Sync success/failure returns failed local ids.
- Sync near-duplicate detection skips insert when employee id and event time match within 5 seconds.
- Manual attendance with missing location.
- Attendance aggregation with multiple raw records.
- Monthly report metrics.

### E2E Tests

- Admin creates employee, employee logs in, employee checks in/out, admin queries attendance.
- Offline sync with mixed valid/invalid items.
- Offline sync retry within 5 seconds does not create a duplicate raw event.
- Shift activation then historical report remains stable because event rows store shift id.
- Leave request approval affects monthly report.

## 9. Implementation Phases

### Phase 1 - Project Foundation

- Install backend dependencies.
- Configure `ConfigModule`, TypeORM, migrations, env validation, and database scripts.
- Add common enums and shared types.
- Add database connection health check.
- Keep frontend minimal with API base URL configuration.

### Phase 2 - Auth and Users

- Implement user entity and migration.
- Implement employee code sequence.
- Implement admin seed.
- Implement auth login, refresh, logout.
- Implement JWT guard, roles guard, and current user decorator.
- Implement employee CRUD.

### Phase 3 - Shifts and Geofence

- Implement shift entity, module, CRUD, and activation transaction.
- Implement geofence singleton config and distance service.
- Seed initial shift and optional geofence.

### Phase 4 - Attendance Core

- Implement check-in/check-out entities.
- Implement direct mobile endpoints.
- Implement sync endpoints.
- Implement manual endpoints.
- Implement raw update/delete endpoints.
- Emit attendance events from successful creates.

### Phase 5 - Attendance Queries, Reports, Dashboard

- Implement attendance aggregation query.
- Implement present-today dashboard endpoint.
- Implement Socket.io gateway.
- Implement Vietnamese holiday calendar provider and cache.
- Implement monthly and employee report services.

### Phase 6 - Face Data and Leave

- Implement face data entity, update, list, delete, and sync.
- Implement leave request entity, create, list, approve, reject.
- Integrate leave into attendance/report aggregation.

### Phase 7 - Hardening

- Add indexes and review query performance.
- Add rate limits for auth if required.
- Add e2e test coverage for critical workflows.
- Add OpenAPI documentation if desired.
- Add deployment configuration after target hosting is known.

## 10. Key Risks

- Timezone ambiguity can make `workDate`, late, and early calculations wrong. Confirm company timezone before implementation.
- Sync duplicate detection is heuristic because `localId` is not stored. The accepted rule is same employee and same event type within 5 seconds; this avoids retry duplicates but can collapse legitimate rapid repeated events.
- Working day calculation depends on a Vietnamese holiday source. Reports should use cached holiday data and degrade clearly if the public API is unavailable.
- Face embeddings stored in `jsonb` are fine for sync/storage, but not for backend similarity search.
- Admin update/delete of raw attendance records can affect auditability unless audit metadata is added.
- Password defaulting to employee code is convenient but weak. Require password change later if security requirements increase.

## 11. Recommended First Coding Milestone

Build the backend foundation and auth/users slice first:

1. Add TypeORM PostgreSQL configuration with migrations.
2. Create users and refresh token schema.
3. Add admin seed.
4. Implement login, refresh, logout.
5. Implement role guard.
6. Implement employee creation with generated `employeeCode`.
7. Add integration tests for employee creation and login.

This milestone proves the monorepo, database, migrations, auth, role protection, and default-account rules before the attendance-specific modules are added.
