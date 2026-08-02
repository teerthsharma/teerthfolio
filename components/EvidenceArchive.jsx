"use client";

import { useRef, useState } from "react";

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

// Slice ramp walks the site palette mint -> teal -> cyan -> cobalt -> violet -> steel -> coral.
// Values are existing tokens (--signal, --abeto-teal, --dawn-cyan, --violet, --aurora-violet,
// --steel, --danger) plus two interpolations to keep nine steps distinct.
const DOMAIN_SLICE_COLORS = Object.freeze([
  "#6FE7C8",
  "#4FB3AE",
  "#6FB8CE",
  "#8AA9E6",
  "#A98FE3",
  "#8D69D6",
  "#A9B8D4",
  "#F0A88C",
  "#F47D69",
]);

// Donut geometry: pathLength="100" makes every dash unit exactly one percent,
// so no arc-path trigonometry is needed. Offset 25 rotates the start to 12 o'clock.
const DONUT_GAP = 0.5;

const buildDomainSlices = (rows) => {
  const total = rows.reduce((sum, [, count]) => sum + count, 0) || 1;
  let cursor = 0;
  return rows.map(([domain, count], index) => {
    const percent = (count / total) * 100;
    const slice = {
      color: DOMAIN_SLICE_COLORS[index % DOMAIN_SLICE_COLORS.length],
      count,
      domain,
      offset: cursor,
      percent,
    };
    cursor += percent;
    return slice;
  });
};

const EVIDENCE_PANELS = Object.freeze({
  source: { id: "source", label: "Source mode" },
  domains: { id: "domains", label: "Domain map" },
  upstream: { id: "upstream", label: "Upstream watch" },
});

export default function EvidenceArchive({ content, domainRows, liveSummary, projects }) {
  // Opens on upstream work, not on the source-mode enum. The default panel used
  // to be a 797x360 card whose entire payload was the internal identifier
  // "live-github" set at display size with 203px of empty space under it, while
  // the merged contributions to triton-lang, pytorch and nemo-relay - the only
  // evidence here a stranger cannot fabricate - sat behind the third tab, 4,320px
  // of horizontal scroll from the entry gate.
  const [activePanel, setActivePanel] = useState("upstream");
  const tabRefs = useRef(new Map());
  const upstream = content.upstream || [];
  const panels = Object.values(EVIDENCE_PANELS);
  const selectedPanel = EVIDENCE_PANELS[activePanel];
  const domainSlices = buildDomainSlices(domainRows);
  const domainTotal = domainRows.reduce((sum, [, count]) => sum + count, 0);
  const leadSlice = domainSlices[0];

  const handleTabKeyDown = (event, index) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? panels.length - 1
          : event.key === "ArrowLeft"
            ? (index - 1 + panels.length) % panels.length
            : (index + 1) % panels.length;
    const nextPanel = panels[nextIndex];
    event.preventDefault();
    setActivePanel(nextPanel.id);
    tabRefs.current.get(nextPanel.id)?.focus();
  };

  return (
    <section aria-labelledby="archive-title" className="evidence-archive section-band" id="archive">
      <header className="archive-head" data-reveal>
        <span className="section-kicker">DENSE EVIDENCE ARCHIVE</span>
        <h2 id="archive-title">Live radar. Snapshot proof.</h2>
        <p>
          Every row is tied to a repository, timestamp, file trace, or upstream link:
          Epsilon-Hollow, Aether-Lang, field physics, topology systems, and public work in
          triton-lang/triton, PyTorch, and NeMo-Relay.
        </p>
      </header>

      <div className="archive-explorer">
        <div aria-label="Evidence views" className="archive-tabs" role="tablist">
          {panels.map((panel, index) => (
            <button
              aria-controls={`archive-panel-${panel.id}`}
              aria-selected={activePanel === panel.id}
              id={`archive-tab-${panel.id}`}
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(node) => {
                if (node) tabRefs.current.set(panel.id, node);
                else tabRefs.current.delete(panel.id);
              }}
              role="tab"
              tabIndex={activePanel === panel.id ? 0 : -1}
              type="button"
            >
              {panel.label}
            </button>
          ))}
        </div>

        <article
          aria-labelledby={`archive-tab-${selectedPanel.id}`}
          className="archive-panel archive-panel-active"
          data-panel={selectedPanel.id}
          data-reveal
          id={`archive-panel-${selectedPanel.id}`}
          role="tabpanel"
          tabIndex={0}
        >
          {activePanel === "source" ? (
            <>
              <span>Source mode</span>
              <strong>{liveSummary?.sourceMode || "research-snapshot"}</strong>
              <p>
                Generated {formatDate(liveSummary?.generatedAt)}. Live GitHub data is shown when
                reachable; otherwise the mined corpus stays visible and labeled as a snapshot.
              </p>
            </>
          ) : null}

          {activePanel === "domains" ? (
            <>
              <span>Domain map</span>
              <div className="domain-map">
                <svg
                  aria-label={`Domain distribution donut: ${domainTotal} repositories across ${domainSlices.length} domains, led by ${leadSlice?.domain} at ${Math.round(leadSlice?.percent || 0)} percent. Every domain and count is listed beside the chart.`}
                  className="domain-donut"
                  fill="none"
                  height="176"
                  role="img"
                  viewBox="0 0 42 42"
                  width="176"
                >
                  <circle className="domain-donut-track" cx="21" cy="21" pathLength="100" r="15.9155" />
                  {domainSlices.map((slice) => (
                    <circle
                      className="domain-donut-slice"
                      cx="21"
                      cy="21"
                      key={slice.domain}
                      pathLength="100"
                      r="15.9155"
                      stroke={slice.color}
                      strokeDasharray={`${Math.max(0.1, slice.percent - DONUT_GAP)} ${100 - Math.max(0.1, slice.percent - DONUT_GAP)}`}
                      strokeDashoffset={25 - slice.offset}
                    />
                  ))}
                  <text className="domain-donut-total" x="21" y="20.6">
                    {domainTotal}
                  </text>
                  <text className="domain-donut-caption" x="21" y="25">
                    REPOS
                  </text>
                </svg>
                <ul className="domain-legend">
                  {domainSlices.map((slice) => (
                    <li key={slice.domain}>
                      <i aria-hidden="true" style={{ background: slice.color }} />
                      <strong>{slice.domain}</strong>
                      <span>{slice.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {activePanel === "upstream" ? (
            <>
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
            </>
          ) : null}
        </article>
      </div>

      <nav className="repo-tape" aria-label="Flagship source tape" data-reveal>
        {projects.map((project) => (
          <a href={project.url} key={project.name} rel="noreferrer" target="_blank">
            <span>{project.name}</span>
            <small>{project.evidenceFiles?.slice(0, 3).join(" / ") || "source"}</small>
          </a>
        ))}
      </nav>
    </section>
  );
}
