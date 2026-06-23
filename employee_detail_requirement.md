### Sidebar thông tin nhân viên bên trái

- Ảnh đại diện
- Tên nhân viên
- Chức danh / phòng ban
- Employee ID hoặc số điện thoại
  Bên dưới là phần tổng hợp attendance trong tháng:
  Present: là là số AttendanceStatus.COMPLETED
  Leave: là số AttendanceStatus.ON_LEAVE
  Absent: số ngày được xếp lịch làm nhưng không đi làm (số status ABSENT )
  Missing Check Out: số status MISSING_CHECK_OUT

### Monthly attendance calendar bên phải

- đây là lịch tháng
- user có thể lựa chọn tháng năm, có nút next month, previus month
- mỗi ô trên calender biểu diễn một ngày, UI phải biểu diễn được trạng thái của ngày đó (Present,Absent,Missing Check Out,partial Leave, leave full day ) và ở trên đó chứa :

* checkOutSource, checkInSource (từng loại method sẽ biểu diễn 1 icon hợp lý thay vì nhập chữ)
* giờ checkin, giờ checkout
* hiển thị icon location nếu checkIn có location
* khi click vào thì sẽ open 1 popup hiển thị ngày và list các audit checkin và checkout (this is AuditEntry export interface AuditEntry {
  occurredAt: Date;
  source: AttendanceSource;
  deviceId?: string | null;
  })
  api example: curl --location '{{base_url}}/attendance/query-by-employee?employeeId={{EMPLOYEE_ID}}&startDate=2026-06-01&endDate=2026-06-30' \
  --header 'Authorization: Bearer {{accessToken}}'
  response:
  {
  "success": true,
  "data": {
  "items": [
  {
  "id": "6fdfa6d2-7857-460c-a23a-63396552a3c9",
  "employee": {
  "id": "311dd4e7-a30a-4f75-9753-5a22e4ee6abf",
  "employeeCode": "EMP19950815",
  "name": "Jane Doe",
  "passwordHash": "$2b$10$XL2.E7HWGWJWlxasV3qP7.0.hCkxvVFfVG0gLZVMOakDpHVyrBa9q",
  "accountRole": "employee",
  "isActive": true,
  "department": "Engineering Team Alpha",
  "departmentId": "cc1759bc-7fc7-47eb-bd66-3793f10d995d",
  "jobTitle": null,
  "phone": null,
  "email": null,
  "dateOfBirth": "1995-08-15",
  "createdAt": "2026-06-22T17:43:43.740Z",
  "updatedAt": "2026-06-22T17:43:43.740Z"
  },
  "employeeId": "311dd4e7-a30a-4f75-9753-5a22e4ee6abf",
  "shiftAssignment": {
  "id": "e038494a-6728-46e5-b0d6-6d1036286e9d",
  "employeeId": "311dd4e7-a30a-4f75-9753-5a22e4ee6abf",
  "shiftId": "7ed8977a-a257-4e24-8c64-de94a1088085",
  "workDate": "2026-06-23",
  "source": "department_default",
  "assignedByUserId": null,
  "note": null,
  "leaveShiftWorkPeriodIds": [],
  "createdAt": "2026-06-22T10:50:33.467Z",
  "updatedAt": "2026-06-22T10:50:33.467Z"
  },
  "shiftAssignmentId": "e038494a-6728-46e5-b0d6-6d1036286e9d",
  "workDate": "2026-06-23",
  "status": "completed",
  "expectedCheckInAt": "2026-06-23T01:00:00.000Z",
  "expectedCheckOutAt": "2026-06-23T10:00:00.000Z",
  "checkedInAt": "2026-06-23T01:09:00.000Z",
  "checkedOutAt": "2026-06-23T10:26:00.000Z",
  "auditCheckIn": [
  "2026-06-23T01:09:00.000Z",
  "2026-06-23T01:15:00.000Z",
  "2026-06-23T01:20:00.000Z",
  "2026-06-23T01:15:00.000Z",
  "2026-06-23T01:00:00.000Z",
  "2026-06-23T01:00:00.000Z",
  "2026-06-23T01:15:00.000Z",
  "2026-06-23T01:59:00.000Z",
  "2026-06-23T02:44:00.000Z"
  ],
  "auditCheckOut": [
  "2026-06-23T10:05:00.000Z",
  "2026-06-23T10:15:00.000Z",
  "2026-06-23T10:20:00.000Z",
  "2026-06-23T10:26:00.000Z"
  ],
  "checkInSource": "mobile_face_recognition",
  "checkOutSource": "mobile_face_recognition",
  "lateMinutes": 0
  },
  ....
  
  ],
  "metaData": {
  "presentCount": 4,
  "leaveCount": 0,
  "absentCount": 0,
  "missingCheckOutCount": 0
  }
  },
  "timestamp": "2026-06-23T14:59:37.716Z"
  }
