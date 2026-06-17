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
  - Build the admin-only web portal in Next.js after the backend admin API contract is aligned.
  - Use server-side API access where possible so JWTs can stay in HTTP-only cookies.
  - Cover login, employee management, shifts, attendance review/manual edits, leave review, face data, geofence, reports, and present-today dashboard.
  - Keep employee self-service out of the web portal.

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

1. Dashboard queries `GET /api/dashboard/present`.
2. Backend returns employees checked in today without a later checkout today.
3. On new check-in/check-out, backend emits `attendance:update`.
4. Web subscribes after the backend Socket.io gateway and admin socket authentication exist.

### Assumptions

- PostgreSQL is the source of truth. Requirement fields that mention `ObjectId` are translated to PostgreSQL `uuid` primary keys.
- The mobile app is out of scope for this repository.
- The web app is admin-only and should be implemented after backend admin API contract gaps are closed.
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
    (auth)/
    (admin)/
    api/
      auth/
  lib/
    api.ts
    env.ts
    session.ts
  components/
  features/
    attendance/
    dashboard/
    employees/
    face/
    geofence/
    leave/
    reports/
    shifts/

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

### Current Backend State

The checked-in backend already has a NestJS app under `apps/api` with global `/api` prefix, CORS, validation, exception handling, and response wrapping:

```ts
{
  success: boolean;
  data: T;
  timestamp: string;
}
```

Implemented modules and routes today:

- `AuthModule`
  - `POST /api/auth/login`
  - Missing from the requirement: `POST /api/auth/refresh`, `POST /api/auth/logout`.
- `AttendanceModule`
  - `POST /api/attendance/checkIn`
  - `POST /api/attendance/checkOut`
  - `POST /api/attendance/sync/checkIn`
  - `POST /api/attendance/sync/checkOut`
  - `POST /api/attendance/manual/checkIn`
  - `POST /api/attendance/manual/checkOut`
  - `PUT /api/attendance/checkIn/:id`
  - `PUT /api/attendance/checkOut/:id`
  - `DELETE /api/attendance/checkIn/:id`
  - `DELETE /api/attendance/checkOut/:id`
  - `GET /api/attendance?date=&empId=&late=&early=&status=&page=&limit=`
- `ShiftsModule`
  - `POST /api/shifts/create`
  - `GET /api/shifts`
  - `PATCH /api/shifts/:id`
  - `DELETE /api/shifts/:id`
  - Missing from the requirement: `POST /api/shifts`, `PUT /api/shifts/:id`, `PUT /api/shifts/:id/activate`.
- `FaceModule`
  - `PUT /api/face/employee/:empId`
  - `POST /api/face/sync`
  - `GET /api/face`
  - `DELETE /api/face/:empId`
- `LeaveModule`
  - `POST /api/leave`
  - `GET /api/leave?status=&empId=`
  - `PUT /api/leave/:id/approve`
  - `PUT /api/leave/:id/reject`
- `UsersModule`
  - Entity and service exist.
  - Missing from the requirement: admin employee CRUD controller/routes.
- `GeofenceModule`
  - Module placeholder exists.
  - Missing from the requirement: entity/service/controller and geofence calculation integration.
- Missing modules from the requirement:
  - `ReportsModule`
  - `DashboardModule`
  - Socket.io gateway for `attendance:update`
  - `HolidayCalendarModule`

The frontend implementation must start after these API contract gaps are either completed or intentionally stubbed behind a documented interface.

### Backend API Contract Prerequisites For Frontend

These items should be implemented before building real admin screens. Otherwise the frontend would need mocks or temporary route adapters.

1. Standardize all admin web routes under the existing `/api` prefix.
   - Keep response wrapping as `{ success, data, timestamp }`.
   - Keep error wrapping as `{ success: false, statusCode, message, timestamp, path }`.
   - Document this in `packages/shared` types so the web client has one parser.
2. Complete auth session endpoints.
   - Add `POST /api/auth/refresh`.
   - Add `POST /api/auth/logout`.
   - Return login payload with `accessToken`, `refreshToken`, and admin user summary.
   - Enforce that only `admin` accounts can enter the web portal; `employee` users remain mobile-only.
3. Complete employee admin API.
   - Add `POST /api/employees`.
   - Add `GET /api/employees?department=&search=&page=&limit=`.
   - Add `GET /api/employees/:id`.
   - Add `PUT /api/employees/:id`.
   - Response must never expose `passwordHash`.
   - Creation must generate `employeeCode` and default password according to the requirement.
4. Align shift API with the requirement.
   - Prefer adding the requirement routes while keeping old routes temporarily if needed:
     - `POST /api/shifts`
     - `PUT /api/shifts/:id`
     - `PUT /api/shifts/:id/activate`
   - Activation must be transactional and guarantee only one active shift.
5. Complete geofence API and service.
   - Add singleton `GeoConfig` persistence.
   - Add `GET /api/config/geofence`.
   - Add `PUT /api/config/geofence`.
   - Replace the current placeholder geofence calculation in attendance with Haversine distance.
6. Complete reports API.
   - Add `GET /api/reports/monthly?month=&empId=`.
   - Add `GET /api/reports/employee/:id?month=`.
   - Include `totalWorkDays`, `totalWorkHours`, `leaveDays`, `lateCount`, `earlyLeaveCount`, and `outOfZoneCount`.
7. Complete dashboard API.
   - Add `GET /api/dashboard/present`.
   - Add Socket.io `attendance:update` broadcast after successful check-in/check-out.
   - Authenticate socket connections as admin-only.
8. Ensure list endpoints have frontend-ready pagination and filters.
   - Employees, attendance, leave, face data, shifts, and reports should have stable response shapes.
   - Use `items`, `total`, `page`, and `limit` for paginated tables.
9. Move shared enums/contracts into `packages/shared`.
   - `AccountRole`
   - `AttendanceStatus`
   - `AttendanceMethod`
   - `LeaveStatus`
   - API response envelope types.
10. Add OpenAPI or a generated contract snapshot after the API shape stabilizes.
    - This is not required for first coding, but it reduces frontend/backend drift.

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

- Base prefix: `/api` already exists in `apps/api/src/main.ts`; all frontend calls should use this prefix.
- Request validation: DTOs with `class-validator`.
- Response shape: use the existing transform interceptor.
- Errors:
  - `400` validation/business input error.
  - `401` unauthenticated.
  - `403` unauthorized role.
  - `404` entity not found.
  - `409` uniqueness or state conflict.

### Auth Endpoints

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Employee Endpoints

- `POST /api/employees`
- `GET /api/employees?department=&search=&page=&limit=`
- `GET /api/employees/:id`
- `PUT /api/employees/:id`

### Shift Endpoints

- `POST /api/shifts`
- `GET /api/shifts`
- `PUT /api/shifts/:id`
- `PUT /api/shifts/:id/activate`
- `DELETE /api/shifts/:id`

### Attendance Endpoints

- `POST /api/attendance/checkIn`
- `POST /api/attendance/checkOut`
- `POST /api/attendance/sync/checkIn`
- `POST /api/attendance/sync/checkOut`
- `POST /api/attendance/manual/checkIn`
- `POST /api/attendance/manual/checkOut`
- `PUT /api/attendance/checkIn/:id`
- `PUT /api/attendance/checkOut/:id`
- `DELETE /api/attendance/checkIn/:id`
- `DELETE /api/attendance/checkOut/:id`
- `GET /api/attendance?date=&empId=&late=&early=&status=&page=&limit=`

### Geofence Endpoints

- `GET /api/config/geofence`
- `PUT /api/config/geofence`

### Face Endpoints

- `PUT /api/face/employee/:empId`
- `POST /api/face/sync`
- `GET /api/face`
- `DELETE /api/face/:empId`

### Leave Endpoints

- `POST /api/leave`
- `GET /api/leave?status=&empId=`
- `PUT /api/leave/:id/approve`
- `PUT /api/leave/:id/reject`

### Report and Dashboard Endpoints

- `GET /api/reports/monthly?month=&empId=`
- `GET /api/reports/employee/:id?month=`
- `GET /api/dashboard/present`
- Socket.io namespace `/` with `attendance:update`.

## 5. Frontend Plan

Build the Next.js admin portal only after the backend API contract prerequisites above are complete or intentionally stubbed. The frontend should use the existing `apps/web` Next.js App Router application and target Next.js 16 conventions.

### Frontend Architecture

- Use App Router route groups:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(admin)/layout.tsx`
  - `src/app/(admin)/dashboard/page.tsx`
  - `src/app/(admin)/employees/page.tsx`
  - `src/app/(admin)/employees/[id]/page.tsx`
  - `src/app/(admin)/attendance/page.tsx`
  - `src/app/(admin)/shifts/page.tsx`
  - `src/app/(admin)/leave/page.tsx`
  - `src/app/(admin)/face/page.tsx`
  - `src/app/(admin)/geofence/page.tsx`
  - `src/app/(admin)/reports/page.tsx`
- Use Server Components for read-heavy pages and fetch backend data server-side.
- Use `cache: 'no-store'` for admin data because attendance, leave, dashboard, and reports are user/session-specific and change frequently.
- Use server actions or route handlers for mutations so the browser does not need direct access to backend tokens.
- Use `proxy.ts` for route protection in Next.js 16, checking for an HTTP-only session cookie before allowing admin routes.
- Keep tokens in HTTP-only cookies set by Next route handlers:
  - `POST /api/auth/login` in the Next app calls the Nest login endpoint and sets cookies.
  - `POST /api/auth/logout` clears cookies and calls Nest logout when available.
  - Refresh can be handled inside the server-side API helper when Nest returns `401`.
- Do not expose the Nest access token to client components.

```text
API_INTERNAL_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Frontend Feature Scope

#### Login

- Login form using `employeeCode` and `password`.
- Reject non-admin users from web access even if login succeeds.
- Store session via HTTP-only cookies.
- Redirect authenticated admins to dashboard.

#### Admin Shell

- Persistent navigation for:
  - Dashboard
  - Employees
  - Attendance
  - Shifts
  - Leave
  - Face Data
  - Geofence
  - Reports
- Server-side session check in the admin layout.
- Logout action.

#### Dashboard

- Show currently present employees from `GET /api/dashboard/present`.
- Prepare Socket.io subscription to `attendance:update` after the backend gateway exists.
- Show high-level counters from existing endpoints or report endpoints once available.

#### Employees

- List employees with department and search filters.
- Create employee form.
- Employee detail/edit page.
- Display generated `employeeCode` after create.
- Never show or handle `passwordHash`.

#### Shifts

- List shifts.
- Create and edit shifts.
- Activate one shift.
- Clearly show active shift.

#### Attendance

- Daily attendance table from `GET /api/attendance`.
- Filters: date, employee, status, late, early, page.
- Manual check-in/check-out creation.
- Edit/delete raw selected check-in/check-out records.
- Display `present`, `partial`, and `absent`; approved leave is separate when backend exposes it.

#### Leave

- List leave requests by status and employee.
- Approve request.
- Reject request with reason.
- Display reviewer and reviewed time when present.

#### Face Data

- List employee face data with image URL.
- Delete face data by employee.
- Do not edit raw embedding arrays in the first web UI unless explicitly needed; embeddings are better managed by the mobile/face-recognition flow.

#### Geofence

- Show current geofence config.
- Edit center latitude, center longitude, and radius.
- Optional later enhancement: map picker.

#### Reports

- Monthly report page with `month` and optional employee filter.
- Individual employee report link from employee detail.
- Display work days, work hours, leave days, late count, early leave count, and out-of-zone count.

### Exclude

- Employee web access.
- Mobile check-in/check-out flows.
- Face capture or face recognition in the web portal.
- File upload/storage unless image upload is later added to the backend contract.
- Complex client-side state management until a real need appears; start with URL filters, server actions, and localized client state for forms.

### Frontend Dependencies To Decide During Implementation

- Form validation:
  - Recommended: use lightweight local validation first; add Zod only when shared schema validation is introduced.
- Data tables:
  - Recommended: start with simple server-rendered tables and URL query filters.
- Socket.io client:
  - Add only when the backend gateway is implemented.
- Component library:
  - Defer until the first real screen pass. If no design system exists, build small local components before adopting a full UI kit.

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

### Phase 1 - Backend API Contract Alignment

- Keep the existing `/api` prefix and response/error envelopes stable.
- Complete auth refresh/logout.
- Complete employee CRUD.
- Align shift routes and activation with the requirement.
- Complete geofence config and distance calculation.
- Complete report and dashboard endpoints.
- Add frontend-ready pagination/filter response shapes.
- Move stable enums and API envelope types into `packages/shared`.

### Phase 2 - Backend Hardening For Admin Portal

- Add or refine integration tests for every admin web endpoint.
- Add seed data for admin, active shift, demo employees, and optional geofence.
- Add API contract documentation or an OpenAPI snapshot.
- Confirm CORS and cookie settings for the web origin.

### Phase 3 - Next.js Admin Foundation

- Add server-only API helper with `API_INTERNAL_BASE_URL`.
- Add Next route handlers or server actions for login/logout/mutations.
- Store access and refresh tokens in HTTP-only cookies.
- Add `proxy.ts` route protection for admin routes.
- Add admin layout and navigation.

### Phase 4 - Admin Core Screens

- Login.
- Dashboard with present-today data.
- Employees list/create/detail/edit.
- Shifts list/create/edit/activate.
- Attendance daily table with filters.
- Manual check-in/check-out.

### Phase 5 - Admin Operations Screens

- Leave list/approve/reject.
- Face data list/delete.
- Geofence view/edit.
- Reports monthly and individual employee views.
- Socket.io `attendance:update` subscription.

### Phase 6 - End-to-End Workflow Testing

- Admin login/logout.
- Admin creates employee.
- Employee attendance data appears in admin attendance table.
- Manual attendance changes the daily aggregation.
- Shift activation affects new events but does not rewrite historical rows.
- Leave approval affects reports.
- Geofence marks out-of-zone events.
- Dashboard updates after check-in/check-out.

### Phase 7 - Deployment Hardening

- Add rate limits for auth if required.
- Review query performance and indexes.
- Add audit metadata for admin attendance edits if required.
- Add production env documentation.
- Add deployment configuration after target hosting is known.

## 10. Key Risks

- Timezone ambiguity can make `workDate`, late, and early calculations wrong. Confirm company timezone before implementation.
- Sync duplicate detection is heuristic because `localId` is not stored. The accepted rule is same employee and same event type within 5 seconds; this avoids retry duplicates but can collapse legitimate rapid repeated events.
- Working day calculation depends on a Vietnamese holiday source. Reports should use cached holiday data and degrade clearly if the public API is unavailable.
- Face embeddings stored in `jsonb` are fine for sync/storage, but not for backend similarity search.
- Admin update/delete of raw attendance records can affect auditability unless audit metadata is added.
- Password defaulting to employee code is convenient but weak. Require password change later if security requirements increase.
- Building frontend screens before API contract alignment will create mock-only UI or throwaway route adapters.

## 11. Recommended First Coding Milestone

Build the backend admin API contract slice first:

1. Add `POST /api/auth/refresh` and `POST /api/auth/logout`.
2. Add admin-only employee CRUD at `/api/employees`.
3. Align shift routes and add transactional `/api/shifts/:id/activate`.
4. Implement geofence config and real distance calculation.
5. Add reports and present-today dashboard endpoints.
6. Add shared API envelope and enum types in `packages/shared`.
7. Add integration tests for the admin endpoints the web portal will consume.

This milestone gives the Next.js app a stable backend contract before any real admin UI is built.
