import content from "../data/teerth-content.json";
import corpus from "../data/project-intelligence.json";

const projects = Array.isArray(corpus.projects) ? corpus.projects : [];

export function getTeerthContent() {
  return content;
}

export function getProjectCorpus() {
  return corpus;
}

export function getProjectByName(name) {
  return projects.find((project) => project.name === name);
}

export function getWorldStations() {
  return content.stations.map((station) => ({
    ...station,
    projectDetails: station.projects
      .map((name) => getProjectByName(name))
      .filter(Boolean),
  }));
}

export function getFlagshipProjects() {
  const preferred = [
    "Epsilon-Hollow",
    "Aether-Lang",
    "faraday",
    "hamliton",
    "topobridge-q",
    "lambda-topo",
    "aether-link",
    "aether-wave",
    "seal-demon-tts",
    "topoflow",
    "charlie",
    "-CE-BB",
  ];

  return preferred
    .map((name) => getProjectByName(name))
    .filter(Boolean);
}

export function getDomainRows() {
  return Object.entries(corpus.domains || {}).sort(([, left], [, right]) => right - left);
}
