"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const tabs = ["Projects", "Skills", "Experience", "Certificates", "Typography", "Raw JSON"];

const defaultTypography = {
  heroTitle: 12.5,
  heroSubtitle: 1.45,
  sectionTitle: 8,
  storyTitle: 3.2,
  body: 1,
  projectTitle: 3.4,
  skillTitle: 3.2,
  skillItem: 1,
  certificateTitle: 3.2,
};

const typographyFields = [
  ["heroTitle", "Hero title", 3.5, 16, 0.1],
  ["heroSubtitle", "Hero subtitle", 0.8, 3, 0.05],
  ["sectionTitle", "Section titles", 2, 12, 0.1],
  ["storyTitle", "Story/proof titles", 1.2, 6, 0.1],
  ["body", "Body copy", 0.75, 1.8, 0.05],
  ["projectTitle", "Project titles", 1.4, 6, 0.1],
  ["skillTitle", "Skill headings", 1.2, 6, 0.1],
  ["skillItem", "Skill items", 0.75, 1.8, 0.05],
  ["certificateTitle", "Certificate titles", 1.2, 6, 0.1],
];

const blankProject = {
  title: "New build",
  eyebrow: "Fresh project",
  description: "Describe what this thing does and why it matters.",
  story: "One cinematic sentence about the build.",
  tags: ["Next.js", "Design"],
  image: "",
  imageAlt: "Project preview image",
  imageCrop: { x: 50, y: 50, zoom: 1 },
  href: "https://github.com/Debyte404",
  sourceHref: "",
  accent: "var(--acid)",
};

const blankSkillStack = {
  title: "New Stack",
  subtitle: "A short subheading that explains this group.",
  items: ["Tool one", "Tool two"],
};

const blankExperience = {
  role: "New work experience",
  org: "Company / team",
  companyHref: "",
  period: "Month YYYY - Month YYYY",
  body: "Write this in first person: what I built, what shipped, and why it mattered.",
  tech: ["Next.js", "React"],
  certificate: "",
  certificateTitle: "Work certificate",
  certificateNote: "Certificate slot ready in admin.",
  certificateImageCrop: { x: 50, y: 50, zoom: 1 },
};

const blankCertificate = {
  title: "New proof slot",
  subtitle: "Top green tag text",
  rank: "Rank or recognition",
  details: "Short context for what this certificate proves.",
  note: "Reserved proof frame",
  image: "",
  imageCrop: { x: 50, y: 50, zoom: 1 },
};

function normalizeCropValue(crop) {
  return {
    x: Number.isFinite(Number(crop?.x)) ? Number(crop.x) : 50,
    y: Number.isFinite(Number(crop?.y)) ? Number(crop.y) : 50,
    zoom: Number.isFinite(Number(crop?.zoom)) ? Number(crop.zoom) : 1,
  };
}

function normalizeContent(content) {
  return {
    ...(content || {}),
    projects: Array.isArray(content?.projects)
      ? content.projects.map((project) => ({ ...project, imageCrop: normalizeCropValue(project.imageCrop) }))
      : [],
    skillStacks: Array.isArray(content?.skillStacks) ? content.skillStacks : [],
    experience: Array.isArray(content?.experience)
      ? content.experience.map((item) => ({
          ...item,
          companyHref: item.companyHref || "",
          tech: Array.isArray(item.tech) ? item.tech : [],
          certificateImageCrop: normalizeCropValue(item.certificateImageCrop),
        }))
      : [],
    certificates: Array.isArray(content?.certificates)
      ? content.certificates.map((certificate) => ({ ...certificate, imageCrop: normalizeCropValue(certificate.imageCrop) }))
      : [],
    typography: { ...defaultTypography, ...(content?.typography || {}) },
  };
}

function getCrop(crop) {
  return normalizeCropValue(crop);
}

function csvToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToCsv(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

const cropperTemplate = `
  <cropper-canvas>
    <cropper-image></cropper-image>
    <cropper-shade hidden></cropper-shade>
    <cropper-handle action="select" plain></cropper-handle>
    <cropper-selection initial-coverage="1" movable resizable zoomable keyboard precise limit-boundaries>
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
      <cropper-handle action="move" theme-color="rgba(216, 255, 53, 0.5)"></cropper-handle>
      <cropper-handle action="n-resize"></cropper-handle>
      <cropper-handle action="e-resize"></cropper-handle>
      <cropper-handle action="s-resize"></cropper-handle>
      <cropper-handle action="w-resize"></cropper-handle>
      <cropper-handle action="ne-resize"></cropper-handle>
      <cropper-handle action="nw-resize"></cropper-handle>
      <cropper-handle action="se-resize"></cropper-handle>
      <cropper-handle action="sw-resize"></cropper-handle>
    </cropper-selection>
  </cropper-canvas>
`;

const CROP_SNAP_PX = 10;
const SNAP_EDGE_THRESHOLD_LABEL = `Release within ${CROP_SNAP_PX}px of an edge to snap.`;

function moveItemInList(list, index, direction) {
  const next = [...list];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function sanitizeExportSize(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.max(Math.round(numeric), 160), 2400);
}

function getSafeFileSlug(value) {
  return String(value || "portfolio-crop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "portfolio-crop";
}

function canvasToBlob(canvas, type = "image/webp", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The browser could not export this crop."));
        }
      },
      type,
      quality,
    );
  });
}

function getRenderedImageBounds(cropper) {
  const canvas = cropper?.getCropperCanvas?.();

  if (!canvas) return null;

  const canvasRect = canvas.getBoundingClientRect();

  if (!canvasRect.width || !canvasRect.height) {
    return null;
  }

  return {
    x: 0,
    y: 0,
    width: canvasRect.width,
    height: canvasRect.height,
    aspectRatio: canvasRect.width / canvasRect.height,
  };
}

function getSelectionShape(source) {
  return {
    x: Number(source?.x) || 0,
    y: Number(source?.y) || 0,
    width: Math.max(Number(source?.width) || 0, 1),
    height: Math.max(Number(source?.height) || 0, 1),
  };
}

function getShapeAspectRatio(shape, fallback = 1) {
  if (shape.width > 0 && shape.height > 0) {
    return shape.width / shape.height;
  }

  return fallback || 1;
}

function fitSelectionInsideBounds(shape, bounds) {
  const aspectRatio = getShapeAspectRatio(shape, bounds.aspectRatio);
  let width = Math.min(shape.width, bounds.width);
  let height = Math.min(shape.height, bounds.height);

  if (shape.width > bounds.width) {
    width = bounds.width;
    height = width / aspectRatio;
  }

  if (height > bounds.height) {
    height = bounds.height;
    width = height * aspectRatio;
  }

  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
  };
}

function clampSelectionToImageBounds(bounds, source, { snap = false } = {}) {
  const shape = getSelectionShape(source);
  const fitted = fitSelectionInsideBounds(shape, bounds);
  let x = shape.x;
  let y = shape.y;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  if (snap && Math.abs(x - bounds.x) <= CROP_SNAP_PX) {
    x = bounds.x;
  }

  if (snap && Math.abs(y - bounds.y) <= CROP_SNAP_PX) {
    y = bounds.y;
  }

  if (snap && Math.abs(x + fitted.width - right) <= CROP_SNAP_PX) {
    x = right - fitted.width;
  }

  if (snap && Math.abs(y + fitted.height - bottom) <= CROP_SNAP_PX) {
    y = bottom - fitted.height;
  }

  return {
    x: Math.min(Math.max(x, bounds.x), right - fitted.width),
    y: Math.min(Math.max(y, bounds.y), bottom - fitted.height),
    width: fitted.width,
    height: fitted.height,
  };
}

function areSelectionShapesClose(left, right) {
  return ["x", "y", "width", "height"].every((key) => Math.abs(left[key] - right[key]) < 0.5);
}

function applyFullImageCrop(cropper, boundsRef) {
  const selection = cropper?.getCropperSelection?.();
  const bounds = getRenderedImageBounds(cropper);

  if (!selection || !bounds) return false;

  boundsRef.current = bounds;
  selection.aspectRatio = Number.NaN;
  selection.initialAspectRatio = bounds.aspectRatio;
  selection.$change(bounds.x, bounds.y, bounds.width, bounds.height, bounds.aspectRatio);
  return true;
}

function getSelectionAspectRatio(selection, fallback = 1) {
  const width = Number(selection?.width);
  const height = Number(selection?.height);

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return width / height;
  }

  return fallback || 1;
}

function AdminField({ label, children }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function FontSizeField({ field, value, onChange }) {
  const [key, label, min, max, step] = field;
  const numeric = Number.isFinite(Number(value)) ? Number(value) : defaultTypography[key];

  return (
    <div className="admin-font-control">
      <AdminField label={`${label} Font Size`}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numeric}
          onChange={(event) => onChange(key, Number(event.target.value))}
        />
      </AdminField>
      <input
        aria-label={`${label} font size value`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={numeric}
        onChange={(event) => onChange(key, Number(event.target.value))}
      />
      <span>rem</span>
    </div>
  );
}

function TypographyEditor({ typography, onChange }) {
  return (
    <div className="admin-list">
      <div className="admin-section-head">
        <h2>Typography</h2>
        <span>Font Size controls feed the live portfolio CSS variables.</span>
      </div>
      <article className="admin-panel">
        <div className="admin-font-grid">
          {typographyFields.map((field) => (
            <FontSizeField
              key={field[0]}
              field={field}
              value={typography[field[0]]}
              onChange={onChange}
            />
          ))}
        </div>
      </article>
    </div>
  );
}

function ImageEditor({ image, imageCrop, label, onImageChange, onCroppedImageChange, onCropChange, onUpload }) {
  const imageRef = useRef(null);
  const cropperRef = useRef(null);
  const imageBoundsRef = useRef(null);
  const adjustingSelectionRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropStatus, setCropStatus] = useState("");
  const [naturalAspectRatio, setNaturalAspectRatio] = useState(null);
  const [resizeWidth, setResizeWidth] = useState("1400");
  const [resizeHeight, setResizeHeight] = useState("");

  useEffect(() => {
    if (!image || !imageRef.current) {
      cropperRef.current?.destroy?.();
      cropperRef.current = null;
      return undefined;
    }

    const sourceImage = imageRef.current;
    let cancelled = false;

    const initializeCropper = async () => {
      if (cancelled || cropperRef.current) return;

      if (sourceImage.naturalWidth && sourceImage.naturalHeight) {
        setNaturalAspectRatio(Number((sourceImage.naturalWidth / sourceImage.naturalHeight).toFixed(5)));
      }

      const { default: Cropper } = await import("cropperjs");
      if (cancelled || cropperRef.current) return;

      const cropper = new Cropper(sourceImage, { template: cropperTemplate });
      cropperRef.current = cropper;
      const cropperCanvas = cropper.getCropperCanvas();
      const cropperImage = cropper.getCropperImage();
      const selection = cropper.getCropperSelection();
      let resizeFrame = 0;
      let resizeObserver = null;

      cropperCanvas?.$addStyles?.(`
        :host {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 0;
          background: #0b0f0d;
        }
      `);
      cropperImage?.$addStyles?.(`
        :host {
          display: block;
          height: 100%;
          width: 100%;
        }
      `);
      cropper.getCropperSelection()?.$addStyles?.(`
        :host {
          outline: 3px solid #d8ff35;
        }
      `);

      const enforceSelectionBounds = (source, event, options) => {
        if (adjustingSelectionRef.current) return;

        const bounds = imageBoundsRef.current;
        if (!bounds) return;

        const next = clampSelectionToImageBounds(bounds, source || selection, options);
        const current = getSelectionShape(source || selection);

        if (!areSelectionShapesClose(current, next)) {
          event?.preventDefault?.();
          adjustingSelectionRef.current = true;
          selection.$change(next.x, next.y, next.width, next.height);
          window.requestAnimationFrame(() => {
            adjustingSelectionRef.current = false;
          });
        }
      };

      const onSelectionChange = (event) => {
        enforceSelectionBounds(event.detail || selection, event);
      };
      const onCropActionEnd = () => {
        enforceSelectionBounds(selection, null, { snap: true });
      };
      const syncCropWorld = (mode = "clamp") => {
        if (!selection) return false;

        const previousBounds = imageBoundsRef.current;
        const selectionWasFull =
          previousBounds && areSelectionShapesClose(getSelectionShape(selection), previousBounds);

        cropperImage?.$center?.("cover");

        if (mode === "full" || selectionWasFull) {
          return applyFullImageCrop(cropper, imageBoundsRef);
        }

        const bounds = getRenderedImageBounds(cropper);
        if (!bounds) return false;

        imageBoundsRef.current = bounds;
        selection.aspectRatio = Number.NaN;
        selection.initialAspectRatio = bounds.aspectRatio;
        enforceSelectionBounds(selection);
        return true;
      };
      const scheduleCropWorldSync = (mode = "clamp") => {
        if (resizeFrame) {
          window.cancelAnimationFrame(resizeFrame);
        }

        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = 0;
          syncCropWorld(mode);
        });
      };

      selection?.addEventListener("change", onSelectionChange);
      cropperCanvas?.addEventListener("actionend", onCropActionEnd);

      if (typeof ResizeObserver !== "undefined" && cropperCanvas) {
        resizeObserver = new ResizeObserver(() => scheduleCropWorldSync());
        resizeObserver.observe(cropperCanvas);
      }

      const cropperReady = cropperImage?.$ready?.((loadedImage) => {
        if (cancelled) return;

        if (loadedImage?.naturalWidth && loadedImage?.naturalHeight) {
          setNaturalAspectRatio(Number((loadedImage.naturalWidth / loadedImage.naturalHeight).toFixed(5)));
        }

        scheduleCropWorldSync("full");
      });
      cropperReady?.catch?.(() => {
        if (!cancelled) {
          setCropStatus("Cropper could not read this image. Try uploading it instead of using a protected link.");
        }
      });

      scheduleCropWorldSync("full");

      cropperRef.current.cleanupSelectionListener = () => {
        selection?.removeEventListener("change", onSelectionChange);
        cropperCanvas?.removeEventListener("actionend", onCropActionEnd);
        resizeObserver?.disconnect();
        if (resizeFrame) {
          window.cancelAnimationFrame(resizeFrame);
        }
      };
    };

    if (sourceImage.complete) {
      initializeCropper();
    } else {
      sourceImage.addEventListener("load", initializeCropper, { once: true });
    }

    return () => {
      cancelled = true;
      sourceImage.removeEventListener("load", initializeCropper);
      cropperRef.current?.cleanupSelectionListener?.();
      cropperRef.current?.destroy?.();
      cropperRef.current = null;
      imageBoundsRef.current = null;
      setNaturalAspectRatio(null);
    };
  }, [image]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadedUrl = await onUpload(file);
    if (uploadedUrl) {
      onImageChange(uploadedUrl);
      onCropChange(getCrop(imageCrop));
      setCropStatus("Image uploaded. Crop it below, then apply the cropped image.");
    }
    event.target.value = "";
    setUploading(false);
  };

  const applyCrop = async () => {
    const selection = cropperRef.current?.getCropperSelection?.();

    if (!selection?.$toCanvas) {
      setCropStatus("Cropper is still loading this image.");
      return;
    }

    setCropping(true);
    setCropStatus("Cropping and uploading...");

    try {
      const width = sanitizeExportSize(resizeWidth, 1400);
      const aspectRatio = getSelectionAspectRatio(selection, imageBoundsRef.current?.aspectRatio);
      const height = sanitizeExportSize(resizeHeight, null) || Math.round(width / aspectRatio);
      const canvasOptions = { width, height };
      const canvas = await selection.$toCanvas(canvasOptions);
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], `${getSafeFileSlug(label)}-${Date.now()}.webp`, { type: blob.type });
      const croppedUrl = await onUpload(file);

      if (croppedUrl) {
        onCroppedImageChange(croppedUrl);
        onCropChange({ x: 50, y: 50, zoom: 1 });
        setCropStatus("Cropped image applied.");
      } else {
        setCropStatus("Crop upload failed.");
      }
    } catch (error) {
      setCropStatus(`Crop failed: ${error.message}`);
    } finally {
      setCropping(false);
    }
  };

  const resetCrop = () => {
    if (applyFullImageCrop(cropperRef.current, imageBoundsRef)) {
      setCropStatus("Crop reset to the full image.");
    } else {
      setCropStatus("Cropper is still loading this image.");
    }
  };
  const cropperStageStyle = naturalAspectRatio ? { "--cropper-aspect-ratio": naturalAspectRatio } : undefined;

  return (
    <div className="admin-image-tools">
      <AdminField label={`${label} Image URL`}>
        <input
          value={image || ""}
          onChange={(event) => {
            onImageChange(event.target.value);
            setCropStatus("");
          }}
          placeholder="https://... or /uploads/image.png"
        />
      </AdminField>
      <AdminField label="Upload image">
        <input type="file" accept="image/*" onChange={handleUpload} />
      </AdminField>
      <div className="admin-preview admin-cropper-preview" style={cropperStageStyle} aria-label={`${label} Cropper.js preview`}>
        {image ? (
          <img
            key={image}
            ref={imageRef}
            src={image}
            alt={`${label} crop source`}
            crossOrigin="anonymous"
          />
        ) : (
          <span>No image yet</span>
        )}
      </div>
      <p className="admin-hint">Cropper.js starts on the whole image, preserves that aspect ratio, and cannot leave the image. {SNAP_EDGE_THRESHOLD_LABEL}</p>
      <div className="admin-crop-grid">
        <AdminField label="Resize width px">
          <input
            type="number"
            min="160"
            max="2400"
            step="20"
            value={resizeWidth}
            onChange={(event) => setResizeWidth(event.target.value)}
          />
        </AdminField>
        <AdminField label="Resize height px optional">
          <input
            type="number"
            min="160"
            max="2400"
            step="20"
            value={resizeHeight}
            onChange={(event) => setResizeHeight(event.target.value)}
            placeholder="auto"
          />
        </AdminField>
        <button type="button" className="admin-crop-button" onClick={applyCrop} disabled={!image || cropping || uploading}>
          {cropping ? "Applying crop..." : "Apply cropped image"}
        </button>
        <button type="button" className="admin-crop-button admin-crop-secondary" onClick={resetCrop} disabled={!image || cropping || uploading}>
          Reset to whole image
        </button>
      </div>
      {uploading ? <p className="admin-hint">Uploading image...</p> : null}
      {cropStatus ? <p className="admin-hint">{cropStatus}</p> : null}
    </div>
  );
}

function ProjectEditor({ project, index, onChange, onRemove, onMove, onUpload }) {
  return (
    <article className="admin-panel">
      <div className="admin-panel-head">
        <strong>{String(index + 1).padStart(2, "0")} / {project.title}</strong>
        <div className="admin-actions">
          <button type="button" onClick={() => onMove(index, -1)}>Up</button>
          <button type="button" onClick={() => onMove(index, 1)}>Down</button>
          <button type="button" className="admin-danger" onClick={() => onRemove(index)}>Remove</button>
        </div>
      </div>
      <div className="admin-grid">
        <AdminField label="Title">
          <input value={project.title || ""} onChange={(event) => onChange(index, { title: event.target.value })} />
        </AdminField>
        <AdminField label="Eyebrow">
          <input value={project.eyebrow || ""} onChange={(event) => onChange(index, { eyebrow: event.target.value })} />
        </AdminField>
        <AdminField label="Accent">
          <input value={project.accent || ""} onChange={(event) => onChange(index, { accent: event.target.value })} />
        </AdminField>
        <AdminField label="Open / Source URL">
          <input value={project.href || ""} onChange={(event) => onChange(index, { href: event.target.value })} />
        </AdminField>
        <AdminField label="Optional source URL">
          <input value={project.sourceHref || ""} onChange={(event) => onChange(index, { sourceHref: event.target.value })} />
        </AdminField>
        <AdminField label="Image alt">
          <input value={project.imageAlt || ""} onChange={(event) => onChange(index, { imageAlt: event.target.value })} />
        </AdminField>
      </div>
      <AdminField label="Story">
        <textarea value={project.story || ""} onChange={(event) => onChange(index, { story: event.target.value })} rows={2} />
      </AdminField>
      <AdminField label="Description">
        <textarea value={project.description || ""} onChange={(event) => onChange(index, { description: event.target.value })} rows={4} />
      </AdminField>
      <AdminField label="Tags, comma separated">
        <input value={listToCsv(project.tags)} onChange={(event) => onChange(index, { tags: csvToList(event.target.value) })} />
      </AdminField>
      <ImageEditor
        image={project.image}
        imageCrop={project.imageCrop}
        label="Project"
        onImageChange={(image) => onChange(index, { image })}
        onCroppedImageChange={(image) => onChange(index, { image, imageCrop: { x: 50, y: 50, zoom: 1 } })}
        onCropChange={(imageCrop) => onChange(index, { imageCrop })}
        onUpload={onUpload}
      />
    </article>
  );
}

function SkillEditor({ stack, index, onChange, onRemove, onMove }) {
  return (
    <article className="admin-panel">
      <div className="admin-panel-head">
        <strong>{String(index + 1).padStart(2, "0")} / {stack.title}</strong>
        <div className="admin-actions">
          <button type="button" onClick={() => onMove(index, -1)}>Up</button>
          <button type="button" onClick={() => onMove(index, 1)}>Down</button>
          <button type="button" className="admin-danger" onClick={() => onRemove(index)}>Remove</button>
        </div>
      </div>
      <AdminField label="Heading">
        <input value={stack.title || ""} onChange={(event) => onChange(index, { title: event.target.value })} />
      </AdminField>
      <AdminField label="Sub heading">
        <input value={stack.subtitle || ""} onChange={(event) => onChange(index, { subtitle: event.target.value })} />
      </AdminField>
      <AdminField label="Items, comma separated">
        <textarea value={listToCsv(stack.items)} onChange={(event) => onChange(index, { items: csvToList(event.target.value) })} rows={3} />
      </AdminField>
    </article>
  );
}

function ExperienceEditor({ item, index, onChange, onRemove, onMove, onUpload }) {
  return (
    <article className="admin-panel">
      <div className="admin-panel-head">
        <strong>{String(index + 1).padStart(2, "0")} / {item.role}</strong>
        <div className="admin-actions">
          <button type="button" onClick={() => onMove(index, -1)}>Up</button>
          <button type="button" onClick={() => onMove(index, 1)}>Down</button>
          <button type="button" className="admin-danger" onClick={() => onRemove(index)}>Remove</button>
        </div>
      </div>
      <div className="admin-grid">
        <AdminField label="Role">
          <input value={item.role || ""} onChange={(event) => onChange(index, { role: event.target.value })} />
        </AdminField>
        <AdminField label="Company / org">
          <input value={item.org || ""} onChange={(event) => onChange(index, { org: event.target.value })} />
        </AdminField>
        <AdminField label="Company website URL optional">
          <input value={item.companyHref || ""} onChange={(event) => onChange(index, { companyHref: event.target.value })} />
        </AdminField>
        <AdminField label="Period">
          <input value={item.period || ""} onChange={(event) => onChange(index, { period: event.target.value })} />
        </AdminField>
        <AdminField label="Certificate title">
          <input value={item.certificateTitle || ""} onChange={(event) => onChange(index, { certificateTitle: event.target.value })} />
        </AdminField>
        <AdminField label="Certificate note">
          <input value={item.certificateNote || ""} onChange={(event) => onChange(index, { certificateNote: event.target.value })} />
        </AdminField>
      </div>
      <AdminField label="Work story">
        <textarea value={item.body || ""} onChange={(event) => onChange(index, { body: event.target.value })} rows={4} />
      </AdminField>
      <AdminField label="Tech tags, comma separated">
        <input value={listToCsv(item.tech)} onChange={(event) => onChange(index, { tech: csvToList(event.target.value) })} />
      </AdminField>
      <ImageEditor
        image={item.certificate}
        imageCrop={item.certificateImageCrop}
        label="Work certificate"
        onImageChange={(certificate) => onChange(index, { certificate })}
        onCroppedImageChange={(certificate) => onChange(index, { certificate, certificateImageCrop: { x: 50, y: 50, zoom: 1 } })}
        onCropChange={(certificateImageCrop) => onChange(index, { certificateImageCrop })}
        onUpload={onUpload}
      />
    </article>
  );
}

function CertificateEditor({ certificate, index, onChange, onRemove, onMove, onUpload }) {
  return (
    <article className="admin-panel">
      <div className="admin-panel-head">
        <strong>{String(index + 1).padStart(2, "0")} / {certificate.title}</strong>
        <div className="admin-actions">
          <button type="button" onClick={() => onMove(index, -1)}>Up</button>
          <button type="button" onClick={() => onMove(index, 1)}>Down</button>
          <button type="button" className="admin-danger" onClick={() => onRemove(index)}>Remove</button>
        </div>
      </div>
      <AdminField label="Title">
        <input value={certificate.title || ""} onChange={(event) => onChange(index, { title: event.target.value })} />
      </AdminField>
      <AdminField label="Top green tag">
        <input value={certificate.subtitle || ""} onChange={(event) => onChange(index, { subtitle: event.target.value })} />
      </AdminField>
      <AdminField label="Rank / recognition">
        <input value={certificate.rank || ""} onChange={(event) => onChange(index, { rank: event.target.value })} />
      </AdminField>
      <AdminField label="Certificate details">
        <textarea value={certificate.details || ""} onChange={(event) => onChange(index, { details: event.target.value })} rows={3} />
      </AdminField>
      <AdminField label="Fallback note">
        <input value={certificate.note || ""} onChange={(event) => onChange(index, { note: event.target.value })} />
      </AdminField>
      <ImageEditor
        image={certificate.image}
        imageCrop={certificate.imageCrop}
        label="Certificate"
        onImageChange={(image) => onChange(index, { image })}
        onCroppedImageChange={(image) => onChange(index, { image, imageCrop: { x: 50, y: 50, zoom: 1 } })}
        onCropChange={(imageCrop) => onChange(index, { imageCrop })}
        onUpload={onUpload}
      />
    </article>
  );
}

export default function AdminDashboard({ initialAuthenticated = false, initialContent }) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [activeTab, setActiveTab] = useState("Projects");
  const [passcode, setPasscode] = useState("");
  const [content, setContent] = useState(() => normalizeContent(initialContent));
  const [rawJson, setRawJson] = useState(() => JSON.stringify(normalizeContent(initialContent), null, 2));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const summary = useMemo(
    () => [
      `${content.projects.length} projects`,
      `${content.skillStacks.length} skill stacks`,
      `${content.experience.length} work entries`,
      `${content.certificates.length} proof slots`,
      "typography controls",
    ],
    [content],
  );

  useEffect(() => {
    setRawJson(JSON.stringify(content, null, 2));
  }, [content]);

  const replaceContent = (updater) => {
    setContent((current) => {
      return normalizeContent(typeof updater === "function" ? updater(current) : updater);
    });
  };

  const updateListItem = (section, index, patch) => {
    replaceContent((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = (section, item) => {
    replaceContent((current) => ({ ...current, [section]: [...current[section], item] }));
  };

  const removeItem = (section, index) => {
    replaceContent((current) => ({ ...current, [section]: current[section].filter((_, itemIndex) => itemIndex !== index) }));
  };

  const moveItem = (section, index, direction) => {
    replaceContent((current) => ({ ...current, [section]: moveItemInList(current[section], index, direction) }));
  };

  const updateTypography = (key, value) => {
    replaceContent((current) => ({
      ...current,
      typography: {
        ...defaultTypography,
        ...current.typography,
        [key]: value,
      },
    }));
  };

  const login = async (event) => {
    event.preventDefault();
    setMessage("Checking passcode...");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (!response.ok) {
      setMessage("Passcode rejected.");
      return;
    }

    setAuthenticated(true);
    setPasscode("");
    setMessage("Admin unlocked.");

    const contentResponse = await fetch("/api/admin/content");
    if (contentResponse.ok) {
      const payload = await contentResponse.json();
      replaceContent(payload.content);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setMessage("Admin locked.");
  };

  const saveContent = async () => {
    setSaving(true);
    setMessage("Saving portfolio...");

    const response = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error || "Save failed.");
      return;
    }

    replaceContent(payload.content);
    setMessage("Portfolio saved.");
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "Upload failed.");
      return "";
    }

    setMessage("Image uploaded.");
    return payload.url;
  };

  const applyRawJson = () => {
    try {
      replaceContent(JSON.parse(rawJson));
      setMessage("Raw JSON applied.");
    } catch (error) {
      setMessage(`JSON error: ${error.message}`);
    }
  };

  if (!authenticated) {
    return (
      <main className="admin-page">
        <section className="admin-login">
          <p>Debyte Expo control room</p>
          <h1>Admin passcode</h1>
          <form onSubmit={login}>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter passcode"
              autoComplete="current-password"
            />
            <button type="submit">Unlock</button>
          </form>
          {message ? <span className="admin-message">{message}</span> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-shell admin-header">
        <div>
          <p>Portfolio Manager</p>
          <h1>Debyte Expo admin</h1>
          <span>{summary.join(" / ")}</span>
        </div>
        <div className="admin-actions">
          <a href="/" target="_blank" rel="noreferrer">View site</a>
          <button type="button" onClick={saveContent} disabled={saving}>{saving ? "Saving..." : "Save portfolio"}</button>
          <button type="button" className="admin-danger" onClick={logout}>Lock</button>
        </div>
      </header>

      <section className="admin-shell">
        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {message ? <p className="admin-message">{message}</p> : null}

        {activeTab === "Projects" ? (
          <div className="admin-list">
            <div className="admin-section-head">
              <h2>Projects</h2>
              <button type="button" onClick={() => addItem("projects", blankProject)}>Add project</button>
            </div>
            {content.projects.map((project, index) => (
              <ProjectEditor
                key={`${project.title}-${index}`}
                project={project}
                index={index}
                onChange={(itemIndex, patch) => updateListItem("projects", itemIndex, patch)}
                onRemove={(itemIndex) => removeItem("projects", itemIndex)}
                onMove={(itemIndex, direction) => moveItem("projects", itemIndex, direction)}
                onUpload={uploadImage}
              />
            ))}
          </div>
        ) : null}

        {activeTab === "Skills" ? (
          <div className="admin-list">
            <div className="admin-section-head">
              <h2>Skills</h2>
              <button type="button" onClick={() => addItem("skillStacks", blankSkillStack)}>Add skill stack</button>
            </div>
            {content.skillStacks.map((stack, index) => (
              <SkillEditor
                key={`${stack.title}-${index}`}
                stack={stack}
                index={index}
                onChange={(itemIndex, patch) => updateListItem("skillStacks", itemIndex, patch)}
                onRemove={(itemIndex) => removeItem("skillStacks", itemIndex)}
                onMove={(itemIndex, direction) => moveItem("skillStacks", itemIndex, direction)}
              />
            ))}
          </div>
        ) : null}

        {activeTab === "Experience" ? (
          <div className="admin-list">
            <div className="admin-section-head">
              <h2>Experience</h2>
              <button type="button" onClick={() => addItem("experience", blankExperience)}>Add work entry</button>
            </div>
            {content.experience.map((item, index) => (
              <ExperienceEditor
                key={`${item.role}-${index}`}
                item={item}
                index={index}
                onChange={(itemIndex, patch) => updateListItem("experience", itemIndex, patch)}
                onRemove={(itemIndex) => removeItem("experience", itemIndex)}
                onMove={(itemIndex, direction) => moveItem("experience", itemIndex, direction)}
                onUpload={uploadImage}
              />
            ))}
          </div>
        ) : null}

        {activeTab === "Certificates" ? (
          <div className="admin-list">
            <div className="admin-section-head">
              <h2>Certificates</h2>
              <button type="button" onClick={() => addItem("certificates", blankCertificate)}>Add proof slot</button>
            </div>
            {content.certificates.map((certificate, index) => (
              <CertificateEditor
                key={`${certificate.title}-${index}`}
                certificate={certificate}
                index={index}
                onChange={(itemIndex, patch) => updateListItem("certificates", itemIndex, patch)}
                onRemove={(itemIndex) => removeItem("certificates", itemIndex)}
                onMove={(itemIndex, direction) => moveItem("certificates", itemIndex, direction)}
                onUpload={uploadImage}
              />
            ))}
          </div>
        ) : null}

        {activeTab === "Typography" ? (
          <TypographyEditor typography={content.typography} onChange={updateTypography} />
        ) : null}

        {activeTab === "Raw JSON" ? (
          <div className="admin-list">
            <div className="admin-section-head">
              <h2>Raw JSON</h2>
              <button type="button" onClick={applyRawJson}>Apply JSON</button>
            </div>
            <textarea
              className="admin-json"
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
              spellCheck="false"
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
