# GrowEasy AI-Powered CSV Importer

An intelligent, production-ready CRM Lead Importer that allows users to upload lead sheets in any arbitrary CSV format, previews them instantly, and leverages AI and heuristics to parse, map, and structure the leads into the GrowEasy CRM schema in real-time.

This application replicates the official GrowEasy CRM branding, utilizing a premium dark glassmorphism dashboard design with a custom-built, ultra-fast virtualized table.

---

## Author & Contact

**Divyansh Joshi**
- Email: divyanshjoshidev@gmail.com
- Phone: +91 8962430535

---

## Live Deployment

- Frontend (Vercel): https://frontend-gamma-black-32.vercel.app

---

## Key Features

* **Intelligent Column Mapping:** Upload any CSV layout (Facebook Lead Export, Google Ads, Real Estate lists, etc.). The system automatically maps messy custom fields to clean CRM parameters.
* **Dual Processing Engine:**
  * AI Engine (Gemini API): Employs LLM prompts to extract ambiguous columns and format values in highly optimized parallel batches.
  * Heuristic Engine (Local Fallback): Regex-based matcher that works instantly without requiring an API key.
* **Real-Time Progress Streaming:** Uses Server-Sent Events (SSE) to stream progress batch-by-batch from the backend to the frontend with real-time percentages and statistics.
* **Data Quality Validation & Deduplication:** Formats dates to ISO-8601, validates allowed enums, skips invalid records, and automatically prevents duplicate email/phone numbers from being imported.
* **Performance Optimization:** Includes a custom-built Virtualized Table to render 10,000+ lead rows instantly on the client with zero scrolling lag, combined with server-side Search Debouncing.

---

## Bonus Points Implemented

- Drag & Drop Upload: Professional file upload zone matching the GrowEasy CRM modal design.
- Progress Indicators: Animated real-time radial progress counters and progress bars.
- Streaming/Incremental Parsing: Implemented via Server-Sent Events (SSE).
- Self-Healing AI Retries: Automatic catch-and-retry mechanism for failed LLM API batches.
- Table Virtualization: Render massive datasets in a custom high-performance virtualized viewport.
- Inline Status Editing: Fully interactive dropdowns inside the table to instantly PATCH/PUT data to the database without page refreshes.
- Dark/Light Mode: Full global theme toggle conforming to premium UI aesthetics.
- Unit & Integration Tests: Double-layered testing suite using vitest and supertest.
- Docker Setup: Fully containerized setup via docker-compose.yml.

---

## Repository Structure

```text
├── backend/
│   ├── prisma/             # SQLite DB schemas and configurations
│   ├── src/
│   │   ├── routes/         # API routes (import streaming, lead querying, inline editing)
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

## Getting Started

### Prerequisites
* Node.js v20+ / Node.js v22+
* npm

### Local Installation

1. Clone the Repository and navigate to the project directory.
2. Setup Backend:
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in the `backend/` folder:
    ```env
    PORT=8000
    DATABASE_URL="file:./dev.db"
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

3. Setup Frontend:
    ```bash
    cd ../frontend
    npm install
    ```
    The frontend will run at `http://localhost:3000`.

---

## Running with Docker

You can spin up the entire frontend, backend, and database with a single command:

```bash
docker-compose up --build
```

Access the dashboard at `http://localhost:3000`. Database records are persisted locally inside the `backend-db-data` Docker volume.

---

## Running Tests

A complete testing suite is provided in the backend to validate mapping correctness and endpoint integrity.

```bash
cd backend
npm run test
```

Tests run in Vitest and verify:
* Fuzzy mappings and allowed value restrictions.
* Formatting logic and multi-contact note consolidation.
* Invalid row skipping.
* API response statuses and search filters.
