# SahaaySetu (सहायसेतु) — The AI Crisis-to-Action Bridge
**PromptWars — Societal Benefit Challenge**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-orange.svg)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-20_Passed-emerald.svg)](https://vitest.dev/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.2_AA_Compliant-purple.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)

> **SahaaySetu** is an emergency coordination bridge that converts fragmented, messy, unstructured crisis inputs — voice notes, eyewitness photos, chaotic bystander descriptions, and forwarded alerts — into verified structured intelligence, explainable triage scores, and prioritized, life-saving next steps.

---

## 1. Problem Statement & Societal Impact

In disasters, structural failures, multi-vehicle crashes, or sudden medical emergencies, information reaches citizens and responders in disjointed fragments:
- Bystanders post panicked, emotional voice notes.
- Observers snap photos of flooded underpasses or sparking transformers.
- WhatsApp forwards circulate unverified evacuation rumors.
- Casualties may have critical underlying health history that bystander first-responders know nothing about.

This scattered chaos creates panic, delays emergency dispatch, and causes fatal secondary accidents. **SahaaySetu** solves this fundamental civic bottleneck by serving as a **universal bridge between human intent and complex systems**:

```
UNSTRUCTURED INPUTS              GEMINI INTELLIGENCE             EVIDENCE-TO-ACTION CHAIN
┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
│ • Voice Recording     │       │ • Structured Entity   │       │ [USER-REPORTED]       │
│ • Eyewitness Photo    │  ───► │   Extraction          │  ───► │ [SOURCE-VERIFIED]     │
│ • Bystander Text      │       │ • Hazard Identification│      │ [AI-INFERRED]         │
│ • Pasted Alert        │       │ • Rule+AI Urgency     │       │ [UNVERIFIED]          │
│ • Consented Medical   │       │ • Conservative Safety │       │                       │
└───────────────────────┘       └───────────────────────┘       └───────────────────────┘
                                                                            │
                                                                            ▼
                                                                ┌───────────────────────┐
                                                                │ • Prioritized Actions │
                                                                │ • Human Fact Audit    │
                                                                │ • Responder Brief     │
                                                                │ • Direct Helplines    │
                                                                └───────────────────────┘
```

---

## 2. Key Differentiators: Beyond a Generic Chatbot

| Feature | Generic AI Chatbot | SahaaySetu Crisis Bridge |
| :--- | :--- | :--- |
| **Output Trust** | Hallucinates "facts" and claims verification | **Strict Evidence-to-Action Chain** with clear provenance labels (`USER-REPORTED`, `SOURCE-VERIFIED`, `AI-INFERRED`, `UNVERIFIED`) |
| **Urgency Scoring** | Black-box single number or ungrounded guess | **Dual Algorithmic + AI Engine** with transparent score (0–100) and line-by-line factor breakdown |
| **Medical Boundary** | Diagnoses conditions or hallucinates medicine | **Strict Conservative Boundary**: No diagnoses, no prescription; provides scene safety precautions & immediate EMS escalation |
| **Dispatch Truth** | Claims "help is dispatched" | **Truth in Coordination**: Explicitly discloses that it does not dispatch physical units; provides direct one-touch helplines (112, 108, 101, 1078) |
| **Field Handoff** | Unusable chat log | **One-Click Responder Brief**: Compact markdown/print report with PII and medical privacy scrub toggles |
| **Privacy Safeguards** | Transmits and logs raw voice/photos | **In-Memory Processing**: Zero disk retention of raw media; explicit affirmative consent barrier for medical data |

---

## 3. Six-Parameter Evaluation Matrix (PromptWars Compliance)

| Evaluation Parameter | How SahaaySetu Exceeds Requirements |
| :--- | :--- |
| **1. Code Quality** | • Strict TypeScript across all modules (`strict: true`, zero `any` shortcuts in domain schemas)<br>• Monorepo architecture with `@sahaaysetu/shared` domain single-source-of-truth<br>• Runtime validation with **Zod** on all inputs, models, and outputs<br>• Zero lint warnings in ESLint 9 flat configuration. |
| **2. Security** | • Server-side Gemini API key isolation (`GEMINI_API_KEY` never sent to client)<br>• In-memory upload storage with strict MIME-type and 5MB size limits<br>• Multi-pattern **Prompt Injection Neutralization** and HTML XSS tag encoding<br>• Rate limiting (`express-rate-limit`) on AI endpoints to prevent DoS/quota exhaustion<br>• Automatic PII redaction and explicit medical consent gate. |
| **3. Efficiency** | • Input pre-validation before invoking Gemini to save quota<br>• Asynchronous UI with progress indicators and duplicate click prevention<br>• Instant browser object URL cleanup to prevent memory leaks<br>• Deterministic simulation fallback when API keys are absent or offline<br>• Offline non-sensitive draft auto-save and restore in `localStorage`. |
| **4. Testing** | • **20 comprehensive automated tests** across server and client (Vitest + RTL)<br>• Unit tests for prioritization scoring, prompt injection defense, PII sanitization, and duplicate detection<br>• Integration tests for health, incident submission, brief export, and validation rejection (400)<br>• Production builds and type-checking verified with exit code 0. |
| **5. Accessibility** | • Built against **WCAG 2.2 AA** guidelines with semantic HTML5 (`<main>`, `<nav>`, `<header>`)<br>• High-contrast navy/slate/teal theme with high-visibility keyboard focus rings<br>• Color-independent status: every badge pairs color with icons and descriptive text<br>• Reduced-motion support via `prefers-reduced-motion: reduce`<br>• Accessible modal focus management and keyboard escape handling. |
| **6. Problem Statement** | • End-to-end working crisis pipeline: Input → Analysis → Review → Actions → Brief<br>• Genuine multi-input ingestion (free text, Web Speech voice input, photos, pasted alerts, medical context)<br>• Genuine Gemini 2.5 Flash SDK integration (`@google/genai`) with structured JSON schema<br>• 5 grounded demonstration scenarios covering floods, highway pileups, rumors, collapses, and medical distress<br>• Bilingual interface (English & Hindi) for high societal reach across India and global communities. |

---

## 4. Architecture & Data Flow

```
sahaaysetu/
├── shared/                     # Single Source of Truth
│   ├── src/index.ts            # Domain Schemas (Zod), Types, Demo Scenarios & Helplines
│   └── tsconfig.json
├── server/                     # Express + TypeScript Backend
│   ├── src/
│   │   ├── config/env.ts       # Zod-validated Environment Configuration
│   │   ├── middleware/security.ts # Helmet, Rate Limiter, Multer Memory Storage, Error Handler
│   │   ├── services/
│   │   │   ├── gemini.ts       # Google Gen AI SDK + Structured JSON Parser + Simulator Fallback
│   │   │   ├── prioritization.ts # Transparent 0-100 Urgency Scoring Engine
│   │   │   ├── duplicateDetector.ts # Jaccard Token & Location Similarity Algorithm
│   │   │   └── sanitizer.ts    # Prompt Injection Neutralizer & PII Redactor
│   │   ├── storage/incidentStore.ts # Thread-Safe Incident Store & Responder Brief Exporter
│   │   ├── routes/             # /api/health and /api/incidents Routes
│   │   └── tests/              # 16 Vitest Backend Tests
├── client/                     # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/         # Navbar, EvidenceBadge, UrgencyBadge, AudioInput,
│   │   │                       # ImageDropzone, ResponderBriefModal, EmergencyContactsBar
│   │   ├── pages/              # Dashboard, SubmitIncident, AnalysisReview,
│   │   │                       # ActionCenter, IncidentExplorer, SettingsPrivacy
│   │   ├── locales/            # Bilingual English & Hindi Translations
│   │   └── tests/              # 4 React Testing Library Frontend Tests
└── package.json                # Root Monorepo Orchestration
```

---

## 5. Getting Started & Installation

### Prerequisites
- **Node.js**: v20+ (tested on v22.23.1)
- **npm**: v10+ (tested on 10.9.8)

### Installation
Clone the repository and install all workspace dependencies:
```bash
git clone <repo-url>
cd "Promt Wars"
npm install
```

### Environment Configuration
Copy the provided `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Edit `server/.env`:
```env
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Optional: Provide your Gemini API key for genuine live AI analysis
# If left blank, SahaaySetu automatically runs in Deterministic Simulation Mode!
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

## 6. Running the Application

### Option A: Run Both Frontend & Backend Concurrently (Recommended)
```bash
npm run dev
```
- **Backend API**: `http://localhost:3001`
- **Frontend Web App**: `http://localhost:5173`

### Option B: Run Individually
```bash
# Terminal 1: Backend
npm --workspace=server run dev

# Terminal 2: Frontend
npm --workspace=client run dev
```

---

## 7. Running Verification Commands

All verification commands are executable from the root workspace:

```bash
# 1. Typecheck all workspaces (shared, server, client)
npm run typecheck

# 2. Run all unit and integration tests (20 tests)
npm run test

# 3. Run ESLint code quality checks
npm run lint

# 4. Build production bundles
npm run build
```

---

## 8. Five Demonstration Scenarios

SahaaySetu includes 5 realistic crisis simulations accessible directly from the Situation Dashboard:

1. **Scenario 1: Flash Waterlogging & Blocked Arterial Underpass** (Natural Disaster / High Urgency)
   - Evaluates submerged vehicles, rising tide data from meteorological alerts, and active electrocution hazards from sparking junction boxes.
2. **Scenario 2: Multi-Vehicle Expressway Collision in Dense Fog** (Traffic Accident / Critical Urgency)
   - Demonstrates visual evidence, flammable diesel fuel spill across travel lanes, and uncertain mile marker coordinates.
3. **Scenario 3: Forwarded Cyclone Warning Verification** (Public Safety / Medium Urgency)
   - Highlights the Evidence-to-Action chain flagging an unverified WhatsApp forward (-20 urgency score penalty) to prevent community stampedes.
4. **Scenario 4: Partial Slab Collapse in Commercial Complex** (Infrastructure Failure / Critical Urgency)
   - Demonstrates information gap tracking: surfaces missing worker headcounts and partially blocked stairways before rescue teams arrive.
5. **Scenario 5: Sudden Collapse with Consented Medical History** (Medical Emergency / Critical Urgency)
   - Illustrates privacy consent safeguards: incorporates pacemaker and diabetic history to generate conservative first-aid precautions without attempting a diagnosis.

---

## 9. Security, Privacy & Ethical Guardrails

1. **No Medical Diagnosis or Prescription**: SahaaySetu strictly adheres to medical conservatism, offering scene-stabilization advice (e.g. recovery position, avoiding giving fluids to an unconscious person) and directing users to call 108 / 112.
2. **Truth in Dispatch**: The application never falsely claims that emergency services have been dispatched. Clear toll-free helpline buttons allow citizens to place calls directly.
3. **Prompt Injection & XSS Neutralization**: User inputs are sanitized using regex pattern matching and HTML tag encoding.
4. **Ephemeral Memory Processing**: Media files are kept in memory and never written to permanent disk storage.
5. **Local Session Erasure**: Users can permanently clear all session-submitted data in one click from the Settings & Privacy screen.

---

## 10. License & Attribution

Developed for **PromptWars — Societal Benefit Challenge**. Built by pairing human civic engineering with Google Gemini AI.
