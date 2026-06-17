import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/login-form';
import { getSession } from '@/lib/session';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Admin portal</p>
          <h1>Face Web</h1>
          <p className="muted">
            Sign in with an admin employee code to manage attendance operations.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
