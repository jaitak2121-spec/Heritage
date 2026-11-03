import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/jaitak/Documents/IIT-Hackathon";
const buildDir = path.join(workspaceDir, "presentation/.codex-presentation-build");
const outputDir = path.join(workspaceDir, "presentation/output");
const skillDir = "/Users/jaitak/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations";
const runtimePython = "/Users/jaitak/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const finalPptx = path.join(outputDir, "HeritageLens-HackCult26-Canva-Import.pptx");

const C = {
  forest: "#0B1F1A",
  forest2: "#123128",
  charcoal: "#141917",
  black: "#080C0B",
  gold: "#C7A15A",
  paleGold: "#E1C58D",
  ivory: "#F4EAD5",
  ivory2: "#E5D7BA",
  sand: "#B99B70",
  rust: "#9B4E35",
  moss: "#6D806B",
  muted: "#A99F8D",
  line: "#C7A15A/35",
  red: "#B85D4A",
};

const serif = "Georgia";
const sans = "Gill Sans";

const assets = {
  home: path.join(workspaceDir, "frontend/presentation/assets/home-live.png"),
  archive: path.join(workspaceDir, "frontend/presentation/assets/archive-live.png"),
  map: path.join(workspaceDir, "frontend/presentation/assets/map-live.png"),
  assistant: path.join(workspaceDir, "frontend/presentation/assets/assistant-live.png"),
  konark: path.join(workspaceDir, "frontend/public/images/sites/konark-sun-temple.jpg"),
  konarkWheel: path.join(workspaceDir, "frontend/public/images/sites/gallery/konark-wheel-detail.jpg"),
  ajanta: path.join(workspaceDir, "frontend/public/images/sites/gallery/ajanta-mural.jpg"),
  ellora: path.join(workspaceDir, "frontend/public/images/sites/gallery/ellora-courtyard.jpg"),
  hampi: path.join(workspaceDir, "frontend/public/images/sites/gallery/hampi-stone-chariot.jpg"),
  rani: path.join(workspaceDir, "frontend/public/images/sites/gallery/rani-ki-vav-stepwell.jpg"),
};

async function bytes(filePath) {
  const data = await fs.readFile(filePath);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

function addText(slide, text, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: options.name,
    position,
    fill: options.fill ?? "none",
    line: options.line ?? { style: "solid", fill: "none", width: 0 },
    borderRadius: options.borderRadius,
  });
  shape.text = text;
  shape.text.style = {
    typeface: options.fontFamily ?? sans,
    fontSize: options.fontSize ?? 20,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? C.ivory,
    alignment: options.alignment ?? "left",
    verticalAlignment: options.verticalAlignment ?? "middle",
  };
  shape.text.insets = options.insets ?? 0;
  return shape;
}

function addBox(slide, position, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "roundRect",
    name: options.name,
    position,
    fill: options.fill ?? C.forest2,
    line: options.line ?? { style: "solid", fill: C.line, width: 1 },
    borderRadius: options.borderRadius ?? 14,
    shadow: options.shadow,
  });
}

async function addImage(slide, filePath, position, options = {}) {
  return slide.images.add({
    blob: await bytes(filePath),
    contentType: "image/png",
    alt: options.alt ?? path.basename(filePath),
    fit: options.fit ?? "cover",
    position,
    geometry: options.geometry ?? "rect",
    borderRadius: options.borderRadius,
  });
}

function addRule(slide, left, top, width, color = C.gold, weight = 2) {
  return slide.shapes.add({
    geometry: "line",
    position: { left, top, width, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width: weight },
  });
}

function addLabel(slide, text, left, top, width = 210) {
  addText(slide, text.toUpperCase(), { left, top, width, height: 28 }, {
    fontSize: 13, bold: true, color: C.gold,
  });
}

function addSlideTitle(slide, number, title, subtitle) {
  addText(slide, String(number).padStart(2, "0"), { left: 58, top: 42, width: 55, height: 28 }, {
    fontSize: 15, bold: true, color: C.gold,
  });
  addRule(slide, 112, 56, 82, C.gold, 1.5);
  addText(slide, title, { left: 58, top: 82, width: 780, height: 62 }, {
    fontFamily: serif, fontSize: 36, bold: true, color: C.ivory,
  });
  if (subtitle) {
    addText(slide, subtitle, { left: 58, top: 145, width: 920, height: 44 }, {
      fontSize: 18, color: C.ivory2,
    });
  }
}

function addFooter(slide, number) {
  addText(slide, "HERITAGELENS  /  HACKCULT '26", { left: 58, top: 685, width: 320, height: 18 }, {
    fontSize: 10, bold: true, color: C.muted,
  });
  addText(slide, String(number).padStart(2, "0"), { left: 1180, top: 682, width: 42, height: 20 }, {
    fontSize: 11, bold: true, color: C.gold, alignment: "right",
  });
}

function addConnector(slide, from, to, fromSide = "right", toSide = "left") {
  return slide.shapes.connect(from, to, {
    kind: "elbow",
    fromSide,
    toSide,
    line: { style: "solid", fill: C.gold, width: 2 },
    tail: { type: "arrow", width: "med", length: "med" },
  });
}

function addDiagramNode(slide, title, detail, position, options = {}) {
  const box = addBox(slide, position, {
    fill: options.fill ?? C.forest2,
    line: { style: "solid", fill: options.line ?? C.line, width: options.width ?? 1.2 },
    borderRadius: options.radius ?? 14,
  });
  addText(slide, title, {
    left: position.left + 16, top: position.top + 10,
    width: position.width - 32, height: detail ? 28 : position.height - 20,
  }, {
    fontFamily: options.serif ? serif : sans,
    fontSize: options.titleSize ?? 17,
    bold: true,
    color: options.titleColor ?? C.ivory,
    alignment: options.align ?? "left",
  });
  if (detail) {
    addText(slide, detail, {
      left: position.left + 16, top: position.top + 42,
      width: position.width - 32, height: position.height - 52,
    }, {
      fontSize: options.detailSize ?? 13,
      color: options.detailColor ?? C.ivory2,
      alignment: options.align ?? "left",
    });
  }
  return box;
}

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
presentation.theme.defaultFont = sans;

// 1 — Cover
{
  const s = presentation.slides.add();
  s.background.fill = C.black;
  await addImage(s, assets.konark, { left: 0, top: 0, width: 1280, height: 720 }, { alt: "Konark Sun Temple" });
  addBox(s, { left: 0, top: 0, width: 1280, height: 720 }, {
    geometry: "rect", fill: "#07100D/68", line: { style: "solid", fill: "none", width: 0 }, borderRadius: 0,
  });
  addBox(s, { left: 54, top: 48, width: 1172, height: 624 }, {
    geometry: "rect", fill: "none", line: { style: "solid", fill: C.gold, width: 1 }, borderRadius: 0,
  });
  addLabel(s, "HackCult '26 · PS2", 88, 76, 300);
  addText(s, "HeritageLens", { left: 84, top: 190, width: 850, height: 100 }, {
    fontFamily: serif, fontSize: 72, bold: true, color: C.ivory,
  });
  addRule(s, 88, 311, 124, C.gold, 3);
  addText(s, "Rediscovering India's architectural memory through AI", { left: 84, top: 335, width: 690, height: 78 }, {
    fontFamily: serif, fontSize: 30, color: C.paleGold,
  });
  addText(s, "Digital revitalisation of unstructured cultural and architectural heritage archives", { left: 86, top: 452, width: 610, height: 64 }, {
    fontSize: 18, color: C.ivory2,
  });
  addText(s, "TEAM HERITAGELENS  ·  IIT GANDHINAGAR", { left: 86, top: 604, width: 520, height: 28 }, {
    fontSize: 13, bold: true, color: C.ivory,
  });
  s.speakerNotes.text = "Project brief: HackCult '26 Problem Statement 2. Cover image: Konark Sun Temple asset from the HeritageLens licensed image library. Photography attribution is recorded in frontend/public/images/sites/ATTRIBUTION.md.";
}

// 2 — Problem
{
  const s = presentation.slides.add();
  s.background.fill = C.charcoal;
  addSlideTitle(s, 2, "Heritage knowledge lives in disconnected formats", "Photographs, PDFs, field journals and regional-language scans cannot be searched as one archive.");

  const fragments = [
    { x: 58, w: 250, image: assets.ajanta, label: "PHOTOGRAPHS", note: "Visual evidence without structured context" },
    { x: 332, w: 250, image: assets.konarkWheel, label: "FIELD NOTES", note: "Observations trapped in isolated records" },
    { x: 606, w: 250, image: assets.ellora, label: "SCANNED DOCUMENTS", note: "Text remains invisible to search" },
  ];
  for (const item of fragments) {
    await addImage(s, item.image, { left: item.x, top: 225, width: item.w, height: 220 }, { alt: item.label, borderRadius: 12 });
    addBox(s, { left: item.x, top: 404, width: item.w, height: 42 }, {
      geometry: "rect", fill: "#07100D/78", line: { style: "solid", fill: "none", width: 0 }, borderRadius: 0,
    });
    addText(s, item.label, { left: item.x + 14, top: 410, width: item.w - 28, height: 24 }, {
      fontSize: 12, bold: true, color: C.gold,
    });
    addText(s, item.note, { left: item.x, top: 463, width: item.w, height: 54 }, {
      fontSize: 16, color: C.ivory2,
    });
  }
  addBox(s, { left: 900, top: 225, width: 320, height: 292 }, { fill: C.forest, line: { style: "solid", fill: C.gold, width: 1.4 } });
  addLabel(s, "The consequence", 928, 251, 240);
  addText(s, "Discovery slows down.\nContext breaks.\nFragile sources stay hidden.", { left: 928, top: 304, width: 250, height: 150 }, {
    fontFamily: serif, fontSize: 27, bold: true, color: C.ivory,
  });
  addText(s, "Researchers cannot trace evidence across collections without manually reopening every source.", { left: 58, top: 578, width: 850, height: 42 }, {
    fontSize: 20, color: C.paleGold,
  });
  addFooter(s, 2);
  s.speakerNotes.text = "Problem framing supplied by the user and reflected in the HeritageLens project README. Images come from the project image library and its recorded attributions.";
}

// 3 — Solution
{
  const s = presentation.slides.add();
  s.background.fill = C.forest;
  addSlideTitle(s, 3, "One archive connects source files to cultural context", "HeritageLens turns unstructured evidence into records people can browse, search and verify.");

  const ingest = addDiagramNode(s, "INGEST", "Upload a PDF, photograph or manuscript scan", { left: 82, top: 272, width: 270, height: 150 }, { line: C.gold, titleColor: C.gold });
  const structure = addDiagramNode(s, "STRUCTURE", "Extract text, capture metadata and preserve the original", { left: 505, top: 272, width: 270, height: 150 }, { line: C.gold, titleColor: C.gold });
  const discover = addDiagramNode(s, "DISCOVER", "Explore sites, documents, maps and grounded answers", { left: 928, top: 272, width: 270, height: 150 }, { line: C.gold, titleColor: C.gold });
  addConnector(s, ingest, structure);
  addConnector(s, structure, discover);

  addText(s, "01", { left: 96, top: 222, width: 50, height: 28 }, { fontSize: 16, bold: true, color: C.paleGold });
  addText(s, "02", { left: 519, top: 222, width: 50, height: 28 }, { fontSize: 16, bold: true, color: C.paleGold });
  addText(s, "03", { left: 942, top: 222, width: 50, height: 28 }, { fontSize: 16, bold: true, color: C.paleGold });

  addBox(s, { left: 82, top: 493, width: 1116, height: 102 }, { fill: "#091713/65", line: { style: "solid", fill: C.line, width: 1 } });
  addText(s, "Public archive", { left: 108, top: 511, width: 210, height: 26 }, { fontFamily: serif, fontSize: 20, bold: true, color: C.ivory });
  addText(s, "Browsing, filters, map and document search remain open to everyone.", { left: 108, top: 543, width: 425, height: 30 }, { fontSize: 15, color: C.ivory2 });
  addRule(s, 615, 511, 0, C.gold, 1);
  addText(s, "Curator workspace", { left: 670, top: 511, width: 230, height: 26 }, { fontFamily: serif, fontSize: 20, bold: true, color: C.ivory });
  addText(s, "Authenticated upload, review, correction and archive maintenance.", { left: 670, top: 543, width: 440, height: 30 }, { fontSize: 15, color: C.ivory2 });
  addFooter(s, 3);
  s.speakerNotes.text = "Verified in frontend routes, backend routers and browser acceptance tests. Public reads remain open; modifying APIs require curator authentication.";
}

// 4 — Product
{
  const s = presentation.slides.add();
  s.background.fill = C.charcoal;
  addSlideTitle(s, 4, "The working product", "Live screens from heritage-pearl.vercel.app. No mock interface is presented as real.");

  await addImage(s, assets.home, { left: 58, top: 210, width: 548, height: 343 }, { alt: "Live HeritageLens home screen", borderRadius: 12 });
  await addImage(s, assets.archive, { left: 635, top: 210, width: 287, height: 180 }, { alt: "Live archive browser", borderRadius: 12 });
  await addImage(s, assets.map, { left: 948, top: 210, width: 274, height: 180 }, { alt: "Live heritage map", borderRadius: 12 });
  addText(s, "IMMERSIVE ENTRY", { left: 58, top: 570, width: 220, height: 24 }, { fontSize: 12, bold: true, color: C.gold });
  addText(s, "Search and visual discovery", { left: 58, top: 597, width: 300, height: 30 }, { fontFamily: serif, fontSize: 21, bold: true });
  addText(s, "SEARCHABLE ARCHIVE", { left: 635, top: 414, width: 240, height: 24 }, { fontSize: 12, bold: true, color: C.gold });
  addText(s, "11 seeded heritage records with filters and document search", { left: 635, top: 442, width: 276, height: 68 }, { fontSize: 15, color: C.ivory2 });
  addText(s, "GEOSPATIAL EXPLORER", { left: 948, top: 414, width: 240, height: 24 }, { fontSize: 12, bold: true, color: C.gold });
  addText(s, "Interactive markers connect monuments to archival detail", { left: 948, top: 442, width: 264, height: 68 }, { fontSize: 15, color: C.ivory2 });
  addBox(s, { left: 635, top: 536, width: 577, height: 86 }, { fill: C.forest, line: { style: "solid", fill: C.line, width: 1 } });
  addText(s, "Also implemented", { left: 658, top: 550, width: 180, height: 24 }, { fontFamily: serif, fontSize: 18, bold: true, color: C.ivory });
  addText(s, "Curator login · OCR upload · review workflow · grounded archive assistant", { left: 658, top: 580, width: 520, height: 24 }, { fontSize: 15, color: C.paleGold });
  addFooter(s, 4);
  s.speakerNotes.text = "Screenshots captured from https://heritage-pearl.vercel.app/, /archive and /map on 2 November 2026. OCR and curator workflows are verified through automated tests but are not represented with a fabricated production screenshot.";
}

// 5 — System architecture
{
  const s = presentation.slides.add();
  s.background.fill = C.forest;
  addSlideTitle(s, 5, "System architecture", "A modular monolith keeps the hackathon build coherent while preserving clean service boundaries.");

  const browser = addDiagramNode(s, "React + Vite SPA", "Vercel\nPublic archive and curator UI", { left: 58, top: 265, width: 205, height: 125 }, { line: C.gold, titleColor: C.gold });
  const api = addDiagramNode(s, "FastAPI application", "Render\nREST routers and service layer", { left: 350, top: 245, width: 260, height: 165 }, { fill: "#193D32", line: C.paleGold, titleSize: 19 });
  const database = addDiagramNode(s, "Supabase PostgreSQL", "Sites, documents, images, workflow state and audit events", { left: 735, top: 205, width: 245, height: 105 }, { line: C.gold });
  const storage = addDiagramNode(s, "Private Supabase Storage", "Original documents and short-lived signed downloads", { left: 735, top: 350, width: 245, height: 105 }, { line: C.gold });
  const ocr = addDiagramNode(s, "Processing executor", "PyMuPDF for PDFs\nTesseract for scanned images", { left: 1035, top: 205, width: 190, height: 105 }, { line: C.line });
  const search = addDiagramNode(s, "Search and retrieval", "PostgreSQL full-text search\nSQLite fallback locally", { left: 1035, top: 350, width: 190, height: 105 }, { line: C.line });
  const ai = addDiagramNode(s, "AI answer layer", "Omnirouter provider\nGrounded archive fallback", { left: 735, top: 510, width: 245, height: 95 }, { line: C.line });

  addConnector(s, browser, api);
  addConnector(s, api, database);
  addConnector(s, api, storage);
  addConnector(s, database, ocr);
  addConnector(s, database, search);
  addConnector(s, search, ai, "bottom", "top");
  addConnector(s, ai, api, "left", "bottom");

  addText(s, "HTTPS / JSON", { left: 270, top: 292, width: 88, height: 22 }, { fontSize: 10, bold: true, color: C.paleGold, alignment: "center" });
  addText(s, "SQLAlchemy + Alembic", { left: 623, top: 214, width: 108, height: 34 }, { fontSize: 10, bold: true, color: C.paleGold, alignment: "center" });
  addText(s, "Server-side service role only", { left: 622, top: 420, width: 112, height: 34 }, { fontSize: 10, bold: true, color: C.paleGold, alignment: "center" });
  addFooter(s, 5);
  s.speakerNotes.text = "Architecture verified from docker-compose.yml, frontend API service, backend FastAPI routers, SQLAlchemy models, Alembic migrations, Supabase storage service, document processing service and assistant service. Deployment targets: Vercel frontend and Render backend.";
}

// 6 — Data architecture
{
  const s = presentation.slides.add();
  s.background.fill = C.charcoal;
  addSlideTitle(s, 6, "Data and archival architecture", "The schema preserves cultural context, original evidence and the complete processing lifecycle.");

  const site = addDiagramNode(s, "HERITAGE SITE", "id · name · description\nperiod · style · region\nlocation · coordinates\nsignificance · sources", { left: 70, top: 235, width: 280, height: 235 }, { fill: C.forest, line: C.gold, titleColor: C.gold, titleSize: 20 });
  const document = addDiagramNode(s, "ARCHIVAL DOCUMENT", "id · site_id · title · type\nstorage provider · object key\nextracted and corrected text\nprocessing and review state\nOCR method · pages · timestamps", { left: 500, top: 210, width: 330, height: 285 }, { fill: "#193D32", line: C.paleGold, titleColor: C.gold, titleSize: 20 });
  const image = addDiagramNode(s, "SITE IMAGE", "id · site_id\nimage URL · caption", { left: 500, top: 535, width: 250, height: 100 }, { fill: C.forest, line: C.line, titleColor: C.paleGold });
  const audit = addDiagramNode(s, "AUDIT EVENT", "actor · action · outcome\nresource · timestamp · details", { left: 955, top: 270, width: 260, height: 150 }, { fill: C.forest, line: C.line, titleColor: C.paleGold });

  addConnector(s, site, document);
  addConnector(s, site, image, "right", "left");
  addConnector(s, document, audit);
  addText(s, "1", { left: 365, top: 316, width: 28, height: 22 }, { fontSize: 14, bold: true, color: C.gold });
  addText(s, "many", { left: 445, top: 316, width: 45, height: 22 }, { fontSize: 12, bold: true, color: C.gold });
  addText(s, "1", { left: 355, top: 505, width: 28, height: 22 }, { fontSize: 14, bold: true, color: C.gold });
  addText(s, "many", { left: 448, top: 553, width: 45, height: 22 }, { fontSize: 12, bold: true, color: C.gold });
  addBox(s, { left: 955, top: 458, width: 260, height: 116 }, { fill: "#241A16", line: { style: "solid", fill: C.gold, width: 1 } });
  addText(s, "Deletion safety", { left: 976, top: 473, width: 190, height: 25 }, { fontFamily: serif, fontSize: 18, bold: true, color: C.ivory });
  addText(s, "Site relationships cascade intentionally. Storage cleanup occurs through the application service.", { left: 976, top: 505, width: 210, height: 54 }, { fontSize: 14, color: C.ivory2 });
  addFooter(s, 6);
  s.speakerNotes.text = "Entity fields and relationships verified in backend/app/models/heritage_site.py, archival_document.py, site_image.py and audit_event.py. PostgreSQL search indexes are managed by Alembic migration 0004.";
}

// 7 — Document digitization
{
  const s = presentation.slides.add();
  s.background.fill = C.forest;
  addSlideTitle(s, 7, "Document digitization workflow", "Automation handles extraction. A curator controls what enters the searchable archive.");

  addText(s, "AUTOMATED", { left: 64, top: 218, width: 150, height: 24 }, { fontSize: 12, bold: true, color: C.gold });
  addRule(s, 162, 231, 740, C.line, 1);
  const steps = [
    ["01", "Upload", "PDF or image"],
    ["02", "Validate", "Type and size"],
    ["03", "Store", "Private object key"],
    ["04", "Extract", "PyMuPDF or OCR"],
  ];
  const nodes = [];
  for (let i = 0; i < steps.length; i += 1) {
    const [num, title, detail] = steps[i];
    const x = 65 + i * 225;
    addText(s, num, { left: x, top: 268, width: 42, height: 24 }, { fontSize: 12, bold: true, color: C.gold });
    const node = addDiagramNode(s, title, detail, { left: x, top: 300, width: 180, height: 100 }, { line: C.line, titleSize: 18 });
    nodes.push(node);
    if (i > 0) addConnector(s, nodes[i - 1], node);
  }
  addText(s, "HUMAN REVIEW", { left: 965, top: 218, width: 180, height: 24 }, { fontSize: 12, bold: true, color: C.paleGold });
  const review = addDiagramNode(s, "Review and correct", "Curator verifies text and metadata", { left: 965, top: 300, width: 250, height: 100 }, { fill: "#34251B", line: C.gold, titleColor: C.paleGold, titleSize: 18 });
  addConnector(s, nodes[3], review);
  const archive = addDiagramNode(s, "Searchable archive", "Approved text becomes discoverable", { left: 965, top: 475, width: 250, height: 100 }, { fill: C.ivory, line: C.gold, titleColor: C.forest, detailColor: C.forest, titleSize: 18 });
  addConnector(s, review, archive, "bottom", "top");

  addText(s, "PERSISTED STATES", { left: 65, top: 475, width: 180, height: 22 }, { fontSize: 12, bold: true, color: C.gold });
  const states = ["uploaded", "processing", "extracted", "needs review", "approved", "failed"];
  for (let i = 0; i < states.length; i += 1) {
    addBox(s, { left: 65 + (i % 3) * 190, top: 515 + Math.floor(i / 3) * 54, width: 168, height: 38 }, {
      fill: i === 5 ? "#4A241F" : "#102922", line: { style: "solid", fill: i === 5 ? C.red : C.line, width: 1 }, borderRadius: 18,
    });
    addText(s, states[i].toUpperCase(), { left: 76 + (i % 3) * 190, top: 520 + Math.floor(i / 3) * 54, width: 146, height: 26 }, {
      fontSize: 11, bold: true, color: i === 5 ? "#F2B5A7" : C.ivory, alignment: "center",
    });
  }
  addFooter(s, 7);
  s.speakerNotes.text = "Workflow verified in backend/app/routers/documents.py, services/storage.py, services/document_processing.py and the UploadPage review interface. Background processing persists state before extraction and recovers pending work at startup.";
}

// 8 — Search and AI
{
  const s = presentation.slides.add();
  s.background.fill = C.charcoal;
  addSlideTitle(s, 8, "Search and source-grounded answers", "Search reaches both site metadata and curator-corrected document text.");

  addBox(s, { left: 58, top: 215, width: 710, height: 392 }, { fill: C.forest, line: { style: "solid", fill: C.line, width: 1 } });
  addLabel(s, "Implemented", 86, 240, 180);
  const q = addDiagramNode(s, "User question", "Natural language or archive query", { left: 88, top: 310, width: 160, height: 92 }, { line: C.line, titleSize: 16 });
  const idx = addDiagramNode(s, "Indexed archive", "Site fields plus extracted and corrected text", { left: 310, top: 300, width: 190, height: 112 }, { line: C.gold, titleColor: C.gold, titleSize: 16 });
  const answer = addDiagramNode(s, "Evidence first", "Matching records, citations and grounded synthesis", { left: 560, top: 300, width: 170, height: 112 }, { line: C.line, titleSize: 16 });
  addConnector(s, q, idx);
  addConnector(s, idx, answer);
  addText(s, "PostgreSQL full-text search in production\nPortable substring fallback for SQLite development", { left: 88, top: 468, width: 400, height: 62 }, { fontSize: 16, color: C.ivory2 });
  addText(s, "Omnirouter when configured\nGrounded archive fallback when unavailable", { left: 510, top: 468, width: 220, height: 62 }, { fontSize: 16, color: C.paleGold });

  addBox(s, { left: 805, top: 215, width: 417, height: 392 }, { fill: "#221B17", line: { style: "solid", fill: C.gold, width: 1 } });
  addLabel(s, "Phase 2 roadmap", 833, 240, 220);
  addText(s, "Multilingual semantic retrieval", { left: 833, top: 310, width: 330, height: 35 }, { fontFamily: serif, fontSize: 23, bold: true });
  addText(s, "Embeddings and hybrid ranking across regional-language archives.", { left: 833, top: 353, width: 330, height: 55 }, { fontSize: 16, color: C.ivory2 });
  addRule(s, 833, 433, 330, C.line, 1);
  addText(s, "RAG evaluation", { left: 833, top: 458, width: 270, height: 30 }, { fontFamily: serif, fontSize: 21, bold: true });
  addText(s, "Measure retrieval quality and citation faithfulness before expanding the corpus.", { left: 833, top: 497, width: 330, height: 62 }, { fontSize: 16, color: C.ivory2 });
  addFooter(s, 8);
  s.speakerNotes.text = "Current search implementation verified in backend/app/routers/search.py and Alembic migration 0004. Assistant provider and grounded fallback verified in backend/app/services/assistant.py. Embeddings, hybrid semantic retrieval and formal RAG evaluation are planned, not implemented.";
}

// 9 — Engineering and scalability
{
  const s = presentation.slides.add();
  s.background.fill = C.forest;
  addSlideTitle(s, 9, "Engineering choices that support growth", "The current architecture favors tested boundaries and reversible deployment decisions.");

  const rows = [
    ["40%", "TECHNICAL EXECUTION", "Protected write APIs, explicit processing states, audit trail, migration-managed schema"],
    ["30%", "ARCHITECTURE", "Modular monolith, durable object storage, PostgreSQL indexes, configurable providers"],
    ["20%", "UI / UX", "Public discovery, curator review flow, direct-route support, meaningful failure states"],
    ["10%", "PROBLEM FIT", "OCR, correction and source-grounded retrieval for unstructured heritage archives"],
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const [weight, label, detail] = rows[i];
    const y = 220 + i * 100;
    addText(s, weight, { left: 64, top: y, width: 90, height: 52 }, { fontFamily: serif, fontSize: 31, bold: true, color: C.gold });
    addText(s, label, { left: 170, top: y + 2, width: 245, height: 24 }, { fontSize: 13, bold: true, color: C.paleGold });
    addText(s, detail, { left: 170, top: y + 30, width: 820, height: 46 }, { fontSize: 17, color: C.ivory });
    addBox(s, { left: 1015, top: y + 18, width: Number.parseInt(weight, 10) * 4.5, height: 14 }, {
      geometry: "rect", fill: i === 0 ? C.gold : C.paleGold, line: { style: "solid", fill: "none", width: 0 }, borderRadius: 7,
    });
    if (i < rows.length - 1) addRule(s, 170, y + 88, 1045, C.line, 1);
  }
  addBox(s, { left: 64, top: 628, width: 1150, height: 38 }, { fill: "#081713/70", line: { style: "solid", fill: C.line, width: 1 }, borderRadius: 18 });
  addText(s, "VERIFIED: 39 backend tests · 3 browser acceptance workflows · frontend lint and production build", { left: 84, top: 634, width: 1110, height: 24 }, { fontSize: 13, bold: true, color: C.ivory, alignment: "center" });
  addFooter(s, 9);
  s.speakerNotes.text = "Evaluation weights supplied by the user. Verified repository capabilities include Alembic migrations 0001–0005, Supabase/local storage provider, curator HMAC sessions, rate limiting, audit events, PostgreSQL search indexes, background document processing and GitHub Actions CI. Local results: 39 backend tests and 3 Playwright workflows passed.";
}

// 10 — Impact and vision
{
  const s = presentation.slides.add();
  s.background.fill = C.black;
  await addImage(s, assets.rani, { left: 0, top: 0, width: 1280, height: 720 }, { alt: "Rani ki Vav stepwell" });
  addBox(s, { left: 0, top: 0, width: 1280, height: 720 }, { geometry: "rect", fill: "#07110E/76", line: { style: "solid", fill: "none", width: 0 }, borderRadius: 0 });
  addSlideTitle(s, 10, "A living digital record of India's architectural memory", "HeritageLens gives every source a durable place, searchable context and a path back to evidence.");

  const audiences = [
    ["Researchers", "Find connected evidence across sites and documents"],
    ["Archivists", "Preserve originals while correcting machine-extracted text"],
    ["Institutions", "Publish structured collections through a maintainable system"],
    ["Heritage tourism", "Explore monuments through maps and accessible narratives"],
  ];
  for (let i = 0; i < audiences.length; i += 1) {
    const x = 58 + i * 297;
    addBox(s, { left: x, top: 260, width: 268, height: 140 }, { fill: "#0A1814/78", line: { style: "solid", fill: C.line, width: 1 }, borderRadius: 12 });
    addText(s, audiences[i][0], { left: x + 20, top: 282, width: 228, height: 32 }, { fontFamily: serif, fontSize: 21, bold: true, color: C.paleGold });
    addText(s, audiences[i][1], { left: x + 20, top: 326, width: 228, height: 54 }, { fontSize: 15, color: C.ivory });
  }
  addRule(s, 58, 455, 1164, C.gold, 1.5);
  addText(s, "Technology should help cultural memory remain discoverable, verifiable and alive.", { left: 105, top: 492, width: 1070, height: 88 }, { fontFamily: serif, fontSize: 34, bold: true, color: C.ivory, alignment: "center" });
  addText(s, "TEAM HERITAGELENS  ·  HACKCULT '26  ·  IIT GANDHINAGAR", { left: 290, top: 624, width: 700, height: 28 }, { fontSize: 13, bold: true, color: C.gold, alignment: "center" });
  addFooter(s, 10);
  s.speakerNotes.text = "Impact groups and vision are based on the project brief. No adoption, accuracy or performance numbers are claimed. Image comes from the HeritageLens licensed image library; attribution is recorded in frontend/public/images/sites/ATTRIBUTION.md.";
}

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

for (const [index, slide] of presentation.slides.items.entries()) {
  const png = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(buildDir, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
}

const montage = await presentation.export({ format: "webp", montage: true });
await fs.writeFile(path.join(buildDir, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));

const { finalizePresentation } = await import(pathToFileURL(
  path.join(skillDir, "container_tools/artifact_tool_utils.mjs"),
).href);
const stagingDir = path.join(buildDir, "finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 10,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
};

await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: finalPptx,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: [serif, sans] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "HeritageLens.validation.json"),
});

console.log(finalPptx);
