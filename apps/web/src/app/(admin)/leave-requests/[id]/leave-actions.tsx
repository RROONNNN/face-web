'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  approveLeaveAction,
  cancelLeaveAction,
  rejectLeaveAction,
} from '@/lib/admin/actions';

function SubmitButton({
  label,
  pendingLabel,
  destructive,
}: {
  label: string;
  pendingLabel: string;
  destructive?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={destructive ? 'secondary-button' : 'primary-button'}
      disabled={pending}
      style={destructive ? { borderColor: 'red', color: 'red' } : undefined}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LeaveActionButtons({
  id,
  status,
  returnPath,
}: {
  id: string;
  status: string;
  returnPath?: string;
}) {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  if (status !== 'pending') {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <form action={approveLeaveAction}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton label="Approve" pendingLabel="Approving..." />
      </form>

      <button
        className="secondary-button"
        onClick={() => setRejectModalOpen(true)}
        style={{ borderColor: 'red', color: 'red' }}
        type="button"
      >
        Reject
      </button>

      <button
        className="secondary-button"
        onClick={() => setCancelModalOpen(true)}
        type="button"
      >
        Cancel
      </button>

      {rejectModalOpen && (
        <Modal
          onClose={() => setRejectModalOpen(false)}
          title="Reject Leave Request"
        >
          <form
            action={rejectLeaveAction}
            className="form-panel"
            onSubmit={() => setRejectModalOpen(false)}
          >
            <input type="hidden" name="id" value={id} />
            <div className="form-grid">
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Rejection Reason</span>
                <textarea name="reason" required rows={3}></textarea>
              </label>
            </div>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <button
                className="secondary-button"
                onClick={() => setRejectModalOpen(false)}
                type="button"
              >
                Close
              </button>
              <SubmitButton
                label="Submit Rejection"
                pendingLabel="Rejecting..."
                destructive
              />
            </div>
          </form>
        </Modal>
      )}

      {cancelModalOpen && (
        <Modal
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Leave Request"
        >
          <form
            action={cancelLeaveAction}
            className="form-panel"
            onSubmit={() => setCancelModalOpen(false)}
          >
            <input name="id" type="hidden" value={id} />
            {returnPath ? (
              <input name="returnPath" type="hidden" value={returnPath} />
            ) : null}
            <p style={{ margin: 0 }}>Cancel this pending leave request?</p>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <button
                className="secondary-button"
                onClick={() => setCancelModalOpen(false)}
                type="button"
              >
                Close
              </button>
              <SubmitButton
                label="Confirm cancel"
                pendingLabel="Cancelling..."
                destructive
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  title,
  onClose,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="attendance-modal-backdrop">
      <div className="attendance-modal">
        <div className="attendance-modal-header">
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          <button
            aria-label="Close"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
