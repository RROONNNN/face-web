'use client';

import { useActionState } from 'react';
import { loginAction, type LoginActionState } from '@/lib/auth/actions';

const initialState: LoginActionState = {
  message: null,
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="login-form">
      <label className="field">
        <span>Employee code</span>
        <input
          autoComplete="username"
          autoFocus
          name="employeeCode"
          placeholder="ADMIN001"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          name="password"
          placeholder="Enter password"
          required
          type="password"
        />
      </label>

      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
