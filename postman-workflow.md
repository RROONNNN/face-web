# API Workflow - Postman Tests

Here is the complete sequence of `curl` commands to test the full lifecycle of the application.

**Postman Variables Used:**
- `{{base_url}}` - The base URL of the API
- `{{accessToken}}` - The JWT access token (usually from the admin login)
- `{{employeeAccessToken}}` - The JWT access token returned by employee login
- `{{DEPARTMENT_ID}}` - The UUID of the department
- `{{EMPLOYEE_ID}}` - The UUID of the generated employee
- `{{WORK_PERIOD_ID}}` - A work-period UUID from the employee's shift assignment
- `{{LEAVE_ID}}` - A leave-request UUID used for lookup and approval
- `{{REJECT_LEAVE_ID}}` - A separate pending leave-request UUID used for rejection
- `{{CANCEL_LEAVE_ID}}` - A separate pending leave-request UUID used for cancellation

---

### 0. Login as Admin
Use this to get your `accessToken`.
```bash
curl --location '{{base_url}}/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "employeeCode": "ADMIN001",
    "password": "your_admin_password"
}'
```
*(Copy the `accessToken` from the response and set it as your `{{accessToken}}` variable in Postman).*

---

### 1. Create a Department
Creates a new department. You will need an active shift ID in your database to assign as the `defaultShiftId`.
```bash
curl --location '{{base_url}}/departments' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "code": "ENG-01",
    "name": "Engineering Team Alpha",
    "description": "Core software development team",
    "isActive": true,
    "defaultShiftId": "YOUR_SHIFT_ID_HERE"
}'
```
*(Copy the `id` from the created department response to use as your `{{DEPARTMENT_ID}}`).*

---

### 2. List Departments
Fetches a paginated list of departments.
```bash
curl --location '{{base_url}}/departments' \
--header 'Authorization: Bearer {{accessToken}}'
```

---

### 3. Register New Employee
Creates an employee. Since `employeeCode` is optional, it will auto-generate one based on `dateOfBirth` (e.g., `EMP19950815`).
```bash
curl --location '{{base_url}}/auth/register' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "name": "Jane Doe",
    "dateOfBirth": "1995-08-15",
    "password": "password123",
    "accountRole": "employee",
    "departmentId": "{{DEPARTMENT_ID}}"
}'
```
*(Copy the `id` from the created user response — set it as `{{EMPLOYEE_ID}}`).*

---

### 4. Generate Default Assignments
Generates assignments based on each employee's department default shift. Use `startDate`/`endDate` for a date range. Pass `employeeId` to generate only for a single employee.
```bash
# All employees, single date
curl --location --request POST '{{base_url}}/shifts/assignments/generate?startDate=2026-06-23&endDate=2026-06-23' \
--header 'Authorization: Bearer {{accessToken}}'

# Single employee, single date
curl --location --request POST '{{base_url}}/shifts/assignments/generate?startDate=2026-06-23&endDate=2026-06-23&employeeId={{EMPLOYEE_ID}}' \
--header 'Authorization: Bearer {{accessToken}}'
```

---

### 5. Get Assignments
Check that the employee received their `department_default` assignment for the date you generated. You can also omit the query parameters to list all assignments.
```bash
curl --location '{{base_url}}/shifts/assignments?employeeId={{EMPLOYEE_ID}}&workDate=2026-06-23' \
--header 'Authorization: Bearer {{accessToken}}'
```

---

### 6. Check In
Simulates the employee checking in. In Postman, update the `occurredAt` to match the timezone and date of your assignment.
```bash
curl --location '{{base_url}}/attendance/check-in' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "employeeId": "{{EMPLOYEE_ID}}",
    "occurredAt": "2026-06-23T08:00:00+07:00",
    "source": "mobile_face_recognition",
    "faceSimilarity": 98.5
}'
```

---

### 7. Check Out
Simulates the employee checking out at the end of their shift.
```bash
curl --location '{{base_url}}/attendance/check-out' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "employeeId": "{{EMPLOYEE_ID}}",
    "occurredAt": "2026-06-23T17:05:00+07:00",
    "source": "mobile_face_recognition",
    "faceSimilarity": 99.1
}'
```

---

### 8. Get Attendance Records
After checking in and checking out, fetch the generated attendance records to see the computed expected times, actual times, and status (e.g., `PRESENT`, `LATE`). 

You can filter by `employeeId`, `date`, `status`, `page`, and `limit`.
```bash
curl --location '{{base_url}}/attendance?employeeId={{EMPLOYEE_ID}}&date=2026-06-23' \
--header 'Authorization: Bearer {{accessToken}}'
```

---

### 9. Offline Sync Check In
Used by mobile apps to upload cached check-ins when back online. Note this expects an array.
```bash
curl --location '{{base_url}}/attendance/sync/check-in' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '[
  {
      "employeeId": "{{EMPLOYEE_ID}}",
      "localId": "local-uuid-or-timestamp-1",
      "occurredAt": "2026-06-23T08:00:00+07:00",
      "source": "mobile_face_recognition",
      "faceSimilarity": 98.5
  }
]'
```

---

### 10. Offline Sync Check Out
Used by mobile apps to upload cached check-outs.
```bash
curl --location '{{base_url}}/attendance/sync/check-out' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '[
  {
      "employeeId": "{{EMPLOYEE_ID}}",
      "localId": "local-uuid-or-timestamp-2",
      "occurredAt": "2026-06-23T17:00:00+07:00",
      "source": "mobile_face_recognition"
  }
]'
```

---

### 11. Admin Manual Check In
Allows an admin to manually insert a check-in for an employee on a specific `workDate`.
```bash
curl --location '{{base_url}}/attendance/manual/check-in' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "employeeId": "{{EMPLOYEE_ID}}",
    "workDate": "2026-06-23",
    "occurredAt": "2026-06-23T08:00:00+07:00",
    "note": "Admin manual override - forgot phone"
}'
```

---

### 12. Admin Manual Check Out
Allows an admin to manually insert a check-out for an employee on a specific `workDate`.
```bash
curl --location '{{base_url}}/attendance/manual/check-out' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "employeeId": "{{EMPLOYEE_ID}}",
    "workDate": "2026-06-23",
    "occurredAt": "2026-06-23T17:05:00+07:00",
    "note": "Admin manual override"
}'
```

---

### 13. Finalize End Of Day
Admin triggers this to compute total hours for all records on a specific date.
```bash
curl --location '{{base_url}}/attendance/admin/finalize-day' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "workDate": "2026-06-23"
}'
```

---

### 14. List Holidays
Fetches a paginated list of holidays. You can filter by `year` and `search`.
```bash
curl --location '{{base_url}}/holidays?page=1&limit=20&year=2026' \
--header 'Authorization: Bearer {{accessToken}}'
```

---

### 15. Create Holiday
Admin creates a single holiday entry.
```bash
curl --location '{{base_url}}/holidays' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "date": "2026-04-30",
    "name": "Reunification Day",
    "description": "Ngày Giải phóng miền Nam"
}'
```
*(Copy the `id` from the created holiday response to test update/delete)*

---

### 16. Update Holiday
Updates an existing holiday by its UUID.
```bash
curl --location --request PATCH '{{base_url}}/holidays/<holiday-uuid>' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "name": "Updated Reunification Day"
}'
```
---

### 17. Delete Holiday
Deletes a holiday by its UUID.
```bash
curl --location --request DELETE '{{base_url}}/holidays/<holiday-uuid>' \
--header 'Authorization: Bearer {{accessToken}}'
```

---

### 18. Import Holidays (Excel)
Uploads an `.xlsx` file to bulk insert or update holidays. In Postman, switch this to `form-data` and select your file for the `file` key.
```bash
curl --location '{{base_url}}/holidays/import' \
--header 'Authorization: Bearer {{accessToken}}' \
--form 'file=@"/Users/mac/thuan/face-web/apps/api/holidays-2026.xlsx"'
```

---

### 8b. Query Attendance by Employee
Returns records for a specific employee with summary counts (present, leave, absent, missing check-out). All params optional.
```bash
curl --location '{{base_url}}/attendance/query-by-employee?employeeId={{EMPLOYEE_ID}}&startDate=2026-06-01&endDate=2026-06-23' \
--header 'Authorization: Bearer {{accessToken}}'
```

---

## Leave Request Workflow

Leave dates must be today or later. Partial leave also requires an existing shift assignment for that date, and `WORK_PERIOD_ID` must belong to the assigned shift. Use separate pending requests for approve, reject, and cancel because each transition is terminal.

### 19. Login as Employee

Use the employee code returned by the registration workflow. Store the returned `data.accessToken` as `{{employeeAccessToken}}`.

```bash
curl --location '{{base_url}}/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "employeeCode": "EMPLOYEE_CODE_HERE",
    "password": "password123"
}'
```

### 20. Create Leave Request

This example requests full-day leave on July 1 and partial leave on July 2. Dates without a `partialDays` entry are treated as full-day leave. Store the returned `data.id` as `{{LEAVE_ID}}`.

```bash
curl --location '{{base_url}}/leave' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{employeeAccessToken}}' \
--data '{
    "startDate": "2026-07-01",
    "endDate": "2026-07-02",
    "reason": "Personal appointment",
    "partialDays": [
        {
            "workDate": "2026-07-02",
            "workPeriodIds": ["{{WORK_PERIOD_ID}}"]
        }
    ]
}'
```

For a full-day-only request, omit `partialDays`:

```bash
curl --location '{{base_url}}/leave' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{employeeAccessToken}}' \
--data '{
    "startDate": "2026-07-03",
    "endDate": "2026-07-03",
    "reason": "Family matter"
}'
```

### 21. Find My Leave Requests

Employee-only endpoint. Supported filters are `status`, `fromDate`, `toDate`, `page`, and `limit`.

```bash
curl --location '{{base_url}}/leave/me?status=pending&fromDate=2026-07-01&toDate=2026-07-31&page=1&limit=20' \
--header 'Authorization: Bearer {{employeeAccessToken}}'
```

### 22. Find All Leave Requests

Admin-only endpoint. It supports `employeeId` in addition to the employee-list filters.

```bash
curl --location '{{base_url}}/leave?employeeId={{EMPLOYEE_ID}}&status=pending&fromDate=2026-07-01&toDate=2026-07-31&page=1&limit=20' \
--header 'Authorization: Bearer {{accessToken}}'
```

### 23. Find Leave Request by ID

Admins can retrieve any request. Employees can retrieve only their own request.

```bash
curl --location '{{base_url}}/leave/{{LEAVE_ID}}' \
--header 'Authorization: Bearer {{employeeAccessToken}}'
```

### 24. Approve Leave Request

Admin-only. Approval is allowed only while the request is pending and no attendance events exist on an affected assigned date.

```bash
curl --location --request PUT '{{base_url}}/leave/{{LEAVE_ID}}/approve' \
--header 'Authorization: Bearer {{accessToken}}'
```

### 25. Create a Request for Rejection

Create another pending request and store its returned `data.id` as `{{REJECT_LEAVE_ID}}`.

```bash
curl --location '{{base_url}}/leave' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{employeeAccessToken}}' \
--data '{
    "startDate": "2026-07-06",
    "endDate": "2026-07-06",
    "reason": "Request used to test rejection"
}'
```

### 26. Reject Leave Request

Admin-only. A non-empty rejection reason is required.

```bash
curl --location --request PUT '{{base_url}}/leave/{{REJECT_LEAVE_ID}}/reject' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{accessToken}}' \
--data '{
    "reason": "Insufficient staffing for the requested date"
}'
```

### 27. Create a Request for Cancellation

Create a third pending request and store its returned `data.id` as `{{CANCEL_LEAVE_ID}}`.

```bash
curl --location '{{base_url}}/leave' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{employeeAccessToken}}' \
--data '{
    "startDate": "2026-07-07",
    "endDate": "2026-07-07",
    "reason": "Request used to test cancellation"
}'
```

### 28. Cancel My Leave Request

Employee-only. Employees can cancel only their own pending requests.

```bash
curl --location --request PUT '{{base_url}}/leave/{{CANCEL_LEAVE_ID}}/cancel' \
--header 'Authorization: Bearer {{employeeAccessToken}}'
```
