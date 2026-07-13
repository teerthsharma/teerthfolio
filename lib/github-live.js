export const GITHUB_HANDLE = "teerthsharma";

const ownOwners = new Set([GITHUB_HANDLE, "debyte404"]);
const profileUrl = `https://github.com/${GITHUB_HANDLE}`;
const profileApiUrl = `https://api.github.com/users/${GITHUB_HANDLE}`;
const eventsApiUrl = `https://api.github.com/users/${GITHUB_HANDLE}/events/public?per_page=30`;

export function summarizeRepositoryTree(payload) {
  if (payload?.truncated || !Array.isArray(payload?.tree)) return null;

  let directoryCount = 0;
  let rustFileCount = 0;
  let trackedFileCount = 0;
  for (const entry of payload.tree) {
    if (entry?.type === "tree") {
      directoryCount += 1;
      continue;
    }
    if (entry?.type !== "blob") continue;
    trackedFileCount += 1;
    if (typeof entry.path === "string" && entry.path.toLowerCase().endsWith(".rs")) {
      rustFileCount += 1;
    }
  }

  return {
    directoryCount,
    rustFileCount,
    trackedFileCount,
    treeTruncated: false,
  };
}

function normalizeRepositorySnapshot(snapshot, fullName) {
  if (
    !snapshot ||
    !Number.isInteger(snapshot.trackedFileCount) ||
    snapshot.trackedFileCount < 1 ||
    !Number.isInteger(snapshot.rustFileCount) ||
    snapshot.rustFileCount < 0 ||
    snapshot.treeTruncated !== false
  ) {
    return null;
  }

  return {
    ...snapshot,
    fullName,
    sourceMode: "github-tree-snapshot",
  };
}

export async function fetchRepositoryMetrics({ fullName, fallbackSnapshot } = {}) {
  const fallback = normalizeRepositorySnapshot(fallbackSnapshot, fullName);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName || "")) return fallback;

  try {
    const headers = githubHeaders();
    const repositoryResponse = await fetch(`https://api.github.com/repos/${fullName}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!repositoryResponse.ok) throw new Error("GitHub repository metadata unavailable");

    const repository = await repositoryResponse.json();
    const defaultBranch = repository.default_branch || "main";
    const treeResponse = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      { headers, next: { revalidate: 3600 } },
    );
    if (!treeResponse.ok) throw new Error("GitHub repository tree unavailable");
    const treeSummary = summarizeRepositoryTree(await treeResponse.json());
    if (!treeSummary) throw new Error("GitHub repository tree is truncated or invalid");

    return {
      ...treeSummary,
      capturedAt: new Date().toISOString(),
      defaultBranch,
      fullName,
      pushedAt: repository.pushed_at || null,
      sizeKb: Number.isFinite(repository.size) ? repository.size : null,
      sourceMode: "live-github-tree",
    };
  } catch {
    return fallback;
  }
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

function normalizeFallbackEvents(fallbackEvents) {
  if (!Array.isArray(fallbackEvents)) return [];

  return fallbackEvents
    .filter((event) => event?.repo && event?.title && event?.url)
    .slice(0, 5)
    .map((event) => ({
      repo: event.repo,
      label: event.label || "Source snapshot",
      title: event.title,
      url: event.url,
      createdAt: event.createdAt || null,
    }));
}

export function createResearchSnapshot({ fallbackEvents = [] } = {}) {
  return {
    sourceMode: "research-snapshot",
    generatedAt: new Date().toISOString(),
    profile: {
      login: GITHUB_HANDLE,
      name: null,
      public_repos: null,
      html_url: profileUrl,
    },
    latest: normalizeFallbackEvents(fallbackEvents),
    events: [],
  };
}

function classifyEvent(event) {
  const repo = event?.repo?.name || "unknown/repo";
  const owner = repo.split("/")[0].toLowerCase();
  const payload = event?.payload || {};
  const pull = payload.pull_request;
  const issue = payload.issue;
  const commit = payload.commits?.[0];

  if (!ownOwners.has(owner) && pull) {
    return {
      repo,
      label: `Upstream PR ${payload.action || "activity"}`,
      title: pull.title || "Upstream pull request",
      url: pull.html_url || `https://github.com/${repo}/pulls`,
      createdAt: event.created_at,
    };
  }

  if (!ownOwners.has(owner) && issue) {
    return {
      repo,
      label: `Upstream issue ${payload.action || "activity"}`,
      title: issue.title || "Upstream issue",
      url: issue.html_url || `https://github.com/${repo}/issues`,
      createdAt: event.created_at,
    };
  }

  if (event?.type === "PushEvent") {
    return {
      repo,
      label: ownOwners.has(owner) ? "Research push" : "Public push",
      title: commit?.message || "Repository push",
      url: `https://github.com/${repo}`,
      createdAt: event.created_at,
    };
  }

  return {
    repo,
    label: event?.type?.replace(/Event$/, "") || "GitHub activity",
    title: `${event?.type?.replace(/Event$/, "") || "Activity"} on ${repo}`,
    url: `https://github.com/${repo}`,
    createdAt: event?.created_at || null,
  };
}

export async function fetchLiveGitHubSummary({ fallbackEvents = [] } = {}) {
  try {
    const headers = githubHeaders();
    const [profileResponse, eventsResponse] = await Promise.all([
      fetch(profileApiUrl, {
        headers,
        next: { revalidate: 1800 },
      }),
      fetch(eventsApiUrl, {
        headers,
        next: { revalidate: 900 },
      }),
    ]);

    if (!profileResponse.ok || !eventsResponse.ok) {
      throw new Error("GitHub API unavailable");
    }

    const profile = await profileResponse.json();
    const eventsPayload = await eventsResponse.json();
    if (!Array.isArray(eventsPayload)) throw new Error("GitHub events response is invalid");

    const events = eventsPayload.map(classifyEvent);
    const upstream = events.filter((event) => {
      const owner = event.repo.split("/")[0].toLowerCase();
      return !ownOwners.has(owner);
    });
    const latest = upstream.length ? upstream : events;

    return {
      sourceMode: "live-github",
      generatedAt: new Date().toISOString(),
      profile: {
        login: profile.login,
        name: profile.name,
        public_repos: profile.public_repos,
        html_url: profile.html_url,
      },
      latest: latest.length ? latest.slice(0, 5) : normalizeFallbackEvents(fallbackEvents),
      events: events.slice(0, 8),
    };
  } catch {
    return createResearchSnapshot({ fallbackEvents });
  }
}
