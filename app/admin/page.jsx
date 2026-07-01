export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return (
    <main className="admin-page">
      <section className="admin-login">
        <p>Seal Topology Observatory</p>
        <h1>Admin disabled for v1</h1>
        <span className="admin-message">
          The public Teerth research world is source-driven from the repository. Template admin
          editing is intentionally removed from this release.
        </span>
        <a className="neo-button" href="/">
          Return to observatory
        </a>
      </section>
    </main>
  );
}
