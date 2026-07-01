"use client";

import { useEffect, useMemo, useState } from "react";

const formatDate = (value) => {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export default function LiveRadar({ content, liveSummary }) {
  const [summary, setSummary] = useState(liveSummary);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setSummary(liveSummary);
    setStatus(liveSummary?.sourceMode === "research-snapshot" ? "fallback" : "live");
  }, [liveSummary]);

  const latest = useMemo(
    () => (Array.isArray(summary?.latest) ? summary.latest.slice(0, 5) : []),
    [summary],
  );

  return (
    <section className="live-radar section-band" id="radar" data-reveal>
      <div className="section-kicker">UPSTREAM RADAR</div>
      <div className="radar-layout">
        <div className="radar-copy">
          <h2>Live GitHub signal over the ice shelf.</h2>
          <p>
            The radar checks Teerth Sharma&apos;s public GitHub activity and shows the
            latest open-source movement. When the API is unavailable, it clearly
            switches to the research-snapshot fallback.
          </p>
          <div className="radar-status" data-mode={summary?.sourceMode || "research-snapshot"}>
            <span>{status}</span>
            <strong>{summary?.sourceMode || "research-snapshot"}</strong>
            <small>generated {formatDate(summary?.generatedAt)}</small>
          </div>
        </div>

        <div className="radar-stack" aria-label="Latest public GitHub activity">
          {latest.map((event, index) => (
            <a
              className="radar-event"
              data-reveal
              href={event.url || content.profile.github}
              key={`${event.repo}-${event.title}-${index}`}
              rel="noreferrer"
              target="_blank"
            >
              <span>{event.repo}</span>
              <strong>{event.title}</strong>
              <small>
                {event.type || event.label || "open-source event"} / {formatDate(event.createdAt)}
              </small>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
