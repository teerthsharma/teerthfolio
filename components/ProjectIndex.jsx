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
            <p>{activeProject.purpose || activeProject.description}</p>

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
              {(activeProject.recentCommits || []).slice(0, 3).map((commit) => (
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
