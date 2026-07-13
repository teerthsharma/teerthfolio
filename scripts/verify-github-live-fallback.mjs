import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  GITHUB_HANDLE,
  createResearchSnapshot,
  fetchLiveGitHubSummary,
} from "../lib/github-live.js";

const outputPath = path.resolve(
  process.env.VERIFY_GITHUB_REPORT ||
    ".verification/wave-e/github-live-fallback-report.json",
);
const originalFetch = globalThis.fetch;
const calls = [];

const profilePayload = {
  html_url: "https://github.com/teerthsharma",
  login: "teerthsharma",
  name: "Teerth Sharma",
  public_repos: 75,
};
const eventsPayload = [
  {
    created_at: "2026-07-11T12:00:00Z",
    payload: {
      action: "opened",
      pull_request: {
        html_url: "https://github.com/google-deepmind/mujoco/pull/1",
        title: "Upstream pull request",
      },
    },
    repo: { name: "google-deepmind/mujoco" },
    type: "PullRequestEvent",
  },
];
const fallbackEvents = [
  {
    createdAt: "2026-07-10T10:00:00Z",
    label: "Research snapshot",
    repo: "triton-lang/triton",
    title: "Source-backed fallback item",
    url: "https://github.com/triton-lang/triton",
  },
];

try {
  assert.equal(GITHUB_HANDLE, "teerthsharma");
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/events/public?per_page=30")) {
      return { json: async () => eventsPayload, ok: true };
    }
    return { json: async () => profilePayload, ok: true };
  };
  const live = await fetchLiveGitHubSummary({ fallbackEvents });
  assert.equal(live.sourceMode, "live-github");
  assert.equal(live.profile.login, "teerthsharma");
  assert.equal(live.latest[0].repo, "google-deepmind/mujoco");
  assert.deepEqual(calls.sort(), [
    "https://api.github.com/users/teerthsharma",
    "https://api.github.com/users/teerthsharma/events/public?per_page=30",
  ]);

  globalThis.fetch = async () => ({ json: async () => ({}), ok: false });
  const fallback = await fetchLiveGitHubSummary({ fallbackEvents });
  assert.equal(fallback.sourceMode, "research-snapshot");
  assert.equal(fallback.profile.login, "teerthsharma");
  assert.equal(fallback.profile.name, null);
  assert.equal(fallback.profile.public_repos, null);
  assert.deepEqual(fallback.events, []);
  assert.deepEqual(fallback.latest, fallbackEvents);

  const emptySnapshot = createResearchSnapshot();
  assert.equal(emptySnapshot.profile.login, "teerthsharma");
  assert.equal(emptySnapshot.sourceMode, "research-snapshot");
  assert.deepEqual(emptySnapshot.latest, []);

  const report = {
    calls,
    fallback,
    live,
    requiredHandle: GITHUB_HANDLE,
    verdict: "live-and-fallback-source-contract",
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `GitHub live/fallback contract verified for @${GITHUB_HANDLE}: exact API endpoints, truthful source labels, no invented fallback profile fields.`,
  );
} finally {
  globalThis.fetch = originalFetch;
}
