'use client';

import { createLeaveRequestAction } from '@/lib/admin/actions';
import type { Department, Shift, User } from '@/lib/api/types';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

type LeaveRequestCreateFormProps = {
  departments: Pick<Department, 'id' | 'defaultShiftId'>[];
  employees: Pick<User, 'id' | 'name' | 'employeeCode' | 'departmentId'>[];
  shifts: Pick<Shift, 'id' | 'name' | 'workPeriods'>[];
};

export function LeaveRequestCreateForm({
  departments,
  employees,
  shifts,
}: LeaveRequestCreateFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const selectedShift = useMemo(
    () => shifts.find((shift) => shift.id === shiftId),
    [shiftId, shifts],
  );
  const selectedPeriods =
    selectedShift?.workPeriods.filter(
      (period): period is typeof period & { id: string } => Boolean(period.id),
    ) ?? [];

  function handleEmployeeChange(value: string) {
    setEmployeeId(value);

    const employee = employeesById.get(value);
    const defaultShiftId = employee?.departmentId
      ? departmentsById.get(employee.departmentId)?.defaultShiftId
      : undefined;
    setShiftId(defaultShiftId ?? '');
  }

  return (
    <>
      <button
        className="primary-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Create request
      </button>

      {isOpen ? (
        <div className="attendance-modal-backdrop">
          <div className="attendance-modal">
            <div className="attendance-modal-header">
              <h2>Create leave request</h2>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <form
              action={createLeaveRequestAction}
              className="form-panel"
              onSubmit={() => setIsOpen(false)}
            >
              <div className="form-grid">
                <label className="field">
                  <span>Employee</span>
                  <select
                    name="employeeId"
                    onChange={(event) =>
                      handleEmployeeChange(event.target.value)
                    }
                    required
                    value={employeeId}
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employeeCode})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Shift</span>
                  <select
                    onChange={(event) => setShiftId(event.target.value)}
                    value={shiftId}
                  >
                    <option value="">Select shift</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Start date</span>
                  <input name="startDate" required type="date" />
                </label>

                <label className="field">
                  <span>End date</span>
                  <input name="endDate" required type="date" />
                </label>

                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>Reason</span>
                  <textarea name="reason" required rows={3} />
                </label>
              </div>

              <fieldset className="fieldset">
                <legend>Partial day</legend>
                <div className="form-grid">
                  <label className="field">
                    <span>Work date</span>
                    <input name="partialWorkDate" type="date" />
                  </label>
                  <label className="field">
                    <span>Work periods</span>
                    <select
                      disabled={selectedPeriods.length === 0}
                      multiple
                      name="partialWorkPeriodIds"
                      size={Math.max(
                        2,
                        Math.min(4, selectedPeriods.length || 2),
                      )}
                    >
                      {selectedPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name} ({period.startTime}-{period.endTime})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>

              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  className="secondary-button"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button" disabled={pending} type="submit">
      {pending ? 'Creating...' : 'Create'}
    </button>
  );
}
