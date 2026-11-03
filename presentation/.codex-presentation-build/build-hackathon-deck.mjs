import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/jaitak/Documents/IIT-Hackathon";
const buildDir = path.join(workspaceDir, "presentation/.codex-presentation-build/hackathon");
const outputDir = path.join(workspaceDir, "presentation/output");
const skillDir = "/Users/jaitak/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations";
const runtimePython = "/Users/jaitak/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const finalPptx = path.join(outputDir, "HeritageLens-HackCult26-Light-Hackathon-Pitch.pptx");

const C = {
  paper: "#F7F1E5",
  paper2: "#EDE3D1",
  ink: "#243037",
  panel: "#FFFDF8",
  panel2: "#EAF2EE",
  cyan: "#176F68",
  cyan2: "#0D5B57",
  saffron: "#D88A24",
  orange: "#C75B38",
  ivory: "#FFF9ED",
  muted: "#5F696D",
  line: "#AFC5BD",
  maroon: "#7B3040",
  green: "#2E846A",
  red: "#B94646",
  peach: "#F3D9C8",
};

const serif = "Baskerville";
const sans = "Avenir Next";

const A = {
  home: path.join(workspaceDir, "frontend/presentation/assets/home-live.png"),
  archive: path.join(workspaceDir, "frontend/presentation/assets/archive-live.png"),
  map: path.join(workspaceDir, "frontend/presentation/assets/map-live.png"),
  konark: path.join(workspaceDir, "frontend/public/images/sites/gallery/konark-wheel-detail.jpg"),
  ajanta: path.join(workspaceDir, "frontend/public/images/sites/gallery/ajanta-mural-detail.jpg"),
  ellora: path.join(workspaceDir, "frontend/public/images/sites/gallery/ellora-pillars.jpg"),
  rani: path.join(workspaceDir, "frontend/public/images/sites/gallery/rani-ki-vav-sculpture.jpg"),
};

async function readBytes(filePath) {
  const data = await fs.readFile(filePath);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

function box(slide, position, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "roundRect",
    position,
    fill: options.fill ?? C.panel,
    line: options.line ?? { style: "solid", fill: C.line, width: 1 },
    borderRadius: options.radius ?? 14,
    shadow: options.shadow,
  });
}

function text(slide, value, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: options.fill ?? "none",
    line: options.line ?? { style: "solid", fill: "none", width: 0 },
    borderRadius: options.radius,
  });
  shape.text = value;
  shape.text.style = {
    typeface: options.font ?? sans,
    fontSize: options.size ?? 20,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? C.ink,
    alignment: options.align ?? "left",
    verticalAlignment: options.valign ?? "middle",
  };
  shape.text.insets = options.insets ?? 0;
  return shape;
}

async function image(slide, filePath, position, options = {}) {
  const ext = path.extname(filePath).toLowerCase();
  return slide.images.add({
    blob: await readBytes(filePath),
    contentType: ext === ".png" ? "image/png" : "image/jpeg",
    alt: options.alt ?? path.basename(filePath),
    fit: options.fit ?? "cover",
    position,
    geometry: "rect",
    borderRadius: options.radius,
  });
}

function rule(slide, left, top, width, color = C.cyan, weight = 2) {
  return slide.shapes.add({
    geometry: "line",
    position: { left, top, width, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width: weight },
  });
}

function header(slide, n, title, subtitle) {
  text(slide, `0${n}`, { left: 56, top: 36, width: 50, height: 26 }, { size: 14, bold: true, color: C.cyan });
  rule(slide, 108, 49, 70, C.cyan, 2);
  text(slide, title, { left: 56, top: 78, width: 1030, height: 62 }, { font: serif, size: 38, bold: true });
  if (subtitle) text(slide, subtitle, { left: 56, top: 143, width: 1035, height: 42 }, { size: 18, color: C.muted });
}

function footer(slide, n) {
  text(slide, "HERITAGELENS  //  HACKCULT '26", { left: 56, top: 682, width: 320, height: 18 }, { size: 10, bold: true, color: C.muted });
  text(slide, String(n).padStart(2, "0"), { left: 1190, top: 680, width: 34, height: 18 }, { size: 11, bold: true, color: C.saffron, align: "right" });
}

function chip(slide, value, position, options = {}) {
  box(slide, position, {
    fill: options.fill ?? C.panel2,
    line: { style: "solid", fill: options.line ?? C.cyan, width: 1 },
    radius: position.height / 2,
  });
  text(slide, value, { left: position.left + 8, top: position.top + 4, width: position.width - 16, height: position.height - 8 }, {
    size: options.size ?? 12, bold: true, color: options.color ?? C.ink, align: "center",
  });
}

function node(slide, title, detail, position, options = {}) {
  const shape = box(slide, position, {
    fill: options.fill ?? C.panel2,
    line: { style: "solid", fill: options.line ?? C.line, width: options.weight ?? 1.2 },
    radius: options.radius ?? 12,
  });
  text(slide, title, { left: position.left + 15, top: position.top + 10, width: position.width - 30, height: 28 }, {
    size: options.titleSize ?? 17, bold: true, color: options.titleColor ?? C.ink,
  });
  if (detail) text(slide, detail, { left: position.left + 15, top: position.top + 42, width: position.width - 30, height: position.height - 52 }, {
    size: options.detailSize ?? 13, color: options.detailColor ?? C.muted,
  });
  return shape;
}

function connect(slide, from, to, fromSide = "right", toSide = "left") {
  return slide.shapes.connect(from, to, {
    kind: "elbow",
    fromSide,
    toSide,
    line: { style: "solid", fill: C.cyan, width: 2 },
    tail: { type: "arrow", width: "med", length: "med" },
  });
}

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
deck.theme.defaultFont = sans;

// 1. Cover
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  await image(s, A.konark, { left: 690, top: 0, width: 590, height: 720 }, { alt: "Konark wheel stone carving" });
  box(s, { left: 650, top: 0, width: 630, height: 720 }, { geometry: "rect", fill: "#243037/12", line: { style: "solid", fill: "none", width: 0 }, radius: 0 });
  rule(s, 56, 56, 172, C.cyan, 3);
  text(s, "HACKCULT '26  /  PS2", { left: 56, top: 76, width: 310, height: 28 }, { size: 13, bold: true, color: C.cyan });
  text(s, "HeritageLens", { left: 56, top: 178, width: 690, height: 100 }, { font: serif, size: 72, bold: true });
  text(s, "AI-powered cultural archive for India's architectural memory", { left: 56, top: 303, width: 590, height: 90 }, { size: 28, color: C.maroon, bold: true });
  text(s, "A working system for digitization, OCR, search, maps and source-grounded research", { left: 56, top: 432, width: 530, height: 74 }, { size: 19, color: C.muted });
  chip(s, "WORKING PROTOTYPE", { left: 56, top: 565, width: 190, height: 38 }, { fill: "#DCECE5", line: C.green, color: C.green });
  text(s, "TEAM HERITAGELENS  //  IIT GANDHINAGAR", { left: 56, top: 635, width: 490, height: 24 }, { size: 12, bold: true, color: C.ink });
  s.speakerNotes.text = "HackCult '26, Problem Statement 2. The working prototype claim is supported by the deployed frontend and automated test suite. Image source is recorded in frontend/public/images/sites/ATTRIBUTION.md.";
}

// 2. Problem and requirements
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  header(s, 2, "The problem and what the system must achieve", "Heritage evidence exists, but its formats and archives cannot work together.");

  await image(s, A.ajanta, { left: 56, top: 222, width: 235, height: 170 }, { alt: "Ajanta mural fragment", radius: 10 });
  await image(s, A.ellora, { left: 310, top: 222, width: 235, height: 170 }, { alt: "Ellora carved pillars", radius: 10 });
  box(s, { left: 56, top: 411, width: 489, height: 184 }, { fill: C.maroon, line: { style: "solid", fill: C.orange, width: 1.2 } });
  text(s, "Knowledge stays fragmented", { left: 78, top: 430, width: 420, height: 34 }, { font: serif, size: 24, bold: true, color: C.ivory });
  text(s, "Photographs lack metadata. Scanned documents hide their text. Field notes and regional records remain disconnected from the monuments they describe.", { left: 78, top: 477, width: 420, height: 88 }, { size: 18, color: C.ivory });

  text(s, "CORE REQUIREMENTS", { left: 608, top: 218, width: 300, height: 26 }, { size: 13, bold: true, color: C.cyan });
  const requirements = [
    ["01", "Preserve originals", "Durable private storage and authorized downloads"],
    ["02", "Make text searchable", "PDF extraction and OCR for scanned sources"],
    ["03", "Keep human oversight", "Curator review before approval"],
    ["04", "Connect context", "Sites, documents, images and map coordinates"],
    ["05", "Support public discovery", "Open browsing, filtering and grounded answers"],
  ];
  requirements.forEach((item, i) => {
    const y = 260 + i * 78;
    text(s, item[0], { left: 608, top: y, width: 42, height: 24 }, { size: 12, bold: true, color: C.saffron });
    text(s, item[1], { left: 665, top: y - 2, width: 250, height: 26 }, { size: 18, bold: true });
    text(s, item[2], { left: 665, top: y + 28, width: 490, height: 30 }, { size: 15, color: C.muted });
    if (i < requirements.length - 1) rule(s, 665, y + 65, 500, C.line, 1);
  });
  footer(s, 2);
  s.speakerNotes.text = "Problem and requirements come from the hackathon brief and the implemented HeritageLens workflow. No size, accuracy or adoption claims are made.";
}

// 3. Solution and product
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  header(s, 3, "HeritageLens turns scattered sources into a usable archive", "The judges can inspect the deployed product, not a mock-up.");
  await image(s, A.home, { left: 56, top: 210, width: 710, height: 444 }, { alt: "Live HeritageLens homepage", radius: 14 });
  chip(s, "LIVE PRODUCT", { left: 82, top: 230, width: 132, height: 34 }, { fill: C.maroon, line: C.maroon, color: C.ivory });

  const features = [
    ["Searchable archive", "Site metadata plus extracted and corrected document text"],
    ["Document digitization", "PDF extraction, Tesseract OCR and curator correction"],
    ["Interactive map", "Coordinates connect monuments to archival records"],
    ["Grounded assistant", "Answers reference retrieved archive sources"],
  ];
  features.forEach((item, i) => {
    const y = 216 + i * 108;
    text(s, `0${i + 1}`, { left: 810, top: y, width: 40, height: 24 }, { size: 12, bold: true, color: C.cyan });
    text(s, item[0], { left: 865, top: y - 4, width: 330, height: 30 }, { font: serif, size: 21, bold: true });
    text(s, item[1], { left: 865, top: y + 33, width: 330, height: 50 }, { size: 16, color: C.muted });
    if (i < features.length - 1) rule(s, 865, y + 94, 330, C.line, 1);
  });
  footer(s, 3);
  s.speakerNotes.text = "Screenshot captured from https://heritage-pearl.vercel.app/. Features are verified in frontend routes, backend services and automated tests.";
}

// 4. End-to-end flow
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  header(s, 4, "From an uploaded source to verified discovery", "Automation handles repetitive processing. Curators retain editorial control.");
  const items = [
    ["UPLOAD", "PDF or image"],
    ["VALIDATE", "File type and size"],
    ["PRESERVE", "Private object storage"],
    ["EXTRACT", "PyMuPDF or OCR"],
    ["REVIEW", "Correct text and metadata"],
    ["DISCOVER", "Search, map and citations"],
  ];
  const shapes = [];
  items.forEach((item, i) => {
    const x = 50 + i * 204;
    text(s, `0${i + 1}`, { left: x + 8, top: 233, width: 38, height: 22 }, { size: 11, bold: true, color: i === 4 ? C.saffron : C.cyan });
    shapes.push(node(s, item[0], item[1], { left: x, top: 272, width: 170, height: 105 }, {
      fill: i === 4 ? C.peach : C.panel2,
      line: i === 4 ? C.saffron : C.cyan,
      titleColor: i === 4 ? C.maroon : C.cyan2,
      titleSize: 16,
    }));
    if (i > 0) connect(s, shapes[i - 1], shapes[i]);
  });

  text(s, "PERSISTED PROCESSING STATES", { left: 56, top: 440, width: 330, height: 24 }, { size: 13, bold: true, color: C.saffron });
  ["uploaded", "processing", "extracted", "needs review", "approved", "failed"].forEach((state, i) => {
    chip(s, state.toUpperCase(), { left: 56 + i * 192, top: 490, width: 170, height: 38 }, {
      fill: i === 5 ? "#F4DDDD" : C.panel,
      line: i === 5 ? C.red : i === 4 ? C.green : C.line,
      color: i === 5 ? C.red : i === 4 ? C.green : C.ink,
    });
  });
  box(s, { left: 56, top: 570, width: 1155, height: 68 }, { fill: C.panel, line: { style: "solid", fill: C.line, width: 1 } });
  text(s, "Failure remains visible and recoverable", { left: 82, top: 584, width: 380, height: 30 }, { font: serif, size: 20, bold: true });
  text(s, "The backend records errors, preserves the original source and can resubmit interrupted background work after restart.", { left: 480, top: 582, width: 690, height: 34 }, { size: 16, color: C.muted });
  footer(s, 4);
  s.speakerNotes.text = "Workflow verified in backend document router, storage service and background processing service. Upload polling and curator review are implemented in the frontend UploadPage.";
}

// 5. Tech stack and architecture
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  header(s, 5, "Technical architecture and verified stack", "The repository uses one modular backend with clear boundaries for storage, processing and public discovery.");

  const client = node(s, "FRONTEND", "React 19 + Vite 8\nReact Router 7\nReact Leaflet 5\nFramer Motion + Axios\nHosted on Vercel", { left: 56, top: 225, width: 230, height: 215 }, { line: C.cyan, titleColor: C.cyan, fill: C.panel });
  const api = node(s, "BACKEND", "FastAPI + Uvicorn\nSQLAlchemy 2 + Pydantic 2\nCurator session auth\nREST API on Render", { left: 350, top: 225, width: 240, height: 215 }, { line: C.orange, titleColor: C.orange, fill: C.panel });
  const data = node(s, "DATA", "Supabase PostgreSQL\npsycopg2 driver\nAlembic migrations\nSQLite for local work", { left: 655, top: 225, width: 240, height: 215 }, { line: C.cyan, titleColor: C.cyan, fill: C.panel });
  const services = node(s, "DOCUMENT PIPELINE", "Private Supabase Storage\nPyMuPDF text extraction\nTesseract OCR + Pillow\nThreadPool background jobs", { left: 960, top: 225, width: 260, height: 215 }, { line: C.orange, titleColor: C.orange, fill: C.panel });
  connect(s, client, api);
  connect(s, api, data);
  connect(s, data, services);
  const retrieval = node(s, "SEARCH AND ASSISTANT", "PostgreSQL full-text search, archive retrieval, optional Omnirouter completion and a local grounded fallback", { left: 350, top: 515, width: 545, height: 92 }, { line: C.green, titleColor: C.green, titleSize: 16, fill: "#E6F2EC" });
  connect(s, data, retrieval, "bottom", "top");
  const secure = node(s, "SECURITY", "Service-role credentials stay on the backend. Public browsing remains read-only.", { left: 960, top: 515, width: 260, height: 92 }, { line: C.maroon, titleColor: C.maroon, titleSize: 15, fill: "#F4E7E8" });
  connect(s, services, secure, "bottom", "top");
  footer(s, 5);
  s.speakerNotes.text = "Stack verified from package manifests, Docker configuration, backend database and storage code, Alembic migrations, deployment configuration and frontend source.";
}

// 6. Feasibility and proof
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  header(s, 6, "Feasibility for a pilot archive", "The current system can support a controlled institutional pilot. Each feasibility claim has evidence and a defined next step.");

  text(s, "AREA", { left: 56, top: 220, width: 170, height: 24 }, { size: 12, bold: true, color: C.maroon });
  text(s, "EVIDENCE IN THE CURRENT BUILD", { left: 245, top: 220, width: 500, height: 24 }, { size: 12, bold: true, color: C.maroon });
  text(s, "NEXT STEP FOR PRODUCTION", { left: 805, top: 220, width: 390, height: 24 }, { size: 12, bold: true, color: C.maroon });
  rule(s, 56, 252, 1155, C.maroon, 1.5);

  const feasibility = [
    ["Technical", "Deployed React and FastAPI application with PostgreSQL, private storage, OCR and automated migrations", "Run live storage and migration checks after every production deployment"],
    ["Operational", "Curator authentication, review states, audit events and recoverable processing failures", "Replace the shared prototype login with individual curator accounts"],
    ["Cost", "Managed Vercel, Render and Supabase services keep the pilot infrastructure small", "Measure storage, OCR time and database usage with real institutional collections"],
    ["Growth", "The modular monolith separates API, storage, processing, search and presentation concerns", "Move OCR jobs to a managed queue when upload volume exceeds one worker"],
  ];
  feasibility.forEach((item, i) => {
    const y = 272 + i * 84;
    text(s, `0${i + 1}`, { left: 56, top: y + 4, width: 34, height: 22 }, { size: 11, bold: true, color: C.saffron });
    text(s, item[0], { left: 98, top: y, width: 128, height: 30 }, { font: serif, size: 20, bold: true, color: C.ink });
    text(s, item[1], { left: 245, top: y, width: 500, height: 58 }, { size: 15, color: C.ink });
    text(s, item[2], { left: 805, top: y, width: 390, height: 58 }, { size: 15, color: C.muted });
    if (i < feasibility.length - 1) rule(s, 56, y + 70, 1155, C.line, 1);
  });

  box(s, { left: 56, top: 616, width: 1155, height: 54 }, { fill: "#E4EEE9", line: { style: "solid", fill: C.green, width: 1.2 } });
  text(s, "Pilot conclusion", { left: 78, top: 628, width: 160, height: 28 }, { font: serif, size: 19, bold: true, color: C.green });
  text(s, "Ready for a controlled pilot. A broader rollout still needs individual curator roles, production monitoring and a managed job queue.", { left: 245, top: 626, width: 930, height: 30 }, { size: 16, color: C.ink });
  footer(s, 6);
  s.speakerNotes.text = "Feasibility is framed for a controlled pilot rather than a full institutional rollout. The architecture and repository support each current-build claim. Live Supabase storage and production migrations still require deployment verification. Cost claims are qualitative because production usage data is not available.";
}

// 7. Impact and roadmap
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  await image(s, A.rani, { left: 0, top: 0, width: 1280, height: 720 }, { alt: "Rani ki Vav sculpture" });
  box(s, { left: 0, top: 0, width: 1280, height: 720 }, { geometry: "rect", fill: "#F7F1E5/88", line: { style: "solid", fill: "none", width: 0 }, radius: 0 });
  header(s, 7, "Impact now, stronger retrieval next", "The current product solves preservation and discovery first. Phase 2 can improve multilingual retrieval after production verification.");

  const users = [
    ["Researchers", "Find evidence across sites and digitized records"],
    ["Archivists", "Preserve originals and approve corrected text"],
    ["Institutions", "Publish structured collections with traceable sources"],
    ["Visitors", "Explore monuments through maps and accessible narratives"],
  ];
  users.forEach((item, i) => {
    const x = 56 + i * 292;
    box(s, { left: x, top: 238, width: 262, height: 126 }, { fill: "#FFFDF8/92", line: { style: "solid", fill: C.line, width: 1 } });
    text(s, item[0], { left: x + 18, top: 258, width: 226, height: 30 }, { font: serif, size: 20, bold: true, color: C.maroon });
    text(s, item[1], { left: x + 18, top: 302, width: 226, height: 48 }, { size: 15, color: C.ink });
  });

  text(s, "NEXT", { left: 56, top: 430, width: 80, height: 24 }, { size: 13, bold: true, color: C.cyan });
  const roadmap = [
    ["Production verification", "Apply migrations, configure private storage and test live upload"],
    ["Multilingual retrieval", "Add embeddings and hybrid ranking for regional-language archives"],
    ["Evaluation", "Measure retrieval quality and citation faithfulness"],
  ];
  roadmap.forEach((item, i) => {
    const x = 56 + i * 380;
    text(s, `0${i + 1}`, { left: x, top: 478, width: 42, height: 24 }, { size: 12, bold: true, color: C.cyan });
    text(s, item[0], { left: x, top: 510, width: 335, height: 30 }, { font: serif, size: 21, bold: true });
    text(s, item[1], { left: x, top: 551, width: 335, height: 58 }, { size: 16, color: C.muted });
  });
  rule(s, 56, 638, 1155, C.cyan, 1.5);
  text(s, "HeritageLens makes cultural evidence searchable without losing the path back to its source.", { left: 128, top: 650, width: 1020, height: 34 }, { font: serif, size: 22, bold: true, align: "center" });
  footer(s, 7);
  s.speakerNotes.text = "The roadmap clearly separates implemented functionality from future work. Phase 2 multilingual semantic retrieval has not been implemented.";
}

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
for (const [index, slide] of deck.slides.items.entries()) {
  const rendered = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(buildDir, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await rendered.arrayBuffer()));
}
const montage = await deck.export({ format: "webp", montage: true });
await fs.writeFile(path.join(buildDir, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));

const stagingDir = path.join(buildDir, "finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  explicitTotalSlideCount: 7,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath: finalPptx,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: [serif, sans] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "HeritageLens-Light-Hackathon-Pitch.validation.json"),
});
console.log(finalPptx);
