const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function Home() {
  return (
    <main>
      <section>
        <p className="eyebrow">Full-stack workspace</p>
        <h1>Face Web</h1>
        <p>
          Next.js frontend and NestJS backend are now organized as npm
          workspaces in one repository.
        </p>
        <a href={apiUrl}>Open API</a>
      </section>
    </main>
  );
}
