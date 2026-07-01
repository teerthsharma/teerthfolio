const formatDate = (value) => {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export default function EvidenceArchive({ content, domainRows, liveSummary, projects }) {
  const upstream = content.upstream || [];

  return (
    <section className="evidence-archive section-band" id="archive">
      <div className="archive-head" data-reveal>
        <span className="section-kicker">DENSE EVIDENCE ARCHIVE</span>
        <h2>Live radar. Snapshot proof.</h2>
        <p>
          Every row is tied to a repository, timestamp, file trace, or upstream
          link: Epsilon-Hollow, Aether-Lang, field physics, topology systems,
          and public work in triton-lang/triton, PyTorch, and NeMo-Relay.
        </p>
      </div>

      <div className="archive-grid">
        <article className="archive-panel archive-panel-wide" data-reveal>
          <span>Source mode</span>
          <strong>{liveSummary?.sourceMode || "research-snapshot"}</strong>
          <p>
            Generated {formatDate(liveSummary?.generatedAt)}. Live GitHub data
            is shown when reachable; otherwise the mined corpus stays visible
            and labeled as a snapshot.
          </p>
        </article>

        <article className="archive-panel" data-reveal>
          <span>Domain map</span>
          <div className="domain-bars">
            {domainRows.map(([domain, count]) => (
              <div key={domain}>
                <strong>{domain}</strong>
                <span style={{ "--domain-size": `${Math.min(100, count * 4)}%` }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="archive-panel" data-reveal>
          <span>Upstream watch</span>
          <div className="upstream-list">
            {upstream.map((item) => (
              <a href={item.url} key={item.url} rel="noreferrer" target="_blank">
                <small>{item.repo}</small>
                <strong>{item.title}</strong>
                <em>{formatDate(item.createdAt)}</em>
              </a>
            ))}
          </div>
        </article>
      </div>

      <div className="repo-tape" aria-label="Flagship source tape" data-reveal>
        {projects.map((project) => (
          <a href={project.url} key={project.name} rel="noreferrer" target="_blank">
            <span>{project.name}</span>
            <small>{project.evidenceFiles?.slice(0, 3).join(" / ") || "source"}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
