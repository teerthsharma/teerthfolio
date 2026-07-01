const ownOwners = new Set(["teerthsharma", "Debyte404"]);

export function createResearchSnapshot() {
  return {
    sourceMode: "research-snapshot",
    generatedAt: new Date().toISOString(),
    profile: {
      login: "teerthsharma",
      name: "Teerth Sharma",
      public_repos: 75,
      html_url: "https://github.com/teerthsharma",
    },
    latest: [
      {
        repo: "triton-lang/triton",
        label: "Upstream issue snapshot",
        title: "Topology-derived CSR block schedule microbenchmark for sparse attention",
        url: "https://github.com/triton-lang/triton/issues/10767",
        createdAt: "2026-06-30T21:58:25Z",
      },
      {
        repo: "triton-lang/triton",
        label: "Upstream PR snapshot",
        title: "[Testing] Add topology-derived sparse attention microbenchmark",
        url: "https://github.com/triton-lang/triton/pull/10768",
        createdAt: "2026-06-30T22:08:50Z",
      },
    ],
  };
}

function classifyEvent(event) {
  const repo = event?.repo?.name || "unknown/repo";
  const owner = repo.split("/")[0];
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
    createdAt: event?.created_at || new Date().toISOString(),
  };
}

export async function fetchLiveGitHubSummary() {
  try {
    const [profileResponse, eventsResponse] = await Promise.all([
      fetch("https://api.github.com/users/teerthsharma", {
        next: { revalidate: 1800 },
      }),
      fetch("https://api.github.com/users/teerthsharma/events/public?per_page=30", {
        next: { revalidate: 900 },
      }),
    ]);

    if (!profileResponse.ok || !eventsResponse.ok) {
      throw new Error("GitHub API unavailable");
    }

    const profile = await profileResponse.json();
    const events = await eventsResponse.json();
    const classified = events.map(classifyEvent);
    const upstream = classified.filter((event) => {
      const owner = event.repo.split("/")[0];
      return !ownOwners.has(owner);
    });
    const latest = upstream.length ? upstream : classified;

    return {
      sourceMode: "live-github",
      generatedAt: new Date().toISOString(),
      profile,
      latest: latest.length ? latest.slice(0, 5) : createResearchSnapshot().latest,
      events: classified.slice(0, 8),
    };
  } catch {
    return createResearchSnapshot();
  }
}
