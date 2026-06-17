# API Database ERD

Generated from `apps/api/schema.sql`.

## Attendance Events

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar employee_code UK
        varchar name
    }

    SHIFTS {
        uuid id PK
        varchar name
        time start_time
        time end_time
        boolean is_active
    }

    CHECK_INS {
        uuid id PK
        uuid employee_id FK
        uuid shift_id FK
        date work_date
        timestamptz time
        attendance_method_enum method
        uuid created_by_id FK
    }

    CHECK_OUTS {
        uuid id PK
        uuid employee_id FK
        uuid shift_id FK
        date work_date
        timestamptz time
        attendance_method_enum method
        uuid created_by_id FK
    }

    USERS ||--o{ CHECK_INS : "employee"
    USERS |o--o{ CHECK_INS : "created_by"
    SHIFTS ||--o{ CHECK_INS : "shift"

    USERS ||--o{ CHECK_OUTS : "employee"
    USERS |o--o{ CHECK_OUTS : "created_by"
    SHIFTS ||--o{ CHECK_OUTS : "shift"
```

## Employee Support

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar employee_code UK
        varchar name
    }

    FACE_DATA {
        uuid id PK
        uuid employee_id FK,UK
        jsonb list_face_embedding
        varchar image_url
    }

    LEAVE_REQUESTS {
        uuid id PK
        uuid employee_id FK
        date start_date
        date end_date
        leave_request_status_enum status
        uuid reviewed_by_id FK
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        timestamptz expires_at
        timestamptz revoked_at
    }

    USERS ||--o| FACE_DATA : "face_profile"
    USERS ||--o{ LEAVE_REQUESTS : "employee"
    USERS |o--o{ LEAVE_REQUESTS : "reviewed_by"
    USERS ||--o{ REFRESH_TOKENS : "refresh_tokens"
```

## Standalone Tables

```mermaid
erDiagram
    GEO_CONFIGS {
        varchar id PK
        double center_lat
        double center_lon
        integer radius_meters
    }

    MIGRATIONS {
        integer id PK
        bigint timestamp
        varchar name
    }
```

## Table Columns

| Table | Columns |
| --- | --- |
| `users` | `id`, `employee_code`, `name`, `password_hash`, `account_role`, `department`, `job_title`, `phone`, `email`, `date_of_birth`, `created_at`, `updated_at` |
| `shifts` | `id`, `name`, `start_time`, `end_time`, `is_active`, `created_at`, `updated_at` |
| `check_ins` | `id`, `employee_id`, `shift_id`, `work_date`, `time`, `latitude`, `longitude`, `method`, `image_path`, `is_out_of_zone`, `created_by_id`, `created_at`, `updated_at` |
| `check_outs` | `id`, `employee_id`, `shift_id`, `work_date`, `time`, `latitude`, `longitude`, `method`, `image_path`, `is_out_of_zone`, `created_by_id`, `created_at`, `updated_at` |
| `face_data` | `id`, `employee_id`, `list_face_embedding`, `image_url`, `updated_time`, `created_at`, `updated_at` |
| `leave_requests` | `id`, `employee_id`, `start_date`, `end_date`, `reason`, `status`, `reviewed_by_id`, `reviewed_at`, `rejection_reason`, `created_at`, `updated_at` |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at` |
| `geo_configs` | `id`, `center_lat`, `center_lon`, `radius_meters`, `created_at`, `updated_at` |
| `migrations` | `id`, `timestamp`, `name` |

## Relationship Notes

- `users.employee_code` is unique.
- `face_data.employee_id` is unique, so each user can have at most one face profile.
- `check_ins.created_by_id`, `check_outs.created_by_id`, and `leave_requests.reviewed_by_id` are nullable and use `ON DELETE SET NULL`.
- `face_data.employee_id` and `refresh_tokens.user_id` use `ON DELETE CASCADE`.
- `geo_configs` and `migrations` have no foreign-key relationships in this dump.
- `shifts` has a partial unique index on active shifts: only one row can have `is_active = true`.
