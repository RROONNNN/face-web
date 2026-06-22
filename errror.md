QueryFailedError: invalid input syntax for type timestamp with time zone: "0NaN-NaN-NaNTNaN:NaN:NaN.NaN+NaN:NaN"
params:311dd4e7-a30a-4f75-9753-5a22e4ee6abf,e038494a-6728-46e5-b0d6-6d1036286e9d,2026-06-23,pending,Invalid Date,Invalid Date,[],[],0
query: "INSERT INTO \"attendance_records\"(\"id\", \"employee_id\", \"shift_assignment_id\", \"work_date\", \"status\", \"expected_check_in_at\", \"expected_check_out_at\", \"checked_in_at\", \"checked_out_at\", \"audit_check_in\", \"audit_check_out\", \"check_in_source\", \"check_out_source\", \"late_minutes\") VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, DEFAULT, DEFAULT, $7, $8, DEFAULT, DEFAULT, $9) RETURNING \"id\", \"status\", \"audit_check_in\", \"audit_check_out\", \"late_minutes\""
"DateTimeParseError"
