# API Workflow - Postman Tests

Here is the complete sequence of `curl` commands to test the full lifecycle of the application.

**Postman Variables Used:**
- `{{base_url}}` - The base URL of the API
- `{{accessToken}}` - The JWT access token (usually from the admin login)
- `{{DEPARTMENT_ID}}` - The UUID of the department
- `{{EMPLOYEE_ID}}` - The UUID of the generated employee

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
Generates the assignments based on the employee's department's default shift. By passing today's date, you can test check-ins immediately.
```bash
curl --location --request POST '{{base_url}}/shifts/assignments/generate?workDate=2026-06-23' \
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

