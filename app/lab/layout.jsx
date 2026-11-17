// Every /lab page is a capture or development harness, not a page to index. Also disallowed in robots.js.
export const metadata = { robots: { index: false, follow: false } };

export default function LabLayout({ children }) {
  return children;
}
