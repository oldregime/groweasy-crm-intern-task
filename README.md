# GrowEasy AI-Powered CSV Importer

An intelligent, production-ready CRM Lead Importer that allows users to upload lead sheets in any arbitrary CSV format, previews them instantly, and leverages AI/heuristics to parse, map, and structure the leads into the GrowEasy CRM schema in real-time.

This application replicates the official GrowEasy CRM branding, utilizing a premium dark glassmorphism dashboard design with smooth micro-animations.

---

## 🌟 Key Features

*   **Intelligent Column Mapping:** Upload *any* CSV layout (Facebook Lead Export, Google Ads, Real Estate lists, etc.). The system automatically maps messy custom fields (e.g. `Cellular`, `Ph No`, `e-mail address`) to clean CRM parameters.
*   **Dual Processing Engine:**
    *   **AI Engine (Gemini/OpenAI):** Employs LLM prompts to extract ambiguous columns and format values.
    *   **Heuristic Engine (Local Fallback):** Regex-based matcher that works instantly without requiring an API key.
*   **Real-Time Progress Streaming:** Uses **Server-Sent Events (SSE)** to stream progress batch-by-batch from the backend to the frontend with real-time percentages and statistics.
*   **Data Quality Validation:**
    *   Formats dates to ISO-8601 / JS-convertible format.
    *   Validates and restricts `crm_status` and `data_source` to allowed enums.
    *   Consolidates multiple emails/numbers, extracting the primary contact and appending extras to notes.
    *   Skips invalid records (rows lacking both email and phone).
*   **Performance Optimization:** Includes a custom-built **Virtualized Table** to render 10,000+ lead rows instantly on the client with zero scrolling lag.

---

## 💎 Bonus Points Implemented

- [x] **Drag & Drop Upload:** Beautiful file upload zone matching the GrowEasy CRM modal design.
- [x] **Progress Indicators:** Animated real-time radial progress counters and progress bars.
- [x] **Streaming/Incremental Parsing:** Implemented via **Server-Sent Events (SSE)**.
- [x] **Self-Healing AI Retries:** Automatic catch-and-retry mechanism for failed LLM API batches.
- [x] **Table Virtualization:** Render massive datasets in a custom high-performance virtualized viewport.
- [x] **Dark/Light Mode:** Full global theme toggle conforming to premium UI aesthetics.
- [x] **Unit & Integration Tests:** Double-layered testing suite using `vitest` and `supertest`.
- [x] **Docker Setup:** Fully containerized setup via `docker-compose.yml`.
- [x] **Online Deployment:** Production-ready configuration for Vercel (Frontend) and Render/Railway (Backend).

---

## 📁 Repository Structure

```text
├── backend/
│   ├── prisma/             # SQLite DB schemas and configurations
│   ├── src/
│   │   ├── routes/         # API routes (import streaming, lead querying)
│   │   ├── services/       # AI mapping engines (Gemini & Heuristic Matchers)
│   │   ├── app.ts          # Main Express application setup
│   │   └── db.ts           # Prisma Client instantiation
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router (Layouts, Styling, Dashboard)
│   │   └── components/     # Virtualized rendering components
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Local multi-container orchestration
└── README.md
```

---

## 🚀 Getting Started

### 📋 Prerequisites
*   Node.js v20+ / Node.js v22+
*   npm

### 🛠️ Local Installation

1.  **Clone the Repository** and navigate to the project directory.
2.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in the `backend/` folder:
    ```env
    PORT=8000
    DATABASE_URL="file:/home/dj/groweasy_crm.db" # Or path to your local SQLite file
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY # (Optional, fallback heuristic engine runs automatically if omitted)
    ```
    Sync the database and generate Prisma Client:
    ```bash
    npm run prisma:push
    ```
    Start the backend dev server:
    ```bash
    npm run dev
    ```
    The backend will run at `http://localhost:8000`.

3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```
    The frontend will run at `http://localhost:3000`.

---

## 🐳 Running with Docker

You can spin up the entire frontend, backend, and database with a single command:

```bash
docker-compose up --build
```

Access the dashboard at `http://localhost:3000`. Database records are persisted locally inside the `backend-db-data` Docker volume.

---

## 🧪 Running Tests

A complete testing suite is provided in the backend to validate mapping correctness and endpoint integrity.

```bash
cd backend
npm run test
```

Tests run in **Vitest** and verify:
*   Fuzzy mappings and allowed value restrictions.
*   Formatting logic and multi-contact note consolidation.
*   Invalid row skipping.
*   API response statuses and search filters.

---

## 🌐 Deployment Guide (Free Hosting)

### Backend (Render / Railway)
1.  Create a web service on **Render** linked to your backend folder.
2.  Select the **Node** runtime.
3.  Add environmental variables:
    *   `PORT=8000`
    *   `DATABASE_URL=file:/data/groweasy_crm.db` (Configure a persistent volume at mount path `/data` to persist your SQLite database!)
4.  Alternatively, connect a free **Neon PostgreSQL** database and change the Prisma provider to `postgresql`.

### Frontend (Vercel)
1.  Import your Next.js frontend folder into **Vercel**.
2.  Deploy with default Next.js configurations.
