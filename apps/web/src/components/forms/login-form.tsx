'use client';

import { useActionState } from 'react';
import { KeyRound, LogIn, UserRound } from 'lucide-react';
import { loginAction, type ActionState } from '@/lib/actions';
import { SubmitButton } from './submit-button';

const initialState: ActionState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form className="login-form" action={formAction}>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <label className="field">
        <span>Employee code</span>
        <span className="input-with-icon">
          <UserRound aria-hidden="true" size={18} />
          <input
            autoComplete="username"
            name="employeeCode"
            placeholder="ADM00001"
            required
          />
        </span>
      </label>
      <label className="field">
        <span>Password</span>
        <span className="input-with-icon">
          <KeyRound aria-hidden="true" size={18} />
          <input
            autoComplete="current-password"
            name="password"
            placeholder="Password"
            required
            type="password"
          />
        </span>
      </label>
      <SubmitButton className="primary-button" pendingLabel="Signing in...">
        <LogIn aria-hidden="true" size={18} />
        Sign in
      </SubmitButton>
    </form>
  );
}
