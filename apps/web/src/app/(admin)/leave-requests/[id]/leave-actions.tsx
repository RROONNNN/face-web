'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { approveLeaveAction, rejectLeaveAction } from '@/lib/admin/actions';

function SubmitButton({ label, pendingLabel, destructive }: { label: string; pendingLabel: string; destructive?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={destructive ? 'secondary-button' : 'primary-button'} type="submit" disabled={pending} style={destructive ? { borderColor: 'red', color: 'red' } : {}}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LeaveActionButtons({ id, status }: { id: string; status: string }) {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  if (status !== 'pending') {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <form action={approveLeaveAction}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton label="Approve" pendingLabel="Approving..." />
      </form>

      <button className="secondary-button" onClick={() => setRejectModalOpen(true)} style={{ borderColor: 'red', color: 'red' }}>
        Reject
      </button>

      {rejectModalOpen && (
        <Modal onClose={() => setRejectModalOpen(false)} title="Reject Leave Request">
          <form action={rejectLeaveAction} className="form-panel" onSubmit={() => setRejectModalOpen(false)}>
            <input type="hidden" name="id" value={id} />
            <div className="form-grid">
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Rejection Reason</span>
                <textarea name="reason" required rows={3}></textarea>
              </label>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="secondary-button" onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <SubmitButton label="Submit Rejection" pendingLabel="Rejecting..." destructive />
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
