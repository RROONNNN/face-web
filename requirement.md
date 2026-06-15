# Requirements - Face Recognition Attendance System

## Overview

The system has 3 components:

- **Mobile App** - offline-first, face recognition, stores check-in/check-out events with location, and syncs periodically to the backend.
- **Backend** - authentication, employee management, attendance history, and face embedding sync.
- **Web Portal (Admin)** - admin-only management interface. Employees do not have access to the web portal.

---

## Roles & Auth

| Role | Description |
|------|-------------|
| `admin` | Full access: manage employees, shifts, manual attendance, leave approval, and all reports |
| `employee` | Mobile app only: check-in/check-out and leave requests |

- Admin is pre-created in the database via seed data.
- Login uses `employeeCode` + `password` (default password = `employeeCode`).
- When a new employee is created, the account and default password are both set to `employeeCode`.
- Authentication uses JWT (short-lived access token + refresh token).

---

## Data Models

### User (employee)
```
employeeCode  String  unique, auto-generated (EMP00001, EMP00002, ...)
name          String  required
passwordHash  String  required
accountRole   Enum    admin | employee
department    String
jobTitle      String
phone         String
email         String
dateOfBirth   Date
```

### Shift
```
name          String   Example: "Office hours"
startTime     String   HH:mm  Example: "08:00"
endTime       String   HH:mm  Example: "17:00"
isActive      Boolean  true = currently applied company-wide
```
> The whole company uses one active shift at a time.  
> `isActive=true` is used to calculate late arrivals and early leave.

### CheckIn
```
employeeId    ObjectId -> User
shiftId       ObjectId -> Shift
workDate      Date     (normalized to start of day UTC)
time          Date
latitude      Number
longitude     Number
method        Enum: mobile | sync | manual
imagePath     String
isOutOfZone   Boolean  default false
createdBy     ObjectId -> User (admin, only for manual entries)
createdAt     Date
updatedAt     Date
```

### CheckOut
```
employeeId    ObjectId -> User
shiftId       ObjectId -> Shift
workDate      Date     (normalized to start of day UTC)
time          Date
latitude      Number
longitude     Number
method        Enum: mobile | sync | manual
imagePath     String
isOutOfZone   Boolean  default false
createdBy     ObjectId -> User (admin, only for manual entries)
createdAt     Date
updatedAt     Date
```

> There is no separate `Attendance` schema. Daily attendance tables, monthly reports, status values (`present | absent | partial | unknown`), late/early calculations, and total work hours are aggregated from `CheckIn` + `CheckOut` by `employeeId + workDate`.

### FaceData
```
employeeId        ObjectId -> User  unique
listFaceEmbedding [[Number]]
imageUrl          String   (actual image URL)
updatedTime       Date
```

### LeaveRequest
```
employeeId   ObjectId -> User
startDate    Date
endDate      Date
reason       String
status       Enum: pending | approved | rejected
reviewedBy   ObjectId -> User (admin)
reviewedAt   Date
```

### GeoConfig
```
centerLat    Number
centerLon    Number
radiusMeters Number
```
> Only one document exists. The same geofence configuration is used company-wide.

---

## API Specification

### Auth
| Method | Path | Body | Auth | Description |
|--------|------|------|------|-------------|
| POST | `/auth/login` | `{employeeCode, password}` | - | Log in and return JWT |
| POST | `/auth/refresh` | `{refreshToken}` | - | Refresh access token |
| POST | `/auth/logout` | - | JWT | Log out |

### Employee
| Method | Path | Body/Query | Auth | Description |
|--------|------|------------|------|-------------|
| POST | `/employees` | `{name, department, jobTitle, phone, email, dateOfBirth}` | admin | Create employee and auto-create account |
| GET | `/employees` | `?department=&search=` | admin | List employees |
| GET | `/employees/:id` | - | admin | Employee detail |
| PUT | `/employees/:id` | fields to update | admin | Update employee profile |

### Shift
| Method | Path | Body | Auth | Description |
|--------|------|------|------|-------------|
| POST | `/shifts` | `{name, startTime, endTime}` | admin | Create shift |
| GET | `/shifts` | - | admin | List shifts |
| PUT | `/shifts/:id` | fields | admin | Update shift |
| PUT | `/shifts/:id/activate` | - | admin | Set this shift as active |
| DELETE | `/shifts/:id` | - | admin | Delete shift |

### Attendance - Direct (from mobile)
| Method | Path | Body | Auth | Description |
|--------|------|------|------|-------------|
| POST | `/attendance/checkIn` | `CheckInRequest` | JWT | Create one `CheckIn` record |
| POST | `/attendance/checkOut` | `CheckOutRequest` | JWT | Create one `CheckOut` record |

```ts
// CheckInRequest / CheckOutRequest object
{ empId: string, time: ISO8601, lat: number, lon: number, imagePath?: string }
```

### Attendance - Sync (from offline mobile data)
| Method | Path | Body | Auth | Output |
|--------|------|------|------|--------|
| POST | `/attendance/sync/checkIn` | `[SyncCheckInRequest]` | JWT | `[localId]` - failed item IDs |
| POST | `/attendance/sync/checkOut` | `[SyncCheckOutRequest]` | JWT | `[localId]` - failed item IDs |

```ts
// SyncCheckInRequest / SyncCheckOutRequest object
{ empId: string, time: ISO8601, lat: number, lon: number, localId: string, imagePath?: string }
```

> `localId` is only used by the client to correlate errors within the current sync request. The backend does not store `localId` in `CheckIn` / `CheckOut`, and `localId` does not need to be globally unique.

### Attendance - Manual & Query (web admin)
| Method | Path | Body/Query | Auth | Description |
|--------|------|------------|------|-------------|
| POST | `/attendance/manual/checkIn` | `{empId, time, lat?, lon?, workDate}` | admin | Create a manual `CheckIn` record |
| POST | `/attendance/manual/checkOut` | `{empId, time, lat?, lon?, workDate}` | admin | Create a manual `CheckOut` record |
| PUT | `/attendance/checkIn/:id` | fields | admin | Update a `CheckIn` record |
| PUT | `/attendance/checkOut/:id` | fields | admin | Update a `CheckOut` record |
| DELETE | `/attendance/checkIn/:id` | - | admin | Delete a `CheckIn` record |
| DELETE | `/attendance/checkOut/:id` | - | admin | Delete a `CheckOut` record |
| GET | `/attendance` | `?date=&empId=&late=&early=&status=&page=` | admin | Attendance table aggregated from `CheckIn` + `CheckOut` |

**Late/Early logic:** compare with `Shift.startTime` / `Shift.endTime` from the active shift.

### Geofencing
| Method | Path | Body | Auth | Description |
|--------|------|------|------|-------------|
| GET | `/config/geofence` | - | admin | Get geofence configuration |
| PUT | `/config/geofence` | `{centerLat, centerLon, radiusMeters}` | admin | Update valid area |

> On check-in/check-out, validate location automatically and set `isOutOfZone=true` if the location is outside the configured area.

### Face Data
| Method | Path | Body | Auth | Description |
|--------|------|------|------|-------------|
| PUT | `/face/employee/:empId` | `{listFaceEmbedding, imageUrl}` | JWT | Update embedding + image |
| POST | `/face/sync` | `[FaceData]` | JWT | Sync face data (see logic below) |
| GET | `/face` | - | admin | List face data with `imageUrl` |
| DELETE | `/face/:empId` | - | admin | Delete an employee's face data |

**SyncFaceData logic:**
1. For each input item: if `updatedTime` is newer than the database value, update it.
2. If the role is admin, return "new" face data by these conditions:
   - `employeeId` is not included in the submitted list -> return it.
   - `employeeId` is included in the submitted list, but the database `updatedTime` is newer -> return it.

### Leave Request
| Method | Path | Body/Query | Auth | Description |
|--------|------|------------|------|-------------|
| POST | `/leave` | `{startDate, endDate, reason}` | JWT | Create leave request from mobile |
| GET | `/leave` | `?status=&empId=` | admin | List leave requests |
| PUT | `/leave/:id/approve` | - | admin | Approve leave request |
| PUT | `/leave/:id/reject` | `{reason}` | admin | Reject leave request |

> Notifications: only update `status` in the database. No push notification is sent.

### Reports
| Method | Path | Query | Auth | Output |
|--------|------|-------|------|--------|
| GET | `/reports/monthly` | `?month=2026-05&empId=` | admin | Monthly report for all employees or one employee |
| GET | `/reports/employee/:id` | `?month=2026-05` | admin | Individual employee report |

**Returned metrics:**
- `totalWorkDays` - total working days
- `totalWorkHours` - total working hours
- `leaveDays` - number of approved leave days
- `lateCount` - number of late check-ins
- `earlyLeaveCount` - number of early check-outs
- `outOfZoneCount` - number of out-of-zone check-ins

### Realtime Dashboard
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard/present` | admin | HTTP: list employees currently present today |
| WS | Socket.io `/` | admin | Emit `attendance:update` event on new check-in/check-out |

**"Currently present"** = checked in today and has not checked out yet.

---

## Business Rules

1. **Geofencing**: Validate every check-in/check-out location. Do not block the event; only mark `isOutOfZone`.
2. **Sync localId**: `localId` is not stored. When sync fails, the backend returns the failed item's `localId` so the client can correlate it within that request.
3. **Shift**: Only one shift can have `isActive=true` at a time. Activating a new shift automatically deactivates the previous active shift.
4. **Password**: Use bcrypt hash. Default password = `employeeCode`.
5. **employeeCode**: Auto-generate with format `EMP00001`, incrementing sequentially.
6. **Attendance aggregation**: A daily attendance row is generated at query time by joining `CheckIn` and `CheckOut` by `employeeId + workDate`. If there are multiple records in a day, use the earliest `CheckIn` and the latest `CheckOut` for the attendance table; keep the remaining records for audit. If one side is missing, status is `partial`; if both are missing and there is no approved leave request, status is `absent`.
7. **Manual attendance**: Admin-entered manual attendance does not require `lat` / `lon`. If location is missing, skip geofence validation and store `method=manual`.
8. **Shift snapshot**: Each `CheckIn` / `CheckOut` stores the active `shiftId` at creation time so historical reports do not change after an admin changes the active shift.
