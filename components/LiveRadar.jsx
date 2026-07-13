"use client";

import { useMemo } from "react";

const formatDate = (value) => {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function LiveRadar({ content, liveSummary }) {
  const summary = liveSummary;
  const sourceMode = summary?.sourceMode || "research-snapshot";
  const status = sourceMode === "live-github" ? "Live GitHub API" : "Research snapshot";
  const profileLogin = summary?.profile?.login;
  const profileName = summary?.profile?.name;
  const publicRepos = summary?.profile?.public_repos;

  const latest = useMemo(
    () => (Array.isArray(summary?.latest) ? summary.latest.slice(0, 4) : []),
    [summary],
  );

  return (
    <section
      aria-labelledby="radar-title"
      className="live-radar section-band"
      data-source-mode={sourceMode}
      id="radar"
    >
      <div className="radar-layout">
        <header className="radar-copy" data-reveal>
          <div className="section-kicker">UPSTREAM RADAR</div>
          <h2 id="radar-title">GitHub, without theatre.</h2>
          <p>
            Public GitHub activity for @{profileLogin || "teerthsharma"}. The source state and
            fetch date stay visible, including when the live API falls back to a snapshot.
          </p>
          <div className="radar-status" data-mode={sourceMode}>
            <span>{status}</span>
            <strong>{profileName || (profileLogin ? `@${profileLogin}` : "GitHub unavailable")}</strong>
            <small>{profileLogin ? `@${profileLogin}` : "public profile pending"}</small>
            <small>
              {Number.isFinite(publicRepos) ? `${publicRepos} public repos / ` : ""}
              fetched {formatDate(summary?.generatedAt)}
            </small>
          </div>
        </header>

        <div className="radar-stack" aria-label="Latest public GitHub activity" aria-live="polite">
          {latest.length ? (
            latest.map((event, index) => (
              <a
                aria-label={`${event.repo}: ${event.title}`}
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
            ))
          ) : (
            <div className="radar-empty" role="status">
              No activity rows were returned. Open the public profile for the current source.
              <a href={content.profile.github} rel="noreferrer" target="_blank">
                Open GitHub
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
