import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in | Face Web Admin',
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">Admin portal</p>
        <h1 id="login-title">Sign in</h1>
        <p className="auth-copy">
          Use an admin employee account to manage attendance operations.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
