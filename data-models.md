
## Data Models

### User (employee)
```
employeeCode  String  unique, auto-generated (EMP00001, EMP00002, ...)
name          String  required
passwordHash  String  required
accountRole   Enum    admin | employee
department_id    String
jobTitle      String
phone         String
email         String
dateOfBirth   Date
```
### Department
name
code (unique)
description
is_active
default_shift_id

### Shift
```
name          String   Example: "Office hours"
startTime     String   HH:mm  Example: "08:00"
endTime       String   HH:mm  Example: "17:00"
late_grace_minutes
early_checkout_grace_minutes
cross_midnight
isActive      Boolean  true = currently applied company-wide
```
> The whole company uses one active shift at a time.  
> `isActive=true` is used to calculate late arrivals and early leave.
### employee_shift_assignments
id
employee_id
shift_id
work_date
assigned_by
note

### AttendanceMethod enum
mobile
admin_manual
fingerprint

enum AttendanceSource {
  mobileFaceRecognition = 'mobile_face_recognition',
  adminManual = 'admin_manual',
  fingerprintDevice = 'fingerprint_device',
}

enum AttendanceStatus {
  pending = 'pending',
  checkedIn = 'checked_in',
  completed = 'completed',
  missingCheckOut = 'missing_check_out',
  absent = 'absent',
  invalid = 'invalid',
  approved_leave
}

enum PunctualityStatus {
  onTime = 'on_time',
  late = 'late',
  early = 'early',
  overtime = 'overtime',
}

interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address?: string;
}

interface AttendanceVerification {
  source: AttendanceSource;

  faceSimilarity?: number;
  livenessScore?: number;
  faceImageUrl?: string;

  deviceId?: string;
  deviceName?: string;
}

interface CheckInData {
  checkedInAt: Date;

  punctuality: PunctualityStatus;
  lateMinutes: number;

  location?: AttendanceLocation;
  verification: AttendanceVerification;

  note?: string;
}

interface CheckOutData {
  checkedOutAt: Date;

  punctuality: PunctualityStatus;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;

  location?: AttendanceLocation;
  verification: AttendanceVerification;

  note?: string;
}

interface AttendanceRecord {
  id: string;

  employeeId: string;
  departmentId?: string;

  shiftAssignmentId: string;
  workDate: string; // YYYY-MM-DD

  status: AttendanceStatus;

  checkIn?: CheckInData;
  checkOut?: CheckOutData;

  createdAt: Date;
  updatedAt: Date;
}

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