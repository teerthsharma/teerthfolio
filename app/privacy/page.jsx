export const metadata = {
  title: "Privacy: how this site is measured",
  description: "Measured with Cloudflare Web Analytics and Microsoft Clarity. No cookies of its own; Clarity stays off when Do Not Track or Global Privacy Control is on.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Teerth Sharma — Seal's Topology Land",
    description: "Measured with Cloudflare Web Analytics and Microsoft Clarity. No cookies of its own; Clarity stays off when Do Not Track or Global Privacy Control is on.",
    type: "website",
    siteName: "Teerth Sharma",
    url: "/privacy",
  },
};

// globals.css locks html/body scroll for the island, so this page scrolls itself.
export default function Privacy() {
  return (
    <main style={{ height: "100%", overflowY: "auto", padding: "48px 16px", fontFamily: "var(--font-sans), sans-serif", lineHeight: 1.6 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1>Privacy</h1>
        <p>
          bro don&apos;t worry. you swam all the way down to the footer of an ice island where one baby seal lives, and you are the
          second most interesting thing on it.
        </p>
        <p>
          I do not want your data. I have no money to misuse it with, no yacht, and the seal does not even have pockets. The numbers
          below only tell me one thing: did anybody actually read the island, or did everyone bounce off the loading screen. (You are
          reading this one, so you are my favourite visitor.)
        </p>
        <h2>the boring bit</h2>
        <p>
          This site is measured with Cloudflare Web Analytics and Microsoft Clarity, and it shows up in Google Search. Together they
          see page views, how long you stayed on a page, how far you scrolled, which buttons and links got clicked or tapped, and
          where you came from. Nothing you type is recorded. No names, no emails, nothing is sold, and nothing goes to an ad network.
        </p>
        <p>
          This site sets no cookies of its own. Clarity may set its own; your browser can block them and the island still runs. If
          your browser sends Do Not Track or Global Privacy Control, Clarity is never loaded at all. Those services also have their
          own privacy policies, which are longer and funnier in a worse way.
        </p>
        <p>ily gang. seal out.</p>
        <p><a href="/">Back to the island</a></p>
      </div>
    </main>
  );
}
