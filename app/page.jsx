import PortfolioPage from "../components/PortfolioPage";
import {
  getDomainRows,
  getFlagshipProjects,
  getTeerthContent,
  getWorldStations,
} from "../lib/teerth-data";
import {
  fetchLiveGitHubSummary,
  fetchRepositoryMetrics,
} from "../lib/github-live";

export const dynamic = "force-dynamic";

function hasSearchParam(searchParams, key, expectedValue) {
  const value = searchParams?.[key];
  const values = Array.isArray(value) ? value : [value];
  if (expectedValue == null) return values.some((item) => item != null);
  return values.some((item) => item === expectedValue);
}

export default async function Home({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const content = getTeerthContent();
  const stations = getWorldStations();
  const projects = getFlagshipProjects();
  const domainRows = getDomainRows();
  const epsilonProject = projects.find((project) => project.name === "Epsilon-Hollow");
  const [liveSummary, epsilonMetrics] = await Promise.all([
    fetchLiveGitHubSummary({ fallbackEvents: content.upstream }),
    fetchRepositoryMetrics({
      fallbackSnapshot: epsilonProject?.repositorySnapshot,
      fullName: epsilonProject?.fullName,
    }),
  ]);
  const repositoryMetrics = epsilonMetrics
    ? { [epsilonProject.name]: epsilonMetrics }
    : {};
  const initialWorldQuery = {
    initialSafeMode:
      hasSearchParam(resolvedSearchParams, "safe", "1") ||
      hasSearchParam(resolvedSearchParams, "safe-mode"),
    initialQaLow: hasSearchParam(resolvedSearchParams, "qa-low"),
  };

  return (
    <PortfolioPage
      content={content}
      domainRows={domainRows}
      initialWorldQuery={initialWorldQuery}
      liveSummary={liveSummary}
      projects={projects}
      repositoryMetrics={repositoryMetrics}
      stations={stations}
    />
  );
}
