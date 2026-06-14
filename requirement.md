# Requirement — Hệ thống chấm công nhận diện khuôn mặt

## Tổng quan

Hệ thống gồm 3 thành phần:

- **Mobile App** — offline-first, nhận diện khuôn mặt, lưu check-in/out kèm vị trí, đồng bộ định kỳ lên backend.
- **Backend** — xác thực, quản lý nhân sự, lịch sử chấm công, đồng bộ face embedding.
- **Web Portal (Admin)** — giao diện quản trị **chỉ dành cho Admin**. Employee không có quyền truy cập web.

---

## Roles & Auth

| Role | Mô tả |
|------|--------|
| `admin` | Toàn quyền: quản lý nhân viên, ca, chấm công thủ công, duyệt nghỉ phép, xem mọi báo cáo |
| `employee` | Chỉ dùng mobile app (check-in/out, xin nghỉ phép) |

- Admin được tạo sẵn trong DB (seed).
- Đăng nhập: `employeeCode` + `password` (default password = `employeeCode`).
- Khi tạo mới nhân viên, tài khoản và mật khẩu mặc định = `employeeCode`.
- Auth dùng JWT (access token ngắn hạn + refresh token).

---

## Data Models

### User (nhân viên)
```
employeeCode  String  unique, auto-gen (EMP00001, EMP00002, ...)
name          String  required
passwordHash  String  required
accountRole   Enum    admin | employee
department    String
jobTitle      String
phone         String
email         String
dateOfBirth   Date
```

### Shift (ca làm việc)
```
name          String   VD: "Ca hành chính"
startTime     String   HH:mm  VD: "08:00"
endTime       String   HH:mm  VD: "17:00"
isActive      Boolean  true = ca đang áp dụng toàn công ty
```
> Toàn công ty dùng chung 1 ca active tại một thời điểm.  
> `isActive=true` → dùng để tính late/early.

### Attendance (bản ghi chấm công ngày)
```
employeeId    ObjectId → User
shiftId       ObjectId → Shift
workDate      Date     (normalized to start of day UTC)
checkIn       { time, latitude, longitude, method, localId, isOutOfZone }
checkOut      { time, latitude, longitude, method, localId, isOutOfZone }
status        Enum: present | absent | partial | unknown
processedLocalIds  [String]
```

### FaceData (embedding khuôn mặt)
```
employeeId        ObjectId → User  unique
listFaceEmbedding [[Number]]
imageUrl          String   (URL ảnh thực tế — thêm mới)
updatedTime       Date
```

### LeaveRequest (đơn nghỉ phép)
```
employeeId   ObjectId → User
startDate    Date
endDate      Date
reason       String
status       Enum: pending | approved | rejected
reviewedBy   ObjectId → User (admin)
reviewedAt   Date
```

### GeoConfig (cấu hình geofencing)
```
centerLat    Number
centerLon    Number
radiusMeters Number
```
> Chỉ 1 document duy nhất (toàn công ty dùng chung).

---

## API Specification

### Auth
| Method | Path | Body | Auth | Mô tả |
|--------|------|------|------|--------|
| POST | `/auth/login` | `{employeeCode, password}` | — | Đăng nhập, trả về JWT |
| POST | `/auth/refresh` | `{refreshToken}` | — | Làm mới access token |
| POST | `/auth/logout` | — | JWT | Logout |

### Employee
| Method | Path | Body/Query | Auth | Mô tả |
|--------|------|------------|------|--------|
| POST | `/employees` | `{name, department, jobTitle, phone, email, dateOfBirth}` | admin | Tạo nhân viên, tự tạo account |
| GET | `/employees` | `?department=&search=` | admin | Danh sách nhân viên |
| GET | `/employees/:id` | — | admin | Chi tiết nhân viên |
| PUT | `/employees/:id` | fields to update | admin | Cập nhật hồ sơ |

### Shift
| Method | Path | Body | Auth | Mô tả |
|--------|------|------|------|--------|
| POST | `/shifts` | `{name, startTime, endTime}` | admin | Tạo ca |
| GET | `/shifts` | — | admin | Danh sách ca |
| PUT | `/shifts/:id` | fields | admin | Cập nhật ca |
| PUT | `/shifts/:id/activate` | — | admin | Set ca này là active |
| DELETE | `/shifts/:id` | — | admin | Xóa ca |

### Attendance — Direct (từ mobile)
| Method | Path | Body | Auth | Mô tả |
|--------|------|------|------|--------|
| POST | `/attendance/checkIn` | `CheckInOut` | JWT | Check-in trực tiếp |
| POST | `/attendance/checkOut` | `CheckInOut` | JWT | Check-out trực tiếp |

```ts
// CheckInOut object
{ empId: string, time: ISO8601, lat: number, lon: number }
```

### Attendance — Sync (từ mobile offline)
| Method | Path | Body | Auth | Output |
|--------|------|------|------|--------|
| POST | `/attendance/sync/checkIn` | `[SyncCheckInOut]` | JWT | `[localId]` — danh sách failed |
| POST | `/attendance/sync/checkOut` | `[SyncCheckInOut]` | JWT | `[localId]` — danh sách failed |

```ts
// SyncCheckInOut object
{ empId: string, time: ISO8601, lat: number, lon: number, localId: string }
```

### Attendance — Manual & Query (web admin)
| Method | Path | Body/Query | Auth | Mô tả |
|--------|------|------------|------|--------|
| POST | `/attendance/manual` | `{empId, checkInTime, checkOutTime, workDate}` | admin | Chấm công thủ công |
| PUT | `/attendance/:id` | fields | admin | Sửa bản ghi |
| DELETE | `/attendance/:id` | — | admin | Xóa bản ghi |
| GET | `/attendance` | `?date=&empId=&late=&early=&page=` | admin | Bảng chấm công có filter |

**Late/Early logic:** so sánh với `Shift.startTime` / `Shift.endTime` của ca active.

### Geofencing
| Method | Path | Body | Auth | Mô tả |
|--------|------|------|------|--------|
| GET | `/config/geofence` | — | admin | Lấy cấu hình vùng |
| PUT | `/config/geofence` | `{centerLat, centerLon, radiusMeters}` | admin | Cập nhật vùng hợp lệ |

> Khi checkIn/checkOut: tự động validate vị trí, đánh dấu `isOutOfZone=true` nếu ngoài vùng.

### Face Data
| Method | Path | Body | Auth | Mô tả |
|--------|------|------|------|--------|
| PUT | `/face/employee/:empId` | `{listFaceEmbedding, imageUrl}` | JWT | Cập nhật embedding + ảnh |
| POST | `/face/sync` | `[FaceData]` | JWT | Sync face data (xem logic bên dưới) |
| GET | `/face` | — | admin | Danh sách face data kèm imageUrl |
| DELETE | `/face/:empId` | — | admin | Xóa face data của nhân viên |

**SyncFaceData logic:**
1. Với mỗi item trong input: nếu `updatedTime` mới hơn DB → cập nhật.
2. Nếu role là admin → trả về danh sách face data "mới" theo 2 điều kiện:
   - `employeeId` **không có** trong list gửi lên → trả về.
   - `employeeId` **có** trong list gửi lên nhưng `updatedTime` trong DB **mới hơn** → trả về.

### Leave Request
| Method | Path | Body/Query | Auth | Mô tả |
|--------|------|------------|------|--------|
| POST | `/leave` | `{startDate, endDate, reason}` | JWT | Tạo đơn xin nghỉ (từ mobile) |
| GET | `/leave` | `?status=&empId=` | admin | Danh sách đơn nghỉ |
| PUT | `/leave/:id/approve` | — | admin | Duyệt đơn |
| PUT | `/leave/:id/reject` | `{reason}` | admin | Từ chối đơn |

> Thông báo: chỉ cập nhật `status` trong DB, không gửi push notification.

### Reports
| Method | Path | Query | Auth | Output |
|--------|------|-------|------|--------|
| GET | `/reports/monthly` | `?month=2026-05&empId=` | admin | Báo cáo tháng (tất cả hoặc cá nhân) |
| GET | `/reports/employee/:id` | `?month=2026-05` | admin | Báo cáo cá nhân |

**Metrics trả về:**
- `totalWorkDays` — tổng ngày đi làm
- `totalWorkHours` — tổng giờ làm
- `leaveDays` — số ngày nghỉ phép được duyệt
- `lateCount` — số lần check-in muộn
- `earlyLeaveCount` — số lần check-out sớm
- `outOfZoneCount` — số lần check-in ngoài vùng geofence

### Realtime Dashboard
| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/dashboard/present` | admin | HTTP: danh sách nhân viên đang có mặt hôm nay |
| WS | Socket.io `/` | admin | Event `attendance:update` khi có check-in/out mới |

**"Đang có mặt"** = đã check-in hôm nay, chưa check-out.

---

## Business Rules

1. **Geofencing**: Mọi check-in/out đều validate vị trí. Không chặn, chỉ đánh dấu `isOutOfZone`.
2. **Idempotency**: Mỗi `localId` chỉ được xử lý 1 lần (dùng `ProcessedEvent`).
3. **Shift**: Chỉ 1 ca `isActive=true` tại một thời điểm. Khi activate ca mới → tự động deactivate ca cũ.
4. **Password**: Bcrypt hash, default = `employeeCode`.
5. **employeeCode**: Auto-generate format `EMP00001`, tăng dần.

