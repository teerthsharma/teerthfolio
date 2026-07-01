"use client";

import EvidenceArchive from "./EvidenceArchive";
import HorizontalAxisController from "./HorizontalAxisController";
import IglooWorld from "./IglooWorld";
import LiveRadar from "./LiveRadar";
import PortfolioMotion from "./PortfolioMotion";
import ProjectIndex from "./ProjectIndex";
import SfxLayer from "./SfxLayer";

export default function PortfolioPage({
  content,
  domainRows,
  initialWorldQuery,
  liveSummary,
  projects,
  stations,
}) {
  return (
    <main className="teerth-site">
      <HorizontalAxisController />
      <SfxLayer />
      <PortfolioMotion />

      <IglooWorld
        content={content}
        initialQuery={initialWorldQuery}
        liveSummary={liveSummary}
        projects={projects}
        stations={stations}
      />
      <LiveRadar content={content} liveSummary={liveSummary} />
      <ProjectIndex projects={projects} stations={stations} />
      <EvidenceArchive
        content={content}
        domainRows={domainRows}
        liveSummary={liveSummary}
        projects={projects}
      />
    </main>
  );
}
