"use client";

import { ArrowUpRight, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import ExpandableImage from "./ExpandableImage";

export const PAGE_SIZE = 3;

export function isGithubUrl(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() === "github.com";
  } catch {
    return false;
  }
}

export function getPrimaryActionLabel(project) {
  return isGithubUrl(project?.href) ? "Source" : "Open";
}

function getImageCropStyle(imageCrop) {
  return {
    objectPosition: `${imageCrop?.x ?? 50}% ${imageCrop?.y ?? 50}%`,
    transform: `scale(${imageCrop?.zoom ?? 1})`,
  };
}

function ProjectCard({ project, index }) {
  const [armed, setArmed] = useState(false);

  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--tilt-x", `${(-y * 4).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(x * 4).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  const onPointerLeave = (event) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };

  const onDoubleClick = (event) => {
    setArmed(true);
    event.currentTarget.dataset.armed = "true";
    window.setTimeout(() => {
      setArmed(false);
      event.currentTarget.dataset.armed = "false";
    }, 540);
  };

  return (
    <article
      className="project-card"
      style={{ "--project-accent": project.accent }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onDoubleClick={onDoubleClick}
      data-sfx="click"
      data-sfx-hover="hover"
      data-sfx-dbl="flip"
      data-dragging="true"
      data-reveal
      data-armed={armed ? "true" : "false"}
    >
      <div className="project-media">
        {project.image ? (
          <ExpandableImage
            src={project.image}
            alt={project.imageAlt}
            loading="lazy"
            style={getImageCropStyle(project.imageCrop)}
            popoutLabel={`Inspect ${project.title} preview`}
          />
        ) : (
          <div className="project-placeholder" aria-label={project.imageAlt}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{project.eyebrow}</strong>
          </div>
        )}
      </div>
      <div className="project-copy">
        <p>{project.eyebrow}</p>
        <h3>{project.title}</h3>
        <span>{project.story}</span>
        <p>{project.description}</p>
      </div>
      <div className="tag-row">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="project-actions">
        <a href={project.href} target="_blank" rel="noreferrer" data-sfx="click">
          {getPrimaryActionLabel(project)} <ArrowUpRight size={18} weight="bold" />
        </a>
        {project.sourceHref ? (
          <a href={project.sourceHref} target="_blank" rel="noreferrer" data-sfx="click">
            Source <ArrowUpRight size={18} weight="bold" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default function ProjectShowcase({ projects }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(projects.length / PAGE_SIZE);
  const visible = useMemo(
    () => projects.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [page, projects],
  );

  const movePage = (direction) => {
    setPage((current) => (current + direction + pageCount) % pageCount);
  };

  return (
    <section className="section projects-section" id="projects">
      <div className="section-heading" data-reveal>
        <p>Selected builds</p>
        <h2>Projects as little worlds.</h2>
      </div>
      <div className="project-toolbar" data-reveal>
        <button
          type="button"
          className="icon-button"
          aria-label="Previous projects"
          onClick={() => movePage(-1)}
          data-sfx="click"
        >
          <CaretLeft size={22} weight="bold" />
        </button>
        <div className="project-pages" aria-label="Project pages">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to project page ${index + 1}`}
              aria-current={page === index ? "page" : undefined}
              onClick={() => setPage(index)}
              data-sfx="click"
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Next projects"
          onClick={() => movePage(1)}
          data-sfx="click"
        >
          <CaretRight size={22} weight="bold" />
        </button>
      </div>
      <div className="project-grid">
        {visible.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={page * PAGE_SIZE + index} />
        ))}
      </div>
    </section>
  );
}
