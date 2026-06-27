'use client';

import { adminCheckInAction, adminCheckOutAction, finalizeDayAction } from '@/lib/admin/actions';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AttendanceActionButtons({
  employees,
  defaultWorkDate,
  returnPath,
}: {
  employees: Array<{ id: string; name: string }>;
  defaultWorkDate?: string;
  returnPath?: string;
}) {
  const [activeModal, setActiveModal] = useState<'checkIn' | 'checkOut' | 'finalize' | null>(null);

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button className="secondary-button" onClick={() => setActiveModal('checkIn')}>
        Manual Check-in
      </button>
      <button className="secondary-button" onClick={() => setActiveModal('checkOut')}>
        Manual Check-out
      </button>
      <button className="secondary-button" onClick={() => setActiveModal('finalize')}>
        Finalize Day
      </button>

      {activeModal === 'checkIn' && (
        <Modal onClose={() => setActiveModal(null)} title="Manual Check-in">
          <form action={adminCheckInAction} className="form-panel" onSubmit={() => setActiveModal(null)}>
            {returnPath ? <input name="returnPath" type="hidden" value={returnPath} /> : null}
            <div className="form-grid">
              <label className="field">
                <span>Employee</span>
                <select name="employeeId" required>
                  <option value="">Select an employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Work Date</span>
                <input defaultValue={defaultWorkDate} name="workDate" type="date" required />
              </label>
              <label className="field">
                <span>Occurred At</span>
                <input name="occurredAt" type="time" required />
              </label>
              <label className="field">
                <span>Note</span>
                <input name="note" />
              </label>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="secondary-button" onClick={() => setActiveModal(null)}>Cancel</button>
              <SubmitButton label="Submit Check-in" pendingLabel="Submitting..." />
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'checkOut' && (
        <Modal onClose={() => setActiveModal(null)} title="Manual Check-out">
          <form action={adminCheckOutAction} className="form-panel" onSubmit={() => setActiveModal(null)}>
            {returnPath ? <input name="returnPath" type="hidden" value={returnPath} /> : null}
            <div className="form-grid">
              <label className="field">
                <span>Employee</span>
                <select name="employeeId" required>
                  <option value="">Select an employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Work Date</span>
                <input defaultValue={defaultWorkDate} name="workDate" type="date" required />
              </label>
              <label className="field">
                <span>Occurred At</span>
                <input name="occurredAt" type="time" required />
              </label>
              <label className="field">
                <span>Note</span>
                <input name="note" />
              </label>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="secondary-button" onClick={() => setActiveModal(null)}>Cancel</button>
              <SubmitButton label="Submit Check-out" pendingLabel="Submitting..." />
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'finalize' && (
        <Modal onClose={() => setActiveModal(null)} title="Finalize Day">
          <form action={finalizeDayAction} className="form-panel" onSubmit={() => setActiveModal(null)}>
            {returnPath ? <input name="returnPath" type="hidden" value={returnPath} /> : null}
            <p style={{ marginBottom: '1rem' }}>
              Finalizing the day will mark pending records as absent and checked-in records as missing checkout. This action cannot be undone.
            </p>
            <div className="form-grid">
              <label className="field">
                <span>Work Date</span>
                <input defaultValue={defaultWorkDate} name="workDate" type="date" required />
              </label>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="secondary-button" onClick={() => setActiveModal(null)}>Cancel</button>
              <SubmitButton label="Finalize Day" pendingLabel="Finalizing..." />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface, #fff)', padding: '2rem', 
        borderRadius: '8px', width: '100%', maxWidth: '500px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
