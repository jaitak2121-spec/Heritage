# HeritageLens 🏛️📜

**HeritageLens** is an AI-powered digital cultural heritage archive dedicated to Indian architectural and historical monuments. It transforms scattered archival photographs, historical documents, regional inscriptions, epigraphical observations, and architectural surveys into an interactive, searchable digital archive.

---

## 🌟 Key Features

- **🏛️ Indian Heritage Archive Explorer**: Search and filter 11+ verified Indian heritage monuments across North, South, East, West, and Central India with architectural period and style categorizations.
- **🗺️ Interactive Heritage Map**: Explore heritage sites geographically with interactive Leaflet markers, custom tooltips, and direct navigation to detailed monument monographs.
- **📄 Document Digitization & OCR Pipeline**:
  - Extract selectable text from historical PDFs using **PyMuPDF**.
  - Digitize scanned manuscripts and inscriptions using **Tesseract OCR**.
  - Edit and save user-corrected transcriptions directly to the archive.
  - Full-text search across both monument metadata and digitized document contents.
- **🤖 Grounded AI Cultural Heritage Assistant**:
  - Semantic and keyword-based SQLite evidence retrieval.
  - Grounded answer generation using **Omnirouter** (Google Gemini models).
  - Built-in zero-failure fallback synthesizer that answers questions directly from retrieved archival records when API keys are absent or providers are offline.
  - Direct citations and clickable pill links to referenced heritage site and document records.
- **🎨 Museum-Grade Design Language**:
  - Inspired by the **Konark Sun Temple wheel** and **Ancient Indian palm-leaf manuscripts**.
  - Warm parchment textures (`#F2E7D2`), deep maroon (`#681D2A`), vermilion (`#B8463D`), terracotta (`#B85D2B`), and antique gold accents (`#C49A5A`).

---

## 🏗️ System Architecture

```
                       ┌──────────────────────────────┐
                       │     React 18 + Vite (SPA)     │
                       │ Tailwind CSS + Framer Motion │
                       │    Port: 5173 / Docker: 80   │
                       └──────────────┬───────────────┘
                                      │ HTTP / REST API
                                      ▼
                       ┌──────────────────────────────┐
                       │       FastAPI Backend        │
                       │   Python 3.12+ / Port: 8000  │
                       └──────┬───────┬────────┬──────┘
                              │       │        │
           ┌──────────────────┘       │        └──────────────────┐
           ▼                          ▼                           ▼
┌────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  SQLite + SQLA     │     │ Document Processing │     │ AI Assistant Engine │
│ 11 Seeded Sites    │     │ • PyMuPDF (PDFs)    │     │ • Omnirouter API    │
│ Archival Documents │     │ • Tesseract OCR     │     │ • Grounded Fallback │
│ Site Image Gallery │     │ • Safe File Storage │     │ • Evidence Linker   │
└────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## 🚀 Quickstart: Local Development

### Prerequisites

- **Python 3.10+** (Tested with Python 3.12 / 3.13)
- **Node.js 18+** & `npm`
- **Tesseract OCR** (Optional for image OCR; clear error message provided if missing):
  - macOS: `brew install tesseract`
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr tesseract-ocr-eng`

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt

# Configure environment
cp .env.example .env

# Apply schema migrations, then run the API (the API seeds an empty archive)
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at [http://localhost:8000](http://localhost:8000).  
Interactive Swagger documentation is live at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Run Vite dev server
npm run dev
```

The web application will be accessible at [http://localhost:5173](http://localhost:5173).

---

## 🐳 Docker Deployment

HeritageLens includes full containerization for both services with automatic reverse-proxying.

```bash
# Build and run with Docker Compose
docker compose up --build
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173) or [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Persistent Data**: SQLite database and uploaded documents are preserved across container restarts via host-volume mounts.

---

## 🔑 Environment Configuration

Create or modify `backend/.env`:

```ini
# Database & File Storage (SQLite default, Supabase PostgreSQL on Render)
DATABASE_URL=sqlite:///./heritagelens.db
# Supabase Session Pooler (IPv4 for Render; normalized to postgresql+psycopg2://):
# Percent-encode password special characters, such as @ as %40 and / as %2F.
# DATABASE_URL=postgresql://postgres.[project-ref]:[URL-encoded-password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=25
STORAGE_PROVIDER=local
DOCUMENT_PROCESSING_MODE=inline
DOCUMENT_PROCESSING_WORKERS=1

# Required for all modifying curator operations
CURATOR_PASSWORD=choose-a-strong-local-password
CURATOR_TOKEN_SECRET=generate-at-least-32-random-characters
CURATOR_LOGIN_MAX_ATTEMPTS=5
CURATOR_LOGIN_WINDOW_SECONDS=300

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Omnirouter AI Configuration (Optional)
# If omitted, HeritageLens operates in grounded archive fallback mode with zero failures
OMNIROUTER_API_KEY=
OMNIROUTER_BASE_URL=https://api.omnirouter.com/v1
OMNIROUTER_MODEL=google/gemini-2.0-flash
```

---

## ☁️ Deploying Backend to Render with Supabase PostgreSQL

### 1. Supabase Database Configuration
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** → **Database** → **Connection string**.
3. Under **Connection pooling**, select **Mode: Session** and port **5432** (or copy the Session Pooler URI).
   *Note: Using the Session Pooler provides IPv4 connectivity which is recommended for Render web services.*
4. Copy the connection URI in format:  
   `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require`

### 2. Render Web Service Deployment
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your Git repository and set:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Create a **private** Supabase Storage bucket named `heritage-documents`.
4. In **Environment Variables**, add:
   - `DATABASE_URL`: Your Supabase Session Pooler connection URI from Step 1.
   - `ALLOWED_ORIGINS`: Your deployed frontend URL(s) and local preview URLs (comma-separated).
   - `STORAGE_PROVIDER=supabase`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=heritage-documents`
   - `CURATOR_PASSWORD` and a random `CURATOR_TOKEN_SECRET` of at least 32 characters.
   - `DOCUMENT_PROCESSING_MODE=background` and `DOCUMENT_PROCESSING_WORKERS=1` to return uploads promptly while OCR runs inside the backend process.
5. Before the first deployment of this migration system, open a Render Shell and run the matching path below. Do not put credentials in the command.

For a new, empty database:

```bash
cd /app
alembic upgrade head
```

For the existing HeritageLens database whose three original tables already exist:

```bash
cd /app
alembic stamp 0001_initial_schema
alembic upgrade head
```

The stamp records the already-existing baseline without recreating it; the upgrade then adds only the Phase 1 document columns. The web process no longer creates or alters tables during startup.

### Creating future migrations

```bash
cd backend
alembic revision --autogenerate -m "describe the schema change"
alembic upgrade head
```

---

## 📡 API Reference

### Heritage Sites & Map

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sites` | List, search (`q`), and filter sites by `period`, `style`, and `region` |
| `GET` | `/api/sites/{id}` | Get full site details with attached documents and photo gallery |
| `POST` | `/api/sites` | Create a new heritage monument record (curator) |
| `PUT` | `/api/sites/{id}` | Update an existing heritage site |
| `DELETE` | `/api/sites/{id}` | Delete a heritage site record |
| `GET` | `/api/map/markers` | Lightweight coordinate markers for interactive map rendering |

### Document Digitization & OCR

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload PDF or image for PyMuPDF/Tesseract OCR extraction (curator) |
| `GET` | `/api/documents` | List all digitized archival documents |
| `GET` | `/api/documents/{id}` | Retrieve document metadata and extracted text |
| `GET` | `/api/documents/{id}/download` | Download a local original or redirect to a short-lived signed URL |
| `PUT` | `/api/documents/{id}` | Save user-corrected transcribed text |
| `DELETE` | `/api/documents/{id}` | Delete document record and remove physical file from disk |
| `GET` | `/api/search?q=...` | Search site metadata and extracted/corrected document text |
| `POST` | `/api/auth/login` | Exchange the curator password for a time-limited bearer session |
| `GET` | `/api/audit` | Read the protected curator authentication/mutation audit trail |
| `GET` | `/api/ready` | Verify database and configured storage readiness |

Write routes use a single shared curator password and stateless signed session. Login attempts are bounded per backend process and authentication/mutation events are persisted without storing raw client addresses. This is appropriate for a hackathon prototype but does not provide individual accounts, role-based permissions, distributed rate limiting, or immediate single-token revocation. Rotate `CURATOR_TOKEN_SECRET` to invalidate all sessions.

Archive search uses native PostgreSQL full-text search with migration-managed GIN indexes in production. SQLite retains a portable case-insensitive substring search for local development.

Document processing defaults to `inline` for predictable local development and tests. In `background` mode, original files and an `uploaded` state are committed before work is submitted. Pending `uploaded` or `processing` records are resubmitted when the application starts, so an interrupted process does not silently lose the workflow state. This remains an in-process executor rather than a distributed job queue; run a single Render web worker for this mode.

### AI Heritage Assistant

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/assistant/chat` | Send research inquiry, retrieve archive context, synthesize grounded answer with clickable source citations |

---

## 🧪 Testing & Verification

Run the complete automated verification suite:

```bash
# Backend unit and integration tests
cd backend
test_dir=$(mktemp -d /tmp/heritagelens-tests.XXXXXX)
export DATABASE_URL="sqlite:///$test_dir/test.db"
alembic upgrade head
python3 -m unittest discover tests

# Frontend linting (oxlint)
cd ../frontend
npm run lint

# Frontend production build
npm run build

# First-time browser installation, then isolated browser acceptance tests
npx playwright install chromium
npm run test:e2e
```

The Playwright suite starts its own FastAPI and Vite servers, migrates and seeds a
temporary SQLite database, uses temporary local document storage, and does not
touch development or production data. It verifies public archive full-text
search and direct-route refresh, curator access and logout, and a background PDF
upload through extraction, review, approval, and deletion.

---

## 🏛️ Seeded Heritage Monuments

HeritageLens comes pre-seeded with 11 verifiable UNESCO World Heritage and ASI monument records:

1. **Konark Sun Temple** (Odisha, Eastern Ganga Dynasty, Kalinga Architecture)
2. **Taj Mahal** (Uttar Pradesh, Mughal Empire, Mughal Architecture)
3. **Brihadisvara Temple** (Tamil Nadu, Chola Dynasty, Dravidian Architecture)
4. **Hampi - Vijayanagara Ruins** (Karnataka, Vijayanagara Empire, Vijayanagara Architecture)
5. **Ajanta Caves** (Maharashtra, Satavahana & Vakataka, Indian Rock-cut)
6. **Khajuraho Group of Monuments** (Madhya Pradesh, Chandela Dynasty, Nagara Style)
7. **Rani ki Vav** (Gujarat, Chaulukya/Solanki Dynasty, Maru-Gurjara Architecture)
8. **Ellora Caves** (Maharashtra, Rashtrakuta & Yadava, Rock-cut Architecture)
9. **Qutb Minar Complex** (Delhi, Delhi Sultanate, Indo-Islamic Architecture)
10. **Mahabalipuram Monuments** (Tamil Nadu, Pallava Dynasty, Dravidian Rock-cut)
11. **Sanchi Stupa** (Madhya Pradesh, Maurya & Shunga Dynasties, Buddhist Architecture)

---

## 📜 License & Acknowledgments

- **Historical Data**: Grounded in official publications from the Archaeological Survey of India (ASI) and UNESCO World Heritage Centre.
- **Imagery**: Public domain and Creative Commons archival photographs.
