import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const file = (target) => path.join(root, target);
const exists = (target) => existsSync(file(target));
const read = (target) => readFileSync(file(target), "utf8");
const readIfExists = (target) => (exists(target) ? read(target) : "");
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const pkg = JSON.parse(read("package.json"));
const layout = readIfExists("app/layout.jsx");
const page = readIfExists("app/page.jsx");
const shell = readIfExists("components/PortfolioPage.jsx");
const pageSurface = `${page}\n${shell}`;
const globals = readIfExists("app/globals.css");
const data = readIfExists("lib/portfolio-data.js");
const splash = readIfExists("components/SplashExperience.jsx");
const scene = readIfExists("components/MakerScene.jsx");
const sfx = readIfExists("components/SfxLayer.jsx");
const interactions = readIfExists("components/PortfolioMotion.jsx");
const expandableImage = readIfExists("components/ExpandableImage.jsx");
const projectShowcase = readIfExists("components/ProjectShowcase.jsx");
const adminDashboard = readIfExists("components/AdminDashboard.jsx");
const store = readIfExists("lib/portfolio-store.js");
const auth = readIfExists("lib/admin-auth.js");
const adminPage = readIfExists("app/admin/page.jsx");
const loginRoute = readIfExists("app/api/admin/login/route.js");
const contentRoute = readIfExists("app/api/admin/content/route.js");
const uploadRoute = readIfExists("app/api/admin/upload/route.js");
const contentJson = readIfExists("data/portfolio-content.json");
const contentSource = `${data}\n${contentJson}`;
const envExample = readIfExists(".env.example");
const readme = readIfExists("README.md");

expect(pkg.scripts?.dev === "next dev", "dev script must run next dev");
expect(pkg.scripts?.build?.includes("check:portfolio") && pkg.scripts?.build?.includes("next build"), "build script must run contract checks before next build");
expect(pkg.dependencies?.next, "Next.js must be installed");
expect(pkg.dependencies?.gsap, "GSAP must be installed");
expect(pkg.dependencies?.["@gsap/react"], "@gsap/react must be installed");
expect(pkg.dependencies?.["@vercel/blob"], "Vercel Blob must be installed for production admin persistence");
expect(pkg.dependencies?.cropperjs, "Cropper.js must be installed for admin image cropping");
expect(!String(pkg.scripts?.dev).includes("vite"), "Vite dev script must be removed");

expect(exists("app/layout.jsx"), "App Router layout must exist");
expect(exists("app/page.jsx"), "App Router page must exist");
expect(layout.includes("<html") && layout.includes("<body"), "layout must render html/body");
expect(layout.includes("next/font/google"), "layout must use next/font/google");
expect(page.includes("PortfolioPage"), "page must render the portfolio client shell");
expect(page.includes("readPortfolioContent"), "page must load editable portfolio content from the server store");
expect(page.includes("force-dynamic"), "page must stay dynamic so admin edits can refresh content");
expect(shell.includes("'use client'"), "portfolio shell must be a client component");
expect(pageSurface.includes("SplashExperience"), "page must include the splash experience");
expect(pageSurface.includes("MakerScene"), "page must include the 3D maker scene");
expect(pageSurface.includes("SfxLayer"), "page must include delegated sound effects");

expect(contentSource.includes("Ankit Chetri"), "portfolio data must include the owner name");
expect(contentSource.includes("Sebastian Lague Legacy"), "portfolio must include the Sebastian Lague Legacy inspiration title");
expect(contentSource.includes("wood carving"), "portfolio must include wood carving");
expect(contentSource.includes("shaders"), "portfolio must include shaders");
expect(contentSource.includes("baking"), "portfolio must include baking");
expect(contentSource.includes("cats"), "portfolio must include cats");
expect(contentSource.includes("https://drive.google.com/file/d/1oZzJXBH-rjmzZ3gGgn4evf0JkhwsEEQ1/view?usp=sharing"), "resume must use the provided Google Drive source URL");
expect(contentSource.includes("https://www.linkedin.com/in/ankit-chetri-debyte-910b46300/"), "LinkedIn URL must keep the exact source-of-truth link");
expect(contentJson.includes('"body": "I '), "story chapters must speak in first person");
expect(contentJson.includes('"description": "I '), "project descriptions must speak in first person");
expect(contentJson.includes("tiny universe") || contentJson.includes("lab bench"), "portfolio copy must feel imaginative instead of plain resume-like");
expect(contentJson.includes('"skillStacks"'), "editable content JSON must include skill stacks");
expect(contentJson.includes('"subtitle"'), "skill stacks must include visible subtitles");
expect(contentJson.includes('"rank"'), "certificate proof slots must include rank/subheading metadata");
expect(contentJson.includes('"details"'), "certificate proof slots must include certificate detail metadata");
expect(contentJson.includes('"certificateTitle"'), "work experience entries must allow work certificate labels");
expect(contentJson.includes('"certificateImageCrop"'), "work experience entries must allow cropped work certificate images");
expect(contentJson.includes('"companyHref"'), "work experience entries must allow optional company website links");
expect(contentJson.includes('"experience"') && contentJson.includes('"tech"'), "work experience entries must include editable tech tags");
expect(contentJson.includes('"typography"'), "editable content JSON must include typography controls");
expect(contentJson.includes('"heroTitle"'), "typography controls must include hero title sizing");
expect(contentJson.includes('"catified"') && contentJson.includes('"fuwafuwa"') && contentJson.includes('"bring the PRD"'), "contact strip content must include the requested whimsy phrases");
expect(
  shell.includes("I build systems with a heart for whimsy") &&
    shell.includes("Sketchbook with a GPU attached.") &&
    shell.includes("Bring me something with whimsy."),
  "public shell copy must use the requested whimsy wording",
);

expect(splash.includes("WELCOME TO DEBYTE EXPO"), "splash must animate WELCOME TO DEBYTE EXPO");
expect(splash.includes("/assets/flip-sound.mp3"), "splash must use the old flip sound");
expect(splash.includes("/assets/chainsaw.mp3"), "splash must use the old chainsaw sound");
expect(splash.includes("prefers-reduced-motion"), "splash must respect reduced motion");
expect(splash.includes("bootRows"), "splash must include OS boot rows");
expect(splash.includes("flipPanels"), "splash must include old-style flip reveal panels");
expect(splash.includes("clickSeries"), "splash must sequence click sound effects during reveal");
expect(splash.includes("flipPanels.join(\"\").length"), "splash click count must be derived from the revealed letter count");
expect(splash.includes("LETTER_CLICK_INTERVAL_MS"), "splash clicks must use a deliberate per-letter interval");
expect(splash.includes("onStart: playClickSeries"), "splash click sequence must begin when the letters reveal");
expect(splash.includes("started.current"), "splash begin action must be guarded against duplicate timelines");
expect(splash.includes("stopSplashSounds"), "splash must stop active sounds when it exits");
expect(splash.includes("splash-status"), "splash must expose a boot status panel");
expect(splash.includes("splash-tiles"), "splash must render flip panel tiles");

expect(scene.includes("'use client'"), "MakerScene must be a client component");
expect(scene.includes("Canvas"), "MakerScene must render a React Three Fiber Canvas");
expect(scene.includes("/assets/chainsawmangrave.glb"), "MakerScene must load the Chainsawman GLB");
expect(scene.includes("isMobile"), "MakerScene must keep a mobile performance mode");
expect(scene.includes("dpr={isMobile ?"), "MakerScene must cap pixel ratio on mobile");
expect(scene.includes("useSceneVisibility"), "3D scene must observe visibility for performance");
expect(scene.includes('frameloop={sceneActive ? "always" : "demand"}'), "3D scene must use an adaptive frameloop for performance");
expect(scene.includes("SceneShaderBackdrop"), "MakerScene must use a shader backdrop");
expect(scene.includes("ShaderMaterial") || scene.includes("shaderMaterial"), "MakerScene must use a shader material");
expect(scene.includes("iTime") && scene.includes("iResolution"), "shader backdrop must expose Shadertoy-style uniforms");
expect(scene.includes("CHAINSAWMAN_RIGHT_PROFILE_Y"), "Chainsawman must use an explicit right-facing profile rotation");
expect(scene.includes("CHAINSAWMAN_RIGHT_PROFILE_Y = 0.905"), "Chainsawman right profile angle must be reduced by about 10 degrees");
expect(scene.includes("CHAINSAWMAN_SCENE_OFFSET_X"), "Chainsawman must expose an explicit left scene offset");
expect(scene.includes("fractalTreeField"), "shader backdrop must generate a fractal tree field");
expect(scene.includes("treeCanopy"), "shader backdrop must include fractal canopy forms");
expect(scene.includes("treeTrunk"), "shader backdrop must include tree/trunk silhouettes");
expect(scene.includes("struct Ray"), "shader backdrop must use raymarch-style fractal tree rays");
expect(scene.includes("vmarch"), "shader backdrop must include volumetric fractal tree marching");
expect(scene.includes("MAXDIST"), "shader backdrop must bound raymarch distance for performance");
expect(scene.includes("RAYMARCH_STEPS 20"), "shader raymarch must use a lower step budget for performance");
expect(scene.includes("VMARCH_STEPS 6"), "shader volume march must use a lower step budget for performance");
expect(scene.includes("CANOPY_ITERATIONS 8"), "fractal canopy iterations must be capped for performance");
expect(scene.includes("neonGreenGrade"), "shader backdrop must apply a dark neon-green grade");
expect(scene.includes("#161f19"), "shader backdrop must use the requested dark green base color");
expect(scene.includes("#6ca600"), "shader backdrop must use the requested neon green accent");
expect(scene.includes("DETAIL_CONTRAST"), "shader backdrop must expose stronger detail contrast tuning");
expect(scene.includes("dpr={isMobile ? [0.75, 1] : [1, 1.25]}"), "3D canvas DPR must be capped lower for performance");
expect(scene.includes("antialias: false"), "3D canvas antialiasing must stay disabled for performance");
expect(scene.includes("const bladeCount = isMobile ? 12 : 28"), "Workbench grid density must be reduced for performance");
expect(!scene.includes("sunRings"), "old ring shader background must be removed");
expect(!scene.includes("FloatingMakerParts"), "random floating maker parts must be removed from the Chainsawman background");

expect(sfx.includes("'use client'"), "SfxLayer must be a client component");
expect(sfx.includes("Howl"), "SfxLayer must use the existing sound assets through Howler");
expect(sfx.includes("pointerenter"), "hover sounds must be wired");
expect(sfx.includes("dblclick"), "double-click sounds must be wired");
expect(sfx.includes("data-sfx"), "sound effects must be delegated through data-sfx");

expect(interactions.includes("useGSAP"), "PortfolioMotion must use @gsap/react useGSAP");
expect(interactions.includes("ScrollTrigger"), "scroll animation must use ScrollTrigger");
expect(interactions.includes("matchMedia"), "GSAP animations must use matchMedia");
expect(interactions.includes("prefers-reduced-motion"), "GSAP animations must respect reduced motion");

expect(exists("components/ExpandableImage.jsx"), "clickable images must use a reusable expandable image layer");
expect(expandableImage.includes("createPortal"), "expanded images must render above the page in a portal layer");
expect(expandableImage.includes("getBoundingClientRect"), "expanded images must grow from the clicked image position");
expect(expandableImage.includes("requestAnimationFrame"), "expanded images must animate from source position to overlay size");
expect(expandableImage.includes("Escape"), "expanded images must close from the Escape key");
expect(expandableImage.includes("data-sfx"), "expanded image triggers must keep sound hooks");

expect(projectShowcase.includes("PAGE_SIZE"), "projects must expose pagination size");
expect(projectShowcase.includes("aria-current"), "project pagination must mark the current page");
expect(projectShowcase.includes("onDoubleClick"), "project cards must support a double-click gesture");
expect(projectShowcase.includes("onPointerMove"), "project cards must support pointer motion");
expect(projectShowcase.includes("getPrimaryActionLabel"), "project cards must compute Open vs Source labels from URLs");
expect(projectShowcase.includes("isGithubUrl"), "GitHub project links must default to Source");
expect(projectShowcase.includes("imageCrop"), "project cards must apply image crop metadata");
expect(projectShowcase.includes("ExpandableImage"), "project images must support click-to-expand inspection");
expect(shell.includes("experience-section"), "work experience must live in its own section");
expect(shell.includes("certificate-section"), "hackathons/certificates must live in a separate section");
expect(shell.includes("work-certificate-button"), "work experience cards must expose certificate viewing buttons");
expect(shell.includes("company-link"), "work experience company names must support optional website links");
expect(shell.includes("work-tech-tags"), "work experience cards must render tech tags");
expect(shell.includes("certificate-lip"), "certificate cards must include a subtitle lip below the image");
expect(!shell.includes("<strong>{certificate.rank}</strong>"), "certificate rank must not render as a second green tag");
expect(shell.includes("contact-corner-marquee"), "contact finale must include the diagonal animated corner marquee");
expect(!shell.includes("Certificate slot ready in admin"), "public portfolio must not show admin placeholder text");
expect(shell.includes("ExpandableImage"), "portfolio images and certificates must support click-to-expand inspection");

expect(exists("app/admin/page.jsx"), "admin dashboard page must exist");
expect(adminPage.includes("AdminDashboard"), "admin page must render the dashboard");
expect(auth.includes("ADMIN_PASSCODE") && auth.includes("VITE_ADMIN_PASSCODE"), "admin auth must use passcode from env only");
expect(auth.includes('process.env.NODE_ENV === "production"'), "production auth must require ADMIN_PASSCODE instead of dev fallback");
expect(auth.includes("createHmac"), "admin session cookie must be signed");
expect(loginRoute.includes("cookies") && loginRoute.includes("httpOnly"), "admin login must set an httpOnly cookie");
expect(contentRoute.includes("readPortfolioContent") && contentRoute.includes("writePortfolioContent"), "admin content API must read/write portfolio data");
expect(uploadRoute.includes("request.formData()"), "admin upload API must accept FormData");
expect(uploadRoute.includes("public/uploads"), "admin upload API must store files under public/uploads");
expect(uploadRoute.includes("@vercel/blob") && uploadRoute.includes("BLOB_READ_WRITE_TOKEN"), "admin upload API must use Vercel Blob in production");
expect(store.includes("portfolio-content.json"), "portfolio store must persist to JSON");
expect(store.includes("@vercel/blob") && store.includes("allowOverwrite") && store.includes("BLOB_READ_WRITE_TOKEN"), "portfolio store must persist admin edits to Vercel Blob in production");
expect(store.includes("readBlobText") && store.includes("new Response(stream).text()"), "portfolio store must read Blob streams across Node/Vercel runtimes");
expect(store.includes("certificateImageCrop"), "portfolio store must normalize work certificate image crops");
expect(store.includes("companyHref"), "portfolio store must normalize optional company website links");
expect(store.includes("tech: withArray"), "portfolio store must normalize work experience tech tags");
expect(adminDashboard.includes("Projects") && adminDashboard.includes("Skills") && adminDashboard.includes("Experience") && adminDashboard.includes("Certificates"), "admin dashboard must expose project, skill, experience, and certificate editors");
expect(adminDashboard.includes("Typography"), "admin dashboard must expose typography controls");
expect(adminDashboard.includes("Font Size"), "admin dashboard must allow font size editing");
expect(adminDashboard.includes("Raw JSON"), "admin dashboard must include a raw JSON editor for everything else");
expect(adminDashboard.includes("image URL") || adminDashboard.includes("Image URL"), "admin dashboard must allow image URLs");
expect(adminDashboard.includes("type=\"file\""), "admin dashboard must allow file uploads");
expect(adminDashboard.includes("import(\"cropperjs\")"), "admin image editor must load Cropper.js on the client");
expect(adminDashboard.includes("getCropperSelection") && adminDashboard.includes("$toCanvas"), "admin cropper must export a real cropped canvas");
expect(adminDashboard.includes("onCroppedImageChange"), "admin cropper must write the cropped/resized asset URL back to content");
expect(adminDashboard.includes('initial-coverage="1"'), "admin cropper must default the crop selection to the full image");
expect(adminDashboard.includes("applyFullImageCrop"), "admin cropper must explicitly initialize the selection to the rendered image bounds");
expect(adminDashboard.includes("clampSelectionToImageBounds"), "admin cropper must clamp selections to image bounds");
expect(adminDashboard.includes("CROP_SNAP_PX"), "admin cropper must snap selections near image edges/corners");
expect((adminDashboard.match(/const CROP_SNAP_PX = (\d+)/)?.[1] || 99) <= 12, "admin cropper edge snapping must be gentle enough for precise dragging");
expect(adminDashboard.includes("limit-boundaries"), "admin cropper selection must use Cropper.js boundary limiting while moving");
expect(adminDashboard.includes("snap: true"), "admin cropper must snap only when the drag/resize gesture ends");
expect(adminDashboard.includes("selection.aspectRatio = Number.NaN"), "admin cropper must allow free crop ratios after the full-image reset");
expect(!adminDashboard.includes("selection.$change(next.x, next.y, next.width, next.height, bounds.aspectRatio)"), "admin cropper must not force every drag back to the full image aspect ratio");
expect(adminDashboard.includes("getSelectionAspectRatio"), "admin crop export must preserve the selected aspect ratio");
expect(adminDashboard.includes("naturalAspectRatio"), "admin cropper must size the crop stage from the image aspect ratio");
expect(adminDashboard.includes("cropperStageStyle"), "admin cropper must pass image aspect ratio into the crop stage");
expect(adminDashboard.includes("$ready"), "admin cropper must wait for Cropper.js image readiness before sizing the crop world");
expect(adminDashboard.includes("ResizeObserver"), "admin cropper must recompute bounds when the crop stage resizes");
expect(!adminDashboard.includes("rotatable scalable skewable translatable"), "admin cropper must not let the image move outside the crop world");
expect(adminDashboard.includes("SNAP_EDGE_THRESHOLD_LABEL"), "admin cropper UI must communicate edge snapping");
expect(globals.includes("--cropper-aspect-ratio"), "admin cropper CSS must size the work surface by image aspect ratio");
expect(adminDashboard.includes("Tech tags, comma separated"), "admin dashboard must edit work experience tech tags");
expect(adminDashboard.includes("ExperienceEditor"), "admin dashboard must include an experience editor");
expect(adminDashboard.includes("certificateTitle") && adminDashboard.includes("certificateImageCrop"), "admin dashboard must edit work certificate metadata");
expect(adminDashboard.includes("companyHref"), "admin dashboard must edit optional company website links");
expect(adminDashboard.includes("Top green tag"), "admin dashboard must let certificate top lips be edited");
expect(adminDashboard.includes("moveItem"), "admin dashboard must allow rearranging content");

expect(globals.includes("--acid"), "global CSS must define the acid accent token");
expect(globals.includes("--shadow-hard"), "global CSS must define hard neobrutalist shadows");
expect(globals.includes("border: 2px solid"), "global CSS must use thick borders");
expect(globals.includes("border-radius: 0"), "global CSS must keep sharp neobrutalist corners");
expect(globals.includes("@media (max-width: 720px)"), "global CSS must include mobile layout rules");
expect(globals.includes("@media (prefers-reduced-motion: reduce)"), "global CSS must include reduced-motion rules");
expect(globals.includes(".project-grid"), "global CSS must style project pagination grid");
expect(globals.includes(".stack-subtitle"), "global CSS must style skill stack subtitles");
expect(globals.includes(".experience-section"), "global CSS must style the standalone work experience section");
expect(globals.includes(".work-tech-tags"), "global CSS must style work experience tech tags");
expect(globals.includes(".certificate-section"), "global CSS must style the standalone certificate section");
expect(/\.work-timeline\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(globals), "work experience cards must stay boxed in a full-width grid");
expect(/\.certificate-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(globals), "certificate gallery must use the available desktop width efficiently");
expect(globals.includes(".certificate-lip"), "global CSS must style certificate subtitle lips");
expect(globals.includes(".contact-corner-marquee") && globals.includes("rotate(-45deg)"), "contact finale must style a 45-degree neon marquee");
expect(globals.includes("@keyframes contact-corner-slide"), "contact finale must animate the diagonal marquee text");
expect(globals.includes("width: max(1400px, 128vw)") && globals.includes("right: clamp(-720px, -34vw, -430px)"), "contact diagonal marquee must overscan the viewport so end-caps do not cut off on the right edge");
expect(!globals.includes("grid-template-columns: minmax(0, 1fr) minmax(260px, auto)"), "contact buttons must stay in the headline flow instead of floating in a separate right column");
expect(/\.contact-section > div\.contact-actions\s*\{[^}]*justify-self:\s*start/.test(globals), "contact buttons must align with the contact headline");
expect(/\.contact-section > div\.contact-actions\s*\{[^}]*position:\s*absolute[^}]*bottom:/s.test(globals), "contact buttons must be anchored as a visible bottom-left dock");
expect(globals.includes(".image-popout-layer") && globals.includes(".image-popout-panel"), "global CSS must style expanded image layers");
expect(globals.includes(".company-link"), "global CSS must style optional company website links");
expect(globals.includes(".contact-section") && globals.includes("align-content: start"), "contact section must reveal actions earlier in the scroll");
expect(globals.includes(".admin-cropper-preview") && globals.includes(".admin-crop-button"), "global CSS must style the Cropper.js admin controls");
expect(globals.includes("::-webkit-scrollbar"), "global CSS must style Chromium/WebKit scrollbars");
expect(globals.includes("scrollbar-color"), "global CSS must style Firefox scrollbars");
expect(globals.includes(".story-card .section-label"), "story card labels must have readable contrast");
expect(globals.includes(".admin-page"), "global CSS must style the admin dashboard");
expect(globals.includes("--font-size-hero-title-max"), "global CSS must support editable hero title font sizing");
expect(globals.includes("--font-size-section-title-max"), "global CSS must support editable section title font sizing");
expect(
  envExample.includes("ADMIN_PASSCODE") &&
    envExample.includes("BLOB_STORE_ID") &&
    envExample.includes("BLOB_READ_WRITE_TOKEN") &&
    envExample.includes("BLOB_WEBHOOK_PUBLIC_KEY"),
  "env example must document production Vercel env vars",
);
expect(
  readme.includes("Vercel") &&
    readme.includes("BLOB_STORE_ID") &&
    readme.includes("BLOB_READ_WRITE_TOKEN") &&
    readme.includes("Production Checklist"),
  "README must document Vercel deployment setup",
);

if (failures.length) {
  console.error("Next portfolio contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Next portfolio contract passed.");
