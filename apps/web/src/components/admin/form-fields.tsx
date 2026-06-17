import type { Employee, Shift } from '@face-web/shared';

export function EmployeeFields({ employee }: { employee?: Employee }) {
  return (
    <div className="form-grid">
      <label className="field">
        <span>Name</span>
        <input name="name" required defaultValue={employee?.name ?? ''} />
      </label>
      <label className="field">
        <span>Department</span>
        <input name="department" defaultValue={employee?.department ?? ''} />
      </label>
      <label className="field">
        <span>Job title</span>
        <input name="jobTitle" defaultValue={employee?.jobTitle ?? ''} />
      </label>
      <label className="field">
        <span>Phone</span>
        <input name="phone" defaultValue={employee?.phone ?? ''} />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" defaultValue={employee?.email ?? ''} />
      </label>
      <label className="field">
        <span>Date of birth</span>
        <input
          name="dateOfBirth"
          type="date"
          defaultValue={employee?.dateOfBirth?.slice(0, 10) ?? ''}
        />
      </label>
    </div>
  );
}

export function ShiftFields({ shift }: { shift?: Shift }) {
  return (
    <div className="form-grid compact">
      <label className="field">
        <span>Name</span>
        <input name="name" required defaultValue={shift?.name ?? ''} />
      </label>
      <label className="field">
        <span>Start</span>
        <input
          name="startTime"
          required
          type="time"
          defaultValue={shift?.startTime?.slice(0, 5) ?? '08:00'}
        />
      </label>
      <label className="field">
        <span>End</span>
        <input
          name="endTime"
          required
          type="time"
          defaultValue={shift?.endTime?.slice(0, 5) ?? '17:00'}
        />
      </label>
    </div>
  );
}
