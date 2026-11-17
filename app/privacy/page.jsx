export const metadata = { title: "Privacy — Teerth Sharma" };

// globals.css locks html/body scroll for the island, so this page scrolls itself.
export default function Privacy() {
  return (
    <main style={{ height: "100%", overflowY: "auto", padding: "48px 16px", fontFamily: "var(--font-sans), sans-serif", lineHeight: 1.6 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1>Privacy</h1>
        <p>
          This site measures visits with Cloudflare Web Analytics and Microsoft Clarity, and appears in Google Search. They record
          the time spent on each page, how far it was scrolled, which buttons and links were clicked or tapped, and where the visit
          came from. No text you type is recorded, and the site sets no cookies of its own. Clarity does not load at all if your
          browser sends Do Not Track or Global Privacy Control. Those services are also covered by their own privacy policies.
        </p>
        <p><a href="/">Back to the island</a></p>
      </div>
    </main>
  );
}
