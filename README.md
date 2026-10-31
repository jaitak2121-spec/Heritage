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
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run FastAPI server (auto-seeds 11 monuments on startup)
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
# Database & File Storage
DATABASE_URL=sqlite:///./heritagelens.db
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=25

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Omnirouter AI Integration (Optional)
# If omitted, HeritageLens operates in grounded archive fallback mode with zero failures
OMNIROUTER_API_KEY=
OMNIROUTER_BASE_URL=https://openrouter.ai/api/v1
OMNIROUTER_MODEL=google/gemini-2.0-flash-001
```

---

## 📡 API Reference

### Heritage Sites & Map

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sites` | List, search (`q`), and filter sites by `period`, `style`, and `region` |
| `GET` | `/api/sites/{id}` | Get full site details with attached documents and photo gallery |
| `POST` | `/api/sites` | Create a new heritage monument record |
| `PUT` | `/api/sites/{id}` | Update an existing heritage site |
| `DELETE` | `/api/sites/{id}` | Delete a heritage site record |
| `GET` | `/api/map/markers` | Lightweight coordinate markers for interactive map rendering |

### Document Digitization & OCR

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload PDF or image for PyMuPDF/Tesseract OCR extraction |
| `GET` | `/api/documents` | List all digitized archival documents |
| `GET` | `/api/documents/{id}` | Retrieve document metadata and extracted text |
| `PUT` | `/api/documents/{id}` | Save user-corrected transcribed text |
| `DELETE` | `/api/documents/{id}` | Delete document record and remove physical file from disk |

### AI Heritage Assistant

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/assistant/chat` | Send research inquiry, retrieve archive context, synthesize grounded answer with clickable source citations |

---

## 🧪 Testing & Verification

Run the complete automated test discovery:

```bash
# Backend test suite (22 unit & integration tests)
cd backend
python3 -m unittest discover tests

# Frontend linting (oxlint)
cd ../frontend
npm run lint

# Frontend production build
npm run build
```

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
