"use client";

import { useMemo, useState } from "react";

const formatDate = (value) => {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const languageLabel = (project) => {
  if (project.language) return project.language;
  if (project.languages?.length) return project.languages[0].language;
  return "Research";
};

const formatCount = (value) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "size unavailable";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${bytes} B`;
};

const sourceTraceLabel = (project, repositoryMetric) => {
  if (Number.isInteger(repositoryMetric?.trackedFileCount)) {
    return `${formatCount(repositoryMetric.trackedFileCount)} tracked / ${formatCount(
      repositoryMetric.rustFileCount || 0,
    )} Rust`;
  }
  const fileCount = project.evidenceFiles?.length || 0;
  const commitCount = project.recentCommits?.length || 0;
  if (fileCount && commitCount) {
    return `${fileCount} sampled paths / ${commitCount} recent commits`;
  }
  if (fileCount) return `${fileCount} sampled evidence paths`;
  if (commitCount) return `${commitCount} recent commit samples`;
  return "Repository link available";
};

// Commit substance ranking. The strip took the three most recent commits with
// no filter, so under a heading reading "Repository evidence, project by
// project" it rendered "Format code with ruff", "ci: fix lint and type errors",
// "Add pytest-cov to dev dependencies" and a merge commit titled "yaya" - while
// "feat: implement traversable wormhole protocol with IBM QPU verification"
// sat unshown in the same array. A reviewer reading the strip concluded the
// author's recent output was running a formatter.
// A conventional-commit type is not enough on its own: `fix(ci):` and
// `feat(build):` are housekeeping wearing a feature prefix, so the scope is
// checked too.
const CHORE_COMMIT =
  /^(chore|ci|build|style|docs|test|revert)\b|^\w+\((ci|build|deps|release|docs|test|lint)\)|^merge\b|\blint\b|\bformat code\b|\btypos?\b|\[skip ci\]/i;
const FEATURE_COMMIT = /^(feat|perf|fix)\b/i;

const rankCommits = (commits = []) => {
  const score = (message) => {
    // ponytail: a 15-character floor stands in for "says what it did". It is a
    // heuristic, not a parser - it demotes "yaya" without claiming to judge
    // prose. Raise it only if real one-line messages start disappearing.
    if (message.trim().length < 15) return 0;
    if (CHORE_COMMIT.test(message)) return 0;
    if (FEATURE_COMMIT.test(message)) return 2;
    return 1;
  };
  const ranked = [...commits]
    .map((message, index) => ({ message, index, score: score(message) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const substantive = ranked.filter((entry) => entry.score > 0);
  // A repository whose recent history is genuinely all chores still shows
  // something; it just no longer outranks real work when real work exists.
  return (substantive.length ? substantive : ranked).slice(0, 3).map((entry) => entry.message);
};

// The `purpose` field is machine-templated as "<name>: <first README line>
// (<domain>)." and was rendered verbatim, so the detail panel printed the
// project name twice, restated a domain already shown in the list row and in
// the DOMAIN tile below, and leaked raw markdown - literal asterisks in
// "-CE-BB: **Zero-Copy Bit-Packed Omnicloud MoE Orchestrator**", and a 380
// character unescaped block quote on aether-wave. This strips the template and
// the markup; it does not invent prose.
const cleanPurpose = (project) => {
  const raw = project?.purpose || project?.description || "";
  const domain = project?.domain;
  let text = raw
    .replace(new RegExp(`^${project?.name}\\s*:\\s*`, "i"), "")
    .replace(/^\s*>\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
  if (domain) {
    text = text.replace(new RegExp(`\\s*\\(${domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)\\.?\\s*$`, "i"), "");
  }
  // Strip a leading duplicate of the name that survived the template prefix,
  // e.g. "Aether-Lang: Aether-Lang: Rust runtime for topological ML".
  text = text.replace(new RegExp(`^${project?.name}\\s*:\\s*`, "i"), "").trim();
  text = text.replace(/^["“]|["”]$/g, "").trim();
  // Some README first-lines are not descriptions. topobridge-q's reduces to
  // "Author: Teerth Sharma"; seal-demon-tts's is "cause why not". Printing
  // those under a project name states something false about the work, so the
  // paragraph is suppressed and the metric tiles carry the record instead.
  // The fix for these is in data/project-intelligence.json, not here.
  if (!text || text.length < 24 || /^authors?\s*:/i.test(text)) return "";
  return text;
};

const repositoryMetricSource = (repositoryMetric) =>
  repositoryMetric?.sourceMode === "live-github-tree"
    ? "Live GitHub tree"
    : repositoryMetric?.sourceMode === "github-tree-snapshot"
      ? "Verified GitHub tree snapshot"
      : "Curated source sample";

export default function ProjectIndex({ projects, repositoryMetrics = {}, stations }) {
  const [activeName, setActiveName] = useState("Epsilon-Hollow");
  const activeProject = useMemo(
    () => projects.find((project) => project.name === activeName) || projects[0],
    [activeName, projects],
  );
  const station = stations.find((entry) =>
    entry.projects.some((projectName) => projectName === activeProject?.name),
  );
  const activeRepositoryMetric = repositoryMetrics[activeProject?.name];

  return (
    <section className="project-index section-band" id="projects">
      <div className="section-kicker" data-reveal>
        SOURCE-BACKED PROJECT INDEX
      </div>
      <div className="project-index-head" data-reveal>
        <h2>Repository evidence, project by project.</h2>
        <p>
          Select a project to inspect its purpose, language bytes, recent commit
          sample, verified repository scope when available, and GitHub source.
        </p>
      </div>

      <div className="project-index-grid">
        <nav className="project-list" aria-label="Flagship projects" data-reveal>
          {projects.map((project) => (
            <button
              aria-pressed={project.name === activeProject?.name}
              key={project.name}
              onClick={() => setActiveName(project.name)}
              type="button"
            >
              <span>{project.domain || "Research"}</span>
              <strong>{project.name}</strong>
              <small>{languageLabel(project)}</small>
            </button>
          ))}
        </nav>

        {activeProject ? (
          <article className="project-detail" data-reveal>
            <div className="project-detail-topline">
              <span>{station?.shortName || "FIELD"}</span>
              <small>{formatDate(activeProject.pushedAt)}</small>
            </div>
            <h3>{activeProject.name}</h3>
            {cleanPurpose(activeProject) ? <p>{cleanPurpose(activeProject)}</p> : null}

            <div className="project-metrics" aria-label={`${activeProject.name} evidence`}>
              <div>
                <span>Domain</span>
                <strong>{activeProject.domain || "Research"}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{activeProject.siteRole || "Source evidence"}</strong>
              </div>
              <div>
                <span>Repository</span>
                <strong>{sourceTraceLabel(activeProject, activeRepositoryMetric)}</strong>
                <small>{repositoryMetricSource(activeRepositoryMetric)}</small>
              </div>
            </div>

            <div className="code-texture" aria-label="Repository language mix">
              {(activeProject.languages || []).slice(0, 5).map((entry) => (
                <span key={`${activeProject.name}-${entry.language}`}>
                  {entry.language} · {formatBytes(entry.bytes)}
                </span>
              ))}
            </div>

            <div className="commit-strip">
              {rankCommits(activeProject.recentCommits).map((commit) => (
                <span key={commit}>{commit}</span>
              ))}
            </div>

            <a
              className="source-link"
              href={activeProject.url}
              rel="noreferrer"
              target="_blank"
            >
              Source / GitHub
            </a>
          </article>
        ) : null}
      </div>
    </section>
  );
}
