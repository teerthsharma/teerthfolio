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

// Substance ranking. The radar used to take the most recent events on repos the
// handle does not own, which is the right instinct for surfacing upstream work
// and the wrong filter for finding it: ForkEvent and WatchEvent also match, fall
// through to the generic branch below, and render as "Fork on facebook/zstd".
// Under a headline reading "GitHub, without theatre" the entire band became two
// cards proving the author had pressed Fork twice. Weight 0 is never shown.
const EVENT_WEIGHT = Object.freeze({
  upstreamPull: 4,
  upstreamIssue: 3,
  push: 2,
  release: 2,
  // Forking, starring, watching and creating a repo are not work.
  noise: 0,
});
const NOISE_EVENT_TYPES = new Set([
  "ForkEvent",
  "WatchEvent",
  "CreateEvent",
  "DeleteEvent",
  "MemberEvent",
  "PublicEvent",
  "GollumEvent",
]);

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
      weight: EVENT_WEIGHT.upstreamPull,
      label: `Upstream PR ${payload.action || "activity"}`,
      title: pull.title || "Upstream pull request",
      url: pull.html_url || `https://github.com/${repo}/pulls`,
      createdAt: event.created_at,
    };
  }

  if (!ownOwners.has(owner) && issue) {
    return {
      repo,
      weight: EVENT_WEIGHT.upstreamIssue,
      label: `Upstream issue ${payload.action || "activity"}`,
      title: issue.title || "Upstream issue",
      url: issue.html_url || `https://github.com/${repo}/issues`,
      createdAt: event.created_at,
    };
  }

  if (event?.type === "PushEvent") {
    return {
      repo,
      weight: EVENT_WEIGHT.push,
      label: ownOwners.has(owner) ? "Research push" : "Public push",
      title: commit?.message || "Repository push",
      url: `https://github.com/${repo}`,
      createdAt: event.created_at,
    };
  }

  if (event?.type === "ReleaseEvent") {
    return {
      repo,
      weight: EVENT_WEIGHT.release,
      label: "Release",
      title: payload.release?.name || payload.release?.tag_name || "Release published",
      url: payload.release?.html_url || `https://github.com/${repo}/releases`,
      createdAt: event.created_at,
    };
  }

  return {
    repo,
    weight: NOISE_EVENT_TYPES.has(event?.type) ? EVENT_WEIGHT.noise : 1,
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
    // Rank by substance, then recency. Owning the repo is a tiebreak, not the
    // filter: a merged PR into triton-lang outranks a push to a private sketch,
    // and a fork of anything outranks nothing at all.
    const byWeight = (a, b) =>
      b.weight - a.weight ||
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    const substantive = events
      .filter((event) => event.weight > EVENT_WEIGHT.noise)
      .sort(byWeight);
    const upstream = substantive.filter((event) => {
      const owner = event.repo.split("/")[0].toLowerCase();
      return !ownOwners.has(owner);
    });
    // Upstream work first when it exists, then the author's own substantive
    // events. Never an empty band, and never a band made of ForkEvents.
    const latest = upstream.length
      ? [...upstream, ...substantive.filter((event) => !upstream.includes(event))]
      : substantive;

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
